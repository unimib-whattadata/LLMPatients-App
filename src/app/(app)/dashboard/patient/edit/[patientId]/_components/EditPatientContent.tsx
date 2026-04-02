"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PatientForm, type PatientFormValues } from "../../../_components/PatientForm";
import { useAppToast } from "~/hooks/useAppToast";
import { api } from "~/trpc/react";

interface EditPatientContentProps {
  patientId: string;
}

export function EditPatientContent({ patientId }: EditPatientContentProps) {
  const router = useRouter();
  const { success, error: showError } = useAppToast();

  const utils = api.useUtils();

  const {
    data: patient,
    isLoading,
    error,
  } = api.patients.getAdminPatientById.useQuery({ id: patientId });

  const updateMutation = api.patients.updatePatient.useMutation({
    onSuccess: async () => {
      success("Patient updated", "Changes have been saved successfully");
      await utils.patients.getAdminPatients.invalidate();
      await utils.patients.getAdminPatientById.invalidate({ id: patientId });
      router.push(`/dashboard/patient/show/${patientId}`);
    },
    onError: (mutationError) => {
      showError("Failed to update patient", mutationError.message);
    },
  });

  useEffect(() => {
    if (error) {
      showError("Unable to load patient", error.message);
    }
  }, [error, showError]);

  const handleSubmit = async (values: PatientFormValues & { age: number }) => {
    if (!patient) {
      throw new Error("Cannot update patient before data is loaded");
    }

    await updateMutation.mutateAsync({
      id: patientId,
      name: values.name,
      age: values.age,
      smallDescription: values.smallDescription,
      details: values.details,
      background: values.background,
      objectives: values.objectives,
      avatarUrl: values.avatarUrl?.trim() ? values.avatarUrl : undefined,
      difficulty: values.difficulty,
      estimatedDuration: values.estimatedDuration,
      therapeuticJourney: patient.therapeuticJourney,
      elevenlabsVoiceId: patient.elevenlabsVoiceId ?? undefined,
      vibevoiceVoiceId: patient.vibevoiceVoiceId ?? undefined,
      welcomeMessage: patient.welcomeMessage ?? undefined,
      isActive: patient.isActive,
    });
  };

  return (
    <PatientForm
      mode="edit"
      initialValues={patient}
      isLoading={isLoading}
      isSubmitting={updateMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={() => router.push(`/dashboard/patient/show/${patientId}`)}
      submitLabel="Save patient"
      cancelLabel="Discard"
      breadcrumbItems={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Patients", href: "/dashboard/patient/index" },
        { label: patient?.name ?? "Patient", isActive: true },
      ]}
    />
  );
}
