import { redirect } from "next/navigation";

interface SignoutPageProps {
  searchParams?: Promise<{
    callbackUrl?: string;
    redirectTo?: string;
  }>;
}

export const dynamic = "force-dynamic";

function getSafeRedirectTarget(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export default async function SignoutPage({ searchParams }: SignoutPageProps) {
  const params = await searchParams;
  const redirectTo = getSafeRedirectTarget(
    params?.redirectTo ?? params?.callbackUrl,
  );

  redirect(`/api/signout?callbackUrl=${encodeURIComponent(redirectTo)}`);
}
