"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { propertyStatuses, ratingFilterOptions } from "../property-options";
import type { PropertyStatusFilter, PropertyTypeFilter } from "../types";

type FilterPanelProps = {
  filtersActive: boolean;
  label: string;
  minimumRatingFilter: number;
  onMinimumRatingFilterChange: (rating: number) => void;
  onPropertyStatusFilterChange: (status: PropertyStatusFilter) => void;
  onPropertyTypeFilterChange: (type: PropertyTypeFilter) => void;
  onResetFilters: () => void;
  propertyList?: ReactNode;
  propertyStatusFilter: PropertyStatusFilter;
  propertyTypeFilter: PropertyTypeFilter;
};

export function FilterPanel({
  filtersActive,
  label,
  minimumRatingFilter,
  onMinimumRatingFilterChange,
  onPropertyStatusFilterChange,
  onPropertyTypeFilterChange,
  onResetFilters,
  propertyList,
  propertyStatusFilter,
  propertyTypeFilter,
}: FilterPanelProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  // Compact mode only applies where the property list is shown alongside filters
  // (the mobile combined panel) — properties matter more than filter controls there,
  // so filters start collapsed and use denser chip rows instead of <select>s.
  const compact = Boolean(propertyList);
  const activeFilterCount =
    (propertyTypeFilter !== "all" ? 1 : 0) +
    (propertyStatusFilter !== "all" ? 1 : 0) +
    (minimumRatingFilter > 0 ? 1 : 0);
  const filtersVisible = !compact || filtersExpanded;

  return (
    <div className="list-filter-panel" aria-label={label}>
      {compact ? (
        <button
          aria-expanded={filtersExpanded}
          className="filter-toggle"
          onClick={() => setFiltersExpanded((isExpanded) => !isExpanded)}
          type="button"
        >
          <span>Filtry{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}</span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      ) : null}

      {filtersVisible ? (
        <>
          <div className="filter-group">
            <span>Typ</span>
            <div className="filter-chip-row">
              <button
                className="filter-chip"
                data-active={propertyTypeFilter === "all"}
                onClick={() => onPropertyTypeFilterChange("all")}
                type="button"
              >
                Wszystkie
              </button>
              <button
                className="filter-chip"
                data-active={propertyTypeFilter === "land"}
                onClick={() => onPropertyTypeFilterChange("land")}
                type="button"
              >
                Działki
              </button>
              <button
                className="filter-chip"
                data-active={propertyTypeFilter === "house"}
                onClick={() => onPropertyTypeFilterChange("house")}
                type="button"
              >
                Domy
              </button>
            </div>
          </div>

          <div className="filter-group">
            <span>Status</span>
            <div className="filter-chip-row">
              <button
                className="filter-chip"
                data-active={propertyStatusFilter === "all"}
                onClick={() => onPropertyStatusFilterChange("all")}
                type="button"
              >
                Wszystkie
              </button>
              {propertyStatuses.map((status) => (
                <button
                  className="filter-chip"
                  data-active={propertyStatusFilter === status}
                  key={status}
                  onClick={() => onPropertyStatusFilterChange(status)}
                  type="button"
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span>Ocena od</span>
            <div className="filter-chip-row">
              {ratingFilterOptions.map((rating) => (
                <button
                  className="filter-chip"
                  data-active={minimumRatingFilter === rating}
                  key={rating}
                  onClick={() => onMinimumRatingFilterChange(rating)}
                  type="button"
                >
                  {rating === 0 ? "Dowolna" : `${rating}+`}
                </button>
              ))}
            </div>
          </div>

          {filtersActive ? (
            <div className="filter-summary">
              <button className="filter-reset" onClick={onResetFilters} type="button">
                Wyczyść
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {propertyList ? (
        <div className="filter-group">
          <span>Nieruchomości</span>
          <div className="grid gap-3">{propertyList}</div>
        </div>
      ) : null}
    </div>
  );
}
