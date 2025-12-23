
import { z } from "zod";
import { eq, and, desc, or, like, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  users,
  impersonationSessions,
  impersonationAuditLog,
} from "~/server/db/tables";
import { createLogger } from "~/lib/logger";

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
        
        const targetUser = await db
          .select()
          .from(users)
          .where(eq(users.id, targetUserId))
          .limit(1);

        if (targetUser.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target user not found",
          });
        }

        const target = targetUser[0]!;

        
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

        
        const existingActiveSession = await db
          .select()
          .from(impersonationSessions)
          .where(
            and(
              eq(impersonationSessions.adminUserId, adminUserId),
              eq(impersonationSessions.isActive, true),
            ),
          )
          .limit(1);

        if (existingActiveSession.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "You already have an active impersonation session. Please end it first.",
          });
        }

        
        const sessionId = crypto.randomUUID();
        const sessionToken = crypto.randomUUID();
        const startedAt = new Date();

        await db.insert(impersonationSessions).values({
          id: sessionId,
          adminUserId,
          targetUserId,
          startedAt: startedAt,
          isActive: true,
          sessionToken,
          ipAddress,
          userAgent,
          reason,
        });

        
        await db.insert(impersonationAuditLog).values({
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
      } catch (error) {
        logger.error("Failed to start impersonation", { admin: adminUserId, target: targetUserId, error });

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
        
        let activeSession;

        if (sessionId) {
          
          activeSession = await db
            .select()
            .from(impersonationSessions)
            .where(
              and(
                eq(impersonationSessions.id, sessionId),
                eq(impersonationSessions.isActive, true),
              ),
            )
            .limit(1);
        } else {
          
          activeSession = await db
            .select()
            .from(impersonationSessions)
            .where(
              and(
                eq(impersonationSessions.adminUserId, adminUserId),
                eq(impersonationSessions.isActive, true),
              ),
            )
            .limit(1);
        }

        if (activeSession.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No active impersonation session found",
          });
        }

        const session = activeSession[0]!;

        
        const endedAt = new Date();

        await db
          .update(impersonationSessions)
          .set({
            endedAt,
            isActive: false,
          })
          .where(eq(impersonationSessions.id, session.id));

        
        await db.insert(impersonationAuditLog).values({
          id: crypto.randomUUID(),
          impersonationSessionId: session.id,
          actionType: "END",
          actionDetails: JSON.stringify({
            adminUserId: session.adminUserId,
            targetUserId: session.targetUserId,
            duration: Math.floor(
              (endedAt.getTime() - session.startedAt.getTime()) / 1000,
            ),
            endedBy: isImpersonated ? "impersonated_user" : "original_admin",
          }),
          performedAt: endedAt,
          ipAddress,
          userAgent,
        });

        logger.info("Impersonation session ended", {
          sessionId: session.id,
          duration: `${Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)}s`,
        });

        return {
          success: true,
          sessionId: session.id,
          duration: Math.floor(
            (endedAt.getTime() - session.startedAt.getTime()) / 1000,
          ),
        };
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
      
      const sessionData = await db
        .select()
        .from(impersonationSessions)
        .where(eq(impersonationSessions.id, impersonationData.sessionId))
        .limit(1);

      if (sessionData.length === 0) {
        logger.warn("Impersonation session not found in database", { sessionId: impersonationData.sessionId });
        return {
          isImpersonating: false,
          session: null,
        };
      }

      const session = sessionData[0]!;

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
    .query(async ({ ctx: _ctx, input }) => {
      const { page, limit, adminUserId, targetUserId } = input;
      const offset = (page - 1) * limit;

      try {
        
        const whereConditions = [];

        if (adminUserId) {
          whereConditions.push(
            eq(impersonationSessions.adminUserId, adminUserId),
          );
        }

        if (targetUserId) {
          whereConditions.push(
            eq(impersonationSessions.targetUserId, targetUserId),
          );
        }

        
        const sessions = await (db as any)
          .select({
            session: impersonationSessions,
            adminUser: {
              id: (users as any).id,
              email: (users as any).email,
              name: (users as any).name,
            },
          })
          .from(impersonationSessions)
          .leftJoin(users, eq(impersonationSessions.adminUserId, users.id))
          .where(
            whereConditions.length > 0 ? and(...whereConditions) : undefined,
          )
          .orderBy(desc(impersonationSessions.startedAt))
          .limit(limit)
          .offset(offset);

        
        const sessionsWithTargetUsers = await Promise.all(
          sessions.map(
            async (item: {
              session: typeof impersonationSessions.$inferSelect;
              adminUser: {
                id: string;
                email: string;
                name: string | null;
              } | null;
            }) => {
              const targetUser = await (db as any)
                .select({
                  id: (users as any).id,
                  email: (users as any).email,
                  name: (users as any).name,
                })
                .from(users)
                .where(eq(users.id, item.session.targetUserId))
                .limit(1);

              return {
                ...item.session,
                adminUser: item.adminUser,
                targetUser: targetUser[0] ?? null,
                duration:
                  item.session.endedAt && item.session.startedAt
                    ? Math.floor(
                        (item.session.endedAt.getTime() -
                          item.session.startedAt.getTime()) /
                          1000,
                      )
                    : null,
              };
            },
          ),
        );

        
        const totalCountResult = await (db as any)
          .select({ count: count() })
          .from(impersonationSessions)
          .where(
            whereConditions.length > 0 ? and(...whereConditions) : undefined,
          );

        const totalCount = Number(totalCountResult[0]?.count ?? 0);
        const totalPages = Math.ceil(totalCount / limit);

        return {
          sessions: sessionsWithTargetUsers,
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
        
        const whereConditions = [
          eq(users.role, "user"), 
        ];

        
        if (search?.trim()) {
          
          
          const term = `%${search.trim()}%`;
          whereConditions.push(
            or(like(users.name, term), like(users.email, term)),
          );
        }

        
        const usersQuery = (db as any)
          .select({
            id: (users as any).id,
            email: (users as any).email,
            name: (users as any).name,
            role: (users as any).role,
          })
          .from(users)
          .where(and(...whereConditions))
          .limit(limit)
          .offset(offset);

        const usersList = await usersQuery;

        
        const filteredUsers = usersList.filter(
          (user: any) => user.id !== ctx.session.user.id,
        );

        
        const totalCountResult = await (db as any)
          .select({ count: count() })
          .from(users)
          .where(and(...whereConditions));

        const totalCount = Number(totalCountResult[0]?.count ?? 0);
        const totalPages = Math.ceil(totalCount / limit);

        return {
          users: filteredUsers,
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
