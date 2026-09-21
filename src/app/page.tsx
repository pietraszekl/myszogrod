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
  Compass,
  Home,
  Info,
  LocateFixed,
  MapPin,
  Mountain,
  Pencil,
  Plus,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { createClient as createSupabaseClient } from "@/lib/supabase/browser";

type PropertyType = "land" | "house";
type PropertyStatus = "Do obejrzenia" | "Obiecujące" | "W trakcie" | "Odrzucone";
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

type PropertyPhoto = {
  file?: File;
  id: string;
  name: string;
  url: string;
};

type Property = {
  id: string;
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
  title: string;
  property_type: PropertyType;
  location: string;
  price: string;
  area: string;
  status: PropertyStatus;
  source_url: string | null;
  description: string;
  note_count: number;
  photo_count: number;
  photos: unknown;
  criteria: unknown;
  coordinates: unknown;
  x: number | string;
  y: number | string;
};

type PropertyInsert = {
  title: string;
  property_type: PropertyType;
  location: string;
  price: string;
  area: string;
  status: PropertyStatus;
  source_url: string | null;
  description: string;
  note_count: number;
  photo_count: number;
  photos: PropertyPhoto[];
  criteria: Property["criteria"];
  coordinates: Coordinates;
  x: number;
  y: number;
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
    .map((photo) => {
      if (
        !photo ||
        typeof photo !== "object" ||
        !("id" in photo) ||
        !("name" in photo) ||
        !("url" in photo)
      ) {
        return null;
      }

      if (
        typeof photo.id !== "string" ||
        typeof photo.name !== "string" ||
        typeof photo.url !== "string" ||
        photo.url.startsWith("blob:")
      ) {
        return null;
      }

      return {
        id: photo.id,
        name: photo.name,
        url: photo.url,
      };
    })
    .filter((photo): photo is PropertyPhoto => photo !== null);
}

function mapPropertyRow(row: PropertyRow): Property {
  return {
    id: row.id,
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
  resetToken,
}: {
  properties: Property[];
  selectedPropertyId: string | null;
  userLocation: Coordinates | null;
  onSelect: (propertyId: string) => void;
  onLongPress: (coordinates: Coordinates) => void;
  resetToken: number;
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
    if (!map) {
      return;
    }

    if (userLocation) {
      map.fitBounds(getRadiusBounds(userLocation, userLocationRadiusKm), {
        duration: 500,
        maxZoom: 11.8,
        padding: getUserLocationViewportPadding(),
      });
      return;
    }

    map.easeTo({
      center: [defaultMapCenter.lng, defaultMapCenter.lat],
      duration: 500,
      padding: getMapViewportPadding(),
      zoom: 10,
    });
  }, [resetToken, userLocation]);

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

export default function HomePage() {
  const [properties, setProperties] = useState(initialProperties);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(
    createInitialPropertyForm(),
  );
  const [propertyFormError, setPropertyFormError] = useState("");
  const [propertiesLoadError, setPropertiesLoadError] = useState("");
  const [photoActionError, setPhotoActionError] = useState("");
  const [deleteActionError, setDeleteActionError] = useState("");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [addressLookup, setAddressLookup] =
    useState<AddressLookupState>(idleAddressLookup);
  const [manualPropertyCoordinates, setManualPropertyCoordinates] =
    useState<Coordinates | null>(null);
  const [mapResetToken, setMapResetToken] = useState(0);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");

  const selectedProperty = selectedPropertyId
    ? properties.find((property) => property.id === selectedPropertyId)
    : undefined;
  const editingProperty = editingPropertyId
    ? properties.find((property) => property.id === editingPropertyId)
    : undefined;
  const isEditingProperty = Boolean(editingProperty);
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
    let ignoreLoadedProperties = false;

    async function loadProperties() {
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (!ignoreLoadedProperties) {
          setProperties((data as PropertyRow[] | null ?? []).map(mapPropertyRow));
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
  }, []);

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

  const selectProperty = useCallback((propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setActivePhotoIndex(0);
    setPhotoActionError("");
    setDeleteActionError("");
  }, []);

  function resetMapPosition() {
    setMapResetToken((token) => token + 1);
  }

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
    setPropertyForm(createInitialPropertyForm());
    setPropertyFormError("");
    setEditingPropertyId(null);
    setManualPropertyCoordinates(coordinates ?? null);
    setAddressLookup(idleAddressLookup);
    setAddPropertyOpen(true);
  }, []);

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

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Nie udało się odczytać zdjęcia."));
      });
      reader.addEventListener("error", () => {
        reject(new Error("Nie udało się odczytać zdjęcia."));
      });
      reader.readAsDataURL(file);
    });
  }

  async function preparePhotosForPersistence(photos: PropertyPhoto[]) {
    return Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        name: photo.name,
        url: photo.file ? await readFileAsDataUrl(photo.file) : photo.url,
      })),
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
      const persistedPhotos = await preparePhotosForPersistence(photos);
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

      const updatedProperty = mapPropertyRow(data[0] as PropertyRow);
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

    try {
      persistedPhotos = await preparePhotosForPersistence(propertyForm.photos);
    } catch (error) {
      const message = getErrorMessage(error);
      setPropertyFormError(`Nie udało się przygotować zdjęć: ${message}`);
      return;
    }

    const propertyPayload = {
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
        const { data, error } = await supabase
          .from("properties")
          .update({
            ...propertyPayload,
            photo_count: persistedPhotos.length,
          })
          .eq("id", propertyBeingEdited.id)
          .select("*");

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

        const updatedProperty = mapPropertyRow(data[0] as PropertyRow);

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
      note_count: 0,
      photo_count: persistedPhotos.length,
      x: 50,
      y: 50,
    };

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("properties")
        .insert(propertyInsert)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "brak danych zwrotnych");
      }

      const newProperty = mapPropertyRow(data as PropertyRow);

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
    <main className="min-h-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <section className="relative min-h-screen">
        <OpenFreePropertyMap
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          userLocation={userLocation}
          onSelect={selectProperty}
          onLongPress={openAddProperty}
          resetToken={mapResetToken}
        />

        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6 lg:hidden">
          <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-[28px] border border-black/10 bg-white/88 px-3 py-3 shadow-[0_18px_70px_rgba(29,38,35,0.12)] backdrop-blur-xl">
            <AppBrand />

            <div className="flex items-center gap-2">
              <button className="icon-button hidden sm:inline-flex" aria-label="Powiadomienia">
                <Bell aria-hidden="true" className="size-4" />
              </button>
              <button className="icon-button" aria-label="Filtry mapy">
                <SlidersHorizontal aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <aside className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-[410px] p-6 lg:block">
          <div className="pointer-events-auto flex h-full flex-col rounded-[30px] border border-black/10 bg-white/90 shadow-[0_24px_90px_rgba(29,38,35,0.14)] backdrop-blur-xl">
            <div className="border-b border-black/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <AppBrand />
              </div>

              <div className="mt-6 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-muted)]">
                    Projekt · Śląskie
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    Lista nieruchomości
                  </h2>
                </div>
                <button className="icon-button shrink-0" aria-label="Filtry listy">
                  <SlidersHorizontal aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {propertiesLoadError ? (
                <p className="form-error" role="alert">
                  {propertiesLoadError}
                </p>
              ) : null}
              {properties.map((property) => (
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
                  <p>Brak nieruchomości. Dodaj pierwszą pozycję ręcznie.</p>
                  <button
                    className="secondary-button justify-center"
                    onClick={() => openAddProperty()}
                    type="button"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Dodaj
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
          <button
            className="icon-button pointer-events-auto"
            aria-label="Wyśrodkuj mapę"
            onClick={resetMapPosition}
            type="button"
          >
            <Compass aria-hidden="true" className="size-4" />
          </button>
          <button
            className="map-add-button"
            aria-label="Dodaj nieruchomość"
            onClick={() => openAddProperty()}
            type="button"
          >
            <Plus aria-hidden="true" className="size-5" />
          </button>
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
                          Zdjęcia są na razie przechowywane lokalnie w tej wersji demo. Docelowo trafią do Supabase Storage.
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
