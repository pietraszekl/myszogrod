import type { Coordinates, Project, ProjectInvitation, ProjectInvitationRow, ProjectRow, Property, PropertyPhoto, PropertyRow } from "./types";
import { defaultMapCenter } from "./map-config";

export function parseNumber(value: number | string, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function parseCoordinates(value: unknown): Coordinates {
  if (
    value &&
    typeof value === "object" &&
    "lat" in value &&
    "lng" in value &&
    Number.isFinite(Number(value.lat)) &&
    Number.isFinite(Number(value.lng))
  ) {
    return {
      lat: Number(value.lat),
      lng: Number(value.lng),
    };
  }

  return defaultMapCenter;
}

export function parseCriteria(value: unknown): Property["criteria"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((criterion) => {
      if (
        !criterion ||
        typeof criterion !== "object" ||
        !("label" in criterion) ||
        !("score" in criterion)
      ) {
        return null;
      }

      const score = Number(criterion.score);
      if (typeof criterion.label !== "string" || !Number.isFinite(score)) {
        return null;
      }

      return {
        label: criterion.label,
        score,
      };
    })
    .filter((criterion): criterion is Property["criteria"][number] => criterion !== null);
}

export function parsePhotos(value: unknown): PropertyPhoto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((photo): PropertyPhoto | null => {
      if (
        !photo ||
        typeof photo !== "object" ||
        !("id" in photo) ||
        !("name" in photo)
      ) {
        return null;
      }

      const path = "path" in photo && typeof photo.path === "string" ? photo.path : undefined;
      const url = "url" in photo && typeof photo.url === "string" ? photo.url : "";

      if (
        typeof photo.id !== "string" ||
        typeof photo.name !== "string" ||
        (!path && !url) ||
        url.startsWith("blob:")
      ) {
        return null;
      }

      return {
        id: photo.id,
        name: photo.name,
        path,
        url,
      };
    })
    .filter((photo): photo is PropertyPhoto => photo !== null);
}

export function mapPropertyRow(row: PropertyRow): Property {
  return {
    id: row.id,
    projectId: row.project_id ?? "",
    createdBy: row.created_by ?? null,
    title: row.title,
    type: row.property_type,
    location: row.location,
    price: row.price,
    area: row.area,
    status: row.status,
    sourceUrl: row.source_url ?? "",
    description: row.description,
    noteCount: row.note_count,
    photoCount: row.photo_count,
    photos: parsePhotos(row.photos),
    criteria: parseCriteria(row.criteria),
    coordinates: parseCoordinates(row.coordinates),
    x: parseNumber(row.x, 50),
    y: parseNumber(row.y, 50),
  };
}

export function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
  };
}

export function mapProjectInvitationRow(row: ProjectInvitationRow): ProjectInvitation {
  return {
    id: row.id,
    projectId: row.project_id,
    email: row.email,
    role: row.role,
    acceptedAt: row.accepted_at,
  };
}
