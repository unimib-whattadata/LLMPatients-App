import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { SharedLayout } from "~/components/layout/SharedLayout";
import {
  getLayoutSessionProps,
  requireAppSession,
} from "~/server/auth/session";

interface PatientLayoutProps {
  children: ReactNode;
}

export default async function PatientLayout({ children }: PatientLayoutProps) {
  const session = await requireAppSession();

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <SharedLayout {...getLayoutSessionProps(session)} layoutType="dashboard">
      {children}
    </SharedLayout>
  );
}
