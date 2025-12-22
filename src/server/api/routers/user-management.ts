
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  adminProcedure,
} from "~/server/api/trpc";
import {
  users,
  accounts,
  sessions,
  userActivities,
  impersonationSessions,
  impersonationAuditLog,
} from "~/server/db/tables";
import { eq, asc, and, or, like, count } from "drizzle-orm";
import { createLogger } from "~/lib/logger";

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

      const userList = await (ctx.db as any)
        .select({
          id: (users as any).id,
          name: (users as any).name,
          email: (users as any).email,
          role: (users as any).role,
          
          
        })
        .from(users)
        .where(whereClause)
        .orderBy(asc((users as any).name)) 
        .limit(limit)
        .offset(offset);

      
      const totalCount = await (ctx.db as any)
        .select({ count: (users as any).id })
        .from(users)
        .where(whereClause);

      return {
        users: userList,
        totalCount: totalCount.length,
        hasMore: totalCount.length > offset + limit,
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
      const { name, email, role } = input;

      
      const existingUser = await (ctx.db as any)
        .select()
        .from(users)
        .where(eq((users as any).email, email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error("User with this email already exists");
      }

      
      const newUser = await (ctx.db as any)
        .insert(users)
        .values({
          name,
          email,
          role,
        })
        .returning({
          id: (users as any).id,
          name: (users as any).name,
          email: (users as any).email,
          role: (users as any).role,
          
        });

      
      
      return newUser[0];
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

      
      const updatedUser = await (ctx.db as any)
        .update(users)
        .set({
          role,
          
        })
        .where(eq((users as any).id, userId))
        .returning({
          id: (users as any).id,
          name: (users as any).name,
          email: (users as any).email,
          role: (users as any).role,
          
        });

      if (updatedUser.length === 0) {
        throw new Error("User not found");
      }

      return updatedUser[0];
    }),

    updateUserProfile: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const { userId, name, email } = input;

      
      const existingUser = await (ctx.db as any)
        .select()
        .from(users)
        .where(
          and(eq((users as any).email, email), eq((users as any).id, userId)),
        )
        .limit(1);

      if (existingUser.length === 0) {
        
        const emailTaken = await (ctx.db as any)
          .select()
          .from(users)
          .where(eq((users as any).email, email))
          .limit(1);

        if (emailTaken.length > 0) {
          throw new Error("Email is already taken by another user");
        }
      }

      
      const updatedUser = await (ctx.db as any)
        .update(users)
        .set({
          name,
          email,
          
        })
        .where(eq((users as any).id, userId))
        .returning({
          id: (users as any).id,
          name: (users as any).name,
          email: (users as any).email,
          role: (users as any).role,
          
        });

      if (updatedUser.length === 0) {
        throw new Error("User not found");
      }

      return updatedUser[0];
    }),

    deleteUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const { userId } = input;

      
      if (userId === ctx.session.user.id) {
        throw new Error("Cannot delete your own account");
      }

      try {
        
        const result = await (ctx.db as any).transaction(async (tx: any) => {
          
          const userImpersonationSessions = await tx
            .select({ id: (impersonationSessions as any).id })
            .from(impersonationSessions)
            .where(
              or(
                eq((impersonationSessions as any).adminUserId, userId),
                eq((impersonationSessions as any).targetUserId, userId),
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
                    eq(
                      (impersonationAuditLog as any).impersonationSessionId,
                      id,
                    ),
                  ),
                ),
              );
          }

          
          await tx
            .delete(impersonationSessions)
            .where(
              or(
                eq((impersonationSessions as any).adminUserId, userId),
                eq((impersonationSessions as any).targetUserId, userId),
              ),
            );

          
          await tx
            .delete(userActivities)
            .where(eq((userActivities as any).userId, userId));

          
          await tx.delete(sessions).where(eq((sessions as any).userId, userId));

          
          await tx.delete(accounts).where(eq((accounts as any).userId, userId));

          
          const deletedUser = await tx
            .delete(users)
            .where(eq((users as any).id, userId))
            .returning({
              id: (users as any).id,
              email: (users as any).email,
            });

          if (deletedUser.length === 0) {
            throw new Error("User not found");
          }

          return deletedUser[0];
        });

        return { success: true, deletedUser: result };
      } catch (error) {
        logger.error("Error deleting user", error);
        throw new Error(
          `Failed to delete user: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

    getUserById: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const { userId } = input;

      const user = await (ctx.db as any)
        .select({
          id: (users as any).id,
          name: (users as any).name,
          email: (users as any).email,
          role: (users as any).role,
          
          
        })
        .from(users)
        .where(eq((users as any).id, userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error("User not found");
      }

      return user[0];
    }),

    getUserStats: protectedProcedure.query(async ({ ctx }) => {
    
    if (ctx.session.user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    
    const totalUsersResult = await (ctx.db as any)
      .select({ count: count() })
      .from(users);

    
    const adminUsersResult = await (ctx.db as any)
      .select({ count: count() })
      .from(users)
      .where(eq((users as any).role, "admin"));

    
    const regularUsersResult = await (ctx.db as any)
      .select({ count: count() })
      .from(users)
      .where(eq((users as any).role, "user"));

    return {
      totalUsers: totalUsersResult[0]?.count ?? 0,
      adminUsers: adminUsersResult[0]?.count ?? 0,
      regularUsers: regularUsersResult[0]?.count ?? 0,
    };
  }),

    getPublicUserList: publicProcedure
    .input(
      z.object({
        specialKey: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      
      if (
        process.env.NODE_ENV !== "development" ||
        input.specialKey !== "DavideIsTesting"
      ) {
        throw new Error("Unauthorized: Development access only");
      }

      const userList = await (ctx.db as any)
        .select({
          id: (users as any).id,
          name: (users as any).name,
          email: (users as any).email,
          role: (users as any).role,
          
        })
        .from(users)
        .orderBy(asc((users as any).name)) 
        .limit(input.limit);

      return userList;
    }),

    createPublicUser: publicProcedure
    .input(
      z.object({
        specialKey: z.string(),
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["admin", "user"]).default("user"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      
      if (
        process.env.NODE_ENV !== "development" ||
        input.specialKey !== "DavideIsTesting"
      ) {
        throw new Error("Unauthorized: Development access only");
      }

      const { name, email, role } = input;

      
      const existingUser = await (ctx.db as any)
        .select()
        .from(users)
        .where(eq((users as any).email, email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error("User with this email already exists");
      }

      
      const newUser = await (ctx.db as any)
        .insert(users)
        .values({
          name,
          email,
          role,
        })
        .returning({
          id: (users as any).id,
          name: (users as any).name,
          email: (users as any).email,
          role: (users as any).role,
          
        });

      return newUser[0];
    }),
});
