
import { redirect } from "next/navigation";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { ManageUsersContent } from "./_components/ManageUsersContent";
import {
  getLayoutSessionProps,
  requireAppSession,
} from "~/server/auth/session";

export default async function AdminUserManagementPage() {
  const session = await requireAppSession();

  
  if (session.user.role !== "admin") {
    redirect("/dashboard/user");
  }

  return (
    <SharedLayout
      {...getLayoutSessionProps(session)}
      layoutType="dashboard"
      currentPage="/admin/manage-users"
    >
      <ManageUsersContent />
    </SharedLayout>
  );
}
