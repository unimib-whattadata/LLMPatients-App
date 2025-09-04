/**
 * Dashboard tRPC Router
 * 
 * Provides API endpoints for dashboard functionality including:
 * - Admin procedures: user management, system statistics
 * - User procedures: profile management, activity tracking
 * - Role-based access control for different dashboard features
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { z } from "zod";
import { eq, desc, count, and, gte, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { users, userActivities } from "~/server/db/schema";

/**
 * Admin-only procedure middleware
 * Ensures only users with 'admin' role can access admin procedures
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "Admin access required to perform this action" 
    });
  }
  return next({ ctx });
});

/**
 * Dashboard router with role-based procedures
 */
export const dashboardRouter = createTRPCRouter({
  
  // ==================== ADMIN PROCEDURES ====================
  
  /**
   * Get all users (admin only)
   * Returns list of all users excluding passwords for security
   */
  getAllUsers: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const allUsers = await ctx.db
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
        
        return allUsers;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch users",
        });
      }
    }),

  /**
   * Update user role (admin only)
   * Allows admin to change user roles between 'admin' and 'user'
   */
  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.string().min(1, "User ID is required"),
      role: z.enum(["admin", "user"], {
        errorMap: () => ({ message: "Role must be either 'admin' or 'user'" }),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Prevent admin from demoting themselves
        if (input.userId === ctx.session.user.id && input.role === "user") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot remove your own admin privileges",
          });
        }

        const updatedUser = await ctx.db
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

        // Log admin activity
        await ctx.db.insert(userActivities).values({
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
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user role",
        });
      }
    }),

  /**
   * Get system statistics (admin only)
   * Returns dashboard metrics for admin overview
   */
  getSystemStats: adminProcedure
    .query(async ({ ctx }) => {
      try {
        // Calculate date 30 days ago for active users metric
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get total users count
        const totalUsersResult = await ctx.db
          .select({ count: count() })
          .from(users);
        
        // Get active users (users with login activity in last 30 days)
        const activeUsersQuery = await ctx.db
          .select({ userId: userActivities.userId })
          .from(userActivities)
          .where(
            and(
              eq(userActivities.activityType, "login"),
              gte(userActivities.createdAt, thirtyDaysAgo)
            )
          )
          .groupBy(userActivities.userId);

        // Get admin users count
        const adminUsersResult = await ctx.db
          .select({ count: count() })
          .from(users)
          .where(eq(users.role, "admin"));

        // Get recent activities (last 10)
        const recentActivities = await ctx.db
          .select({
            id: userActivities.id,
            activityType: userActivities.activityType,
            metadata: userActivities.metadata,
            createdAt: userActivities.createdAt,
            userName: users.name,
          })
          .from(userActivities)
          .leftJoin(users, eq(userActivities.userId, users.id))
          .orderBy(desc(userActivities.createdAt))
          .limit(10);

        return {
          totalUsers: totalUsersResult[0]?.count ?? 0,
          activeUsers: activeUsersQuery.length,
          adminUsers: adminUsersResult[0]?.count ?? 0,
          recentActivities: recentActivities.map(activity => ({
            id: activity.id,
            type: activity.activityType,
            createdAt: activity.createdAt,
            userName: activity.userName ?? "Unknown User",
            metadata: activity.metadata ? JSON.parse(activity.metadata) as Record<string, unknown> : null,
          })),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch system statistics",
        });
      }
    }),

  // ==================== USER PROCEDURES ====================

  /**
   * Get current user profile
   * Returns profile information for the authenticated user
   */
  getUserProfile: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userProfile = await ctx.db
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
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user profile",
        });
      }
    }),

  /**
   * Update user profile
   * Allows users to update their own profile information
   */
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required").max(255, "Name too long"),
      email: z.string().email("Invalid email format").max(255, "Email too long"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if email is already taken by another user
        const existingUser = await ctx.db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.email, input.email),
              ne(users.id, ctx.session.user.id)
            )
          )
          .limit(1);

        // If email exists and belongs to different user, reject
        if (existingUser.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email address is already in use by another account",
          });
        }

        const updatedUser = await ctx.db
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

        // Log profile update activity
        await ctx.db.insert(userActivities).values({
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
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }
    }),

  /**
   * Get user activity history
   * Returns recent activities for the authenticated user
   */
  getUserActivity: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const activities = await ctx.db
          .select({
            id: userActivities.id,
            activityType: userActivities.activityType,
            metadata: userActivities.metadata,
            createdAt: userActivities.createdAt,
          })
          .from(userActivities)
          .where(eq(userActivities.userId, ctx.session.user.id))
          .orderBy(desc(userActivities.createdAt))
          .limit(input.limit);

        return activities.map(activity => ({
          id: activity.id,
          type: activity.activityType,
          createdAt: activity.createdAt,
          metadata: activity.metadata ? JSON.parse(activity.metadata) as Record<string, unknown> : null,
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user activities",
        });
      }
    }),

  /**
   * Record user activity
   * Allows recording of user actions for tracking purposes
   */
  recordActivity: protectedProcedure
    .input(z.object({
      activityType: z.enum(["login", "dashboard_view", "profile_update", "simulation"], {
        errorMap: () => ({ message: "Invalid activity type" }),
      }),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const activity = await ctx.db
          .insert(userActivities)
          .values({
            userId: ctx.session.user.id,
            activityType: input.activityType,
            metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          })
          .returning({
            id: userActivities.id,
            activityType: userActivities.activityType,
            createdAt: userActivities.createdAt,
          });

        return activity[0]!;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record activity",
        });
      }
    }),
});