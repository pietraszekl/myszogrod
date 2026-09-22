export type PropertyType = "land" | "house";
export type PropertyStatus = "Do obejrzenia" | "Obiecujące" | "W trakcie" | "Odrzucone";
export type PropertyTypeFilter = "all" | PropertyType;
export type PropertyStatusFilter = "all" | PropertyStatus;
export type AuthMode = "sign-in" | "sign-up";
export type Coordinates = {
  lat: number;
  lng: number;
};
export type LocationStatus = "idle" | "loading" | "ready" | "denied" | "unsupported" | "error";

export type PropertyFormState = {
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

export type Project = {
  id: string;
  name: string;
  ownerId: string;
};

export type ProjectInvitation = {
  id: string;
  projectId: string;
  email: string;
  role: "admin" | "member";
  acceptedAt: string | null;
};

export type PropertyPhoto = {
  file?: File;
  id: string;
  name: string;
  path?: string;
  url: string;
};

export type Property = {
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

export type PropertyRow = {
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

export type ProjectRow = {
  id: string;
  name: string;
  owner_id: string;
};

export type ProjectInvitationRow = {
  id: string;
  project_id: string;
  email: string;
  role: ProjectInvitation["role"];
  accepted_at: string | null;
};

export type PropertyInsert = {
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

export type PropertyPayload = {
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

export type GeocodeLocationResult = {
  coordinates: Coordinates;
  label: string;
};

export type AddressLookupState = {
  coordinates: Coordinates | null;
  label: string;
  message: string;
  query: string;
  status: "idle" | "loading" | "found" | "error";
};
