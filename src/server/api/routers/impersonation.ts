/**
 * Impersonation tRPC Router
 *
 * Handles admin user impersonation functionality including:
 * - Starting impersonation sessions
 * - Ending impersonation sessions
 * - Getting impersonation status and history
 * - Audit logging for security tracking
 */

import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
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
} from "~/server/db/schema";

/**
 * Impersonation Router
 * Provides endpoints for managing admin user impersonation
 */
export const impersonationRouter = createTRPCRouter({
  /**
   * Start Impersonation Session
   * Admin-only endpoint to begin impersonating a target user
   */
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

      console.log("Starting impersonation:", {
        adminUserId,
        targetUserId,
        reason: reason ?? "No reason provided",
      });

      try {
        // Validate that target user exists and is not an admin
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

        // Prevent admin from impersonating another admin
        if (target.role === "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot impersonate another admin user",
          });
        }

        // Prevent self-impersonation
        if (targetUserId === adminUserId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot impersonate yourself",
          });
        }

        // Check for existing active impersonation session
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

        // Create new impersonation session
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

        // Create audit log entry
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

        console.log("Impersonation session created successfully:", {
          sessionId,
          adminUserId,
          targetUserId,
          targetUserEmail: target.email,
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
        console.error("Error starting impersonation:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start impersonation session",
        });
      }
    }),

  /**
   * End Impersonation Session
   * Ends the current active impersonation session
   */
  endImpersonation: protectedProcedure
    .input(
      z.object({
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { ipAddress, userAgent } = input;

      // Determine if this is an impersonated session or original admin
      const isImpersonated = !!ctx.session.impersonation?.isImpersonating;
      const adminUserId = isImpersonated
        ? ctx.session.impersonation!.originalAdminId
        : ctx.session.user.id;
      const sessionId = isImpersonated
        ? ctx.session.impersonation!.sessionId
        : undefined;

      console.log("Ending impersonation:", {
        adminUserId,
        sessionId,
        isImpersonated,
        currentUserId: ctx.session.user.id,
      });

      try {
        // Find and validate the active impersonation session
        let activeSession;

        if (sessionId) {
          // We have the session ID from the impersonated session
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
          // Look for active session by admin user ID (direct admin ending)
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

        // End the impersonation session
        const endedAt = new Date();

        await db
          .update(impersonationSessions)
          .set({
            endedAt,
            isActive: false,
          })
          .where(eq(impersonationSessions.id, session.id));

        // Create audit log entry
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

        console.log("Impersonation session ended successfully:", {
          sessionId: session.id,
          adminUserId: session.adminUserId,
          targetUserId: session.targetUserId,
          duration: Math.floor(
            (endedAt.getTime() - session.startedAt.getTime()) / 1000,
          ),
        });

        return {
          success: true,
          sessionId: session.id,
          duration: Math.floor(
            (endedAt.getTime() - session.startedAt.getTime()) / 1000,
          ),
        };
      } catch (error) {
        console.error("Error ending impersonation:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to end impersonation session",
        });
      }
    }),

  /**
   * Get Current Impersonation Status
   * Returns information about the current impersonation session if active
   */
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
      // Get session details from database
      const sessionData = await db
        .select()
        .from(impersonationSessions)
        .where(eq(impersonationSessions.id, impersonationData.sessionId))
        .limit(1);

      if (sessionData.length === 0) {
        console.warn(
          "Impersonation session not found in database:",
          impersonationData.sessionId,
        );
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
      console.error("Error getting current impersonation:", error);
      return {
        isImpersonating: false,
        session: null,
      };
    }
  }),

  /**
   * Get Impersonation History
   * Admin-only endpoint to view impersonation history with pagination
   */
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
        // Build where conditions
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

        // Get impersonation sessions with user details
        const sessions = await db
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
          .offset(offset);

        // Get target user details separately (due to join limitations)
        const sessionsWithTargetUsers = await Promise.all(
          sessions.map(async (item) => {
            const targetUser = await db
              .select({
                id: users.id,
                email: users.email,
                name: users.name,
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
          }),
        );

        // Get total count for pagination
        const totalCountResult = await db
          .select({ count: impersonationSessions.id })
          .from(impersonationSessions)
          .where(
            whereConditions.length > 0 ? and(...whereConditions) : undefined,
          );

        const totalCount = totalCountResult.length;
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
        console.error("Error getting impersonation history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve impersonation history",
        });
      }
    }),

  /**
   * Get All Users for Impersonation
   * Admin-only endpoint to get list of users that can be impersonated
   */
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
        // Build where conditions
        const whereConditions = [
          eq(users.role, "user"), // Only show regular users, not admins
        ];

        // Add search filter if provided
        if (search?.trim()) {
          // This would need to be adapted based on your SQL dialect
          // For SQLite, you might need to use LIKE differently
          whereConditions
            .push
            // Note: This is a simplified search - you may want to use proper full-text search
            // or multiple OR conditions for email, name search
            ();
        }

        // Get users (excluding admins and the current admin)
        const usersQuery = db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
          })
          .from(users)
          .where(and(...whereConditions))
          .limit(limit)
          .offset(offset);

        const usersList = await usersQuery;

        // Filter out current admin user
        const filteredUsers = usersList.filter(
          (user) => user.id !== ctx.session.user.id,
        );

        // Get total count
        const totalCountResult = await db
          .select({ count: users.id })
          .from(users)
          .where(and(...whereConditions));

        const totalCount = totalCountResult.length;
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
        console.error("Error getting users for impersonation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve users for impersonation",
        });
      }
    }),
});
