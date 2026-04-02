import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, ne, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { userActivities, users } from "~/server/db/tables";

function parseActivityMetadata(metadata: string | null) {
  // Metadata is stored as JSON text across both dialects. A bad row should not
  // take down the dashboard, so malformed payloads are treated as missing.
  if (!metadata) {
    return null;
  }

  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const dashboardRouter = createTRPCRouter({
  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    try {
      return await (ctx.db as any)
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          emailVerified: users.emailVerified,
          image: users.image,
        })
        .from(users)
        .orderBy(desc(users.name));
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch users",
      });
    }
  }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1, "User ID is required"),
        role: z.enum(["admin", "user"], {
          message: "Role must be either 'admin' or 'user'",
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.userId === ctx.session.user.id && input.role === "user") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot remove your own admin privileges",
          });
        }

        const updatedUser = await (ctx.db as any)
          .update(users)
          .set({ role: input.role })
          .where(eq(users.id, input.userId))
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

        await (ctx.db as any).insert(userActivities).values({
          userId: ctx.session.user.id,
          activityType: "role_update",
          metadata: JSON.stringify({
            targetUserId: input.userId,
            newRole: input.role,
            targetUserName: updatedUser[0]?.name,
          }),
        });

        return updatedUser[0]!;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user role",
        });
      }
    }),

  getSystemStats: adminProcedure.query(async ({ ctx }) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalUsersResult, activeUsersResult, adminUsersResult, recentActivities] =
        await Promise.all([
          (ctx.db as any)
            .select({ count: count() })
            .from(users),
          (ctx.db as any)
            .select({
              count: sql<number>`count(distinct ${userActivities.userId})`,
            })
            .from(userActivities)
            .where(
              and(
                eq((userActivities as any).activityType, "login"),
                gte((userActivities as any).createdAt, thirtyDaysAgo),
              ),
            ),
          (ctx.db as any)
            .select({ count: count() })
            .from(users)
            .where(eq(users.role, "admin")),
          (ctx.db as any)
            .select({
              id: (userActivities as any).id,
              activityType: (userActivities as any).activityType,
              metadata: (userActivities as any).metadata,
              createdAt: (userActivities as any).createdAt,
              userName: users.name,
            })
            .from(userActivities)
            .leftJoin(users, eq(userActivities.userId, users.id))
            .orderBy(desc(userActivities.createdAt))
            .limit(10),
        ]);

      return {
        totalUsers: Number(totalUsersResult[0]?.count ?? 0),
        // "Active" here means "logged in during the last 30 days". It is an
        // engagement metric, not the same thing as the auth-level isActive flag.
        activeUsers: Number(activeUsersResult[0]?.count ?? 0),
        adminUsers: Number(adminUsersResult[0]?.count ?? 0),
        recentActivities: recentActivities.map((activity: any) => ({
          id: activity.id,
          type: activity.activityType,
          createdAt: activity.createdAt,
          userName: activity.userName ?? "Unknown User",
          metadata: parseActivityMetadata(activity.metadata),
        })),
      };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch system statistics",
      });
    }
  }),

  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userProfile = await (ctx.db as any)
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          emailVerified: users.emailVerified,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, ctx.session.user.id))
        .limit(1);

      if (userProfile.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }

      return userProfile[0]!;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user profile",
      });
    }
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(255, "Name too long"),
        email: z
          .string()
          .email("Invalid email format")
          .max(255, "Email too long"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existingUser = await (ctx.db as any)
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.email, input.email),
              ne(users.id, ctx.session.user.id),
            ),
          )
          .limit(1);

        // Keep the conflict message explicit for UX, while the DB unique index
        // remains the hard guarantee against duplicates.
        if (existingUser.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email address is already in use by another account",
          });
        }

        const updatedUser = await (ctx.db as any)
          .update(users)
          .set({
            name: input.name,
            email: input.email,
          })
          .where(eq(users.id, ctx.session.user.id))
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

        await (ctx.db as any).insert(userActivities).values({
          userId: ctx.session.user.id,
          activityType: "profile_update",
          metadata: JSON.stringify({
            updatedFields: ["name", "email"],
            newName: input.name,
            newEmail: input.email,
          }),
        });

        return updatedUser[0]!;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }
    }),

  getUserActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const activities = await (ctx.db as any)
          .select({
            id: (userActivities as any).id,
            activityType: (userActivities as any).activityType,
            metadata: (userActivities as any).metadata,
            createdAt: (userActivities as any).createdAt,
          })
          .from(userActivities)
          .where(eq(userActivities.userId, ctx.session.user.id))
          .orderBy(desc(userActivities.createdAt))
          .limit(input.limit);

        return activities.map((activity: any) => ({
          id: String(activity.id),
          type: activity.activityType,
          createdAt: activity.createdAt,
          metadata: parseActivityMetadata(activity.metadata),
        }));
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user activities",
        });
      }
    }),

  recordActivity: protectedProcedure
    .input(
      z.object({
        activityType: z.enum(
          ["login", "dashboard_view", "profile_update", "simulation"],
          {
            message: "Invalid activity type",
          },
        ),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const activity = await (ctx.db as any)
          .insert(userActivities)
          .values({
            userId: ctx.session.user.id,
            activityType: input.activityType,
            metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          })
          .returning({
            id: (userActivities as any).id,
            activityType: (userActivities as any).activityType,
            createdAt: (userActivities as any).createdAt,
          });

        return activity[0]!;
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record activity",
        });
      }
    }),

  getStudentStats: adminProcedure.query(async ({ ctx }) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        totalStudentsResult,
        activeStudentsResult,
        studentsWithSimulationsResult,
        totalSimulationsResult,
      ] = await Promise.all([
        (ctx.db as any)
          .select({ count: count() })
          .from(users)
          .where(eq(users.role, "user")),
        (ctx.db as any)
          .select({
            count: sql<number>`count(distinct ${userActivities.userId})`,
          })
          .from(userActivities)
          .innerJoin(users, eq(userActivities.userId, users.id))
          .where(
            and(
              eq((userActivities as any).activityType, "login"),
              eq(users.role, "user"),
              gte((userActivities as any).createdAt, thirtyDaysAgo),
            ),
          ),
        // We currently only know whether a student produced at least one
        // simulation event, so completionRate is intentionally a coarse proxy.
        (ctx.db as any)
          .select({
            count: sql<number>`count(distinct ${userActivities.userId})`,
          })
          .from(userActivities)
          .innerJoin(users, eq(userActivities.userId, users.id))
          .where(
            and(
              eq((userActivities as any).activityType, "simulation"),
              eq(users.role, "user"),
            ),
          ),
        (ctx.db as any)
          .select({ count: count() })
          .from(userActivities)
          .innerJoin(users, eq(userActivities.userId, users.id))
          .where(
            and(
              eq((userActivities as any).activityType, "simulation"),
              eq(users.role, "user"),
            ),
          ),
      ]);

      const totalStudentsCount = Number(totalStudentsResult[0]?.count ?? 0);
      const studentsWithSimulationsCount = Number(
        studentsWithSimulationsResult[0]?.count ?? 0,
      );
      const completionRate =
        totalStudentsCount > 0
          ? Math.round(
              (studentsWithSimulationsCount / totalStudentsCount) * 100,
            )
          : 0;

      return {
        totalStudents: totalStudentsCount,
        activeStudents: Number(activeStudentsResult[0]?.count ?? 0),
        completionRate: Math.min(completionRate, 100),
        // No persisted scoring model exists yet. Returning null plus a status
        // flag is safer than inventing a synthetic average.
        averageScore: null,
        totalSimulations: Number(totalSimulationsResult[0]?.count ?? 0),
        metricsStatus: "partial",
      };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch student statistics",
      });
    }
  }),

  getStudentEvaluationStats: adminProcedure.query(async () => {
    try {
      return {
        // These fields stay explicitly unavailable until evaluation data is
        // stored in the database and can be derived honestly.
        totalEvaluations: null,
        completedEvaluations: null,
        inProgressEvaluations: null,
        successRate: null,
        status: "not_available",
      };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch student evaluation statistics",
      });
    }
  }),
});
