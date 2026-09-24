import type { Coordinates } from "./types";

export const defaultMapCenter: Coordinates = { lat: 50.1908, lng: 18.9238 };
export const openFreeMapStyleUrl = "https://tiles.openfreemap.org/styles/liberty";
export const userLocationRadiusKm = 2;
export const fullPropertyMarkerMinZoom = 12;
export const selectedPropertyFocusZoom = 15.2;
export const propertyClusterSourceId = "property-clusters";
export const propertyClusterLayerId = "property-clusters-circle";
export const propertyClusterCountLayerId = "property-clusters-count";
export const propertyClusterPointLayerId = "property-clusters-point";
export const userLocationSourceId = "user-location-point";
export const userLocationHaloLayerId = "user-location-halo";
export const userLocationCoreLayerId = "user-location-core";
export const userRadiusSourceId = "user-location-radius";
export const userRadiusFillLayerId = "user-location-radius-fill";
export const userRadiusLineLayerId = "user-location-radius-line";

export function getMapViewportPadding() {
  if (typeof window !== "undefined" && window.innerWidth >= 1024) {
    return { bottom: 40, left: 430, right: 470, top: 110 };
  }

  return { bottom: 270, left: 20, right: 20, top: 112 };
}

export function getUserLocationViewportPadding() {
  if (typeof window !== "undefined" && window.innerWidth >= 1024) {
    return { bottom: 96, left: 96, right: 96, top: 96 };
  }

  return { bottom: 88, left: 28, right: 28, top: 88 };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getMarkerScaleForZoom(zoom: number) {
  return clamp(0.62 + ((zoom - 8) / 4) * 0.38, 0.62, 1);
}
