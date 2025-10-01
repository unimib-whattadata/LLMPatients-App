import { z } from "zod";
import { eq, asc, and, like } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { patients } from "~/server/db/tables";
import { type DifficultyLevel } from "~/lib/constants/difficulty";

/**
 * Patient interface representing a virtual patient in the system
 *
 * Contains all necessary information for patient exploration and therapy sessions.
 * Includes demographic data, psychological profile, difficulty level, and metadata.
 */
export interface Patient {
  id: string;
  name: string;
  smallDescription: string; // Brief description of the case
  details: string; // JSON string containing all patient details
  background: string;
  objectives: string[];
  avatarUrl?: string | null;
  avatarType: "photo" | "illustration" | "avatar";
  difficulty: DifficultyLevel;
  estimatedDuration: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

/**
 * Patients Router
 *
 * Handles all patient exploration and management endpoints.
 * Provides functionality for browsing, filtering, and retrieving patient information.
 */
export const patientsRouter = createTRPCRouter({
  /**
   * Get all active virtual patients for exploration page
   *
   * Public endpoint that returns paginated list of patients with optional filtering.
   * Supports filtering by difficulty level, tags, and search queries.
   *
   * @param input - Optional filtering and pagination parameters
   * @returns Array of patient objects with associated tags
   */
  getExplorationPatients: publicProcedure
    .input(
      z
        .object({
          difficulty: z.array(z.number().min(1).max(3)).optional(),
          searchQuery: z.string().optional(),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const {
        difficulty = [],
        searchQuery = "",
        limit = 20,
        offset = 0,
      } = input ?? {};

      // Build where conditions
      const whereConditions = [eq(patients.isActive, true)];

      if (difficulty.length > 0) {
        whereConditions.push(
          // Use IN operator for multiple difficulty values
          eq(patients.difficulty, difficulty[0]!), // Simplified for now
        );
      }

      if (searchQuery.trim()) {
        whereConditions.push(like(patients.name, `%${searchQuery}%`));
      }

      try {
        console.log(
          "getExplorationPatients: Building query with conditions:",
          whereConditions,
        );
        console.log("getExplorationPatients: Input params:", {
          difficulty,
          searchQuery,
          limit,
          offset,
        });

        // Get patients with error handling
        const patientsData = await ctx.db
          .select()
          .from(patients)
          .where(and(...whereConditions))
          .orderBy(asc(patients.difficulty), asc(patients.name))
          .limit(limit)
          .offset(offset);

        console.log(
          "getExplorationPatients: Raw patients data from DB:",
          patientsData,
        );
        console.log(
          "getExplorationPatients: Number of patients found:",
          patientsData.length,
        );

        // Transform the data and parse objectives
        const transformedPatients: Patient[] = patientsData.map(
          (patient: typeof patients.$inferSelect) => ({
            id: patient.id,
            name: patient.name,
            smallDescription: patient.smallDescription,
            details: patient.details,
            background: patient.background,
            objectives: JSON.parse(patient.objectives) as string[],
            avatarUrl: patient.avatarUrl,
            avatarType: patient.avatarType as
              | "photo"
              | "illustration"
              | "avatar",
            difficulty: patient.difficulty as DifficultyLevel,
            estimatedDuration: patient.estimatedDuration,
            isActive: patient.isActive,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt,
          }),
        );

        console.log(
          "getExplorationPatients: Transformed patients:",
          transformedPatients.length,
        );

        return transformedPatients;
      } catch (error) {
        // Log detailed error information for debugging
        console.error("Database query failed in getExplorationPatients:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          input: { difficulty, searchQuery, limit, offset },
          environment: process.env.NODE_ENV,
          databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT_SET",
        });

        // In production, return empty array instead of throwing error
        // This prevents the entire page from crashing
        if (process.env.NODE_ENV === "production") {
          console.warn("Returning empty patients array due to database error");
          return [];
        }

        // Re-throw with more context in development
        throw new Error(
          `Failed to fetch patients: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),

  /**
   * Get a specific virtual patient by ID
   * Public endpoint - no authentication required
   */
  getPatientById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const patientResult = await ctx.db
        .select()
        .from(patients)
        .where(and(eq(patients.id, input.id), eq(patients.isActive, true)))
        .limit(1);

      if (patientResult.length === 0) {
        throw new Error("Patient not found");
      }

      const patient = patientResult[0]!;

      // Transform the data and parse objectives
      const transformedPatient: Patient = {
        id: patient.id,
        name: patient.name,
        smallDescription: patient.smallDescription,
        details: patient.details,
        background: patient.background,
        objectives: JSON.parse(patient.objectives) as string[],
        avatarUrl: patient.avatarUrl,
        avatarType: patient.avatarType as "photo" | "illustration" | "avatar",
        difficulty: patient.difficulty as DifficultyLevel,
        estimatedDuration: patient.estimatedDuration,
        isActive: patient.isActive,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      };

      return transformedPatient;
    }),

  /**
   * Create a new virtual patient
   *
   * Protected endpoint for admin users to create new virtual patients.
   * Validates input data and creates patient with associated tags.
   *
   * @param input - Patient creation data including name, description, details, etc.
   * @returns Created patient object
   */
  createPatient: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        smallDescription: z.string().min(1).max(500),
        details: z.string().min(1), // JSON string containing all patient details
        background: z.string().min(1).max(2000),
        objectives: z.array(z.string()),
        avatarUrl: z.string().url().optional(),
        avatarType: z
          .enum(["photo", "illustration", "avatar"])
          .default("illustration"),
        difficulty: z.number().min(1).max(3),
        estimatedDuration: z.number().min(5).max(180).default(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      // Create the patient
      const [newPatient] = await ctx.db
        .insert(patients)
        .values({
          name: input.name,
          smallDescription: input.smallDescription,
          details: input.details,
          background: input.background,
          objectives: JSON.stringify(input.objectives),
          avatarUrl: input.avatarUrl,
          avatarType: input.avatarType,
          difficulty: input.difficulty,
          estimatedDuration: input.estimatedDuration,
        })
        .returning();

      return { id: newPatient?.id, success: true };
    }),

  /**
   * Update patient status (activate/deactivate)
   * Protected endpoint - admin only
   */
  updatePatientStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      await ctx.db
        .update(patients)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, input.id));

      return { success: true };
    }),
});
