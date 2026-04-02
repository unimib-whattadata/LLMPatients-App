"use client";

import type { UseFormReturn } from "react-hook-form";

import {
  Button,
  Input,
  Textarea,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Slider,
  Skeleton,
} from "~/components/ui";
import { DashboardPanel, DashboardSection } from "~/components/dashboard/ui";

import { patientJsonTemplate } from "./patient-form-utils";
import type { PatientFormValues } from "./patient-form-types";

interface PatientFormLoadingStateProps {
  showBreadcrumb: boolean;
}

export function PatientFormLoadingState({
  showBreadcrumb,
}: PatientFormLoadingStateProps) {
  return (
    <DashboardSection
      title={<Skeleton variant="heading" className="h-8 w-64" />}
      description={<Skeleton variant="text" className="h-4 w-full max-w-md" />}
      headerSlot={
        showBreadcrumb ? <Skeleton variant="text" className="h-4 w-52" /> : null
      }
    >
      <DashboardPanel className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton variant="text" className="h-4 w-28" />
              <Skeleton variant="text" className="h-10 w-full" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton variant="text" className="h-4 w-40" />
          <Skeleton variant="text" className="h-24 w-full" />
        </div>

        <div className="space-y-3">
          <Skeleton variant="text" className="h-4 w-44" />
          <Skeleton variant="text" className="h-64 w-full" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Skeleton variant="button" className="h-10 w-24" />
          <Skeleton variant="button" className="h-10 w-36" />
        </div>
      </DashboardPanel>
    </DashboardSection>
  );
}

interface PatientBasicInfoSectionProps {
  form: UseFormReturn<PatientFormValues>;
}

export function PatientBasicInfoSection({
  form,
}: PatientBasicInfoSectionProps) {
  return (
    <DashboardPanel>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
  );
}

interface PatientObjectivesSectionProps {
  form: UseFormReturn<PatientFormValues>;
  objectives: string[];
  onAddObjective: () => void;
  onRemoveObjective: (index: number) => void;
}

export function PatientObjectivesSection({
  form,
  objectives,
  onAddObjective,
  onRemoveObjective,
}: PatientObjectivesSectionProps) {
  return (
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
                    onClick={() => onRemoveObjective(index)}
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
        onClick={onAddObjective}
      >
        + Add Objective
      </Button>
    </DashboardPanel>
  );
}

interface PatientSimulationSettingsSectionProps {
  form: UseFormReturn<PatientFormValues>;
}

export function PatientSimulationSettingsSection({
  form,
}: PatientSimulationSettingsSectionProps) {
  return (
    <DashboardPanel>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
              <FormDescription>
                Expected simulation length (5–180 minutes)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="border-t border-gray-700 pt-4">
        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <FormLabel>Avatar URL (optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Link to the virtual patient avatar image
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </DashboardPanel>
  );
}

interface PatientJsonDetailsSectionProps {
  form: UseFormReturn<PatientFormValues>;
  showJsonTemplate: boolean;
  onToggleTemplate: () => void;
  onLoadTemplate: () => void;
}

export function PatientJsonDetailsSection({
  form,
  showJsonTemplate,
  onToggleTemplate,
  onLoadTemplate,
}: PatientJsonDetailsSectionProps) {
  return (
    <DashboardPanel>
      <FormField
        control={form.control}
        name="details"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <div className="mb-4 flex items-center justify-between">
              <FormLabel className="label-required">JSON Details</FormLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onToggleTemplate}
                >
                  {showJsonTemplate ? "Hide" : "Show"} Template
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onLoadTemplate}
                >
                  Load Template
                </Button>
              </div>
            </div>

            {showJsonTemplate && (
              <div className="mb-4 rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 font-medium text-text-primary">
                    <svg
                      className="h-4 w-4 text-primary-green"
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
                  <span className="rounded bg-gray-700/50 px-2 py-1 text-xs text-gray-400">
                    Copy and customise
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg bg-gray-900/60 p-4">
                  <pre className="whitespace-pre font-mono text-xs text-gray-300">
                    {JSON.stringify(patientJsonTemplate, null, 2)}
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
  );
}

interface PatientFormFooterProps {
  mode: "create" | "edit";
  isSubmitting: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
}

export function PatientFormFooter({
  mode,
  isSubmitting,
  submitLabel,
  cancelLabel,
  onCancel,
}: PatientFormFooterProps) {
  return (
    <DashboardPanel>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="submit"
          className="min-w-[160px] flex-1 bg-primary-green font-semibold text-text-inverse hover:bg-primary-green/90 sm:flex-initial"
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
  );
}
