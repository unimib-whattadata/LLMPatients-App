"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form, Breadcrumb } from "~/components/ui";
import { DashboardSection } from "~/components/dashboard/ui";

import {
  PatientBasicInfoSection,
  PatientFormFooter,
  PatientFormLoadingState,
  PatientJsonDetailsSection,
  PatientObjectivesSection,
  PatientSimulationSettingsSection,
} from "./PatientFormSections";
import {
  computeAgeFromPatientDetails,
  patientJsonTemplate,
} from "./patient-form-utils";
import {
  defaultPatientFormValues,
  patientFormSchema,
  type PatientFormValues,
  type PatientSubmitValues,
} from "./patient-form-types";

export type { PatientFormValues, PatientSubmitValues } from "./patient-form-types";

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
    const base = { ...defaultPatientFormValues };
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
  }, [form, mergedInitialValues]);

  const objectives = form.watch("objectives") ?? [""];

  const handleObjectiveRemove = (index: number) => {
    if (objectives.length <= 1) {
      return;
    }

    const nextObjectives = objectives.filter((_, itemIndex) => itemIndex !== index);
    form.setValue("objectives", nextObjectives.length ? nextObjectives : [""], {
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

  const loadJsonTemplate = () => {
    form.setValue("details", JSON.stringify(patientJsonTemplate, null, 2), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setShowJsonTemplate(false);
  };

  const handleSubmit = async (values: PatientFormValues) => {
    const normalizedObjectives = values.objectives.map((objective) =>
      objective.trim(),
    );
    const age = computeAgeFromPatientDetails(values.details);

    await onSubmit({
      ...values,
      objectives: normalizedObjectives,
      age,
    });

    if (resetAfterSubmit) {
      form.reset(defaultPatientFormValues);
    }

    setShowJsonTemplate(false);
    onSubmitSuccess?.();
  };

  if (!isMounted || isLoading) {
    return <PatientFormLoadingState showBreadcrumb={Boolean(breadcrumbItems?.length)} />;
  }

  return (
    <DashboardSection
      title={mode === "create" ? "Create New Patient" : "Edit Patient"}
      description="Provide structured information to manage the clinical simulation."
      headerSlot={
        breadcrumbItems?.length ? <Breadcrumb items={breadcrumbItems} /> : null
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <PatientBasicInfoSection form={form} />
          <PatientObjectivesSection
            form={form}
            objectives={objectives}
            onAddObjective={handleObjectiveAdd}
            onRemoveObjective={handleObjectiveRemove}
          />
          <PatientSimulationSettingsSection form={form} />
          <PatientJsonDetailsSection
            form={form}
            showJsonTemplate={showJsonTemplate}
            onToggleTemplate={() => setShowJsonTemplate((current) => !current)}
            onLoadTemplate={loadJsonTemplate}
          />
          {footerSlot}
          <PatientFormFooter
            mode={mode}
            isSubmitting={isSubmitting}
            submitLabel={submitLabel}
            cancelLabel={cancelLabel}
            onCancel={onCancel}
          />
        </form>
      </Form>
    </DashboardSection>
  );
}
