import { SharedLayout } from "~/components/layout/SharedLayout";
import { TherapeuticJourneyContent } from "./_components/TherapeuticJourneyContent";
import {
  getLayoutSessionProps,
  requireAppSession,
} from "~/server/auth/session";

export default async function TherapeuticJourneyPage() {
  const session = await requireAppSession();
  const layoutProps = getLayoutSessionProps(session);

  return (
    <SharedLayout {...layoutProps} layoutType="dashboard" currentPage="/dashboard/therapeutic-journey">
      <TherapeuticJourneyContent />
    </SharedLayout>
  );
}
