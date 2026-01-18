"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit, ArrowLeft } from "lucide-react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { createPatientSlug } from "~/lib/utils/slugify";
import { DashboardSection, DashboardPanel } from "~/components/dashboard/ui";
import { PatientDifficulty } from "~/components/patient/PatientDifficulty";
import { PatientDuration } from "~/components/patient/PatientDuration";

interface PatientDetailContentProps {
  patientId: string;
}

export function PatientDetailContent({ patientId }: PatientDetailContentProps) {
  const router = useRouter();

  const { data: patient, isLoading, error } = api.patients.getAdminPatientById.useQuery({ id: patientId });

  const previewUrl = useMemo(() => {
    if (!patient) return "";
    const slug = createPatientSlug(patient.name);
    return `/explore-patients/${patientId}/${slug}`;
  }, [patient, patientId]);

  if (isLoading) {
    return (

      <DashboardSection
        title="Loading patient..."
        description="Retrieving patient information"
      >
        <DashboardPanel className="text-center text-gray-400">
          Retrieving patient information...
        </DashboardPanel>
      </DashboardSection>
    );

  }

  if (error || !patient) {
    return (

      <DashboardSection
        title="Patient not found"
        description="Unable to locate the requested patient."
      >
        <DashboardPanel>
          <div className="text-center py-8">
            <p className="text-sm text-gray-400 mb-6">
              Unable to locate the requested patient. It may have been removed or is no longer available.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/patient/index")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
            </Button>
          </div>
        </DashboardPanel>
      </DashboardSection>
    );

  }

  const handleEdit = () => {
    router.push(`/dashboard/patient/edit/${patientId}`);
  };

  const handlePreview = () => {
    if (!previewUrl) {
      return;
    }
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <DashboardSection
      title={patient.name}
      description="Administrative detail view for the clinical case."
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/patient/index")}
            className="border-gray-700 text-gray-200 hover:bg-gray-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Button>
          <Button variant="outline" onClick={handlePreview}
            className="border-gray-700 text-gray-200 hover:bg-gray-800"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview public page
          </Button>
          <Button onClick={handleEdit} className="bg-primary-green text-white hover:bg-primary-green/90">
            <Edit className="mr-2 h-4 w-4" />
            Edit patient
          </Button>
        </div>
      }
    >

      <DashboardPanel className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Age</p>
            <p className="text-lg font-semibold text-white">{patient.age}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Difficulty</p>
            <p className="text-lg font-semibold text-white">
              <PatientDifficulty difficulty={patient.difficulty} />
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Estimated duration</p>
            <p className="text-lg font-semibold text-white">
              <PatientDuration duration={patient.estimatedDuration} />
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Short description</h2>
          <p className="text-sm text-gray-300">{patient.smallDescription}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Therapeutic objectives</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            {patient.objectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-green" />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Clinical background</h2>
          <p className="text-sm text-gray-300 whitespace-pre-line">{patient.background}</p>
        </div>
      </DashboardPanel>

      <DashboardPanel>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Structured JSON details</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigator.clipboard.writeText(patient.details)}
          >
            Copy JSON
          </Button>
        </div>
        <pre className="max-h-[400px] overflow-auto rounded-lg bg-black/40 p-4 text-xs text-gray-300">
          {patient.details}
        </pre>
      </DashboardPanel>
    </DashboardSection>
  );
}
