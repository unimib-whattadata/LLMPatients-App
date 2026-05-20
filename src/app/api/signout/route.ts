import { type NextRequest } from "next/server";

import { signOut } from "~/server/auth";

function getSafeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const redirectTo = getSafeRedirectTarget(
    request.nextUrl.searchParams.get("redirectTo") ??
      request.nextUrl.searchParams.get("callbackUrl"),
  );

  return signOut({ redirectTo });
}
