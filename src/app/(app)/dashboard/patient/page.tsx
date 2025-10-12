import { redirect } from "next/navigation";

export default function PatientRootPage() {
  redirect("/dashboard/patient/index");
}

