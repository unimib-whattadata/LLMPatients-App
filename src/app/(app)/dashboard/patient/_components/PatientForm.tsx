"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Button,
  Input,
  Textarea,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Slider,
  Breadcrumb,
} from "~/components/ui";
import { DashboardSection, DashboardPanel } from "~/components/dashboard/ui";

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

const defaultValues: PatientFormValues = {
  name: "",
  smallDescription: "",
  background: "",
  objectives: [""],
  avatarUrl: "",
  difficulty: 1,
  estimatedDuration: 30,
  details: "",
};

interface PatientFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<PatientFormValues>;
  isSubmitting?: boolean;
  isLoading?: boolean;
  onSubmit: (values: PatientSubmitValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  resetAfterSubmit?: boolean;
  onSubmitSuccess?: () => void;
  footerSlot?: React.ReactNode;
  breadcrumbItems?: Array<{
    label: string;
    href?: string;
    isActive?: boolean;
  }>;
}

export function PatientForm({
  mode,
  initialValues,
  isSubmitting = false,
  isLoading = false,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  resetAfterSubmit = false,
  onSubmitSuccess,
  footerSlot,
  breadcrumbItems,
}: PatientFormProps) {
  const [showJsonTemplate, setShowJsonTemplate] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const mergedInitialValues = useMemo(() => {
    const base = { ...defaultValues };
    if (!initialValues) {
      return base;
    }

    const next = {
      ...base,
      ...initialValues,
    } satisfies PatientFormValues;

    next.objectives =
      initialValues.objectives && initialValues.objectives.length > 0
        ? initialValues.objectives
        : [""];

    next.avatarUrl = initialValues.avatarUrl ?? "";

    if (initialValues.details) {
      try {
        const parsed = JSON.parse(initialValues.details);
        next.details = JSON.stringify(parsed, null, 2);
      } catch {
        next.details = initialValues.details;
      }
    }

    return next;
  }, [initialValues]);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: mergedInitialValues,
  });

  useEffect(() => {
    form.reset(mergedInitialValues);
  }, [mergedInitialValues, form]);

  const objectives = form.watch("objectives") ?? [""];

  const handleObjectiveRemove = (index: number) => {
    if (objectives.length <= 1) {
      return;
    }
    const next = objectives.filter((_, i) => i !== index);
    form.setValue("objectives", next.length ? next : [""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleObjectiveAdd = () => {
    form.setValue("objectives", [...objectives, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const jsonTemplate: Record<string, unknown> = {
    demographicAndSocioculturalInformation: {
      age: 28,
      gender: "Male",
      maritalStatus: "Single",
      culturalBackground: "Patient cultural background",
      religiousBeliefs: "Religious beliefs",
      spokenLanguage: "Italian",
      migrationStatus: "Native resident",
      educationLevel: "Bachelor's degree",
      occupation: "Patient profession",
      livingSituation: "Lives alone/with family",
    },
    familySocialHistory: {
      developmentalFamilyDynamics: "Family dynamics during development",
      currentParentRelationships: "Current relationship with parents",
      childhoodExperiences: "Significant childhood experiences",
      abuseHistory: "Abuse history (if any)",
      siblingRelationships: "Relationships with siblings",
      significantRelationships: "Current significant relationships",
    },
    psychologicalProfileAndCognitiveFunctioning: {
      currentAndPastPsychiatricDiagnoses: "Current and past psychiatric diagnoses",
      mainSymptoms: "Main presenting symptoms",
      emotionalReactionsAndMood: "Emotional reactions and mood",
      selfPerceptionAndIdentity: "Self perception and identity",
      copingMechanisms: "Coping mechanisms",
      cognitivePatterns: "Cognitive patterns",
    },
    medicalHistory: {
      chronicConditions: "Chronic medical conditions",
      medications: "Current medications",
      substanceUse: "Substance use",
      sleepPatterns: "Sleep patterns",
      diet: "Diet",
    },
    therapyHistory: {
      previousTherapies: "Previous therapies",
      responseToTreatment: "Response to previous treatments",
      currentMotivation: "Current motivation",
      therapeuticGoals: "Patient therapeutic goals",
    },
  };

  const loadJsonTemplate = () => {
    form.setValue("details", JSON.stringify(jsonTemplate, null, 2), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setShowJsonTemplate(false);
  };

  const computeAgeFromDetails = (details: string) => {
    let age = 30;
    try {
      const detailsObj = JSON.parse(details);
      const extractedAge =
        detailsObj?.demographicAndSocioculturalInformation?.age ||
        detailsObj?.demographic_sociocultural_information?.age;
      if (extractedAge) {
        const parsedAge =
          typeof extractedAge === "number"
            ? extractedAge
            : parseInt(String(extractedAge), 10);
        if (!Number.isNaN(parsedAge) && parsedAge >= 1 && parsedAge <= 120) {
          age = parsedAge;
        }
      }
    } catch (error) {
      // Silent catch
    }
    return age;
  };

  const handleSubmit = async (values: PatientFormValues) => {
    const normalizedObjectives = values.objectives.map((objective) => objective.trim());
    const age = computeAgeFromDetails(values.details);

    try {
      await onSubmit({
        ...values,
        objectives: normalizedObjectives,
        age,
      });

      if (resetAfterSubmit) {
        form.reset(defaultValues);
      }
      setShowJsonTemplate(false);
      onSubmitSuccess?.();
    } catch (error) {
      throw error;
    }
  };

  if (!isMounted || isLoading) {
    return (

      <DashboardSection
        title={mode === "create" ? "Create New Patient" : "Edit Patient"}
        description="Preparing the form, please wait..."
      >
        <DashboardPanel>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg
                className="animate-spin h-8 w-8 mx-auto mb-4 text-primary-green"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-400">Loading form...</p>
            </div>
          </div>
        </DashboardPanel>
      </DashboardSection>
    );

  }

  return (
    <DashboardSection
      title={mode === "create" ? "Create New Patient" : "Edit Patient"}
      description="Provide structured information to manage the clinical simulation."
      headerSlot={breadcrumbItems?.length ? <Breadcrumb items={breadcrumbItems} /> : null}
    >

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <DashboardPanel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="label-required">Patient Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Maria Rossi" {...field} />
                    </FormControl>
                    <FormDescription>{field.value.length}/255 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smallDescription"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="label-required">Short Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Generalized Anxiety Disorder"
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Brief clinical summary ({field.value.length}/500 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="background"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="label-required">Clinical Background</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the clinical background, history, and relevant milestones..."
                      rows={6}
                      maxLength={2000}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Contextual narrative ({field.value.length}/2000 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </DashboardPanel>

          <DashboardPanel>
            <div className="space-y-4">
              {objectives.map((_, index) => (
                <FormField
                  key={`objective-${index}`}
                  control={form.control}
                  name={`objectives.${index}`}
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={`Objective ${index + 1}: e.g. Reduce anxiety symptoms through relaxation techniques`}
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleObjectiveRemove(index)}
                          disabled={objectives.length === 1}
                          className="shrink-0"
                        >
                          Remove
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleObjectiveAdd}
            >
              + Add Objective
            </Button>
          </DashboardPanel>

          <DashboardPanel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="label-required">
                      Difficulty <span className="text-xs text-gray-400">( {field.value}/3 )</span>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={3}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        aria-label="Difficulty level"
                      />
                    </FormControl>
                    <FormDescription>
                      Complexity level: 1=Beginner, 2=Intermediate, 3=Advanced
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedDuration"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="label-required">
                      Estimated Duration (min) <span className="text-xs text-gray-400">( {field.value} min )</span>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={5}
                        max={180}
                        step={5}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        aria-label="Estimated duration in minutes"
                      />
                    </FormControl>
                    <FormDescription>Expected simulation length (5–180 minutes)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-4 border-t border-gray-700">
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>Avatar URL (optional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com/avatar.jpg" {...field} />
                    </FormControl>
                    <FormDescription>Link to the virtual patient avatar image</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <FormLabel className="label-required">JSON Details</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowJsonTemplate(!showJsonTemplate)}
                      >
                        {showJsonTemplate ? "Hide" : "Show"} Template
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={loadJsonTemplate}
                      >
                        Load Template
                      </Button>
                    </div>
                  </div>

                  {showJsonTemplate && (
                    <div className="p-4 bg-gray-800/60 border border-gray-700 rounded-xl mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-text-primary flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-primary-green"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Complete JSON Template
                        </h4>
                        <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">Copy and customise</span>
                      </div>
                      <div className="bg-gray-900/60 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-300 whitespace-pre font-mono">
                          {JSON.stringify(jsonTemplate, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  <FormControl>
                    <Textarea
                      rows={14}
                      className="font-mono text-sm"
                      placeholder='{"demographicAndSocioculturalInformation": {"age": 28, "gender": "Male", ...}}'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </DashboardPanel>

          {footerSlot}

          <DashboardPanel>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-end sm:items-center">
              <Button
                type="submit"
                className="flex-1 sm:flex-initial min-w-[160px] bg-primary-green hover:bg-primary-green/90 text-text-inverse font-semibold"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting
                  ? mode === "create"
                    ? "Creating..."
                    : "Saving..."
                  : submitLabel ?? (mode === "create" ? "Create Patient" : "Save Changes")}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  size="lg"
                  className="flex-1 sm:flex-initial"
                >
                  {cancelLabel ?? "Cancel"}
                </Button>
              )}
            </div>
          </DashboardPanel>
        </form>
      </Form>
    </DashboardSection>
  );
}

