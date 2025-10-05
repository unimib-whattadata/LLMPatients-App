
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { SharedLayout } from "~/components/layout/SharedLayout";
import { ManageUsersContent } from "./_components/ManageUsersContent";

export default async function AdminUserManagementPage() {
  
  const session = await auth();

  
  if (!session || !session.user) {
    redirect("/login");
  }

  
  if (session.user.role !== "admin") {
    redirect("/dashboard/user");
  }

  return (
    <SharedLayout
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role,
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/admin/manage-users"
    >
      <ManageUsersContent />
    </SharedLayout>
  );
}
