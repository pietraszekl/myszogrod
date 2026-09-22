import type { AddressLookupState, Property, PropertyFormState, PropertyType } from "./types";
import { criteriaByType } from "./property-options";

export const idleAddressLookup: AddressLookupState = {
  coordinates: null,
  label: "",
  message: "",
  query: "",
  status: "idle",
};

export const initialPropertyForm: PropertyFormState = {
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

export function createInitialPropertyForm(type: PropertyType = "land"): PropertyFormState {
  return {
    ...initialPropertyForm,
    type,
    photos: [],
    criteriaScores: Object.fromEntries(
      criteriaByType[type].map((criterion) => [criterion, "7"]),
    ),
  };
}

export function createPropertyFormFromProperty(property: Property): PropertyFormState {
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
