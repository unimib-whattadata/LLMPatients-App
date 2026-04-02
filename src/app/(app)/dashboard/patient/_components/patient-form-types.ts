import { z } from "zod";

const objectiveSchema = z
  .string()
  .trim()
  .min(1, "Objective cannot be empty");

const detailsSchema = z
  .string()
  .min(1, "JSON details are required")
  .superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Details must be a valid JSON object",
        });
        return;
      }

      const parsedKeys = Object.keys(parsed as Record<string, unknown>);
      if (parsedKeys.length <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "JSON must contain at least one key",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Details are not valid JSON",
      });
    }
  });

export const patientFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Patient name is required")
    .max(255, "Maximum 255 characters"),
  smallDescription: z
    .string()
    .trim()
    .min(1, "Short description is required")
    .max(500, "Maximum 500 characters"),
  background: z
    .string()
    .trim()
    .min(1, "Clinical background is required")
    .max(2000, "Maximum 2000 characters"),
  objectives: z
    .array(objectiveSchema)
    .min(1, "At least one therapeutic objective is required"),
  avatarUrl: z.string().trim().optional().or(z.literal("")),
  difficulty: z
    .number()
    .min(1, "Difficulty must be at least 1")
    .max(3, "Difficulty cannot exceed 3"),
  estimatedDuration: z
    .number()
    .min(5, "Minimum duration is 5 minutes")
    .max(180, "Maximum duration is 180 minutes"),
  details: detailsSchema,
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export interface PatientSubmitValues extends PatientFormValues {
  age: number;
}

export const defaultPatientFormValues: PatientFormValues = {
  name: "",
  smallDescription: "",
  background: "",
  objectives: [""],
  avatarUrl: "",
  difficulty: 1,
  estimatedDuration: 30,
  details: "",
};
