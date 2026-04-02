
import { SharedLayout } from "~/components/layout/SharedLayout";
import { UserContent } from "./_components/UserContent";
import {
  getLayoutSessionProps,
  requireAppSession,
} from "~/server/auth/session";

export default async function UserDashboardPage() {
  const session = await requireAppSession();
  const layoutProps = getLayoutSessionProps(session);

  return (
    <SharedLayout {...layoutProps} layoutType="dashboard" currentPage="/dashboard/user">
      <UserContent />
    </SharedLayout>
  );
}
