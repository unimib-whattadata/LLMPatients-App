import type { ReactNode } from "react";
import { redirect } from "next/navigation";
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

  return children;
}

