import type { Property, PropertyStatus, PropertyType } from "./types";

export const criteriaByType: Record<PropertyType, string[]> = {
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

export const propertyStatuses: PropertyStatus[] = [
  "Do obejrzenia",
  "Obiecujące",
  "W trakcie",
  "Odrzucone",
];
export const ratingFilterOptions = [0, 4, 6, 8];
export const initialProperties: Property[] = [];
