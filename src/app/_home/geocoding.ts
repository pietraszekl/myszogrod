import type { GeocodeLocationResult } from "./types";

export async function geocodeLocation(location: string): Promise<GeocodeLocationResult> {
  const response = await fetch(`/api/geocode?q=${encodeURIComponent(location)}`);
  const data = (await response.json().catch(() => null)) as
    | { error?: string; label?: string; lat?: number; lng?: number }
    | null;

  if (
    !response.ok ||
    !data ||
    !Number.isFinite(data.lat) ||
    !Number.isFinite(data.lng)
  ) {
    throw new Error(data?.error ?? "Nie udało się zweryfikować adresu na mapie.");
  }

  return {
    coordinates: {
      lat: Number(data.lat),
      lng: Number(data.lng),
    },
    label: data.label ?? location,
  };
}
