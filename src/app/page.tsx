"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type PointerEvent,
  useMemo,
  useState,
} from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
} from "@vis.gl/react-google-maps";
import {
  Bell,
  Camera,
  ChevronDown,
  Compass,
  ExternalLink,
  Filter,
  Home,
  Layers3,
  MapPin,
  Maximize2,
  MessageSquareText,
  Mountain,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from "lucide-react";

type PropertyType = "land" | "house";
type PropertyFilter = "all" | PropertyType;
type PropertyStatus = "Do obejrzenia" | "Obiecujące" | "W trakcie" | "Odrzucone";
type Coordinates = {
  lat: number;
  lng: number;
};

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

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const googleMapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "";
const hasGoogleMapsConfig = Boolean(googleMapsApiKey && googleMapsMapId);
const defaultMapCenter: Coordinates = { lat: 50.1908, lng: 18.9238 };

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

const demoProperties: Property[] = [
  {
    id: "p1",
    title: "Działka przy lesie",
    type: "land",
    location: "Mikołów, Śląskie",
    price: "392 000 zł",
    area: "1 180 m²",
    status: "Obiecujące",
    description:
      "Najmocniejszy kandydat w tej chwili: spokojne otoczenie, dobra ekspozycja i sensowny dojazd do Katowic.",
    noteCount: 6,
    photoCount: 14,
    photos: [],
    criteria: [
      { label: "Dojazd do Katowic", score: 9 },
      { label: "Media w drodze", score: 8 },
      { label: "Szkody górnicze", score: 9 },
      { label: "Sąsiedzi i otoczenie", score: 9 },
      { label: "Droga dojazdowa", score: 8 },
      { label: "MPZP / warunki zabudowy", score: 8 },
      { label: "Kształt i ustawność działki", score: 9 },
      { label: "Hałas i uciążliwości", score: 8 },
    ],
    coordinates: { lat: 50.171, lng: 18.904 },
    x: 42,
    y: 38,
  },
  {
    id: "p2",
    title: "Dom z dużym ogrodem",
    type: "house",
    location: "Tychy, Śląskie",
    price: "1 140 000 zł",
    area: "152 m² / 920 m²",
    status: "Do obejrzenia",
    description:
      "Dobry dom rodzinny z dużą działką. Wymaga sprawdzenia kosztów ogrzewania i stanu instalacji.",
    noteCount: 4,
    photoCount: 22,
    photos: [],
    criteria: [
      { label: "Dojazd do Katowic", score: 8 },
      { label: "Stan techniczny", score: 7 },
      { label: "Szkody górnicze", score: 7 },
      { label: "Sąsiedzi i otoczenie", score: 8 },
      { label: "Układ pomieszczeń", score: 7 },
      { label: "Ogrzewanie i koszty utrzymania", score: 6 },
      { label: "Stan działki / ogrodu", score: 9 },
      { label: "Hałas i uciążliwości", score: 7 },
    ],
    coordinates: { lat: 50.121, lng: 18.986 },
    x: 61,
    y: 54,
  },
  {
    id: "p3",
    title: "Parcela blisko DK81",
    type: "land",
    location: "Żory, Śląskie",
    price: "278 000 zł",
    area: "970 m²",
    status: "W trakcie",
    description:
      "Praktyczna lokalizacja i niezły potencjał, ale trzeba zweryfikować hałas oraz warunki zabudowy.",
    noteCount: 3,
    photoCount: 8,
    photos: [],
    criteria: [
      { label: "Dojazd do Katowic", score: 5 },
      { label: "Media w drodze", score: 6 },
      { label: "Szkody górnicze", score: 6 },
      { label: "Sąsiedzi i otoczenie", score: 6 },
      { label: "Droga dojazdowa", score: 8 },
      { label: "MPZP / warunki zabudowy", score: 7 },
      { label: "Kształt i ustawność działki", score: 7 },
      { label: "Hałas i uciążliwości", score: 5 },
    ],
    coordinates: { lat: 50.045, lng: 18.7 },
    x: 52,
    y: 71,
  },
  {
    id: "p4",
    title: "Dom do remontu",
    type: "house",
    location: "Katowice Podlesie",
    price: "760 000 zł",
    area: "118 m² / 640 m²",
    status: "Odrzucone",
    description:
      "Cena jest interesująca, ale zakres remontu i ryzyko techniczne obniżają priorytet oględzin.",
    noteCount: 9,
    photoCount: 18,
    photos: [],
    criteria: [
      { label: "Dojazd do Katowic", score: 9 },
      { label: "Stan techniczny", score: 3 },
      { label: "Szkody górnicze", score: 4 },
      { label: "Sąsiedzi i otoczenie", score: 6 },
      { label: "Układ pomieszczeń", score: 5 },
      { label: "Ogrzewanie i koszty utrzymania", score: 4 },
      { label: "Stan działki / ogrodu", score: 6 },
      { label: "Hałas i uciążliwości", score: 5 },
    ],
    coordinates: { lat: 50.181, lng: 18.966 },
    x: 33,
    y: 58,
  },
];

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

function PropertyMarker({
  property,
  onSelect,
  selected = false,
}: {
  property: Property;
  onSelect: (propertyId: string) => void;
  selected?: boolean;
}) {
  const rating = getPropertyRating(property);
  const tone = ratingTone(rating);

  return (
    <button
      className="property-marker"
      data-tone={tone}
      data-selected={selected}
      style={{ left: `${property.x}%`, top: `${property.y}%` }}
      aria-label={`${property.title}, rating ${rating}`}
      aria-pressed={selected}
      onClick={() => onSelect(property.id)}
      type="button"
    >
      <PropertyMarkerContent property={property} rating={rating} />
    </button>
  );
}

function GooglePropertyMarker({
  property,
  onSelect,
  selected = false,
}: {
  property: Property;
  onSelect: (propertyId: string) => void;
  selected?: boolean;
}) {
  const rating = getPropertyRating(property);
  const tone = ratingTone(rating);

  return (
    <AdvancedMarker
      position={property.coordinates}
      title={`${property.title}, rating ${rating}`}
      zIndex={selected ? 20 : 10}
    >
      <button
        className="property-marker google-property-marker"
        data-tone={tone}
        data-selected={selected}
        aria-label={`${property.title}, rating ${rating}`}
        aria-pressed={selected}
        onClick={() => onSelect(property.id)}
        type="button"
      >
        <PropertyMarkerContent property={property} rating={rating} />
      </button>
    </AdvancedMarker>
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

export default function HomePage() {
  const [properties, setProperties] = useState(demoProperties);
  const [selectedPropertyId, setSelectedPropertyId] = useState(demoProperties[0].id);
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(
    createInitialPropertyForm(),
  );
  const [propertyFormError, setPropertyFormError] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{
    pointerX: number;
    pointerY: number;
    mapX: number;
    mapY: number;
  } | null>(null);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesType = propertyFilter === "all" || property.type === propertyFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          property.title,
          property.location,
          property.status,
          property.price,
          property.type === "land" ? "ziemia działka grunt" : "dom house",
          property.criteria.map((criterion) => criterion.label).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesType && matchesQuery;
    });
  }, [properties, propertyFilter, searchQuery]);

  const selectedProperty =
    properties.find((property) => property.id === selectedPropertyId) ?? properties[0];
  const selectedPhotoCount = selectedProperty.photoCount + selectedProperty.photos.length;
  const topProperty = properties.reduce((best, property) =>
    getPropertyRating(property) > getPropertyRating(best) ? property : best,
  );
  const selectedPropertyRating = getPropertyRating(selectedProperty);
  const propertyFormRating =
    Object.values(propertyForm.criteriaScores).reduce(
      (sum, score) => sum + Number(score),
      0,
    ) / Object.values(propertyForm.criteriaScores).length;

  function selectProperty(propertyId: string) {
    setSelectedPropertyId(propertyId);
  }

  function applyFilter(nextFilter: PropertyFilter) {
    setPropertyFilter(nextFilter);

    const nextProperties = filterProperties(nextFilter, searchQuery);
    if (
      nextProperties.length > 0 &&
      !nextProperties.some((property) => property.id === selectedPropertyId)
    ) {
      setSelectedPropertyId(nextProperties[0].id);
    }
  }

  function applySearch(nextQuery: string) {
    setSearchQuery(nextQuery);

    const nextProperties = filterProperties(propertyFilter, nextQuery);
    if (
      nextProperties.length > 0 &&
      !nextProperties.some((property) => property.id === selectedPropertyId)
    ) {
      setSelectedPropertyId(nextProperties[0].id);
    }
  }

  function filterProperties(filter: PropertyFilter, query: string) {
    const normalizedQuery = query.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesType = filter === "all" || property.type === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          property.title,
          property.location,
          property.status,
          property.price,
          property.type === "land" ? "ziemia działka grunt" : "dom house",
          property.criteria.map((criterion) => criterion.label).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesType && matchesQuery;
    });
  }

  function handleMapPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, input")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanStart({
      pointerX: event.clientX,
      pointerY: event.clientY,
      mapX: mapOffset.x,
      mapY: mapOffset.y,
    });
  }

  function handleMapPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!panStart) {
      return;
    }

    setMapOffset({
      x: panStart.mapX + event.clientX - panStart.pointerX,
      y: panStart.mapY + event.clientY - panStart.pointerY,
    });
  }

  function stopMapPan() {
    setPanStart(null);
  }

  function resetMapPosition() {
    setMapOffset({ x: 0, y: 0 });
    setPanStart(null);
  }

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

  function handleAddProperty(event: FormEvent<HTMLFormElement>) {
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
    const newProperty: Property = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `property-${Date.now()}`,
      title,
      type: propertyForm.type,
      location,
      price,
      area,
      status: propertyForm.status,
      description:
        description ||
        "Nowa nieruchomość dodana ręcznie. Uzupełnij notatki, zdjęcia i kryteria w kolejnym kroku.",
      noteCount: 0,
      photoCount: 0,
      photos: propertyForm.photos,
      criteria,
      coordinates: createCoordinatesForIndex(nextIndex),
      x: 28 + ((nextIndex * 13) % 44),
      y: 30 + ((nextIndex * 17) % 42),
    };

    setProperties((currentProperties) => [...currentProperties, newProperty]);
    setSelectedPropertyId(newProperty.id);
    setPropertyFilter("all");
    setSearchQuery("");
    setMobileSearchOpen(false);
    setPropertyForm(createInitialPropertyForm());
    setPropertyFormError("");
    setAddPropertyOpen(false);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <section className="relative min-h-screen">
        {hasGoogleMapsConfig ? (
          <div className="google-map-shell" aria-label="Mapa Google z nieruchomościami">
            <APIProvider apiKey={googleMapsApiKey}>
              <Map
                defaultCenter={defaultMapCenter}
                defaultZoom={10}
                disableDefaultUI={false}
                fullscreenControl={false}
                gestureHandling="greedy"
                mapId={googleMapsMapId}
                mapTypeControl={false}
                streetViewControl={false}
                style={{ height: "100%", width: "100%" }}
              >
                {filteredProperties.map((property) => (
                  <GooglePropertyMarker
                    key={property.id}
                    property={property}
                    onSelect={selectProperty}
                    selected={property.id === selectedPropertyId}
                  />
                ))}
              </Map>
            </APIProvider>
          </div>
        ) : (
          <div
            className="map-surface"
            data-panning={panStart !== null}
            aria-label="Mapa nieruchomości projektu Dom dla rodziny"
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleMapPointerMove}
            onPointerUp={stopMapPan}
            onPointerCancel={stopMapPan}
            onPointerLeave={stopMapPan}
          >
            <div
              className="map-content"
              data-map-content="true"
              style={{ transform: `translate3d(${mapOffset.x}px, ${mapOffset.y}px, 0)` }}
            >
              <div className="map-grid" />
              <div className="map-region map-region--north">Katowice</div>
              <div className="map-region map-region--west">Mikołów</div>
              <div className="map-region map-region--south">Żory</div>
              <div className="map-route map-route--one" />
              <div className="map-route map-route--two" />
              {filteredProperties.map((property) => (
                <PropertyMarker
                  key={property.id}
                  property={property}
                  onSelect={selectProperty}
                  selected={property.id === selectedPropertyId}
                />
              ))}
            </div>
          </div>
        )}

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

            <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
              <label className="relative w-full max-w-md">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]"
                />
                <span className="sr-only">Szukaj lokalizacji albo nieruchomości</span>
                <input
                  className="h-11 w-full rounded-2xl border border-black/10 bg-white/75 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
                  placeholder="Szukaj lokalizacji albo nieruchomości"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => applySearch(event.target.value)}
                />
              </label>
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
                  <strong>{getPropertyRating(topProperty).toFixed(1)}</strong>
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
                  <Search aria-hidden="true" className="size-5" />
                  <p>Brak nieruchomości dla tych filtrów.</p>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="pointer-events-none absolute bottom-5 right-5 z-20 hidden flex-col gap-2 sm:flex">
          <button
            className="icon-button pointer-events-auto"
            aria-label="Wyśrodkuj mapę"
            onClick={resetMapPosition}
            type="button"
          >
            <Compass aria-hidden="true" className="size-4" />
          </button>
          <button className="icon-button pointer-events-auto" aria-label="Pełny ekran mapy">
            <Maximize2 aria-hidden="true" className="size-4" />
          </button>
        </div>

        <section className="mobile-sheet">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-black/20" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--color-muted)]">
                Wybrana nieruchomość
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold">{selectedProperty.title}</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {selectedProperty.location}
              </p>
            </div>
            <RatingPill rating={selectedPropertyRating} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="metric-tile">
              <span>Cena</span>
              <strong>{selectedProperty.price}</strong>
            </div>
            <div className="metric-tile">
              <span>Area</span>
              <strong>{selectedProperty.area}</strong>
            </div>
            <div className="metric-tile">
              <span>Status</span>
              <strong>{selectedProperty.status}</strong>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="secondary-button flex-1"
              aria-label={`${selectedPhotoCount} zdjęć`}
            >
              <Camera aria-hidden="true" className="size-4" />
              {selectedPhotoCount}
            </button>
            <button
              className="secondary-button flex-1"
              aria-label={`${selectedProperty.noteCount} notatek`}
            >
              <MessageSquareText aria-hidden="true" className="size-4" />
              {selectedProperty.noteCount}
            </button>
            <button
              className="primary-button flex-1 justify-center"
              onClick={() => setDetailsOpen(true)}
              type="button"
            >
              Szczegóły
              <ChevronDown aria-hidden="true" className="size-4 rotate-[-90deg]" />
            </button>
          </div>
        </section>

        <div className="absolute left-4 top-28 z-20 flex gap-2 md:hidden">
          <button
            className="icon-button"
            aria-label="Szukaj"
            onClick={() => setMobileSearchOpen((isOpen) => !isOpen)}
            type="button"
          >
            <Search aria-hidden="true" className="size-4" />
          </button>
          <button className="icon-button" aria-label="Członkowie projektu">
            <Users aria-hidden="true" className="size-4" />
          </button>
        </div>

        {mobileSearchOpen ? (
          <div className="mobile-search">
            <label className="relative block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]"
              />
              <span className="sr-only">Szukaj lokalizacji albo nieruchomości</span>
              <input
                className="h-12 w-full rounded-2xl border border-black/10 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
                placeholder="Szukaj lokalizacji albo nieruchomości"
                type="search"
                value={searchQuery}
                onChange={(event) => applySearch(event.target.value)}
                autoFocus
              />
            </label>
          </div>
        ) : null}

        {detailsOpen ? (
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
                  Przy Google Maps wybierzemy punkt kliknięciem na mapie.
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
