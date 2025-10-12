"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PatientForm, type PatientFormValues } from "../../_components/PatientForm";
import { api } from "~/trpc/react";

export function CreatePatientContent() {
  const router = useRouter();

  const createPatientMutation = api.patients.createPatient.useMutation({
    onSuccess: () => {
      toast.success("Patient created successfully", {
        description: "The new clinical case has been added to the system",
      });
      void router.push("/dashboard/patient/index");
    },
    onError: (error) => {
      toast.error("Failed to create patient", {
        description: error.message,
      });
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
        toast.info("Redirecting to patient list...");
      }}
      breadcrumbItems={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Patients", href: "/dashboard/patient/index" },
        { label: "Create", isActive: true },
      ]}
    />
  );
}

