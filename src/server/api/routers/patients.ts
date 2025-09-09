import { z } from "zod";
import { eq, asc, desc, and, like } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  virtualPatients,
  patientTags,
  patientTagRelations,
} from "~/server/db/schema";

/**
 * Virtual Patient type for TypeScript
 */
export interface VirtualPatient {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  condition: string;
  background: string;
  objectives: string[];
  avatarUrl?: string | null;
  avatarType: "photo" | "illustration" | "avatar";
  difficulty: "Facile" | "Medio" | "Difficile";
  estimatedDuration: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  tags: Array<{
    id: string;
    label: string;
    category: string;
    color: string;
  }>;
}

/**
 * Patient Tag type for TypeScript
 */
export interface PatientTag {
  id: string;
  label: string;
  category: "psychological" | "physical" | "behavioral";
  color: string;
  createdAt: Date;
}

/**
 * Patients Router
 * Handles all patient exploration and management endpoints
 */
export const patientsRouter = createTRPCRouter({
  /**
   * Get all active virtual patients for exploration page
   * Public endpoint - no authentication required
   */
  getExplorationPatients: publicProcedure
    .input(
      z.object({
        difficulty: z.array(z.enum(["Facile", "Medio", "Difficile"])).optional(),
        tags: z.array(z.string()).optional(),
        searchQuery: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { 
        difficulty = [], 
        tags = [], 
        searchQuery = "", 
        limit = 20, 
        offset = 0 
      } = input ?? {};

      // Build where conditions
      const whereConditions = [eq(virtualPatients.isActive, true)];

      if (difficulty.length > 0) {
        whereConditions.push(
          // Use IN operator for multiple difficulty values
          eq(virtualPatients.difficulty, difficulty[0]!) // Simplified for now
        );
      }

      if (searchQuery.trim()) {
        whereConditions.push(
          like(virtualPatients.name, `%${searchQuery}%`)
        );
      }

      // Get patients with their tag relationships
      const patients = await ctx.db.query.virtualPatients.findMany({
        where: and(...whereConditions),
        with: {
          tagRelations: {
            with: {
              tag: true,
            },
          },
        },
        orderBy: [asc(virtualPatients.difficulty), asc(virtualPatients.name)],
        limit,
        offset,
      });

      // Transform the data to include tags array and parse objectives
      const transformedPatients: VirtualPatient[] = patients.map((patient) => ({
        id: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender as "male" | "female" | "other",
        condition: patient.condition,
        background: patient.background,
        objectives: JSON.parse(patient.objectives) as string[],
        avatarUrl: patient.avatarUrl,
        avatarType: patient.avatarType as "photo" | "illustration" | "avatar",
        difficulty: patient.difficulty as "Facile" | "Medio" | "Difficile",
        estimatedDuration: patient.estimatedDuration,
        isActive: patient.isActive,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        tags: patient.tagRelations.map((relation) => ({
          id: relation.tag.id,
          label: relation.tag.label,
          category: relation.tag.category,
          color: relation.tag.color,
        })),
      }));

      return transformedPatients;
    }),

  /**
   * Get a specific virtual patient by ID
   * Public endpoint - no authentication required
   */
  getPatientById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const patient = await ctx.db.query.virtualPatients.findFirst({
        where: and(
          eq(virtualPatients.id, input.id),
          eq(virtualPatients.isActive, true)
        ),
        with: {
          tagRelations: {
            with: {
              tag: true,
            },
          },
        },
      });

      if (!patient) {
        throw new Error("Patient not found");
      }

      // Transform the data to include tags array and parse objectives
      const transformedPatient: VirtualPatient = {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender as "male" | "female" | "other",
        condition: patient.condition,
        background: patient.background,
        objectives: JSON.parse(patient.objectives) as string[],
        avatarUrl: patient.avatarUrl,
        avatarType: patient.avatarType as "photo" | "illustration" | "avatar",
        difficulty: patient.difficulty as "Facile" | "Medio" | "Difficile",
        estimatedDuration: patient.estimatedDuration,
        isActive: patient.isActive,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        tags: patient.tagRelations.map((relation) => ({
          id: relation.tag.id,
          label: relation.tag.label,
          category: relation.tag.category,
          color: relation.tag.color,
        })),
      };

      return transformedPatient;
    }),

  /**
   * Get all available patient tags
   * Public endpoint - for filtering and display purposes
   */
  getPatientTags: publicProcedure.query(async ({ ctx }) => {
    const tags = await ctx.db.query.patientTags.findMany({
      orderBy: [asc(patientTags.category), asc(patientTags.label)],
    });

    return tags.map((tag): PatientTag => ({
      id: tag.id,
      label: tag.label,
      category: tag.category as "psychological" | "physical" | "behavioral",
      color: tag.color,
      createdAt: tag.createdAt,
    }));
  }),

  /**
   * Create a new virtual patient
   * Protected endpoint - admin only
   */
  createPatient: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        age: z.number().min(1).max(120),
        gender: z.enum(["male", "female", "other"]),
        condition: z.string().min(1).max(500),
        background: z.string().min(1).max(2000),
        objectives: z.array(z.string()),
        avatarUrl: z.string().url().optional(),
        avatarType: z.enum(["photo", "illustration", "avatar"]).default("illustration"),
        difficulty: z.enum(["Facile", "Medio", "Difficile"]),
        estimatedDuration: z.number().min(5).max(180).default(30),
        tagIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      // Create the patient
      const [newPatient] = await ctx.db
        .insert(virtualPatients)
        .values({
          name: input.name,
          age: input.age,
          gender: input.gender,
          condition: input.condition,
          background: input.background,
          objectives: JSON.stringify(input.objectives),
          avatarUrl: input.avatarUrl,
          avatarType: input.avatarType,
          difficulty: input.difficulty,
          estimatedDuration: input.estimatedDuration,
        })
        .returning();

      // Add tag relationships if provided
      if (input.tagIds && input.tagIds.length > 0 && newPatient) {
        const tagRelationValues = input.tagIds.map((tagId) => ({
          patientId: newPatient.id,
          tagId,
        }));

        await ctx.db.insert(patientTagRelations).values(tagRelationValues);
      }

      return { id: newPatient?.id, success: true };
    }),

  /**
   * Create a new patient tag
   * Protected endpoint - admin only
   */
  createTag: protectedProcedure
    .input(
      z.object({
        label: z.string().min(1).max(100),
        category: z.enum(["psychological", "physical", "behavioral"]),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#gray"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const [newTag] = await ctx.db
        .insert(patientTags)
        .values({
          label: input.label,
          category: input.category,
          color: input.color,
        })
        .returning();

      return { id: newTag?.id, success: true };
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      await ctx.db
        .update(virtualPatients)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(virtualPatients.id, input.id));

      return { success: true };
    }),
});