import { Suspense } from "react";

import { PatientList } from "./_components/PatientList";

export default function PatientIndexPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading patients...</div>}>
      <PatientList />
    </Suspense>
  );
}
