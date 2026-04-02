"use client";

import { useRouter } from "next/navigation";

import { PatientForm, type PatientFormValues } from "../../_components/PatientForm";
import { useAppToast } from "~/hooks/useAppToast";
import { api } from "~/trpc/react";

export function CreatePatientContent() {
  const router = useRouter();
  const { success, info, error } = useAppToast();

  const createPatientMutation = api.patients.createPatient.useMutation({
    onSuccess: () => {
      success(
        "Patient created successfully",
        "The new clinical case has been added to the system",
      );
      void router.push("/dashboard/patient/index");
    },
    onError: (createError) => {
      error("Failed to create patient", createError.message);
    },
  });

  const handleSubmit = async (values: PatientFormValues & { age: number }) => {
    await createPatientMutation.mutateAsync({
      ...values,
    });
  };

  return (
    <PatientForm
      mode="create"
      onSubmit={handleSubmit}
      isSubmitting={createPatientMutation.isPending}
      resetAfterSubmit={true}
      onSubmitSuccess={() => {
        info("Redirecting to patient list...");
      }}
      breadcrumbItems={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Patients", href: "/dashboard/patient/index" },
        { label: "Create", isActive: true },
      ]}
    />
  );
}
