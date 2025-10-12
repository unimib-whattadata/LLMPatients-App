import { PatientDetailContent } from "./_components/PatientDetailContent";

interface PatientShowPageParams {
  patientId: string;
}

export default async function PatientShowPage({
  params,
}: {
  params: Promise<PatientShowPageParams>;
}) {
  const { patientId } = await params;

  return <PatientDetailContent patientId={patientId} />;
}

