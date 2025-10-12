import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { SharedLayout } from "~/components/layout/SharedLayout";
import { auth } from "~/server/auth";

interface PatientLayoutProps {
  children: ReactNode;
}

export default async function PatientLayout({ children }: PatientLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <SharedLayout
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role || "user",
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
      layoutType="dashboard"
    >
      {children}
    </SharedLayout>
  );
}

