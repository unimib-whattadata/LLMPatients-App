import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import {
  users,
  accounts,
  sessions,
  userActivities,
  impersonationSessions,
  impersonationAuditLog,
} from "~/server/db/tables";
import { eq, asc, and, or, like, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createLogger } from "~/lib/logger";
import { isUniqueConstraintError } from "~/server/db/errors";

const logger = createLogger("UserManagement");

export const userManagementRouter = createTRPCRouter({
  getAllUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        role: z.enum(["admin", "user"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset, search, role } = input;

      // Build the filter list incrementally so search/role can be combined
      // without duplicating query branches.
      const conditions = [];

      if (search) {
        conditions.push(
          or(like(users.name, `%${search}%`), like(users.email, `%${search}%`)),
        );
      }

      if (role) {
        conditions.push(eq(users.role, role));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [userList, totalCountResult] = await Promise.all([
        ctx.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          })
          .from(users)
          .where(whereClause)
          .orderBy(asc(users.name))
          .limit(limit)
          .offset(offset),
        ctx.db.select({ count: count() }).from(users).where(whereClause),
      ]);

      const totalCount = Number(totalCountResult[0]?.count ?? 0);

      return {
        users: userList,
        totalCount,
        hasMore: offset + limit < totalCount,
      };
    }),

  createUser: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(["admin", "user"]).default("user"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, email, role, password } = input;

      const saltRounds = process.env.NODE_ENV === "production" ? 12 : 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      try {
        // We rely on the DB unique constraint for correctness so concurrent
        // admin-created users cannot bypass the duplicate-email check.
        const newUser = await ctx.db
          .insert(users)
          .values({
            name,
            email,
            role,
            password: hashedPassword,
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          });

        return newUser[0];
      } catch (error) {
        if (isUniqueConstraintError(error, "email")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User with this email already exists",
          });
        }

        throw error;
      }
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "user"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, role } = input;

      if (userId === ctx.session.user.id) {
        throw new Error("Cannot change your own role");
      }

      const updatedUser = await ctx.db
        .update(users)
        .set({
          role,
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        });

      if (updatedUser.length === 0) {
        throw new Error("User not found");
      }

      return updatedUser[0];
    }),

  updateUserProfile: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, name, email } = input;

      try {
        // As with self-service profile updates, the database remains the source
        // of truth for email uniqueness and we translate that into a conflict.
        const updatedUser = await ctx.db
          .update(users)
          .set({
            name,
            email,
          })
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          });

        if (updatedUser.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return updatedUser[0];
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        if (isUniqueConstraintError(error, "email")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email is already taken by another user",
          });
        }

        throw error;
      }
    }),

  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;

      if (userId === ctx.session.user.id) {
        throw new Error("Cannot delete your own account");
      }

      try {
        // Delete dependent rows in one transaction so partial cleanup does not
        // leave orphaned auth or impersonation records behind.
        const result = await ctx.db.transaction(async (tx) => {
          // Audit rows depend on impersonation sessions, so they must be removed
          // first for databases that do not enforce cascading deletes here.
          const userImpersonationSessions = await tx
            .select({ id: impersonationSessions.id })
            .from(impersonationSessions)
            .where(
              or(
                eq(impersonationSessions.adminUserId, userId),
                eq(impersonationSessions.targetUserId, userId),
              ),
            );

          if (userImpersonationSessions.length > 0) {
            const sessionIds = userImpersonationSessions.map(
              (session: { id: string }) => session.id,
            );
            await tx
              .delete(impersonationAuditLog)
              .where(
                or(
                  ...sessionIds.map((id: string) =>
                    eq(impersonationAuditLog.impersonationSessionId, id),
                  ),
                ),
              );
          }

          await tx
            .delete(impersonationSessions)
            .where(
              or(
                eq(impersonationSessions.adminUserId, userId),
                eq(impersonationSessions.targetUserId, userId),
              ),
            );

          await tx
            .delete(userActivities)
            .where(eq(userActivities.userId, userId));

          await tx.delete(sessions).where(eq(sessions.userId, userId));

          await tx.delete(accounts).where(eq(accounts.userId, userId));

          const deletedUser = await tx
            .delete(users)
            .where(eq(users.id, userId))
            .returning({
              id: users.id,
              email: users.email,
            });

          if (deletedUser.length === 0) {
            throw new Error("User not found");
          }

          return deletedUser[0];
        });

        return { success: true, deletedUser: result };
      } catch (error) {
        logger.error("User deletion failed", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new Error(
          `Failed to delete user: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  getUserById: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { userId } = input;

      const user = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error("User not found");
      }

      return user[0];
    }),

  getUserStats: adminProcedure.query(async ({ ctx }) => {
    const [totalUsersResult, adminUsersResult, regularUsersResult] =
      await Promise.all([
        ctx.db.select({ count: count() }).from(users),
        ctx.db
          .select({ count: count() })
          .from(users)
          .where(eq(users.role, "admin")),
        ctx.db
          .select({ count: count() })
          .from(users)
          .where(eq(users.role, "user")),
      ]);

    return {
      totalUsers: totalUsersResult[0]?.count ?? 0,
      adminUsers: adminUsersResult[0]?.count ?? 0,
      regularUsers: regularUsersResult[0]?.count ?? 0,
    };
  }),
});
