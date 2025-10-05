"use client";

import { api } from "~/trpc/react";
import { PatientGrid } from "./PatientGrid";

export function PatientGridWrapper() {
  const {
    data: patients,
    isLoading,
    error,
  } = api.patients.getExplorationPatients.useQuery();

  return (
    <PatientGrid
      patients={patients || []}
      isLoading={isLoading}
      error={error?.message || null}
    />
  );
}
