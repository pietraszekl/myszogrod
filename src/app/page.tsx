"use client";

import {
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import {
  AttributionControl,
  type GeoJSONSource,
  Map as MapLibre,
  type MapMouseEvent,
  type Map as MapLibreMap,
  type MapTouchEvent,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";
import {
  Bell,
  Camera,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Home,
  Info,
  KeyRound,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  Mountain,
  Pencil,
  Plus,
  Settings,
  SlidersHorizontal,
  Star,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { createClient as createSupabaseClient } from "@/lib/supabase/browser";

type PropertyType = "land" | "house";
type PropertyStatus = "Do obejrzenia" | "Obiecujące" | "W trakcie" | "Odrzucone";
type PropertyTypeFilter = "all" | PropertyType;
type PropertyStatusFilter = "all" | PropertyStatus;
type AuthMode = "sign-in" | "sign-up";
type Coordinates = {
  lat: number;
  lng: number;
};
type LocationStatus = "idle" | "loading" | "ready" | "denied" | "unsupported" | "error";

type PropertyFormState = {
  title: string;
  type: PropertyType;
  location: string;
  price: string;
  area: string;
  status: PropertyStatus;
  sourceUrl: string;
  description: string;
  criteriaScores: Record<string, string>;
  photos: PropertyPhoto[];
};

type Project = {
  id: string;
  name: string;
  ownerId: string;
};

type ProjectMember = {
  projectId: string;
  userId: string;
  role: "owner" | "admin" | "member";
};

type ProjectInvitation = {
  id: string;
  projectId: string;
  email: string;
  role: "admin" | "member";
  acceptedAt: string | null;
};

type PropertyPhoto = {
  file?: File;
  id: string;
  name: string;
  path?: string;
  url: string;
};

type Property = {
  id: string;
  projectId: string;
  createdBy: string | null;
  title: string;
  type: PropertyType;
  location: string;
  price: string;
  area: string;
  status: PropertyStatus;
  sourceUrl: string;
  description: string;
  noteCount: number;
  photoCount: number;
  photos: PropertyPhoto[];
  criteria: {
    label: string;
    score: number;
  }[];
  coordinates: Coordinates;
  x: number;
  y: number;
};

type PropertyRow = {
  id: string;
  project_id?: string | null;
  created_by?: string | null;
  title: string;
  property_type: PropertyType;
  location: string;
  price: string;
  area: string;
  status: PropertyStatus;
  source_url?: string | null;
  description: string;
  note_count: number;
  photo_count: number;
  photos: unknown;
  criteria: unknown;
  coordinates: unknown;
  x: number | string;
  y: number | string;
};

type ProjectRow = {
  id: string;
  name: string;
  owner_id: string;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
  role: ProjectMember["role"];
};

type ProjectInvitationRow = {
  id: string;
  project_id: string;
  email: string;
  role: ProjectInvitation["role"];
  accepted_at: string | null;
};

type PropertyInsert = {
  project_id: string;
  created_by: string;
  title: string;
  property_type: PropertyType;
  location: string;
  price: string;
  area: string;
  status: PropertyStatus;
  source_url?: string | null;
  description: string;
  note_count: number;
  photo_count: number;
  photos: PropertyPhoto[];
  criteria: Property["criteria"];
  coordinates: Coordinates;
  x: number;
  y: number;
};

type PropertyPayload = {
  project_id: string;
  title: string;
  property_type: PropertyType;
  location: string;
  price: string;
  area: string;
  status: PropertyStatus;
  source_url?: string | null;
  description: string;
  photos: PropertyPhoto[];
  criteria: Property["criteria"];
  coordinates: Coordinates;
};

type GeocodeLocationResult = {
  coordinates: Coordinates;
  label: string;
};

type AddressLookupState = {
  coordinates: Coordinates | null;
  label: string;
  message: string;
  query: string;
  status: "idle" | "loading" | "found" | "error";
};

const defaultMapCenter: Coordinates = { lat: 50.1908, lng: 18.9238 };
const openFreeMapStyleUrl = "https://tiles.openfreemap.org/styles/liberty";
const userLocationRadiusKm = 2;
const fullPropertyMarkerMinZoom = 12;
const selectedPropertyFocusZoom = 15.2;
const propertyClusterSourceId = "property-clusters";
const propertyClusterLayerId = "property-clusters-circle";
const propertyClusterCountLayerId = "property-clusters-count";
const propertyClusterPointLayerId = "property-clusters-point";
const userLocationSourceId = "user-location-point";
const userLocationHaloLayerId = "user-location-halo";
const userLocationCoreLayerId = "user-location-core";
const userRadiusSourceId = "user-location-radius";
const userRadiusFillLayerId = "user-location-radius-fill";
const userRadiusLineLayerId = "user-location-radius-line";
const propertyPhotoBucket = "property-photos";
const idleAddressLookup: AddressLookupState = {
  coordinates: null,
  label: "",
  message: "",
  query: "",
  status: "idle",
};

setWorkerUrl("/maplibre-gl-worker.mjs");

function getMapViewportPadding() {
  if (typeof window !== "undefined" && window.innerWidth >= 1024) {
    return { bottom: 40, left: 430, right: 470, top: 110 };
  }

  return { bottom: 270, left: 20, right: 20, top: 112 };
}

function getUserLocationViewportPadding() {
  if (typeof window !== "undefined" && window.innerWidth >= 1024) {
    return { bottom: 96, left: 96, right: 96, top: 96 };
  }

  return { bottom: 88, left: 28, right: 28, top: 88 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMarkerScaleForZoom(zoom: number) {
  return clamp(0.62 + ((zoom - 8) / 4) * 0.38, 0.62, 1);
}

function createEmptyFeatureCollection() {
  return {
    type: "FeatureCollection" as const,
    features: [],
  };
}

function createUserLocationFeatureCollection(userLocation: Coordinates | null) {
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

function createPropertyClusterFeatureCollection(properties: Property[]) {
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

function createRadiusFeatureCollection(center: Coordinates, radiusKm: number) {
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

function getRadiusBounds(center: Coordinates, radiusKm: number) {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));

  return [
    [center.lng - lngDelta, center.lat - latDelta],
    [center.lng + lngDelta, center.lat + latDelta],
  ] as [[number, number], [number, number]];
}

const criteriaByType: Record<PropertyType, string[]> = {
  land: [
    "Dojazd do Katowic",
    "Media w drodze",
    "Szkody górnicze",
    "Sąsiedzi i otoczenie",
    "Droga dojazdowa",
    "MPZP / warunki zabudowy",
    "Kształt i ustawność działki",
    "Hałas i uciążliwości",
  ],
  house: [
    "Dojazd do Katowic",
    "Stan techniczny",
    "Szkody górnicze",
    "Sąsiedzi i otoczenie",
    "Układ pomieszczeń",
    "Ogrzewanie i koszty utrzymania",
    "Stan działki / ogrodu",
    "Hałas i uciążliwości",
  ],
};

const propertyStatuses: PropertyStatus[] = [
  "Do obejrzenia",
  "Obiecujące",
  "W trakcie",
  "Odrzucone",
];
const ratingFilterOptions = [0, 4, 6, 8];
const initialProperties: Property[] = [];

const initialPropertyForm: PropertyFormState = {
  title: "",
  type: "land",
  location: "",
  price: "",
  area: "",
  status: "Do obejrzenia",
  sourceUrl: "",
  description: "",
  photos: [],
  criteriaScores: Object.fromEntries(
    criteriaByType.land.map((criterion) => [criterion, "7"]),
  ),
};

function createInitialPropertyForm(type: PropertyType = "land"): PropertyFormState {
  return {
    ...initialPropertyForm,
    type,
    photos: [],
    criteriaScores: Object.fromEntries(
      criteriaByType[type].map((criterion) => [criterion, "7"]),
    ),
  };
}

function createPropertyFormFromProperty(property: Property): PropertyFormState {
  return {
    title: property.title,
    type: property.type,
    location: property.location,
    price: property.price,
    area: property.area,
    status: property.status,
    sourceUrl: property.sourceUrl,
    description: property.description,
    photos: property.photos,
    criteriaScores: Object.fromEntries(
      criteriaByType[property.type].map((criterion) => [
        criterion,
        String(
          property.criteria.find((propertyCriterion) => propertyCriterion.label === criterion)
            ?.score ?? 7,
        ),
      ]),
    ),
  };
}

function getPropertyRating(property: Property) {
  if (property.criteria.length === 0) {
    return 1;
  }

  const total = property.criteria.reduce((sum, criterion) => sum + criterion.score, 0);
  return Math.round((total / property.criteria.length) * 10) / 10;
}

function formatPrice(price: string) {
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

function ratingTone(rating: number) {
  if (rating >= 8) return "excellent";
  if (rating >= 6) return "good";
  if (rating >= 4) return "average";
  return "low";
}

function getCriterionColor(score: number) {
  const normalizedScore = Math.min(Math.max(score, 1), 10);
  const hue = 2 + ((normalizedScore - 1) / 9) * 138;

  return `hsl(${Math.round(hue)} 64% 42%)`;
}

function TypeIcon({ type, className }: { type: PropertyType; className?: string }) {
  const Icon = type === "land" ? Mountain : Home;

  return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />;
}

function AppBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-ink)] text-white">
        <MapPin aria-hidden="true" className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Logbook nieruchomości
        </p>
        <h1 className="truncate text-base font-semibold sm:text-lg">
          Myszogród
        </h1>
      </div>
    </div>
  );
}

function parseNumber(value: number | string, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function parseCoordinates(value: unknown): Coordinates {
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

function parseCriteria(value: unknown): Property["criteria"] {
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

function parsePhotos(value: unknown): PropertyPhoto[] {
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

function mapPropertyRow(row: PropertyRow): Property {
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

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
  };
}

function mapProjectMemberRow(row: ProjectMemberRow): ProjectMember {
  return {
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
  };
}

function mapProjectInvitationRow(row: ProjectInvitationRow): ProjectInvitation {
  return {
    id: row.id,
    projectId: row.project_id,
    email: row.email,
    role: row.role,
    acceptedAt: row.accepted_at,
  };
}

async function signPhotoUrl(photo: PropertyPhoto): Promise<PropertyPhoto> {
  if (!photo.path) {
    return photo;
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.storage
    .from(propertyPhotoBucket)
    .createSignedUrl(photo.path, 60 * 60);

  if (error || !data?.signedUrl) {
    return photo;
  }

  return {
    ...photo,
    url: data.signedUrl,
  };
}

async function hydratePropertyPhotoUrls(property: Property): Promise<Property> {
  return {
    ...property,
    photos: await Promise.all(property.photos.map(signPhotoUrl)),
  };
}

async function geocodeLocation(location: string): Promise<GeocodeLocationResult> {
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

function getErrorMessage(error: unknown) {
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

function PropertyMapMarkerContent({
  property,
  rating,
}: {
  property: Property;
  rating: number;
}) {
  const primaryPhoto = property.photos[0];

  return (
    <span className="property-map-pin" data-has-photo={primaryPhoto ? "true" : "false"}>
      <span className="property-map-pin__media">
        {primaryPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primaryPhoto.url} alt="" />
        ) : (
          <TypeIcon type={property.type} className="size-5" />
        )}
      </span>
      <span className="property-map-pin__rating">{rating.toFixed(1)}</span>
    </span>
  );
}

type MapMarkerInstance = {
  element: HTMLElement;
  marker: Marker;
  propertyId: string;
  root: Root;
};

function disposeMapMarker({ marker, root }: MapMarkerInstance) {
  marker.remove();
  queueMicrotask(() => {
    root.unmount();
  });
}

function OpenFreePropertyMap({
  properties,
  selectedPropertyId,
  userLocation,
  onSelect,
  onLongPress,
}: {
  properties: Property[];
  selectedPropertyId: string | null;
  userLocation: Coordinates | null;
  onSelect: (propertyId: string) => void;
  onLongPress: (coordinates: Coordinates) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapMarkerInstance[]>([]);
  const hasCenteredUserLocationRef = useRef(false);
  const onLongPressRef = useRef(onLongPress);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new MapLibre({
      attributionControl: false,
      center: [defaultMapCenter.lng, defaultMapCenter.lat],
      container: containerRef.current,
      pitch: 0,
      style: openFreeMapStyleUrl,
      zoom: 10,
    });

    map.on("load", () => {
      map.addSource(userRadiusSourceId, {
        type: "geojson",
        data: createEmptyFeatureCollection(),
      });
      map.addLayer({
        id: userRadiusFillLayerId,
        type: "fill",
        source: userRadiusSourceId,
        paint: {
          "fill-color": "#f3a43b",
          "fill-opacity": 0.09,
        },
      });
      map.addLayer({
        id: userRadiusLineLayerId,
        type: "line",
        source: userRadiusSourceId,
        paint: {
          "line-color": "#f3a43b",
          "line-opacity": 0.34,
          "line-width": 1.5,
        },
      });
      map.addSource(userLocationSourceId, {
        type: "geojson",
        data: createEmptyFeatureCollection(),
      });
      map.addLayer({
        id: userLocationHaloLayerId,
        type: "circle",
        source: userLocationSourceId,
        paint: {
          "circle-color": "#f4aa23",
          "circle-opacity": 0.1,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 8, 12, 16],
        },
      });
      map.addLayer({
        id: userLocationCoreLayerId,
        type: "circle",
        source: userLocationSourceId,
        paint: {
          "circle-color": "#f4aa23",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 12, 8],
          "circle-stroke-color": "rgba(255, 255, 255, 0.94)",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 12, 3],
        },
      });
      map.addSource(propertyClusterSourceId, {
        type: "geojson",
        cluster: true,
        clusterMaxZoom: fullPropertyMarkerMinZoom - 1,
        clusterRadius: 58,
        data: createPropertyClusterFeatureCollection([]),
      });
      map.addLayer({
        id: propertyClusterLayerId,
        type: "circle",
        source: propertyClusterSourceId,
        filter: ["has", "point_count"],
        maxzoom: fullPropertyMarkerMinZoom,
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#3d7b62",
            5,
            "#16845c",
            12,
            "#143d2d",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18,
            5,
            23,
            12,
            29,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 4,
        },
      });
      map.addLayer({
        id: propertyClusterCountLayerId,
        type: "symbol",
        source: propertyClusterSourceId,
        filter: ["has", "point_count"],
        maxzoom: fullPropertyMarkerMinZoom,
        layout: {
          "text-allow-overlap": true,
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 13,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(23, 33, 29, 0.35)",
          "text-halo-width": 1,
        },
      });
      map.addLayer({
        id: propertyClusterPointLayerId,
        type: "circle",
        source: propertyClusterSourceId,
        filter: ["!", ["has", "point_count"]],
        maxzoom: fullPropertyMarkerMinZoom,
        paint: {
          "circle-color": "#143d2d",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 5, 11, 9],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      setMapStatus("ready");
    });
    map.on("error", () => {
      if (!map.loaded()) {
        setMapStatus("error");
      }
    });
    const setPointerCursor = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointerCursor = () => {
      map.getCanvas().style.cursor = "";
    };
    let longPressTimer: number | undefined;
    let longPressStartPoint: { x: number; y: number } | null = null;

    const cancelLongPress = () => {
      if (longPressTimer !== undefined) {
        window.clearTimeout(longPressTimer);
        longPressTimer = undefined;
      }
      longPressStartPoint = null;
    };
    const scheduleLongPress = (event: MapMouseEvent | MapTouchEvent) => {
      cancelLongPress();
      longPressStartPoint = event.point;
      longPressTimer = window.setTimeout(() => {
        longPressTimer = undefined;
        longPressStartPoint = null;
        onLongPressRef.current({
          lat: event.lngLat.lat,
          lng: event.lngLat.lng,
        });
      }, 650);
    };
    const cancelLongPressAfterMove = (event: MapMouseEvent | MapTouchEvent) => {
      if (!longPressStartPoint) {
        return;
      }

      const movement = Math.hypot(
        event.point.x - longPressStartPoint.x,
        event.point.y - longPressStartPoint.y,
      );

      if (movement > 8) {
        cancelLongPress();
      }
    };

    map.on("click", propertyClusterLayerId, async (event) => {
      const feature = event.features?.[0];
      const clusterId = Number(feature?.properties?.cluster_id);
      const coordinates = (feature?.geometry as { coordinates?: [number, number] } | undefined)
        ?.coordinates;
      const source = map.getSource(propertyClusterSourceId) as GeoJSONSource | undefined;

      if (!source || !Number.isFinite(clusterId) || !coordinates) {
        return;
      }

      const expansionZoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: coordinates,
        duration: 550,
        zoom: Math.min(expansionZoom, 15),
      });
    });
    map.on("click", propertyClusterPointLayerId, (event) => {
      const propertyId = event.features?.[0]?.properties?.id;
      if (typeof propertyId === "string") {
        onSelect(propertyId);
      }
    });
    map.on("mouseenter", propertyClusterLayerId, setPointerCursor);
    map.on("mouseleave", propertyClusterLayerId, clearPointerCursor);
    map.on("mouseenter", propertyClusterPointLayerId, setPointerCursor);
    map.on("mouseleave", propertyClusterPointLayerId, clearPointerCursor);
    map.on("mousedown", scheduleLongPress);
    map.on("touchstart", scheduleLongPress);
    map.on("mousemove", cancelLongPressAfterMove);
    map.on("touchmove", cancelLongPressAfterMove);
    map.on("mouseup", cancelLongPress);
    map.on("touchend", cancelLongPress);
    map.on("dragstart", cancelLongPress);
    map.on("zoomstart", cancelLongPress);
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;

    return () => {
      cancelLongPress();
      markersRef.current.forEach(disposeMapMarker);
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== "ready") {
      return;
    }

    const updateMarkerScale = () => {
      const shouldShowFullMarkers = map.getZoom() >= fullPropertyMarkerMinZoom;
      const markerScale = getMarkerScaleForZoom(map.getZoom());
      markersRef.current.forEach(({ element }) => {
        element.style.setProperty("--map-marker-scale", markerScale.toFixed(3));
        element.hidden = !shouldShowFullMarkers;
      });
    };

    markersRef.current.forEach(disposeMapMarker);
    markersRef.current = properties.map((property) => {
      const rating = getPropertyRating(property);
      const markerElement = document.createElement("button");
      markerElement.className = "property-map-marker";
      markerElement.dataset.selected = String(property.id === selectedPropertyId);
      markerElement.type = "button";
      markerElement.setAttribute("aria-label", `${property.title}, ocena ${rating}`);
      markerElement.setAttribute(
        "aria-pressed",
        String(property.id === selectedPropertyId),
      );
      markerElement.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(property.id);
      });

      const root = createRoot(markerElement);
      root.render(<PropertyMapMarkerContent property={property} rating={rating} />);

      const marker = new Marker({
        anchor: "center",
        element: markerElement,
      })
        .setLngLat([property.coordinates.lng, property.coordinates.lat])
        .addTo(map);

      return { element: markerElement, marker, propertyId: property.id, root };
    });
    updateMarkerScale();
    map.on("zoom", updateMarkerScale);

    return () => {
      map.off("zoom", updateMarkerScale);
      markersRef.current.forEach(disposeMapMarker);
      markersRef.current = [];
    };
  }, [mapStatus, onSelect, properties, selectedPropertyId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== "ready") {
      return;
    }

    const source = map.getSource(propertyClusterSourceId) as GeoJSONSource | undefined;
    source?.setData(createPropertyClusterFeatureCollection(properties));
  }, [mapStatus, properties]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== "ready") {
      return;
    }

    const source = map.getSource(userRadiusSourceId) as GeoJSONSource | undefined;
    source?.setData(
      userLocation
        ? createRadiusFeatureCollection(userLocation, userLocationRadiusKm)
        : createEmptyFeatureCollection(),
    );
    const userLocationSource = map.getSource(userLocationSourceId) as
      | GeoJSONSource
      | undefined;
    userLocationSource?.setData(createUserLocationFeatureCollection(userLocation));

    if (!userLocation) {
      hasCenteredUserLocationRef.current = false;
      return;
    }

    if (!hasCenteredUserLocationRef.current) {
      hasCenteredUserLocationRef.current = true;
      map.fitBounds(getRadiusBounds(userLocation, userLocationRadiusKm), {
        duration: 700,
        maxZoom: 11.8,
        padding: getUserLocationViewportPadding(),
      });
    }
  }, [mapStatus, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const selectedProperty = properties.find(
      (property) => property.id === selectedPropertyId,
    );

    if (!map || !selectedProperty) {
      return;
    }

    map.easeTo({
      center: [selectedProperty.coordinates.lng, selectedProperty.coordinates.lat],
      duration: 550,
      padding: getMapViewportPadding(),
      zoom: Math.max(map.getZoom(), selectedPropertyFocusZoom),
    });
  }, [properties, selectedPropertyId]);

  return (
    <div
      className="openfree-map-shell"
      aria-label="Mapa OpenFreeMap z nieruchomościami"
      data-map-status={mapStatus}
    >
      <div ref={containerRef} className="openfree-map-canvas" />
      {mapStatus === "error" ? (
        <div className="map-load-error" role="status">
          Nie udało się załadować mapy. Sprawdź połączenie z OpenFreeMap.
        </div>
      ) : null}
    </div>
  );
}

function RatingPill({ rating }: { rating: number }) {
  return (
    <span className="rating-pill" data-tone={ratingTone(rating)}>
      <Star aria-hidden="true" className="size-3.5 fill-current" />
      {rating.toFixed(1)}
    </span>
  );
}

function PropertyPhotoGallery({
  activeIndex,
  onActiveIndexChange,
  property,
}: {
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  property: Property;
}) {
  const photos = property.photos;
  const activePhoto = photos[activeIndex] ?? photos[0];
  const hasMultiplePhotos = photos.length > 1;

  if (!activePhoto) {
    return (
      <div className="details-photo">
        <TypeIcon type={property.type} className="size-10" />
      </div>
    );
  }

  function showPreviousPhoto() {
    onActiveIndexChange((activeIndex - 1 + photos.length) % photos.length);
  }

  function showNextPhoto() {
    onActiveIndexChange((activeIndex + 1) % photos.length);
  }

  return (
    <div className="property-gallery">
      <div className="details-photo property-gallery__hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activePhoto.url}
          alt={`Zdjęcie ${activeIndex + 1}: ${activePhoto.name}`}
        />
        {hasMultiplePhotos ? (
          <>
            <button
              aria-label="Poprzednie zdjęcie"
              className="gallery-nav gallery-nav--prev"
              onClick={showPreviousPhoto}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-label="Następne zdjęcie"
              className="gallery-nav gallery-nav--next"
              onClick={showNextPhoto}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
            <span className="gallery-counter">
              {activeIndex + 1} / {photos.length}
            </span>
          </>
        ) : null}
      </div>

      {hasMultiplePhotos ? (
        <div className="gallery-strip" aria-label="Miniatury zdjęć">
          {photos.map((photo, index) => (
            <button
              aria-label={`Pokaż zdjęcie ${index + 1}`}
              aria-pressed={index === activeIndex}
              className="gallery-thumb"
              key={photo.id}
              onClick={() => onActiveIndexChange(index)}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getLocationStatusText(status: LocationStatus) {
  if (status === "loading") return "Ustalam lokalizację...";
  if (status === "ready") return "";
  if (status === "denied") return "Zezwól na lokalizację w przeglądarce";
  if (status === "unsupported") return "Ta przeglądarka nie udostępnia lokalizacji";
  if (status === "error") return "Nie udało się pobrać lokalizacji";
  return "Pokaż moją lokalizację";
}

function formatCoordinates(coordinates: Coordinates) {
  return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
}

function formatManualLocationLabel(coordinates: Coordinates) {
  return `Punkt z mapy (${formatCoordinates(coordinates)})`;
}

function isMissingSourceUrlColumnError(error: unknown) {
  return getErrorMessage(error).includes("source_url");
}

function omitSourceUrl<T extends { source_url?: string | null }>(payload: T) {
  const payloadWithoutSourceUrl = { ...payload };
  delete payloadWithoutSourceUrl.source_url;
  return payloadWithoutSourceUrl;
}

function getAuthRedirectUrl(kind: "default" | "recovery" = "default") {
  const origin = window.location.origin;

  if (kind === "recovery") {
    return `${origin}/?auth=recovery`;
  }

  return origin;
}

function createInviteInstructions(email: string, projectName: string, appUrl: string) {
  return [
    `Zapraszam Cię do projektu "${projectName}" w Myszogrodzie.`,
    `Wejdź na ${appUrl} i zarejestruj albo zaloguj się adresem ${email}.`,
    "Po zalogowaniu dostęp do projektu zostanie nadany automatycznie.",
  ].join("\n");
}

export default function HomePage() {
  const [properties, setProperties] = useState(initialProperties);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [newAuthPassword, setNewAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectInvitations, setProjectInvitations] = useState<ProjectInvitation[]>([]);
  const [projectName, setProjectName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteInstructions, setInviteInstructions] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(
    createInitialPropertyForm(),
  );
  const [propertyFormError, setPropertyFormError] = useState("");
  const [propertiesLoadError, setPropertiesLoadError] = useState("");
  const [photoActionError, setPhotoActionError] = useState("");
  const [deleteActionError, setDeleteActionError] = useState("");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [propertyTypeFilter, setPropertyTypeFilter] =
    useState<PropertyTypeFilter>("all");
  const [propertyStatusFilter, setPropertyStatusFilter] =
    useState<PropertyStatusFilter>("all");
  const [minimumRatingFilter, setMinimumRatingFilter] = useState(0);
  const [addressLookup, setAddressLookup] =
    useState<AddressLookupState>(idleAddressLookup);
  const [manualPropertyCoordinates, setManualPropertyCoordinates] =
    useState<Coordinates | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const filtersActive =
    propertyTypeFilter !== "all" ||
    propertyStatusFilter !== "all" ||
    minimumRatingFilter > 0;
  const filteredProperties = properties.filter((property) => {
    if (propertyTypeFilter !== "all" && property.type !== propertyTypeFilter) {
      return false;
    }

    if (propertyStatusFilter !== "all" && property.status !== propertyStatusFilter) {
      return false;
    }

    if (minimumRatingFilter > 0 && getPropertyRating(property) < minimumRatingFilter) {
      return false;
    }

    return true;
  });

  const selectedProperty = selectedPropertyId
    ? properties.find((property) => property.id === selectedPropertyId)
    : undefined;
  const editingProperty = editingPropertyId
    ? properties.find((property) => property.id === editingPropertyId)
    : undefined;
  const isEditingProperty = Boolean(editingProperty);
  const activeProject = activeProjectId
    ? projects.find((project) => project.id === activeProjectId)
    : undefined;
  const selectedPhotoCount = selectedProperty
    ? selectedProperty.photos.length
    : 0;
  const activeSelectedPhotoIndex = selectedProperty
    ? Math.min(activePhotoIndex, Math.max(selectedProperty.photos.length - 1, 0))
    : 0;
  const selectedPropertyRating = selectedProperty
    ? getPropertyRating(selectedProperty)
    : null;
  const propertyFormRating =
    Object.values(propertyForm.criteriaScores).reduce(
      (sum, score) => sum + Number(score),
      0,
    ) / Object.values(propertyForm.criteriaScores).length;

  useEffect(() => {
    const supabase = createSupabaseClient();
    let ignoreAuth = false;

    function showPasswordRecovery(message = "Ustaw nowe hasło do konta.") {
      setPasswordRecoveryOpen(true);
      setSettingsOpen(true);
      setAuthMessage(message);
    }

    async function handleAuthRedirect() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const authIntent = url.searchParams.get("auth");
      const authError = url.searchParams.get("auth_error");
      const authType = url.searchParams.get("type");
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const hashType = hashParams.get("type");
      const hashError = hashParams.get("error_description") ?? hashParams.get("error");
      const isRecoveryRedirect =
        authIntent === "recovery" ||
        authType === "recovery" ||
        hashType === "recovery";

      if (authError || hashError) {
        setSettingsOpen(true);
        setAuthMessage(`Link logowania/resetu hasła nie zadziałał: ${authError ?? hashError}`);
        url.searchParams.delete("auth_error");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        url.searchParams.delete("code");
        url.searchParams.delete("auth");
        url.searchParams.delete("type");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

        if (error) {
          setSettingsOpen(true);
          setAuthMessage(`Nie udało się użyć linku z emaila: ${error.message}`);
          return;
        }

        if (isRecoveryRedirect) {
          showPasswordRecovery();
        }
      } else if (isRecoveryRedirect || hashParams.has("access_token")) {
        showPasswordRecovery();
      }
    }

    void handleAuthRedirect();

    supabase.auth.getUser().then(({ data }) => {
      if (!ignoreAuth) {
        setCurrentUser(data.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null);

      if (event === "PASSWORD_RECOVERY") {
        showPasswordRecovery();
      }
    });

    return () => {
      ignoreAuth = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ignoreProjects = false;

    async function loadProjects() {
      if (!currentUser) {
        setProjects([]);
        setActiveProjectId(null);
        setProjectMembers([]);
        setProjectInvitations([]);
        setProperties([]);
        return;
      }

      try {
        const supabase = createSupabaseClient();
        await supabase.rpc("accept_my_project_invitations");
        const { data: loadedProjects, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) {
          throw error;
        }

        let projectRows = loadedProjects as ProjectRow[] | null;

        if ((projectRows ?? []).length === 0) {
          const { data: createdProject, error: createError } = await supabase
            .rpc("create_project", { project_name: "Mój projekt" });

          if (createError || !createdProject) {
            throw new Error(createError?.message ?? "nie udało się utworzyć projektu startowego");
          }

          projectRows = [createdProject] as ProjectRow[];
        }

        if (!ignoreProjects) {
          const nextProjects = (projectRows ?? []).map(mapProjectRow);
          setProjects(nextProjects);
          setActiveProjectId((currentProjectId) =>
            currentProjectId && nextProjects.some((project) => project.id === currentProjectId)
              ? currentProjectId
              : nextProjects[0]?.id ?? null,
          );
          setSettingsError("");
        }
      } catch (error) {
        if (!ignoreProjects) {
          setSettingsError(`Nie udało się pobrać projektów: ${getErrorMessage(error)}`);
        }
      }
    }

    loadProjects();

    return () => {
      ignoreProjects = true;
    };
  }, [currentUser]);

  useEffect(() => {
    let ignoreLoadedProperties = false;

    async function loadProperties() {
      if (!currentUser || !activeProjectId) {
        setProperties([]);
        setPropertiesLoadError(currentUser ? "" : "Zaloguj się, aby zobaczyć projekty.");
        return;
      }

      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("project_id", activeProjectId)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (!ignoreLoadedProperties) {
          const loadedProperties = await Promise.all(
            (data as PropertyRow[] | null ?? [])
              .map(mapPropertyRow)
              .map(hydratePropertyPhotoUrls),
          );
          setProperties(loadedProperties);
          setPropertiesLoadError("");
        }
      } catch (error) {
        if (!ignoreLoadedProperties) {
          const message = getErrorMessage(error);
          setPropertiesLoadError(`Nie udało się pobrać danych z Supabase: ${message}`);
        }
      }
    }

    loadProperties();

    return () => {
      ignoreLoadedProperties = true;
    };
  }, [activeProjectId, currentUser]);

  useEffect(() => {
    if (!addPropertyOpen) {
      return;
    }

    if (manualPropertyCoordinates) {
      return;
    }

    const query = propertyForm.location.trim();

    if (query.length < 4) {
      return;
    }

    let ignoreLookup = false;
    const timer = window.setTimeout(async () => {
      setAddressLookup({
        coordinates: null,
        label: "",
        message: "Sprawdzam adres na mapie...",
        query,
        status: "loading",
      });

      try {
        const result = await geocodeLocation(query);

        if (!ignoreLookup) {
          setAddressLookup({
            coordinates: result.coordinates,
            label: result.label,
            message: "Znaleziono lokalizację na mapie.",
            query,
            status: "found",
          });
        }
      } catch (error) {
        if (!ignoreLookup) {
          setAddressLookup({
            coordinates: null,
            label: "",
            message: getErrorMessage(error),
            query,
            status: "error",
          });
        }
      }
    }, 900);

    return () => {
      ignoreLookup = true;
      window.clearTimeout(timer);
    };
  }, [addPropertyOpen, manualPropertyCoordinates, propertyForm.location]);

  useEffect(() => {
    let ignoreSettings = false;

    async function loadProjectSettings() {
      if (!settingsOpen || !activeProjectId || !currentUser) {
        return;
      }

      try {
        const supabase = createSupabaseClient();
        const [membersResult, invitationsResult] = await Promise.all([
          supabase
            .from("project_members")
            .select("*")
            .eq("project_id", activeProjectId)
            .order("created_at", { ascending: true }),
          supabase
            .from("project_invitations")
            .select("*")
            .eq("project_id", activeProjectId)
            .order("created_at", { ascending: false }),
        ]);

        if (membersResult.error) {
          throw membersResult.error;
        }

        if (invitationsResult.error) {
          throw invitationsResult.error;
        }

        if (!ignoreSettings) {
          setProjectMembers(
            (membersResult.data as ProjectMemberRow[] | null ?? []).map(mapProjectMemberRow),
          );
          setProjectInvitations(
            (invitationsResult.data as ProjectInvitationRow[] | null ?? []).map(
              mapProjectInvitationRow,
            ),
          );
          setSettingsError("");
        }
      } catch (error) {
        if (!ignoreSettings) {
          setSettingsError(`Nie udało się pobrać ustawień projektu: ${getErrorMessage(error)}`);
        }
      }
    }

    loadProjectSettings();

    return () => {
      ignoreSettings = true;
    };
  }, [activeProjectId, currentUser, settingsOpen]);

  const selectProperty = useCallback((propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setActivePhotoIndex(0);
    setPhotoActionError("");
    setDeleteActionError("");
  }, []);

  const updateCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("ready");
      },
      (error) => {
        setLocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 12_000,
      },
    );
  }, []);

  function requestCurrentLocation() {
    updateCurrentLocation();
  }

  async function handleEmailPasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = authEmail.trim();
    const password = authPassword;

    if (!email) {
      setAuthMessage("Podaj adres email.");
      return;
    }

    if (password.length < 6) {
      setAuthMessage("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage(authMode === "sign-up" ? "Tworzę konto..." : "Loguję...");

    try {
      const supabase = createSupabaseClient();
      const { error } =
        authMode === "sign-up"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: getAuthRedirectUrl(),
              },
            })
          : await supabase.auth.signInWithPassword({
              email,
              password,
            });

      if (error) {
        throw error;
      }

      setAuthPassword("");
      setAuthMessage(
        authMode === "sign-up"
          ? "Konto zostało utworzone. Jeśli Supabase wymaga potwierdzenia emaila, sprawdź skrzynkę."
          : "Zalogowano pomyślnie.",
      );
    } catch (error) {
      setAuthMessage(
        authMode === "sign-up"
          ? `Nie udało się utworzyć konta: ${getErrorMessage(error)}`
          : `Nie udało się zalogować: ${getErrorMessage(error)}`,
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function requestPasswordReset() {
    const email = authEmail.trim();

    if (!email) {
      setAuthMessage("Podaj email, na który wysłać link resetowania hasła.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("Wysyłam link resetowania hasła...");

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl("recovery"),
      });

      if (error) {
        throw error;
      }

      setAuthMessage("Wysłano link resetowania hasła. Sprawdź skrzynkę email.");
    } catch (error) {
      setAuthMessage(`Nie udało się wysłać resetu hasła: ${getErrorMessage(error)}`);
    } finally {
      setAuthBusy(false);
    }
  }

  async function updateRecoveredPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newAuthPassword.length < 6) {
      setAuthMessage("Nowe hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("Zapisuję nowe hasło...");

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: newAuthPassword,
      });

      if (error) {
        throw error;
      }

      setNewAuthPassword("");
      setPasswordRecoveryOpen(false);
      setAuthMessage("Hasło zostało zmienione.");
    } catch (error) {
      setAuthMessage(`Nie udało się zmienić hasła: ${getErrorMessage(error)}`);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
    setProjects([]);
    setActiveProjectId(null);
    setProperties([]);
    setFiltersOpen(false);
    setSettingsOpen(false);
    setPasswordRecoveryOpen(false);
    setNewAuthPassword("");
    setAuthPassword("");
    setAuthMessage("");
    setInviteInstructions("");
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = projectName.trim();
    if (!currentUser || !name) {
      setSettingsError("Zaloguj się i podaj nazwę projektu.");
      return;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .rpc("create_project", { project_name: name });

      if (error || !data) {
        throw new Error(error?.message ?? "brak danych zwrotnych");
      }

      const newProject = mapProjectRow(data as ProjectRow);
      setProjects((currentProjects) => [...currentProjects, newProject]);
      setActiveProjectId(newProject.id);
      setProjectName("");
      setSettingsError("");
    } catch (error) {
      setSettingsError(`Nie udało się utworzyć projektu: ${getErrorMessage(error)}`);
    }
  }

  async function inviteCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = inviteEmail.trim().toLowerCase();
    if (!currentUser || !activeProjectId || !email) {
      setSettingsError("Wybierz projekt i podaj email współpracownika.");
      return;
    }

    const instructions = createInviteInstructions(
      email,
      activeProject?.name ?? "aktywny projekt",
      window.location.origin,
    );

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("project_invitations")
        .insert({
          project_id: activeProjectId,
          email,
          role: "member",
          invited_by: currentUser.id,
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "brak danych zwrotnych");
      }

      setProjectInvitations((currentInvitations) => [
        mapProjectInvitationRow(data as ProjectInvitationRow),
        ...currentInvitations,
      ]);
      setInviteEmail("");
      setInviteInstructions(instructions);
      setSettingsError("Zaproszenie zapisane. Nie wysyłamy maila automatycznie.");
    } catch (error) {
      const message = getErrorMessage(error);

      if (
        message.includes("duplicate key") ||
        message.includes("project_invitations_project_id_email_key")
      ) {
        setInviteEmail("");
        setInviteInstructions(instructions);
        setSettingsError("Zaproszenie dla tego adresu już istnieje. Skopiuj instrukcję poniżej.");
        return;
      }

      setSettingsError(`Nie udało się dodać zaproszenia: ${message}`);
    }
  }

  async function copyInviteInstructions() {
    if (!inviteInstructions) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteInstructions);
      setSettingsError("Instrukcja zaproszenia została skopiowana.");
    } catch {
      setSettingsError("Nie udało się skopiować automatycznie. Skopiuj tekst instrukcji ręcznie.");
    }
  }

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => {
        setLocationStatus("unsupported");
      });
      return;
    }

    if (!("permissions" in navigator)) {
      queueMicrotask(() => {
        updateCurrentLocation();
      });
      return;
    }

    let ignorePermissionChange = false;
    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (ignorePermissionChange) {
          return;
        }

        permissionStatus = status;

        if (status.state === "granted") {
          updateCurrentLocation();
        } else if (status.state === "denied") {
          setLocationStatus("denied");
        }

        status.onchange = () => {
          if (status.state === "granted") {
            updateCurrentLocation();
          } else if (status.state === "denied") {
            setLocationStatus("denied");
          } else {
            setLocationStatus("idle");
          }
        };
      })
      .catch(() => {
        updateCurrentLocation();
      });

    return () => {
      ignorePermissionChange = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [updateCurrentLocation]);

  const openAddProperty = useCallback((coordinates?: Coordinates) => {
    if (!currentUser) {
      setSettingsOpen(true);
      return;
    }

    setPropertyForm({
      ...createInitialPropertyForm(),
      location: coordinates ? formatManualLocationLabel(coordinates) : "",
    });
    setPropertyFormError("");
    setEditingPropertyId(null);
    setManualPropertyCoordinates(coordinates ?? null);
    setAddressLookup(idleAddressLookup);
    setAddPropertyOpen(true);
  }, [currentUser]);

  const openEditProperty = useCallback((property: Property) => {
    setPropertyForm(createPropertyFormFromProperty(property));
    setPropertyFormError("");
    setEditingPropertyId(property.id);
    setManualPropertyCoordinates(null);
    setAddressLookup(idleAddressLookup);
    setAddPropertyOpen(true);
    setDetailsOpen(false);
  }, []);

  const closeAddProperty = useCallback(() => {
    setAddPropertyOpen(false);
    setEditingPropertyId(null);
    setManualPropertyCoordinates(null);
    setPropertyFormError("");
    setAddressLookup(idleAddressLookup);
  }, []);

  function updatePropertyForm<Key extends keyof PropertyFormState>(
    key: Key,
    value: PropertyFormState[Key],
  ) {
    setPropertyForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  function updatePropertyType(type: PropertyType) {
    setPropertyForm((currentForm) => ({
      ...currentForm,
      type,
      criteriaScores: Object.fromEntries(
        criteriaByType[type].map((criterion) => [
          criterion,
          currentForm.criteriaScores[criterion] ?? "7",
        ]),
      ),
    }));
  }

  function updateCriterionScore(label: string, score: string) {
    setPropertyForm((currentForm) => ({
      ...currentForm,
      criteriaScores: {
        ...currentForm.criteriaScores,
        [label]: score,
      },
    }));
  }

  function createPhoto(file: File, index: number): PropertyPhoto {
    return {
      file,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `photo-${file.lastModified}-${file.size}-${index}-${file.name}`,
      name: file.name,
      url: URL.createObjectURL(file),
    };
  }

  function createPhotoStoragePath(projectId: string, scopeId: string, photo: PropertyPhoto) {
    const safeName = photo.name
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    return `${projectId}/${scopeId}/${photo.id}-${safeName || "photo"}`;
  }

  async function uploadPhotoForPersistence(
    photo: PropertyPhoto,
    projectId: string,
    scopeId: string,
  ): Promise<PropertyPhoto> {
    if (!photo.file) {
      return {
        id: photo.id,
        name: photo.name,
        path: photo.path,
        url: photo.url,
      };
    }

    const supabase = createSupabaseClient();
    const path = createPhotoStoragePath(projectId, scopeId, photo);
    const { error } = await supabase.storage
      .from(propertyPhotoBucket)
      .upload(path, photo.file, {
        cacheControl: "3600",
        contentType: photo.file.type,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return signPhotoUrl({
      id: photo.id,
      name: photo.name,
      path,
      url: photo.url,
    });
  }

  async function preparePhotosForPersistence(
    photos: PropertyPhoto[],
    projectId: string,
    scopeId: string,
  ) {
    return Promise.all(
      photos.map((photo) => uploadPhotoForPersistence(photo, projectId, scopeId)),
    );
  }

  function getPhotosFromInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    return files
      .filter((file) => file.type.startsWith("image/"))
      .map((file, index) => createPhoto(file, index));
  }

  function addPhotosToForm(event: ChangeEvent<HTMLInputElement>) {
    const photos = getPhotosFromInput(event);
    if (photos.length === 0) {
      return;
    }

    setPropertyForm((currentForm) => ({
      ...currentForm,
      photos: [...currentForm.photos, ...photos],
    }));
  }

  async function addPhotosToSelectedProperty(event: ChangeEvent<HTMLInputElement>) {
    const photos = getPhotosFromInput(event);
    const property = selectedProperty;

    if (photos.length === 0 || !property) {
      return;
    }

    setPhotoActionError("");

    try {
      const persistedPhotos = await preparePhotosForPersistence(
        photos,
        property.projectId,
        property.id,
      );
      const nextPhotos = [...property.photos, ...persistedPhotos];
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("properties")
        .update({
          photo_count: nextPhotos.length,
          photos: nextPhotos,
        })
        .eq("id", property.id)
        .select("*");

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(
          "Supabase nie zwrócił zaktualizowanego wpisu. Najpewniej polityka RLS blokuje aktualizację zdjęć dla anonimowego użytkownika.",
        );
      }

      if (data.length > 1) {
        throw new Error("Supabase zaktualizował więcej niż jeden wpis. Przerwano odświeżanie zdjęć.");
      }

      const updatedProperty = await hydratePropertyPhotoUrls(
        mapPropertyRow(data[0] as PropertyRow),
      );
      setProperties((currentProperties) =>
        currentProperties.map((currentProperty) =>
          currentProperty.id === updatedProperty.id ? updatedProperty : currentProperty,
        ),
      );
      setActivePhotoIndex(Math.max(updatedProperty.photos.length - photos.length, 0));
    } catch (error) {
      const message = getErrorMessage(error);
      setPhotoActionError(`Nie udało się zapisać zdjęć: ${message}`);
    }
  }

  async function handleAddProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const propertyBeingEdited = editingPropertyId
      ? properties.find((property) => property.id === editingPropertyId)
      : undefined;

    if (!currentUser) {
      setPropertyFormError("Zaloguj się, aby zapisywać nieruchomości.");
      return;
    }

    if (!activeProjectId && !propertyBeingEdited) {
      setPropertyFormError("Utwórz albo wybierz projekt przed dodaniem nieruchomości.");
      return;
    }

    if (editingPropertyId && !propertyBeingEdited) {
      setPropertyFormError("Nie znaleziono wpisu do edycji. Odśwież dane i spróbuj ponownie.");
      return;
    }

    const title = propertyForm.title.trim();
    const location = propertyForm.location.trim();
    const price = propertyForm.price.trim();
    const area = propertyForm.area.trim();
    const sourceUrl = propertyForm.sourceUrl.trim();
    const description = propertyForm.description.trim();
    const criteria = Object.entries(propertyForm.criteriaScores).map(([label, score]) => ({
      label,
      score: Number(score),
    }));

    if (!title || !location || !price || !area) {
      setPropertyFormError("Uzupełnij nazwę, lokalizację, cenę i powierzchnię.");
      return;
    }

    if (
      criteria.some(
        (criterion) =>
          !Number.isFinite(criterion.score) ||
          criterion.score < 1 ||
          criterion.score > 10,
      )
    ) {
      setPropertyFormError("Każde kryterium musi mieć ocenę od 1 do 10.");
      return;
    }

    let propertyCoordinates: Coordinates;

    try {
      propertyCoordinates =
        manualPropertyCoordinates ??
        (propertyBeingEdited && propertyBeingEdited.location === location
          ? propertyBeingEdited.coordinates
          : null) ??
        (
          addressLookup.status === "found" &&
          addressLookup.query === location &&
          addressLookup.coordinates
            ? {
                lat: addressLookup.coordinates.lat,
                lng: addressLookup.coordinates.lng,
              }
            : (await geocodeLocation(location)).coordinates
        );
    } catch (error) {
      const message = getErrorMessage(error);
      setPropertyFormError(`Nie udało się ustalić punktu na mapie: ${message}`);
      return;
    }

    let persistedPhotos: PropertyPhoto[];
    const photoProjectId = propertyBeingEdited?.projectId ?? activeProjectId!;
    const photoScopeId =
      propertyBeingEdited?.id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `draft-${Date.now()}`);

    try {
      persistedPhotos = await preparePhotosForPersistence(
        propertyForm.photos,
        photoProjectId,
        photoScopeId,
      );
    } catch (error) {
      const message = getErrorMessage(error);
      setPropertyFormError(`Nie udało się przygotować zdjęć: ${message}`);
      return;
    }

    const propertyPayload: PropertyPayload = {
      project_id: propertyBeingEdited?.projectId ?? activeProjectId!,
      title,
      property_type: propertyForm.type,
      location,
      price,
      area,
      status: propertyForm.status,
      source_url: sourceUrl || null,
      description:
        description ||
        (propertyBeingEdited
          ? ""
          : "Nowa nieruchomość dodana ręcznie. Uzupełnij notatki, zdjęcia i kryteria w kolejnym kroku."),
      photos: persistedPhotos,
      criteria,
      coordinates: propertyCoordinates,
    };

    if (propertyBeingEdited) {
      try {
        const supabase = createSupabaseClient();
        let { data, error } = await supabase
          .from("properties")
          .update({
            ...propertyPayload,
            photo_count: persistedPhotos.length,
          })
          .eq("id", propertyBeingEdited.id)
          .select("*");

        if (error && isMissingSourceUrlColumnError(error)) {
          const fallbackPayload = omitSourceUrl(propertyPayload);
          const fallbackResult = await supabase
            .from("properties")
            .update({
              ...fallbackPayload,
              photo_count: persistedPhotos.length,
            })
            .eq("id", propertyBeingEdited.id)
            .select("*");
          data = fallbackResult.data;
          error = fallbackResult.error;
        }

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error(
            "Supabase nie zwrócił zaktualizowanego wpisu. Najpewniej polityka RLS blokuje edycję dla anonimowego użytkownika.",
          );
        }

        if (data.length > 1) {
          throw new Error("Supabase zaktualizował więcej niż jeden wpis.");
        }

        const updatedProperty = await hydratePropertyPhotoUrls(
          mapPropertyRow(data[0] as PropertyRow),
        );

        setProperties((currentProperties) =>
          currentProperties.map((property) =>
            property.id === updatedProperty.id ? updatedProperty : property,
          ),
        );
        setSelectedPropertyId(updatedProperty.id);
      } catch (error) {
        const message = getErrorMessage(error);
        setPropertyFormError(`Nie udało się zaktualizować wpisu: ${message}`);
        return;
      }

      closeAddProperty();
      return;
    }

    const propertyInsert: PropertyInsert = {
      ...propertyPayload,
      created_by: currentUser.id,
      note_count: 0,
      photo_count: persistedPhotos.length,
      x: 50,
      y: 50,
    };

    try {
      const supabase = createSupabaseClient();
      let { data, error } = await supabase
        .from("properties")
        .insert(propertyInsert)
        .select("*")
        .single();

      if (error && isMissingSourceUrlColumnError(error)) {
        const fallbackInsert = omitSourceUrl(propertyInsert);
        const fallbackResult = await supabase
          .from("properties")
          .insert(fallbackInsert)
          .select("*")
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error || !data) {
        throw new Error(error?.message ?? "brak danych zwrotnych");
      }

      const newProperty = await hydratePropertyPhotoUrls(mapPropertyRow(data as PropertyRow));

      setProperties((currentProperties) => [newProperty, ...currentProperties]);
      setSelectedPropertyId(newProperty.id);
    } catch (error) {
      const message = getErrorMessage(error);
      setPropertyFormError(
        `Nie udało się zapisać w Supabase: ${message}`,
      );
      return;
    }
    setPropertyForm(createInitialPropertyForm());
    setPropertyFormError("");
    setManualPropertyCoordinates(null);
    setAddressLookup(idleAddressLookup);
    setAddPropertyOpen(false);
  }

  async function deleteSelectedProperty() {
    if (!selectedProperty) {
      return;
    }

    const shouldDelete = window.confirm(
      `Usunąć wpis "${selectedProperty.title}"? Tej operacji nie da się cofnąć.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteActionError("");

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .rpc("delete_property", { property_id: selectedProperty.id });

      if (error) {
        throw error;
      }

      if (data !== selectedProperty.id) {
        throw new Error("Supabase nie potwierdził usunięcia rekordu.");
      }

      setProperties((currentProperties) =>
        currentProperties.filter((property) => property.id !== selectedProperty.id),
      );
      setSelectedPropertyId(null);
      setDetailsOpen(false);
    } catch (error) {
      const message = getErrorMessage(error);
      setDeleteActionError(`Nie udało się usunąć wpisu: ${message}`);
    }
  }

  return (
    <main className="app-map-root overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <section className="app-map-stage relative">
        <OpenFreePropertyMap
          properties={filteredProperties}
          selectedPropertyId={selectedPropertyId}
          userLocation={userLocation}
          onSelect={selectProperty}
          onLongPress={openAddProperty}
        />

        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6 lg:hidden">
          <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-[28px] border border-black/10 bg-white/88 px-3 py-3 shadow-[0_18px_70px_rgba(29,38,35,0.12)] backdrop-blur-xl">
            <AppBrand />

            <div className="flex items-center gap-2">
              <button className="icon-button hidden sm:inline-flex" aria-label="Powiadomienia">
                <Bell aria-hidden="true" className="size-4" />
              </button>
              {currentUser ? (
                <button
                  className="icon-button"
                  aria-label="Wyloguj się"
                  onClick={signOut}
                  title="Wyloguj się"
                  type="button"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                </button>
              ) : (
                <button
                  className="icon-button"
                  aria-label="Zaloguj się"
                  onClick={() => setSettingsOpen(true)}
                  title="Zaloguj się"
                  type="button"
                >
                  <LogIn aria-hidden="true" className="size-4" />
                </button>
              )}
              {currentUser ? (
                <>
                  <button
                    className="icon-button"
                    aria-label="Ustawienia projektu"
                    onClick={() => setSettingsOpen(true)}
                    type="button"
                  >
                    <Settings aria-hidden="true" className="size-4" />
                  </button>
                  <button className="icon-button" aria-label="Filtry mapy">
                    <SlidersHorizontal aria-hidden="true" className="size-4" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <aside className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-[410px] p-6 lg:block">
          <div className="pointer-events-auto flex h-full flex-col rounded-[30px] border border-black/10 bg-white/90 shadow-[0_24px_90px_rgba(29,38,35,0.14)] backdrop-blur-xl">
            <div className="border-b border-black/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <AppBrand />
                <div className="flex shrink-0 items-center gap-2">
                  {currentUser ? (
                    <button
                      className="icon-button"
                      aria-label="Wyloguj się"
                      onClick={signOut}
                      title="Wyloguj się"
                      type="button"
                    >
                      <LogOut aria-hidden="true" className="size-4" />
                    </button>
                  ) : (
                    <button
                      className="icon-button"
                      aria-label="Zaloguj się"
                      onClick={() => setSettingsOpen(true)}
                      title="Zaloguj się"
                      type="button"
                    >
                      <LogIn aria-hidden="true" className="size-4" />
                    </button>
                  )}
                  {currentUser ? (
                    <button
                      className="icon-button"
                      aria-label="Ustawienia projektu"
                      onClick={() => setSettingsOpen(true)}
                      type="button"
                    >
                      <Settings aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-muted)]">
                    Projekt
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {activeProject?.name ?? "Brak projektu"}
                  </h2>
                  <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                    {currentUser?.email ?? "Nie zalogowano"}
                  </p>
                </div>
                {currentUser ? (
                  <button
                    className="icon-button shrink-0"
                    aria-label="Filtry listy"
                    aria-pressed={filtersOpen}
                    onClick={() => setFiltersOpen((isOpen) => !isOpen)}
                    type="button"
                  >
                    <SlidersHorizontal aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
              {currentUser && filtersOpen ? (
                <div className="list-filter-panel" aria-label="Filtry listy">
                  <div className="filter-group">
                    <span>Typ</span>
                    <div className="filter-chip-row">
                      <button
                        className="filter-chip"
                        data-active={propertyTypeFilter === "all"}
                        onClick={() => setPropertyTypeFilter("all")}
                        type="button"
                      >
                        Wszystkie
                      </button>
                      <button
                        className="filter-chip"
                        data-active={propertyTypeFilter === "land"}
                        onClick={() => setPropertyTypeFilter("land")}
                        type="button"
                      >
                        Działki
                      </button>
                      <button
                        className="filter-chip"
                        data-active={propertyTypeFilter === "house"}
                        onClick={() => setPropertyTypeFilter("house")}
                        type="button"
                      >
                        Domy
                      </button>
                    </div>
                  </div>

                  <label className="filter-field">
                    <span>Status</span>
                    <select
                      value={propertyStatusFilter}
                      onChange={(event) =>
                        setPropertyStatusFilter(event.target.value as PropertyStatusFilter)
                      }
                    >
                      <option value="all">Wszystkie statusy</option>
                      {propertyStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="filter-field">
                    <span>Ocena od</span>
                    <select
                      value={minimumRatingFilter}
                      onChange={(event) =>
                        setMinimumRatingFilter(Number(event.target.value))
                      }
                    >
                      {ratingFilterOptions.map((rating) => (
                        <option key={rating} value={rating}>
                          {rating === 0 ? "Dowolna" : `${rating}+`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="filter-summary">
                    <span>
                      {filteredProperties.length} z {properties.length}
                    </span>
                    {filtersActive ? (
                      <button
                        className="filter-reset"
                        onClick={() => {
                          setPropertyTypeFilter("all");
                          setPropertyStatusFilter("all");
                          setMinimumRatingFilter(0);
                        }}
                        type="button"
                      >
                        Wyczyść
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {propertiesLoadError ? (
                <p className="form-error" role="alert">
                  {propertiesLoadError}
                </p>
              ) : null}
              {filteredProperties.map((property) => (
                <button
                  className="property-card"
                  data-selected={property.id === selectedPropertyId}
                  key={property.id}
                  onClick={() => selectProperty(property.id)}
                  type="button"
                  aria-pressed={property.id === selectedPropertyId}
                  aria-label={`Wybierz ${property.title}, rating ${getPropertyRating(property)}`}
                >
                  <div className="property-card__image">
                    {property.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={property.photos[0].url} alt="" />
                    ) : (
                      <TypeIcon type={property.type} className="size-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">{property.title}</h3>
                        <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                          {property.location}
                        </p>
                      </div>
                      <RatingPill rating={getPropertyRating(property)} />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                      <span>{formatPrice(property.price)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{property.area}</span>
                    </div>
                  </div>
                </button>
              ))}
              {properties.length === 0 ? (
                <div className="empty-state">
                  <MapPin aria-hidden="true" className="size-5" />
                  <p>
                    {currentUser
                      ? "Brak nieruchomości. Dodaj pierwszą pozycję ręcznie."
                      : "Zaloguj się, aby zobaczyć i dodawać nieruchomości."}
                  </p>
                  {currentUser ? (
                    <button
                      className="secondary-button justify-center"
                      onClick={() => openAddProperty()}
                      type="button"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Dodaj
                    </button>
                  ) : null}
                </div>
              ) : null}
              {properties.length > 0 && filteredProperties.length === 0 ? (
                <div className="empty-state">
                  <SlidersHorizontal aria-hidden="true" className="size-5" />
                  <p>Brak wyników dla aktywnych filtrów.</p>
                  <button
                    className="secondary-button justify-center"
                    onClick={() => {
                      setPropertyTypeFilter("all");
                      setPropertyStatusFilter("all");
                      setMinimumRatingFilter(0);
                    }}
                    type="button"
                  >
                    Wyczyść filtry
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        {selectedProperty && selectedPropertyRating !== null ? (
          <aside className="pointer-events-none absolute bottom-0 left-0 top-0 z-20 hidden w-[410px] p-6 lg:block">
            <div className="sidebar-detail-panel pointer-events-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Szczegóły lokalizacji
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {selectedProperty.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {selectedProperty.location}
                  </p>
                </div>
                <button
                  className="icon-button"
                  aria-label="Wróć do listy nieruchomości"
                  onClick={() => setSelectedPropertyId(null)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              <div className="mt-5 sidebar-detail-photo">
                <PropertyPhotoGallery
                  activeIndex={activeSelectedPhotoIndex}
                  onActiveIndexChange={setActivePhotoIndex}
                  property={selectedProperty}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="metric-tile">
                  <span>Średnia</span>
                  <strong>{selectedPropertyRating.toFixed(1)}</strong>
                </div>
                <div className="metric-tile">
                  <span>Status</span>
                  <strong>{selectedProperty.status}</strong>
                </div>
                <div className="metric-tile">
                  <span>Cena</span>
                  <strong>{formatPrice(selectedProperty.price)}</strong>
                </div>
                <div className="metric-tile">
                  <span>Powierzchnia</span>
                  <strong>{selectedProperty.area}</strong>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">
                {selectedProperty.description}
              </p>
              {selectedProperty.sourceUrl ? (
                <a
                  className="external-link mt-4"
                  href={selectedProperty.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Otwórz ogłoszenie zewnętrzne
                </a>
              ) : null}

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Kryteria oceny</h3>
                  <RatingPill rating={selectedPropertyRating} />
                </div>
                <div className="mt-3 space-y-3">
                  {selectedProperty.criteria.map((criterion) => (
                    <div
                      className="criterion-row"
                      key={criterion.label}
                      style={{
                        "--criterion-color": getCriterionColor(criterion.score),
                      } as CSSProperties}
                    >
                      <span>{criterion.label}</span>
                      <div className="criterion-bar" aria-hidden="true">
                        <span style={{ width: `${criterion.score * 10}%` }} />
                      </div>
                      <strong>{criterion.score}/10</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <button
                  className="secondary-button justify-center"
                  onClick={() => openEditProperty(selectedProperty)}
                  type="button"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Edytuj
                </button>
                <label className="secondary-button justify-center">
                  <Camera aria-hidden="true" className="size-4" />
                  Zdjęcia
                  <input
                    accept="image/*"
                    multiple
                    onChange={addPhotosToSelectedProperty}
                    type="file"
                  />
                </label>
                <button
                  className="danger-button justify-center"
                  onClick={deleteSelectedProperty}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Usuń
                </button>
              </div>
              {photoActionError || deleteActionError ? (
                <p className="form-error mt-3" role="alert">
                  {photoActionError || deleteActionError}
                </p>
              ) : null}
            </div>
          </aside>
        ) : null}

        <div className="map-action-stack">
          <div
            className="location-chip"
            data-state={locationStatus}
            role="status"
          >
            {getLocationStatusText(locationStatus)}
          </div>
          <button
            className="location-button"
            aria-label="Pokaż moją lokalizację i promień 2 kilometry"
            disabled={locationStatus === "loading"}
            onClick={requestCurrentLocation}
            type="button"
          >
            <LocateFixed aria-hidden="true" className="size-5" />
          </button>
          {currentUser ? (
            <button
              className="map-add-button"
              aria-label="Dodaj nieruchomość"
              onClick={() => openAddProperty()}
              type="button"
            >
              <Plus aria-hidden="true" className="size-5" />
            </button>
          ) : null}
        </div>

        {detailsOpen && selectedProperty && selectedPropertyRating !== null ? (
          <div className="details-backdrop" role="presentation">
            <section className="details-panel" aria-labelledby="property-details-title">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Szczegóły nieruchomości
                  </p>
                  <h2
                    className="mt-2 text-2xl font-semibold"
                    id="property-details-title"
                  >
                    {selectedProperty.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {selectedProperty.location}
                  </p>
                </div>
                <button
                  className="icon-button"
                  aria-label="Zamknij szczegóły"
                  onClick={() => setDetailsOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              <div className="mt-5">
                <PropertyPhotoGallery
                  activeIndex={activeSelectedPhotoIndex}
                  onActiveIndexChange={setActivePhotoIndex}
                  property={selectedProperty}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="metric-tile">
                  <span>Średnia</span>
                  <strong>{selectedPropertyRating.toFixed(1)}</strong>
                </div>
                <div className="metric-tile">
                  <span>Status</span>
                  <strong>{selectedProperty.status}</strong>
                </div>
                <div className="metric-tile">
                  <span>Cena</span>
                  <strong>{formatPrice(selectedProperty.price)}</strong>
                </div>
                <div className="metric-tile">
                  <span>Powierzchnia</span>
                  <strong>{selectedProperty.area}</strong>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">
                {selectedProperty.description}
              </p>
              {selectedProperty.sourceUrl ? (
                <a
                  className="external-link mt-4"
                  href={selectedProperty.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Otwórz ogłoszenie zewnętrzne
                </a>
              ) : null}

              <div className="mt-6">
                <h3 className="text-sm font-semibold">Kryteria oceny</h3>
                <div className="mt-3 space-y-3">
                  {selectedProperty.criteria.map((criterion) => (
                    <div
                      className="criterion-row"
                      key={criterion.label}
                      style={{
                        "--criterion-color": getCriterionColor(criterion.score),
                      } as CSSProperties}
                    >
                      <span>{criterion.label}</span>
                      <div className="criterion-bar" aria-hidden="true">
                        <span style={{ width: `${criterion.score * 10}%` }} />
                      </div>
                      <strong>{criterion.score}/10</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Zdjęcia</h3>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {selectedPhotoCount} zdjęć przy tej nieruchomości
                    </p>
                  </div>
                </div>

                <div className="photo-actions mt-3">
                  <label className="secondary-button justify-center">
                    <Camera aria-hidden="true" className="size-4" />
                    Dodaj serię
                    <input
                      accept="image/*"
                      multiple
                      onChange={addPhotosToSelectedProperty}
                      type="file"
                    />
                  </label>
                  <label className="secondary-button justify-center">
                    <Camera aria-hidden="true" className="size-4" />
                    Aparat
                    <input
                      accept="image/*"
                      capture="environment"
                      onChange={addPhotosToSelectedProperty}
                      type="file"
                    />
                  </label>
                </div>

                {photoActionError ? (
                  <p className="form-error mt-3" role="alert">
                    {photoActionError}
                  </p>
                ) : null}

                {selectedProperty.photos.length > 0 ? (
                  <div className="photo-grid mt-3">
                    {selectedProperty.photos.map((photo) => (
                      <figure className="photo-thumb" key={photo.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.name} />
                      </figure>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state mt-3">
                    <Camera aria-hidden="true" className="size-5" />
                    <p>Dodaj zdjęcia z telefonu, aparatu albo komputera.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  className="secondary-button flex-1 justify-center"
                  onClick={() => openEditProperty(selectedProperty)}
                  type="button"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Edytuj
                </button>
                <button
                  className="danger-button flex-1 justify-center"
                  onClick={deleteSelectedProperty}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Usuń
                </button>
              </div>
              {deleteActionError ? (
                <p className="form-error mt-3" role="alert">
                  {deleteActionError}
                </p>
              ) : null}
            </section>
          </div>
        ) : null}

        {settingsOpen ? (
          <div className="details-backdrop" role="presentation">
            <section className="details-panel" aria-labelledby="settings-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Bezpieczeństwo i współpraca
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold" id="settings-title">
                    Ustawienia projektu
                  </h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Zamknij ustawienia"
                  onClick={() => setSettingsOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              {passwordRecoveryOpen ? (
                <div className="property-form">
                  <form className="auth-form" onSubmit={updateRecoveredPassword}>
                    <label className="form-field">
                      <span>Nowe hasło</span>
                      <input
                        autoComplete="new-password"
                        value={newAuthPassword}
                        onChange={(event) => setNewAuthPassword(event.target.value)}
                        placeholder="Minimum 6 znaków"
                        type="password"
                      />
                    </label>
                    <button
                      className="primary-button justify-center"
                      disabled={authBusy}
                      type="submit"
                    >
                      <KeyRound aria-hidden="true" className="size-4" />
                      {authBusy ? "Zapisuję..." : "Zapisz nowe hasło"}
                    </button>
                  </form>

                  {authMessage ? (
                    <p className="form-help" role="status">
                      {authMessage}
                    </p>
                  ) : null}
                </div>
              ) : !currentUser ? (
                <div className="property-form">
                  <div className="auth-mode-toggle" aria-label="Tryb logowania">
                    <button
                      data-active={authMode === "sign-in"}
                      onClick={() => {
                        setAuthMode("sign-in");
                        setAuthMessage("");
                      }}
                      type="button"
                    >
                      Logowanie
                    </button>
                    <button
                      data-active={authMode === "sign-up"}
                      onClick={() => {
                        setAuthMode("sign-up");
                        setAuthMessage("");
                      }}
                      type="button"
                    >
                      Rejestracja
                    </button>
                  </div>

                  <form className="auth-form" onSubmit={handleEmailPasswordAuth}>
                    <label className="form-field">
                      <span>Email</span>
                      <input
                        autoComplete="email"
                        value={authEmail}
                        onChange={(event) => setAuthEmail(event.target.value)}
                        placeholder="email@przyklad.pl"
                        type="email"
                      />
                    </label>
                    <label className="form-field">
                      <span>Hasło</span>
                      <input
                        autoComplete={authMode === "sign-up" ? "new-password" : "current-password"}
                        value={authPassword}
                        onChange={(event) => setAuthPassword(event.target.value)}
                        placeholder="Minimum 6 znaków"
                        type="password"
                      />
                    </label>
                    <button className="primary-button justify-center" disabled={authBusy} type="submit">
                      {authMode === "sign-up" ? (
                        <KeyRound aria-hidden="true" className="size-4" />
                      ) : (
                        <LogIn aria-hidden="true" className="size-4" />
                      )}
                      {authBusy
                        ? authMode === "sign-up"
                          ? "Tworzę konto..."
                          : "Loguję..."
                        : authMode === "sign-up"
                          ? "Utwórz konto"
                          : "Zaloguj"}
                    </button>
                  </form>

                  {authMode === "sign-in" ? (
                    <button
                      className="auth-link-button"
                      disabled={authBusy}
                      onClick={requestPasswordReset}
                      type="button"
                    >
                      Nie pamiętasz hasła?
                    </button>
                  ) : null}

                  {authMessage ? (
                    <p className="form-help" role="status">
                      {authMessage}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="property-form">
                  <div className="settings-summary">
                    <div>
                      <span>Zalogowano jako</span>
                      <strong>{currentUser.email}</strong>
                    </div>
                    <button className="secondary-button" onClick={signOut} type="button">
                      <LogOut aria-hidden="true" className="size-4" />
                      Wyloguj
                    </button>
                  </div>

                  <label className="form-field">
                    <span>Aktywny projekt</span>
                    <select
                      value={activeProjectId ?? ""}
                      onChange={(event) => setActiveProjectId(event.target.value || null)}
                    >
                      {projects.length === 0 ? (
                        <option value="">Brak projektów</option>
                      ) : null}
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <form className="settings-inline-form" onSubmit={createProject}>
                    <label className="form-field">
                      <span>Nowy projekt</span>
                      <input
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        placeholder="np. Dom pod Katowicami"
                      />
                    </label>
                    <button className="secondary-button justify-center" type="submit">
                      <FolderPlus aria-hidden="true" className="size-4" />
                      Utwórz
                    </button>
                  </form>

                  <form className="settings-inline-form" onSubmit={inviteCollaborator}>
                    <label className="form-field">
                      <span>Zaproszenie</span>
                      <input
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="email@przyklad.pl"
                        type="email"
                      />
                    </label>
                    <button
                      className="secondary-button justify-center"
                      disabled={!activeProjectId}
                      type="submit"
                    >
                      <UserPlus aria-hidden="true" className="size-4" />
                      Zaproś
                    </button>
                  </form>

                  {inviteInstructions ? (
                    <div className="invite-instructions">
                      <p>{inviteInstructions}</p>
                      <button
                        className="secondary-button justify-center"
                        onClick={copyInviteInstructions}
                        type="button"
                      >
                        Skopiuj instrukcję
                      </button>
                    </div>
                  ) : null}

                  <div className="settings-list">
                    <h3>Członkowie</h3>
                    {projectMembers.length > 0 ? (
                      projectMembers.map((member) => (
                        <div className="settings-list-row" key={`${member.projectId}-${member.userId}`}>
                          <span>{member.userId}</span>
                          <strong>{member.role}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--color-muted)]">
                        Brak widocznych członków albo brak uprawnień admina.
                      </p>
                    )}
                  </div>

                  <div className="settings-list">
                    <h3>Zaproszenia</h3>
                    {projectInvitations.length > 0 ? (
                      projectInvitations.map((invitation) => (
                        <div className="settings-list-row" key={invitation.id}>
                          <span>{invitation.email}</span>
                          <strong>{invitation.acceptedAt ? "przyjęte" : invitation.role}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--color-muted)]">
                        Brak zaproszeń dla aktywnego projektu.
                      </p>
                    )}
                  </div>

                  {settingsError ? (
                    <p className="form-error" role="alert">
                      {settingsError}
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {addPropertyOpen ? (
          <div className="details-backdrop" role="presentation">
            <section className="details-panel" aria-labelledby="add-property-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    {isEditingProperty ? "Edycja nieruchomości" : "Nowa nieruchomość"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold" id="add-property-title">
                    {isEditingProperty ? "Popraw dane wpisu" : "Dodaj punkt na mapie"}
                  </h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Zamknij dodawanie nieruchomości"
                  onClick={closeAddProperty}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              <form className="property-form" onSubmit={handleAddProperty}>
                <div className="form-field">
                  <span>Typ</span>
                  <div className="segmented-control">
                    <button
                      aria-pressed={propertyForm.type === "land"}
                      onClick={() => updatePropertyType("land")}
                      type="button"
                    >
                      <Mountain aria-hidden="true" className="size-4" />
                      ZIEMIA
                    </button>
                    <button
                      aria-pressed={propertyForm.type === "house"}
                      onClick={() => updatePropertyType("house")}
                      type="button"
                    >
                      <Home aria-hidden="true" className="size-4" />
                      DOM
                    </button>
                  </div>
                </div>

                <label className="form-field">
                  <span>Nazwa</span>
                  <input
                    value={propertyForm.title}
                    onChange={(event) => updatePropertyForm("title", event.target.value)}
                    placeholder="np. Działka przy parku"
                    required
                  />
                </label>

                <label className="form-field">
                  <span className="field-label-with-help">
                    Lokalizacja
                    <span className="info-popover">
                      <button
                        aria-describedby="location-help"
                        aria-label="Jak zapisywana jest lokalizacja"
                        className="info-popover__trigger"
                        type="button"
                      >
                        <Info aria-hidden="true" className="size-3.5" />
                      </button>
                      <span className="info-popover__content" id="location-help" role="tooltip">
                        {manualPropertyCoordinates
                          ? "Ten wpis zostanie zapisany w punkcie wskazanym długim przytrzymaniem na mapie."
                          : "Adres zostanie sprawdzony przez geokodowanie OpenStreetMap/Nominatim i zapisany jako współrzędne na mapie."}
                      </span>
                    </span>
                  </span>
                  <input
                    value={propertyForm.location}
                    onChange={(event) => updatePropertyForm("location", event.target.value)}
                    placeholder="np. Legionów Polskich, Dąbrowa Górnicza"
                    required
                  />
                  {manualPropertyCoordinates ? (
                    <span className="address-lookup" data-state="pinned">
                      Punkt wskazany na mapie: {formatCoordinates(manualPropertyCoordinates)}
                    </span>
                  ) : null}
                  {addressLookup.status !== "idle" &&
                  !manualPropertyCoordinates &&
                  addressLookup.query === propertyForm.location.trim() ? (
                    <span className="address-lookup" data-state={addressLookup.status}>
                      {addressLookup.status === "found"
                        ? addressLookup.label
                        : addressLookup.message}
                    </span>
                  ) : null}
                </label>

                <div className="form-grid">
                  <label className="form-field">
                    <span className="field-label-with-help">
                      Cena
                      <span className="info-popover">
                        <button
                          aria-describedby="price-help"
                          aria-label="Jak wpisywać cenę"
                          className="info-popover__trigger"
                          type="button"
                        >
                          <Info aria-hidden="true" className="size-3.5" />
                        </button>
                        <span className="info-popover__content" id="price-help" role="tooltip">
                          Wpisz kwotę w tysiącach, np. 425 = 425 tys. zł.
                        </span>
                      </span>
                    </span>
                    <input
                      value={propertyForm.price}
                      onChange={(event) => updatePropertyForm("price", event.target.value)}
                      placeholder="425"
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Powierzchnia</span>
                    <input
                      value={propertyForm.area}
                      onChange={(event) => updatePropertyForm("area", event.target.value)}
                      placeholder="1 100 m²"
                      required
                    />
                  </label>
                </div>

                <label className="form-field">
                  <span>Link zewnętrzny</span>
                  <input
                    value={propertyForm.sourceUrl}
                    onChange={(event) => updatePropertyForm("sourceUrl", event.target.value)}
                    placeholder="np. https://www.otodom.pl/..."
                    type="url"
                  />
                </label>

                <div className="form-grid">
                  <div className="metric-tile">
                    <span>Średnia ocena</span>
                    <strong>{propertyFormRating.toFixed(1)}</strong>
                  </div>
                  <label className="form-field">
                    <span>Status</span>
                    <select
                      value={propertyForm.status}
                      onChange={(event) =>
                        updatePropertyForm("status", event.target.value as PropertyStatus)
                      }
                    >
                      <option>Do obejrzenia</option>
                      <option>Obiecujące</option>
                      <option>W trakcie</option>
                      <option>Odrzucone</option>
                    </select>
                  </label>
                </div>

                <div className="criteria-editor">
                  <div>
                    <h3>Kryteria oceny</h3>
                    <p>Ocena końcowa liczy się automatycznie jako średnia.</p>
                  </div>
                  {criteriaByType[propertyForm.type].map((criterion) => (
                    <label className="criterion-input" key={criterion}>
                      <span>{criterion}</span>
                      <input
                        max="10"
                        min="1"
                        step="1"
                        type="range"
                        value={propertyForm.criteriaScores[criterion] ?? "7"}
                        onChange={(event) =>
                          updateCriterionScore(criterion, event.target.value)
                        }
                      />
                      <strong>{propertyForm.criteriaScores[criterion] ?? "7"}/10</strong>
                    </label>
                  ))}
                </div>

                <div className="photo-uploader">
                  <div>
                    <h3 className="field-label-with-help">
                      Zdjęcia
                      <span className="info-popover">
                        <button
                          aria-describedby="photos-help"
                          aria-label="Jak przechowywane są zdjęcia"
                          className="info-popover__trigger"
                          type="button"
                        >
                          <Info aria-hidden="true" className="size-3.5" />
                        </button>
                        <span className="info-popover__content" id="photos-help" role="tooltip">
                          Nowe zdjęcia trafiają do prywatnego Supabase Storage i są dostępne tylko dla członków aktywnego projektu.
                        </span>
                      </span>
                    </h3>
                    <p>Możesz dodać jedno zdjęcie albo od razu całą serię.</p>
                  </div>
                  <div className="photo-actions">
                    <label className="secondary-button justify-center">
                      <Camera aria-hidden="true" className="size-4" />
                      Dodaj serię
                      <input
                        accept="image/*"
                        multiple
                        onChange={addPhotosToForm}
                        type="file"
                      />
                    </label>
                    <label className="secondary-button justify-center">
                      <Camera aria-hidden="true" className="size-4" />
                      Aparat
                      <input
                        accept="image/*"
                        capture="environment"
                        onChange={addPhotosToForm}
                        type="file"
                      />
                    </label>
                  </div>

                  {propertyForm.photos.length > 0 ? (
                    <div className="photo-grid">
                      {propertyForm.photos.map((photo) => (
                        <figure className="photo-thumb" key={photo.id}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.url} alt={photo.name} />
                        </figure>
                      ))}
                    </div>
                  ) : null}
                </div>

                <label className="form-field">
                  <span>Opis</span>
                  <textarea
                    value={propertyForm.description}
                    onChange={(event) =>
                      updatePropertyForm("description", event.target.value)
                    }
                    placeholder="Krótka notatka, co warto sprawdzić..."
                    rows={4}
                  />
                </label>

                {propertyFormError ? (
                  <p className="form-error" role="alert">
                    {propertyFormError}
                  </p>
                ) : null}

                <div className="form-actions">
                  <button
                    className="secondary-button justify-center"
                    onClick={closeAddProperty}
                    type="button"
                  >
                    Anuluj
                  </button>
                  <button className="primary-button justify-center" type="submit">
                    {isEditingProperty ? (
                      <Pencil aria-hidden="true" className="size-4" />
                    ) : (
                      <Plus aria-hidden="true" className="size-4" />
                    )}
                    {isEditingProperty ? "Zapisz zmiany" : "Zapisz"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
