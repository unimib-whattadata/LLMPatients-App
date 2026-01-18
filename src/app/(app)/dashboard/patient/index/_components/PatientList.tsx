"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { api } from "~/trpc/react";
import { Button, Input, Switch, Label } from "~/components/ui";
import { DataTable } from "~/components/ui/data-table";
import { DashboardSection, DashboardPanel } from "~/components/dashboard/ui";
import { patientColumns } from "../columns";
import type { AdminPatientSummary } from "../types";

export function PatientList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const { data, isLoading, refetch } = api.patients.getAdminPatients.useQuery({
    search: search || undefined,
    onlyActive,
  });

  const patients = data ?? [];

  return (
    <DashboardSection
      title="Patient Cases"
      description="Manage all patient simulations available in the platform."
      action={
        <Button
          onClick={() => router.push("/dashboard/patient/create")}
          className="bg-primary-green text-white hover:bg-primary-green/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Patient
        </Button>
      }
    >
      <DashboardPanel>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="patient-search">Search patients</Label>
            <div className="flex gap-2">
              <Input
                id="patient-search"
                placeholder="Search by name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="max-w-md"
              />
              <Button variant="outline" onClick={() => void refetch()}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="only-active"
              checked={onlyActive}
              onCheckedChange={(checked) => setOnlyActive(checked)}
            />
            <Label htmlFor="only-active" className="text-sm text-gray-300">
              Show only active patients
            </Label>
          </div>
        </div>

        <DataTable<AdminPatientSummary>
          columns={patientColumns}
          data={patients}
          isLoading={isLoading}
          emptyMessage="No patients found"
        />
      </DashboardPanel>
    </DashboardSection>
  );
}
