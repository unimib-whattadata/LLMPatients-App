function splitUrlSuffix(url: string): { base: string; suffix: string } {
  const match = url.match(/([?#].*)$/);
  const suffix = match?.[1] ?? "";
  const base = suffix ? url.slice(0, -suffix.length) : url;
  return { base, suffix };
}

function replaceFilenameKeepingExtension(
  urlWithoutSuffix: string,
  newBasename: string,
): string {
  const extensionMatch = urlWithoutSuffix.match(/\.(png|jpe?g|webp)$/i);
  if (!extensionMatch?.[1]) return urlWithoutSuffix;

  const extension = extensionMatch[1].toLowerCase();
  return urlWithoutSuffix.replace(
    /[^/]+\.(png|jpe?g|webp)$/i,
    `${newBasename}.${extension}`,
  );
}

export function getBasePatientAvatarUrl(
  avatarUrl: string | null | undefined,
): string | null | undefined {
  if (!avatarUrl) return avatarUrl;

  const { base, suffix } = splitUrlSuffix(avatarUrl);
  return `${replaceFilenameKeepingExtension(base, "base")}${suffix}`;
}

