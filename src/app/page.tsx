"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  AttributionControl,
  type GeoJSONSource,
  Map as MapLibre,
  type Map as MapLibreMap,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";
import {
  Bell,
  Camera,
  Compass,
  ExternalLink,
  Filter,
  Home,
  Layers3,
  LocateFixed,
  MapPin,
  MessageSquareText,
  Mountain,
  Navigation2,
  Plus,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

import { createClient as createSupabaseClient } from "@/lib/supabase/browser";

type PropertyType = "land" | "house";
type PropertyFilter = "all" | PropertyType;
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
  description: string;
  criteriaScores: Record<string, string>;
  photos: PropertyPhoto[];
};

type PropertyPhoto = {
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
  description: string;
  note_count: number;
  photo_count: number;
  photos: PropertyPhoto[];
  criteria: Property["criteria"];
  coordinates: Coordinates;
  x: number;
  y: number;
};

const defaultMapCenter: Coordinates = { lat: 50.1908, lng: 18.9238 };
const openFreeMapStyleUrl = "https://tiles.openfreemap.org/styles/liberty";
const userLocationRadiusKm = 2;
const userRadiusSourceId = "user-location-radius";
const userRadiusFillLayerId = "user-location-radius-fill";
const userRadiusLineLayerId = "user-location-radius-line";

setWorkerUrl("/maplibre-gl-worker.mjs");

function getMapViewportPadding() {
  if (typeof window !== "undefined" && window.innerWidth >= 1024) {
    return { bottom: 40, left: 430, right: 470, top: 110 };
  }

  return { bottom: 270, left: 20, right: 20, top: 112 };
}

function createEmptyFeatureCollection() {
  return {
    type: "FeatureCollection" as const,
    features: [],
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

function getPropertyRating(property: Property) {
  if (property.criteria.length === 0) {
    return 1;
  }

  const total = property.criteria.reduce((sum, criterion) => sum + criterion.score, 0);
  return Math.round((total / property.criteria.length) * 10) / 10;
}

function ratingTone(rating: number) {
  if (rating >= 8) return "excellent";
  if (rating >= 6) return "good";
  if (rating >= 4) return "average";
  return "low";
}

function TypeIcon({ type, className }: { type: PropertyType; className?: string }) {
  const Icon = type === "land" ? Mountain : Home;

  return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />;
}

function createCoordinatesForIndex(index: number): Coordinates {
  return {
    lat: defaultMapCenter.lat + ((index * 0.021) % 0.16) - 0.08,
    lng: defaultMapCenter.lng + ((index * 0.027) % 0.22) - 0.11,
  };
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
        typeof photo.url !== "string"
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

function PropertyMarkerContent({
  property,
  rating,
}: {
  property: Property;
  rating: number;
}) {
  return (
    <>
      <span className="property-marker__halo" />
      <span className="property-marker__icon">
        <TypeIcon type={property.type} className="size-5" />
      </span>
      <span className="property-marker__rating">{rating}</span>
      <span className="property-marker__label">{property.title}</span>
    </>
  );
}

function UserLocationMarkerContent() {
  return (
    <>
      <span className="user-location-marker__pulse" />
      <span className="user-location-marker__core">
        <Navigation2 aria-hidden="true" className="size-5 fill-current" />
      </span>
    </>
  );
}

type MapMarkerInstance = {
  marker: Marker;
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
  resetToken,
}: {
  properties: Property[];
  selectedPropertyId: string | null;
  userLocation: Coordinates | null;
  onSelect: (propertyId: string) => void;
  resetToken: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapMarkerInstance[]>([]);
  const userMarkerRef = useRef<MapMarkerInstance | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");

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
      setMapStatus("ready");
    });
    map.on("error", () => {
      if (!map.loaded()) {
        setMapStatus("error");
      }
    });
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(disposeMapMarker);
      markersRef.current = [];
      if (userMarkerRef.current) {
        disposeMapMarker(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach(disposeMapMarker);
    markersRef.current = properties.map((property) => {
      const rating = getPropertyRating(property);
      const markerElement = document.createElement("button");
      markerElement.className = "property-marker maplibre-property-marker";
      markerElement.dataset.tone = ratingTone(rating);
      markerElement.dataset.selected = String(property.id === selectedPropertyId);
      markerElement.type = "button";
      markerElement.setAttribute("aria-label", `${property.title}, rating ${rating}`);
      markerElement.setAttribute(
        "aria-pressed",
        String(property.id === selectedPropertyId),
      );
      markerElement.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(property.id);
      });

      const root = createRoot(markerElement);
      root.render(<PropertyMarkerContent property={property} rating={rating} />);

      const marker = new Marker({
        anchor: "center",
        element: markerElement,
      })
        .setLngLat([property.coordinates.lng, property.coordinates.lat])
        .addTo(map);

      return { marker, root };
    });
  }, [properties, selectedPropertyId, onSelect]);

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

    if (userMarkerRef.current) {
      disposeMapMarker(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (!userLocation) {
      return;
    }

    const markerElement = document.createElement("div");
    markerElement.className = "user-location-marker";
    markerElement.setAttribute("aria-label", "Twoja obecna lokalizacja");
    markerElement.setAttribute("role", "img");

    const root = createRoot(markerElement);
    root.render(<UserLocationMarkerContent />);

    const marker = new Marker({
      anchor: "center",
      element: markerElement,
    })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);

    userMarkerRef.current = { marker, root };

    map.fitBounds(getRadiusBounds(userLocation, userLocationRadiusKm), {
      duration: 700,
      maxZoom: 11.8,
      padding: getMapViewportPadding(),
    });
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
        padding: getMapViewportPadding(),
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
      zoom: Math.max(map.getZoom(), 10.8),
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

function getLocationStatusText(status: LocationStatus) {
  if (status === "loading") return "Ustalam lokalizację...";
  if (status === "ready") return "Promień 2 km aktywny";
  if (status === "denied") return "Zezwól na lokalizację w przeglądarce";
  if (status === "unsupported") return "Ta przeglądarka nie udostępnia lokalizacji";
  if (status === "error") return "Nie udało się pobrać lokalizacji";
  return "Pokaż moją lokalizację";
}

export default function HomePage() {
  const [properties, setProperties] = useState(initialProperties);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(
    createInitialPropertyForm(),
  );
  const [propertyFormError, setPropertyFormError] = useState("");
  const [propertiesLoadError, setPropertiesLoadError] = useState("");
  const [mapResetToken, setMapResetToken] = useState(0);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");

  const filteredProperties = useMemo(() => {
    return properties.filter(
      (property) => propertyFilter === "all" || property.type === propertyFilter,
    );
  }, [properties, propertyFilter]);

  const selectedProperty = selectedPropertyId
    ? properties.find((property) => property.id === selectedPropertyId)
    : undefined;
  const selectedPhotoCount = selectedProperty
    ? selectedProperty.photoCount + selectedProperty.photos.length
    : 0;
  const topRating =
    properties.length > 0
      ? Math.max(...properties.map((property) => getPropertyRating(property)))
      : null;
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
          const message = error instanceof Error ? error.message : "Nieznany błąd";
          setPropertiesLoadError(`Nie udało się pobrać danych z Supabase: ${message}`);
        }
      }
    }

    loadProperties();

    return () => {
      ignoreLoadedProperties = true;
    };
  }, []);

  function selectProperty(propertyId: string) {
    setSelectedPropertyId(propertyId);
  }

  function applyFilter(nextFilter: PropertyFilter) {
    setPropertyFilter(nextFilter);

    const nextProperties = filterProperties(nextFilter);
    if (
      selectedPropertyId &&
      !nextProperties.some((property) => property.id === selectedPropertyId)
    ) {
      setSelectedPropertyId(null);
      setDetailsOpen(false);
    }
  }

  function filterProperties(filter: PropertyFilter) {
    return properties.filter(
      (property) => filter === "all" || property.type === filter,
    );
  }

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

  function openAddProperty() {
    setPropertyForm(createInitialPropertyForm());
    setPropertyFormError("");
    setAddPropertyOpen(true);
  }

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

  function createPhoto(file: File): PropertyPhoto {
    return {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `photo-${Date.now()}-${file.name}`,
      name: file.name,
      url: URL.createObjectURL(file),
    };
  }

  function getPhotosFromInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    return files.filter((file) => file.type.startsWith("image/")).map(createPhoto);
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

  function addPhotosToSelectedProperty(event: ChangeEvent<HTMLInputElement>) {
    const photos = getPhotosFromInput(event);
    if (photos.length === 0) {
      return;
    }

    setProperties((currentProperties) =>
      currentProperties.map((property) =>
        property.id === selectedPropertyId
          ? {
              ...property,
              photos: [...property.photos, ...photos],
            }
          : property,
      ),
    );
  }

  async function handleAddProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = propertyForm.title.trim();
    const location = propertyForm.location.trim();
    const price = propertyForm.price.trim();
    const area = propertyForm.area.trim();
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

    const nextIndex = properties.length + 1;
    const propertyInsert: PropertyInsert = {
      title,
      property_type: propertyForm.type,
      location,
      price,
      area,
      status: propertyForm.status,
      description:
        description ||
        "Nowa nieruchomość dodana ręcznie. Uzupełnij notatki, zdjęcia i kryteria w kolejnym kroku.",
      note_count: 0,
      photo_count: 0,
      photos: propertyForm.photos,
      criteria,
      coordinates: createCoordinatesForIndex(nextIndex),
      x: 28 + ((nextIndex * 13) % 44),
      y: 30 + ((nextIndex * 17) % 42),
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
      const message = error instanceof Error ? error.message : "Nieznany błąd";
      setPropertyFormError(
        `Nie udało się zapisać w Supabase: ${message}`,
      );
      return;
    }
    setPropertyFilter("all");
    setPropertyForm(createInitialPropertyForm());
    setPropertyFormError("");
    setAddPropertyOpen(false);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <section className="relative min-h-screen">
        <OpenFreePropertyMap
          properties={filteredProperties}
          selectedPropertyId={selectedPropertyId}
          userLocation={userLocation}
          onSelect={selectProperty}
          resetToken={mapResetToken}
        />

        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6 lg:px-8">
          <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-[28px] border border-black/10 bg-white/88 px-3 py-3 shadow-[0_18px_70px_rgba(29,38,35,0.12)] backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-ink)] text-white">
                <MapPin aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Logbook nieruchomości
                </p>
                <h1 className="truncate text-base font-semibold sm:text-lg">
                  Myszogród 🐭
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="icon-button hidden sm:inline-flex" aria-label="Powiadomienia">
                <Bell aria-hidden="true" className="size-4" />
              </button>
              <button className="icon-button" aria-label="Filtry mapy">
                <SlidersHorizontal aria-hidden="true" className="size-4" />
              </button>
              <button
                className="primary-button"
                aria-label="Dodaj nieruchomość"
                onClick={openAddProperty}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Dodaj</span>
              </button>
            </div>
          </div>
        </header>

        <aside className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-[410px] px-6 pb-6 pt-28 lg:block">
          <div className="pointer-events-auto flex h-full flex-col rounded-[30px] border border-black/10 bg-white/90 shadow-[0_24px_90px_rgba(29,38,35,0.14)] backdrop-blur-xl">
            <div className="border-b border-black/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted)]">
                    Projekt · Śląskie
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {filteredProperties.length} nieruchomości
                  </h2>
                </div>
                <button className="icon-button" aria-label="Warstwy mapy">
                  <Layers3 aria-hidden="true" className="size-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="metric-tile">
                  <span>Top</span>
                  <strong>{topRating === null ? "—" : topRating.toFixed(1)}</strong>
                </div>
                <div className="metric-tile">
                  <span>DOM</span>
                  <strong>
                    {properties.filter((property) => property.type === "house").length}
                  </strong>
                </div>
                <div className="metric-tile">
                  <span>ZIEMIA</span>
                  <strong>
                    {properties.filter((property) => property.type === "land").length}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-black/10 p-4">
              <button
                className="filter-chip"
                data-active={propertyFilter === "all"}
                onClick={() => applyFilter("all")}
                type="button"
              >
                Wszystkie
              </button>
              <button
                className="filter-chip"
                data-active={propertyFilter === "house"}
                onClick={() => applyFilter("house")}
                type="button"
              >
                DOM
              </button>
              <button
                className="filter-chip"
                data-active={propertyFilter === "land"}
                onClick={() => applyFilter("land")}
                type="button"
              >
                ZIEMIA
              </button>
              <button className="icon-button ml-auto" aria-label="Więcej filtrów">
                <Filter aria-hidden="true" className="size-4" />
              </button>
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
                    <TypeIcon type={property.type} className="size-6" />
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
                      <span>{property.price}</span>
                      <span aria-hidden="true">·</span>
                      <span>{property.area}</span>
                    </div>
                  </div>
                </button>
              ))}
              {filteredProperties.length === 0 ? (
                <div className="empty-state">
                  <MapPin aria-hidden="true" className="size-5" />
                  <p>Brak nieruchomości. Dodaj pierwszą pozycję ręcznie.</p>
                  <button
                    className="secondary-button justify-center"
                    onClick={openAddProperty}
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
          <aside className="pointer-events-none absolute bottom-0 left-0 top-0 z-20 hidden w-[410px] px-6 pb-6 pt-28 lg:block">
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

              <div className="mt-5 details-photo sidebar-detail-photo">
                {selectedProperty.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedProperty.photos[0].url}
                    alt={`Główne zdjęcie: ${selectedProperty.photos[0].name}`}
                  />
                ) : (
                  <TypeIcon type={selectedProperty.type} className="size-10" />
                )}
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
                  <strong>{selectedProperty.price}</strong>
                </div>
                <div className="metric-tile">
                  <span>Powierzchnia</span>
                  <strong>{selectedProperty.area}</strong>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">
                {selectedProperty.description}
              </p>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Kryteria oceny</h3>
                  <RatingPill rating={selectedPropertyRating} />
                </div>
                <div className="mt-3 space-y-3">
                  {selectedProperty.criteria.map((criterion) => (
                    <div className="criterion-row" key={criterion.label}>
                      <span>{criterion.label}</span>
                      <div className="criterion-bar" aria-hidden="true">
                        <span style={{ width: `${criterion.score * 10}%` }} />
                      </div>
                      <strong>{criterion.score}/10</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
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
                <button className="primary-button justify-center" type="button">
                  <ExternalLink aria-hidden="true" className="size-4" />
                  Link
                </button>
              </div>
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

              <div className="mt-5 details-photo">
                {selectedProperty.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedProperty.photos[0].url}
                    alt={`Główne zdjęcie: ${selectedProperty.photos[0].name}`}
                  />
                ) : (
                  <TypeIcon type={selectedProperty.type} className="size-10" />
                )}
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
                  <strong>{selectedProperty.price}</strong>
                </div>
                <div className="metric-tile">
                  <span>Powierzchnia</span>
                  <strong>{selectedProperty.area}</strong>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">
                {selectedProperty.description}
              </p>

              <div className="mt-6">
                <h3 className="text-sm font-semibold">Kryteria oceny</h3>
                <div className="mt-3 space-y-3">
                  {selectedProperty.criteria.map((criterion) => (
                    <div className="criterion-row" key={criterion.label}>
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
                <button className="secondary-button flex-1 justify-center" type="button">
                  <MessageSquareText aria-hidden="true" className="size-4" />
                  Notatki
                </button>
                <button className="primary-button flex-1 justify-center" type="button">
                  <ExternalLink aria-hidden="true" className="size-4" />
                  Link
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {addPropertyOpen ? (
          <div className="details-backdrop" role="presentation">
            <section className="details-panel" aria-labelledby="add-property-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Nowa nieruchomość
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold" id="add-property-title">
                    Dodaj punkt na mapie
                  </h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Zamknij dodawanie nieruchomości"
                  onClick={() => setAddPropertyOpen(false)}
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
                  <span>Lokalizacja</span>
                  <input
                    value={propertyForm.location}
                    onChange={(event) => updatePropertyForm("location", event.target.value)}
                    placeholder="np. Gliwice, Śląskie"
                    required
                  />
                </label>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Cena</span>
                    <input
                      value={propertyForm.price}
                      onChange={(event) => updatePropertyForm("price", event.target.value)}
                      placeholder="520 000 zł"
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
                    <h3>Zdjęcia</h3>
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
                  ) : (
                    <p className="form-help">
                      Zdjęcia są na razie przechowywane lokalnie w tej wersji demo.
                      Docelowo trafią do Supabase Storage.
                    </p>
                  )}
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

                <p className="form-help">
                  Pozycja na mapie jest na razie ustawiana automatycznie w tej demo-warstwie.
                  Przy OpenFreeMap wybierzemy punkt kliknięciem na mapie.
                </p>

                {propertyFormError ? (
                  <p className="form-error" role="alert">
                    {propertyFormError}
                  </p>
                ) : null}

                <div className="form-actions">
                  <button
                    className="secondary-button justify-center"
                    onClick={() => setAddPropertyOpen(false)}
                    type="button"
                  >
                    Anuluj
                  </button>
                  <button className="primary-button justify-center" type="submit">
                    <Plus aria-hidden="true" className="size-4" />
                    Zapisz
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
