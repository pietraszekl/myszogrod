"use client";

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
  propertyStatusFilter,
  propertyTypeFilter,
}: FilterPanelProps) {
  return (
    <div className="list-filter-panel" aria-label={label}>
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

      <label className="filter-field">
        <span>Status</span>
        <select
          value={propertyStatusFilter}
          onChange={(event) =>
            onPropertyStatusFilterChange(event.target.value as PropertyStatusFilter)
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
          onChange={(event) => onMinimumRatingFilterChange(Number(event.target.value))}
        >
          {ratingFilterOptions.map((rating) => (
            <option key={rating} value={rating}>
              {rating === 0 ? "Dowolna" : `${rating}+`}
            </option>
          ))}
        </select>
      </label>

      {filtersActive ? (
        <div className="filter-summary">
          <button className="filter-reset" onClick={onResetFilters} type="button">
            Wyczyść
          </button>
        </div>
      ) : null}
    </div>
  );
}
