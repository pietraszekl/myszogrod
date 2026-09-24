import type { Coordinates, Property } from "./types";
import { getPropertyRating, ratingTone } from "./property-utils";

export function createEmptyFeatureCollection() {
  return {
    type: "FeatureCollection" as const,
    features: [],
  };
}

export function createUserLocationFeatureCollection(userLocation: Coordinates | null) {
  if (!userLocation) {
    return createEmptyFeatureCollection();
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Point" as const,
          coordinates: [userLocation.lng, userLocation.lat],
        },
      },
    ],
  };
}

export function createPropertyClusterFeatureCollection(properties: Property[]) {
  return {
    type: "FeatureCollection" as const,
    features: properties.map((property) => {
      const rating = getPropertyRating(property);

      return {
        type: "Feature" as const,
        properties: {
          id: property.id,
          ratingLabel: rating.toFixed(1),
          title: property.title,
          tone: ratingTone(rating),
        },
        geometry: {
          type: "Point" as const,
          coordinates: [property.coordinates.lng, property.coordinates.lat],
        },
      };
    }),
  };
}

export function createRadiusFeatureCollection(center: Coordinates, radiusKm: number) {
  const steps = 96;
  const earthRadiusKm = 6371;
  const angularDistance = radiusKm / earthRadiusKm;
  const latRad = (center.lat * Math.PI) / 180;
  const lngRad = (center.lng * Math.PI) / 180;
  const coordinates: [number, number][] = [];

  for (let index = 0; index <= steps; index += 1) {
    const bearing = (index / steps) * 2 * Math.PI;
    const pointLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const pointLngRad =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLatRad),
      );

    coordinates.push([
      (pointLngRad * 180) / Math.PI,
      (pointLatRad * 180) / Math.PI,
    ]);
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Polygon" as const,
          coordinates: [coordinates],
        },
      },
    ],
  };
}

export function getRadiusBounds(center: Coordinates, radiusKm: number) {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));

  return [
    [center.lng - lngDelta, center.lat - latDelta],
    [center.lng + lngDelta, center.lat + latDelta],
  ] as [[number, number], [number, number]];
}
