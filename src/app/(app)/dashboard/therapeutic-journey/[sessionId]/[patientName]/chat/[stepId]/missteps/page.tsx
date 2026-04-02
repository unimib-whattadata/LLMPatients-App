import { requireAppSession, toAppUser } from "~/server/auth/session";

import { StepMisstepReportContent } from "./_components/StepMisstepReportContent";

export default async function StepMisstepReportPage() {
  const session = await requireAppSession();

  return (
    <StepMisstepReportContent
      user={toAppUser(session.user)}
      impersonation={session.impersonation ?? undefined}
    />
  );
}
