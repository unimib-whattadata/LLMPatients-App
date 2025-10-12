import { EditPatientContent } from "./_components/EditPatientContent";

interface EditPatientPageParams {
  patientId: string;
}

export default async function EditPatientPage({
  params,
}: {
  params: Promise<EditPatientPageParams>;
}) {
  const { patientId } = await params;

  return <EditPatientContent patientId={patientId} />;
}
