export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    const parts: string[] = [];

    for (const key of ["message", "code", "details", "hint"]) {
      const value = errorRecord[key];
      if (typeof value === "string" && value.length > 0) {
        parts.push(`${key}: ${value}`);
      }
    }

    if (parts.length > 0) {
      return parts.join(" · ");
    }
  }

  return "Nieznany błąd";
}

export function isMissingSourceUrlColumnError(error: unknown) {
  return getErrorMessage(error).includes("source_url");
}

export function omitSourceUrl<T extends { source_url?: string | null }>(payload: T) {
  const payloadWithoutSourceUrl = { ...payload };
  delete payloadWithoutSourceUrl.source_url;
  return payloadWithoutSourceUrl;
}
