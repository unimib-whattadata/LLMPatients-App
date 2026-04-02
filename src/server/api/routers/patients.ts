import { and, asc, eq, inArray, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { patients } from "~/server/db/tables";
import { type DifficultyLevel } from "~/lib/constants/difficulty";
import { createLogger } from "~/lib/logger";

const logger = createLogger("Patients");

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logger.warn("JSON parsing failed", {
      error: error instanceof Error ? error.message : String(error),
      rawValue: typeof value === "string" ? value.substring(0, 100) : value,
    });
    return fallback;
  }
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  smallDescription: string;
  details: string;
  background: string;
  objectives: string[];
  avatarUrl?: string | null;
  elevenlabsVoiceId?: string | null;
  vibevoiceVoiceId?: string | null;
  chatterboxVoiceId?: string | null;
  welcomeMessage?: string | null;
  therapeuticJourney: unknown;
  difficulty: DifficultyLevel;
  estimatedDuration: number;
  isActive: boolean;
  externalPatientId?: string | null;
  gender?: string | null;
  diagnosis?: string | null;
  psychologicalProfile?: string | null;
  currentMedications?: string[] | null;
  previousSessions?: number | null;
  createdAt: Date;
  updatedAt: Date | null;
}

type PatientSummaryRow = Pick<
  typeof patients.$inferSelect,
  | "id"
  | "name"
  | "age"
  | "smallDescription"
  | "clinicalCase"
  | "objectives"
  | "avatarUrl"
  | "elevenlabsVoiceId"
  | "vibevoiceVoiceId"
  | "chatterboxVoiceId"
  | "welcomeMessage"
  | "therapeuticJourney"
  | "difficulty"
  | "estimatedDuration"
  | "isActive"
  | "externalPatientId"
  | "createdAt"
  | "updatedAt"
>;

type PatientDetailRow = Pick<
  typeof patients.$inferSelect,
  keyof typeof patients.$inferSelect
>;

type PatientMutationInput = {
  name: string;
  age: number;
  smallDescription: string;
  details: string;
  background: string;
  objectives: string[];
  avatarUrl?: string | null;
  elevenlabsVoiceId?: string | null;
  vibevoiceVoiceId?: string | null;
  chatterboxVoiceId?: string | null;
  welcomeMessage?: string | null;
  therapeuticJourney?: unknown;
  difficulty: number;
  estimatedDuration: number;
  isActive?: boolean;
};

const patientSummarySelection = {
  id: patients.id,
  name: patients.name,
  age: patients.age,
  smallDescription: patients.smallDescription,
  clinicalCase: patients.clinicalCase,
  objectives: patients.objectives,
  avatarUrl: patients.avatarUrl,
  elevenlabsVoiceId: patients.elevenlabsVoiceId,
  vibevoiceVoiceId: patients.vibevoiceVoiceId,
  chatterboxVoiceId: patients.chatterboxVoiceId,
  welcomeMessage: patients.welcomeMessage,
  therapeuticJourney: patients.therapeuticJourney,
  difficulty: patients.difficulty,
  estimatedDuration: patients.estimatedDuration,
  isActive: patients.isActive,
  externalPatientId: patients.externalPatientId,
  createdAt: patients.createdAt,
  updatedAt: patients.updatedAt,
} as const;

const patientDetailSelection = {
  id: patients.id,
  name: patients.name,
  age: patients.age,
  smallDescription: patients.smallDescription,
  details: patients.details,
  clinicalCase: patients.clinicalCase,
  objectives: patients.objectives,
  avatarUrl: patients.avatarUrl,
  elevenlabsVoiceId: patients.elevenlabsVoiceId,
  vibevoiceVoiceId: patients.vibevoiceVoiceId,
  chatterboxVoiceId: patients.chatterboxVoiceId,
  welcomeMessage: patients.welcomeMessage,
  therapeuticJourney: patients.therapeuticJourney,
  difficulty: patients.difficulty,
  estimatedDuration: patients.estimatedDuration,
  isActive: patients.isActive,
  externalPatientId: patients.externalPatientId,
  gender: patients.gender,
  diagnosis: patients.diagnosis,
  psychologicalProfile: patients.psychologicalProfile,
  currentMedications: patients.currentMedications,
  previousSessions: patients.previousSessions,
  createdAt: patients.createdAt,
  updatedAt: patients.updatedAt,
} as const;

function mapPatientSummary(patient: PatientSummaryRow) {
  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    smallDescription: patient.smallDescription,
    background: patient.clinicalCase,
    objectives: safeJsonParse<string[]>(patient.objectives, []),
    avatarUrl: patient.avatarUrl,
    elevenlabsVoiceId: patient.elevenlabsVoiceId,
    vibevoiceVoiceId: patient.vibevoiceVoiceId ?? null,
    chatterboxVoiceId: patient.chatterboxVoiceId ?? null,
    welcomeMessage: patient.welcomeMessage,
    therapeuticJourney: safeJsonParse(patient.therapeuticJourney, {}),
    difficulty: patient.difficulty as DifficultyLevel,
    estimatedDuration: patient.estimatedDuration,
    isActive: patient.isActive,
    externalPatientId: patient.externalPatientId,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

function mapPatientDetail(patient: PatientDetailRow): Patient {
  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    smallDescription: patient.smallDescription,
    details: patient.details,
    background: patient.clinicalCase,
    objectives: safeJsonParse<string[]>(patient.objectives, []),
    avatarUrl: patient.avatarUrl,
    elevenlabsVoiceId: patient.elevenlabsVoiceId,
    vibevoiceVoiceId: patient.vibevoiceVoiceId ?? null,
    chatterboxVoiceId: patient.chatterboxVoiceId ?? null,
    welcomeMessage: patient.welcomeMessage,
    therapeuticJourney: safeJsonParse(patient.therapeuticJourney, {}),
    difficulty: patient.difficulty as DifficultyLevel,
    estimatedDuration: patient.estimatedDuration,
    isActive: patient.isActive,
    externalPatientId: patient.externalPatientId,
    gender: patient.gender ?? null,
    diagnosis: patient.diagnosis ?? null,
    psychologicalProfile: patient.psychologicalProfile ?? null,
    currentMedications: patient.currentMedications
      ? safeJsonParse<string[]>(patient.currentMedications, [])
      : null,
    previousSessions: patient.previousSessions ?? null,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

function serializePatientMutationInput(input: PatientMutationInput) {
  return {
    name: input.name,
    age: input.age,
    smallDescription: input.smallDescription,
    details: input.details,
    clinicalCase: input.background,
    objectives: JSON.stringify(input.objectives),
    avatarUrl: input.avatarUrl ?? null,
    elevenlabsVoiceId: input.elevenlabsVoiceId ?? null,
    vibevoiceVoiceId: input.vibevoiceVoiceId ?? null,
    chatterboxVoiceId: input.chatterboxVoiceId ?? null,
    welcomeMessage: input.welcomeMessage ?? null,
    therapeuticJourney: JSON.stringify(input.therapeuticJourney ?? {}),
    difficulty: input.difficulty,
    estimatedDuration: input.estimatedDuration,
    ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
  };
}

export const patientsRouter = createTRPCRouter({
  getAdminPatients: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          onlyActive: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { search, onlyActive } = input ?? {};
      const filters: Parameters<typeof and>[number][] = [];

      if (onlyActive) {
        filters.push(eq(patients.isActive, true));
      }

      if (search && search.trim().length > 0) {
        filters.push(like(patients.name, `%${search.trim()}%`));
      }

      const baseQuery = (ctx.db as any)
        .select(patientSummarySelection)
        .from(patients);
      const filteredQuery =
        filters.length > 0 ? baseQuery.where(and(...filters)) : baseQuery;

      const rows = await filteredQuery.orderBy(asc(patients.name));
      return rows.map(mapPatientSummary);
    }),

  getAdminPatientById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await (ctx.db as any)
        .select(patientDetailSelection)
        .from(patients)
        .where(eq(patients.id, input.id))
        .limit(1);

      if (result.length === 0) {
        throw new Error("Patient not found");
      }

      const patient = mapPatientDetail(result[0]!);
      return {
        ...patient,
        avatarUrl: patient.avatarUrl ?? undefined,
      };
    }),

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
        whereConditions.push(inArray(patients.difficulty, difficulty));
      }

      if (searchQuery.trim()) {
        whereConditions.push(like(patients.name, `%${searchQuery}%`));
      }

      try {
        logger.debug("Building exploration query", {
          conditions: whereConditions.length,
          difficulty,
          searchQuery: searchQuery || "(none)",
          limit,
          offset,
        });

        const patientsData = await (ctx.db as any)
          .select(patientDetailSelection)
          .from(patients)
          .where(and(...whereConditions))
          .orderBy(asc(patients.difficulty), asc(patients.name))
          .limit(limit)
          .offset(offset);

        logger.debug("Patients retrieved from database", {
          count: patientsData.length,
        });

        const transformedPatients = patientsData.map(mapPatientDetail);

        logger.debug("Patients transformation completed", {
          count: transformedPatients.length,
        });

        return transformedPatients;
      } catch (error) {
        logger.error("Database query failed for exploration patients", {
          error: error instanceof Error ? error.message : String(error),
          difficulty,
          searchQuery: searchQuery || "(none)",
          limit,
          offset,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch exploration patients",
          cause: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }),

  getPatientById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const patientResult = await (ctx.db as any)
        .select(patientDetailSelection)
        .from(patients)
        .where(and(eq(patients.id, input.id), eq(patients.isActive, true)))
        .limit(1);

      if (patientResult.length === 0) {
        throw new Error("Patient not found");
      }

      return mapPatientDetail(patientResult[0]!);
    }),

  createPatient: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        age: z.number().min(1).max(120),
        smallDescription: z.string().min(1).max(500),
        details: z.string().min(1),
        background: z.string().min(1).max(2000),
        objectives: z.array(z.string()),
        avatarUrl: z.string().url().optional(),
        elevenlabsVoiceId: z.string().max(255).optional(),
        vibevoiceVoiceId: z.string().max(255).optional(),
        chatterboxVoiceId: z.string().max(255).optional(),
        welcomeMessage: z.string().max(1000).optional(),
        therapeuticJourney: z.unknown().optional(),
        difficulty: z.number().min(1).max(3),
        estimatedDuration: z.number().min(5).max(180).default(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const insertedPatients = await (ctx.db as any)
        .insert(patients)
        .values(serializePatientMutationInput(input))
        .returning();

      const newPatient = insertedPatients[0];

      return { id: newPatient?.id, success: true };
    }),

  updatePatient: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255),
        age: z.number().min(1).max(120),
        smallDescription: z.string().min(1).max(500),
        details: z.string().min(1),
        background: z.string().min(1).max(2000),
        objectives: z.array(z.string()),
        avatarUrl: z.string().url().optional(),
        elevenlabsVoiceId: z.string().max(255).optional().nullable(),
        vibevoiceVoiceId: z.string().max(255).optional().nullable(),
        chatterboxVoiceId: z.string().max(255).optional().nullable(),
        welcomeMessage: z.string().max(1000).optional().nullable(),
        therapeuticJourney: z.unknown().optional(),
        difficulty: z.number().min(1).max(3),
        estimatedDuration: z.number().min(5).max(180).default(30),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patientInput } = input;

      await ctx.db
        .update(patients)
        .set({
          ...serializePatientMutationInput(patientInput),
          updatedAt: new Date(),
        })
        .where(eq(patients.id, id));

      return { success: true };
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
