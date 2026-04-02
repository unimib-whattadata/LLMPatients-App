import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { z } from "zod";

import { createLogger } from "~/lib/logger";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "~/server/api/trpc";
import {
  isUniqueConstraintError,
  withDatabaseLockRetry,
} from "~/server/db/errors";
import {
  impersonationAuditLog,
  impersonationSessions,
  users,
} from "~/server/db/tables";
import { closeActiveImpersonationInExecutor } from "~/server/impersonation/service";

const logger = createLogger("Impersonation");

export const impersonationRouter = createTRPCRouter({
  startImpersonation: adminProcedure
    .input(
      z.object({
        targetUserId: z.string().min(1, "Target user ID is required"),
        reason: z.string().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { targetUserId, reason, ipAddress, userAgent } = input;
      const adminUserId = ctx.session.user.id;

      logger.info("Starting impersonation session", {
        admin: adminUserId,
        target: targetUserId,
        reason: reason ?? "(none)",
      });

      try {
        return await withDatabaseLockRetry(() =>
          ctx.db.transaction(async (tx) => {
            const targetUser = await tx
              .select({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                isActive: users.isActive,
              })
              .from(users)
              .where(eq(users.id, targetUserId))
              .limit(1);

            const target = targetUser[0];
            if (!target) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Target user not found",
              });
            }

            if (!target.isActive) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cannot impersonate an inactive user",
              });
            }

            if (target.role === "admin") {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cannot impersonate another admin user",
              });
            }

            if (targetUserId === adminUserId) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Cannot impersonate yourself",
              });
            }

            const sessionId = crypto.randomUUID();
            const sessionToken = crypto.randomUUID();
            const startedAt = new Date();

            try {
              await tx.insert(impersonationSessions).values({
                id: sessionId,
                adminUserId,
                targetUserId,
                startedAt,
                isActive: true,
                // This denormalized key is what enforces "one active
                // impersonation per admin" across both DB engines.
                activeAdminSessionKey: adminUserId,
                sessionToken,
                ipAddress,
                userAgent,
                reason,
              });
            } catch (error) {
              if (isUniqueConstraintError(error, "activeadminsessionkey")) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    "You already have an active impersonation session. Please end it first.",
                });
              }

              throw error;
            }

            await tx.insert(impersonationAuditLog).values({
              id: crypto.randomUUID(),
              impersonationSessionId: sessionId,
              actionType: "START",
              actionDetails: JSON.stringify({
                adminUserId,
                targetUserId,
                targetUserEmail: target.email,
                targetUserName: target.name,
                reason,
              }),
              performedAt: startedAt,
              ipAddress,
              userAgent,
            });

            logger.info("Impersonation session created", {
              sessionId,
              admin: adminUserId,
              targetEmail: target.email,
            });

            return {
              success: true,
              sessionId,
              targetUser: {
                id: target.id,
                email: target.email,
                name: target.name,
                role: target.role,
              },
              startedAt,
            };
          }),
        );
      } catch (error) {
        logger.error("Failed to start impersonation", {
          admin: adminUserId,
          target: targetUserId,
          error,
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start impersonation session",
        });
      }
    }),

  endImpersonation: protectedProcedure
    .input(
      z.object({
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { ipAddress, userAgent } = input;
      const isImpersonated = !!ctx.session.impersonation?.isImpersonating;
      const adminUserId = isImpersonated
        ? ctx.session.impersonation!.originalAdminId
        : ctx.session.user.id;
      const sessionId = isImpersonated
        ? ctx.session.impersonation!.sessionId
        : undefined;

      logger.info("Ending impersonation session", {
        admin: adminUserId,
        sessionId: sessionId ?? "(none)",
        isImpersonated,
      });

      try {
        return await withDatabaseLockRetry(() =>
          ctx.db.transaction(async (tx) => {
            const closedSession = await closeActiveImpersonationInExecutor(tx, {
              sessionId,
              adminUserId,
              endedBy: isImpersonated ? "impersonated_user" : "original_admin",
              ipAddress,
              userAgent,
            });

            if (!closedSession) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "No active impersonation session found",
              });
            }

            logger.info("Impersonation session ended", {
              sessionId: closedSession.sessionId,
              duration: `${closedSession.duration}s`,
            });

            return {
              success: true,
              sessionId: closedSession.sessionId,
              duration: closedSession.duration,
            };
          }),
        );
      } catch (error) {
        logger.error("Failed to end impersonation", { sessionId, error });

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to end impersonation session",
        });
      }
    }),

  getCurrentImpersonation: protectedProcedure.query(async ({ ctx }) => {
    const isImpersonated = !!ctx.session.impersonation?.isImpersonating;

    if (!isImpersonated) {
      return {
        isImpersonating: false,
        session: null,
      };
    }

    const impersonationData = ctx.session.impersonation!;

    try {
      const sessionData = await ctx.db
        .select()
        .from(impersonationSessions)
        .where(
          and(
            eq(impersonationSessions.id, impersonationData.sessionId),
            eq(impersonationSessions.isActive, true),
          ),
        )
        .limit(1);

      const session = sessionData[0];
      if (!session) {
        logger.warn("Impersonation session not found in database", {
          sessionId: impersonationData.sessionId,
        });
        return {
          isImpersonating: false,
          session: null,
        };
      }

      return {
        isImpersonating: true,
        session: {
          id: session.id,
          originalAdminId: impersonationData.originalAdminId,
          targetUserId: impersonationData.targetUserId,
          targetUserEmail: impersonationData.targetUserEmail,
          targetUserName: impersonationData.targetUserName,
          startedAt: impersonationData.startedAt,
          reason: session.reason,
        },
      };
    } catch (error) {
      logger.error("Failed to get current impersonation state", error);
      return {
        isImpersonating: false,
        session: null,
      };
    }
  }),

  getImpersonationHistory: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        adminUserId: z.string().optional(),
        targetUserId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, adminUserId, targetUserId } = input;
      const offset = (page - 1) * limit;

      try {
        const whereConditions = [];

        if (adminUserId) {
          whereConditions.push(eq(impersonationSessions.adminUserId, adminUserId));
        }

        if (targetUserId) {
          whereConditions.push(eq(impersonationSessions.targetUserId, targetUserId));
        }

        const [sessions, totalCountResult] = await Promise.all([
          ctx.db
            .select({
              session: impersonationSessions,
              adminUser: {
                id: users.id,
                email: users.email,
                name: users.name,
              },
            })
            .from(impersonationSessions)
            .leftJoin(users, eq(impersonationSessions.adminUserId, users.id))
            .where(
              whereConditions.length > 0 ? and(...whereConditions) : undefined,
            )
            .orderBy(desc(impersonationSessions.startedAt))
            .limit(limit)
            .offset(offset),
          ctx.db
            .select({ count: count() })
            .from(impersonationSessions)
            .where(
              whereConditions.length > 0 ? and(...whereConditions) : undefined,
            ),
        ]);

        const targetUserIds = [...new Set(sessions.map((item) => item.session.targetUserId))];
        const targetUsers =
          targetUserIds.length > 0
            ? await ctx.db
                .select({
                  id: users.id,
                  email: users.email,
                  name: users.name,
                })
                .from(users)
                .where(inArray(users.id, targetUserIds))
            : [];

        const targetUserById = new Map(targetUsers.map((user) => [user.id, user]));

        const totalCount = Number(totalCountResult[0]?.count ?? 0);
        const totalPages = Math.ceil(totalCount / limit);

        return {
          sessions: sessions.map((item) => ({
            ...item.session,
            adminUser: item.adminUser,
            targetUser: targetUserById.get(item.session.targetUserId) ?? null,
            duration:
              item.session.endedAt && item.session.startedAt
                ? Math.floor(
                    (item.session.endedAt.getTime() -
                      item.session.startedAt.getTime()) /
                      1000,
                  )
                : null,
          })),
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        };
      } catch (error) {
        logger.error("Failed to retrieve impersonation history", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve impersonation history",
        });
      }
    }),

  getUsersForImpersonation: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { search, page, limit } = input;
      const offset = (page - 1) * limit;

      try {
        const whereConditions = [eq(users.role, "user"), eq(users.isActive, true)];

        if (search?.trim()) {
          const term = `%${search.trim()}%`;
          const searchCondition = or(like(users.name, term), like(users.email, term));
          if (searchCondition) {
            whereConditions.push(searchCondition);
          }
        }

        const [usersList, totalCountResult] = await Promise.all([
          ctx.db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
              role: users.role,
            })
            .from(users)
            .where(and(...whereConditions))
            .limit(limit)
            .offset(offset),
          ctx.db
            .select({ count: count() })
            .from(users)
            .where(and(...whereConditions)),
        ]);

        const totalCount = Number(totalCountResult[0]?.count ?? 0);
        const totalPages = Math.ceil(totalCount / limit);

        return {
          users: usersList.filter((user) => user.id !== ctx.session.user.id),
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        };
      } catch (error) {
        logger.error("Failed to retrieve users for impersonation", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve users for impersonation",
        });
      }
    }),
});
