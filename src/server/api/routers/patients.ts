import { z } from "zod";
import { eq, asc, and, like } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { patients } from "~/server/db/tables";
import { type DifficultyLevel } from "~/lib/constants/difficulty";

export interface Patient {
  id: string;
  name: string;
  smallDescription: string; 
  details: string; 
  background: string;
  objectives: string[];
  avatarUrl?: string | null;
  avatarType: "photo" | "illustration" | "avatar";
  difficulty: DifficultyLevel;
  estimatedDuration: number;
  isActive: boolean;
  externalPatientId?: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export const patientsRouter = createTRPCRouter({
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

      
      const whereConditions = [eq(patients.isActive, true)];

      if (difficulty.length > 0) {
        whereConditions.push(
          
          eq(patients.difficulty, difficulty[0]!), 
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
            externalPatientId: patient.externalPatientId,
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
        
        console.error("Database query failed in getExplorationPatients:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          input: { difficulty, searchQuery, limit, offset },
          environment: process.env.NODE_ENV,
          databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT_SET",
        });

        
        
        if (process.env.NODE_ENV === "production") {
          console.warn("Returning empty patients array due to database error");
          return [];
        }

        
        throw new Error(
          `Failed to fetch patients: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),

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
        externalPatientId: patient.externalPatientId,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      };

      return transformedPatient;
    }),

    createPatient: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        smallDescription: z.string().min(1).max(500),
        details: z.string().min(1), 
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
      
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      
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

    updatePatientStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      
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
