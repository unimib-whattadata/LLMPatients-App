
import { SharedLayout } from "~/components/layout/SharedLayout";
import { PatientDetailContent } from "./_components/PatientDetailContent";
import { getAppSession, getLayoutSessionProps } from "~/server/auth/session";

export default async function PatientDetailPage() {
  const session = await getAppSession();
  const layoutProps = getLayoutSessionProps(session);

  return (
    <SharedLayout {...layoutProps} layoutType="home" currentPage="/explore-patients">
      <PatientDetailContent />
    </SharedLayout>
  );
}
