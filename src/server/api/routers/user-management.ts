/**
 * User Management tRPC Router
 * 
 * Provides API endpoints for admin user management operations including:
 * - List all users with pagination
 * - Create new users 
 * - Update user roles and profiles
 * - Delete users
 * - User activity tracking
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { users, accounts } from "~/server/db/schema";
import { eq, desc, asc, and, or, like, count } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const userManagementRouter = createTRPCRouter({
  /**
   * Get all users with optional filtering and pagination
   * Admin only endpoint
   */
  getAllUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        role: z.enum(["admin", "user"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset, search, role } = input;

      // Build where conditions
      const conditions = [];
      
      if (search) {
        conditions.push(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        );
      }
      
      if (role) {
        conditions.push(eq(users.role, role));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const userList = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          // // createdAt: users.createdAt,
          // // updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(asc(users.name)) // Changed from desc(users.createdAt)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCount = await ctx.db
        .select({ count: users.id })
        .from(users)
        .where(whereClause);

      return {
        users: userList,
        totalCount: totalCount.length,
        hasMore: totalCount.length > offset + limit,
      };
    }),

  /**
   * Create a new user
   * Admin only endpoint
   */
  createUser: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(["admin", "user"]).default("user"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, email, password, role } = input;

      // Check if user with email already exists
      const existingUser = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const newUser = await ctx.db
        .insert(users)
        .values({
          name,
          email,
          role,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          // createdAt: users.createdAt,
        });

      // Create account for credentials provider
      /* await ctx.db.insert(accounts).values({
        userId: newUser[0]!.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: newUser[0]!.id,
        // Note: In a real app, you'd want to handle password storage differently
        access_token: hashedPassword, // Temporary storage - should use proper auth system
      }); */

      return newUser[0];
    }),

  /**
   * Update user role
   * Admin only endpoint
   */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "user"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, role } = input;

      // Prevent users from changing their own role
      if (userId === ctx.session.user.id) {
        throw new Error("Cannot change your own role");
      }

      // Update user role
      const updatedUser = await ctx.db
        .update(users)
        .set({ 
          role,
          // updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          // updatedAt: users.updatedAt,
        });

      if (updatedUser.length === 0) {
        throw new Error("User not found");
      }

      return updatedUser[0];
    }),

  /**
   * Update user profile
   * Admin only endpoint for managing other users
   */
  updateUserProfile: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const { userId, name, email } = input;

      // Check if email is already taken by another user
      const existingUser = await ctx.db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.id, userId)))
        .limit(1);

      if (existingUser.length === 0) {
        // Check if email is taken by someone else
        const emailTaken = await ctx.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (emailTaken.length > 0) {
          throw new Error("Email is already taken by another user");
        }
      }

      // Update user profile
      const updatedUser = await ctx.db
        .update(users)
        .set({ 
          name,
          email,
          // updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          // updatedAt: users.updatedAt,
        });

      if (updatedUser.length === 0) {
        throw new Error("User not found");
      }

      return updatedUser[0];
    }),

  /**
   * Delete user
   * Admin only endpoint
   */
  deleteUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const { userId } = input;

      // Prevent users from deleting themselves
      if (userId === ctx.session.user.id) {
        throw new Error("Cannot delete your own account");
      }

      // Delete user accounts first (foreign key constraint)
      await ctx.db.delete(accounts).where(eq(accounts.userId, userId));

      // Delete user
      const deletedUser = await ctx.db
        .delete(users)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
        });

      if (deletedUser.length === 0) {
        throw new Error("User not found");
      }

      return { success: true, deletedUser: deletedUser[0] };
    }),

  /**
   * Get user details by ID
   * Admin only endpoint
   */
  getUserById: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const { userId } = input;

      const user = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          // createdAt: users.createdAt,
          // updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error("User not found");
      }

      return user[0];
    }),

  /**
   * Get user statistics
   * Admin only endpoint
   */
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is admin
    if (ctx.session.user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get total users count
    const totalUsersResult = await ctx.db
      .select({ count: count() })
      .from(users);
    
    // Get admin users count
    const adminUsersResult = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "admin"));
    
    // Get regular users count
    const regularUsersResult = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "user"));

    return {
      totalUsers: totalUsersResult[0]?.count ?? 0,
      adminUsers: adminUsersResult[0]?.count ?? 0,
      regularUsers: regularUsersResult[0]?.count ?? 0,
    };
  }),

  /**
   * Public endpoint for development access
   * Only works in development with special key
   */
  getPublicUserList: publicProcedure
    .input(
      z.object({
        specialKey: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Only allow in development with special key
      if (process.env.NODE_ENV !== "development" || input.specialKey !== "DavideIsTesting") {
        throw new Error("Unauthorized: Development access only");
      }

      const userList = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          // createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(asc(users.name)) // Changed from desc(users.createdAt)
        .limit(input.limit);

      return userList;
    }),

  /**
   * Public endpoint for creating users in development
   * Only works in development with special key
   */
  createPublicUser: publicProcedure
    .input(
      z.object({
        specialKey: z.string(),
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["admin", "user"]).default("user"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow in development with special key
      if (process.env.NODE_ENV !== "development" || input.specialKey !== "DavideIsTesting") {
        throw new Error("Unauthorized: Development access only");
      }

      const { name, email, password, role } = input;

      // Check if user exists
      const existingUser = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const newUser = await ctx.db
        .insert(users)
        .values({
          name,
          email,
          role,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          // createdAt: users.createdAt,
        });

      return newUser[0];
    }),
});