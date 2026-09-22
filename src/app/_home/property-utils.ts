import type { Coordinates, LocationStatus, Property } from "./types";

export function getPropertyRating(property: Property) {
  if (property.criteria.length === 0) {
    return 1;
  }

  const total = property.criteria.reduce((sum, criterion) => sum + criterion.score, 0);
  return Math.round((total / property.criteria.length) * 10) / 10;
}

export function formatPrice(price: string) {
  const trimmedPrice = price.trim();
  const numericText = trimmedPrice.replace(/[^\d,.]/g, "").replace(",", ".");
  const numericValue = Number(numericText);

  if (!trimmedPrice) {
    return "";
  }

  if (!Number.isFinite(numericValue)) {
    return trimmedPrice;
  }

  if (numericValue > 0 && numericValue < 10000) {
    return `${numericValue.toLocaleString("pl-PL")} tys. zł`;
  }

  return `${Math.round(numericValue).toLocaleString("pl-PL")} zł`;
}

export function ratingTone(rating: number) {
  if (rating >= 8) return "excellent";
  if (rating >= 6) return "good";
  if (rating >= 4) return "average";
  return "low";
}

export function getCriterionColor(score: number) {
  const normalizedScore = Math.min(Math.max(score, 1), 10);
  const hue = 2 + ((normalizedScore - 1) / 9) * 138;

  return `hsl(${Math.round(hue)} 64% 42%)`;
}

export function getLocationStatusText(status: LocationStatus) {
  if (status === "loading") return "Ustalam lokalizację...";
  if (status === "ready") return "";
  if (status === "denied") return "Zezwól na lokalizację w przeglądarce";
  if (status === "unsupported") return "Ta przeglądarka nie udostępnia lokalizacji";
  if (status === "error") return "Nie udało się pobrać lokalizacji";
  return "Pokaż moją lokalizację";
}

export function formatCoordinates(coordinates: Coordinates) {
  return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
}

export function formatManualLocationLabel(coordinates: Coordinates) {
  return `Punkt z mapy (${formatCoordinates(coordinates)})`;
}
