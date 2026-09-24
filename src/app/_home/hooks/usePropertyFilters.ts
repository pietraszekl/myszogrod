"use client";

import { useMemo, useState } from "react";

import { getPropertyRating } from "../property-utils";
import type {
  Property,
  PropertyStatusFilter,
  PropertyTypeFilter,
} from "../types";

export function usePropertyFilters(properties: Property[]) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [propertyTypeFilter, setPropertyTypeFilter] =
    useState<PropertyTypeFilter>("all");
  const [propertyStatusFilter, setPropertyStatusFilter] =
    useState<PropertyStatusFilter>("all");
  const [minimumRatingFilter, setMinimumRatingFilter] = useState(0);

  const filtersActive =
    propertyTypeFilter !== "all" ||
    propertyStatusFilter !== "all" ||
    minimumRatingFilter > 0;

  const filteredProperties = useMemo(
    () =>
      properties.filter((property) => {
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
      }),
    [minimumRatingFilter, properties, propertyStatusFilter, propertyTypeFilter],
  );

  function resetFilters() {
    setPropertyTypeFilter("all");
    setPropertyStatusFilter("all");
    setMinimumRatingFilter(0);
  }

  return {
    filteredProperties,
    filtersActive,
    filtersOpen,
    minimumRatingFilter,
    propertyStatusFilter,
    propertyTypeFilter,
    resetFilters,
    setFiltersOpen,
    setMinimumRatingFilter,
    setPropertyStatusFilter,
    setPropertyTypeFilter,
  };
}
