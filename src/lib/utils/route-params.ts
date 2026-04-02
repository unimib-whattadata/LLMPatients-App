export function normalizeParam(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return (value[0] as string) ?? null;
  }

  return null;
}
