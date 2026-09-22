"use client";

import type { ReactNode } from "react";
import { LogIn, MapPin, Plus, Settings, SlidersHorizontal } from "lucide-react";

import { formatPrice, getPropertyRating } from "../property-utils";
import type { Property } from "../types";
import { AppBrand } from "./AppBrand";
import { RatingPill } from "./RatingPill";
import { TypeIcon } from "./TypeIcon";

type PropertySidebarProps = {
  filterPanel: ReactNode;
  filteredProperties: Property[];
  filtersOpen: boolean;
  isAuthenticated: boolean;
  onAddProperty: () => void;
  onOpenSettings: () => void;
  onResetFilters: () => void;
  onSelectProperty: (propertyId: string) => void;
  onToggleFilters: () => void;
  properties: Property[];
  propertiesLoadError: string;
  selectedPropertyId: string | null;
};

export function PropertySidebar({
  filterPanel,
  filteredProperties,
  filtersOpen,
  isAuthenticated,
  onAddProperty,
  onOpenSettings,
  onResetFilters,
  onSelectProperty,
  onToggleFilters,
  properties,
  propertiesLoadError,
  selectedPropertyId,
}: PropertySidebarProps) {
  return (
    <aside className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-[410px] p-6 lg:block">
      <div className="pointer-events-auto flex h-full flex-col rounded-[30px] border border-black/10 bg-white/90 shadow-[0_24px_90px_rgba(29,38,35,0.14)] backdrop-blur-xl">
        <div className="border-b border-black/10 p-5">
          <div className="flex items-start justify-between gap-3">
            <AppBrand />
            <div className="flex shrink-0 items-center gap-2">
              {isAuthenticated ? (
                <button
                  className="icon-button"
                  aria-label="Filtry listy"
                  aria-pressed={filtersOpen}
                  onClick={onToggleFilters}
                  type="button"
                >
                  <SlidersHorizontal aria-hidden="true" className="size-4" />
                </button>
              ) : null}
              {isAuthenticated ? (
                <button
                  className="icon-button"
                  aria-label="Ustawienia projektu"
                  onClick={onOpenSettings}
                  type="button"
                >
                  <Settings aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          {filterPanel}
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
              onClick={() => onSelectProperty(property.id)}
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
                {isAuthenticated
                  ? "Brak nieruchomości. Dodaj pierwszą pozycję ręcznie."
                  : "Zaloguj się, aby zobaczyć i dodawać nieruchomości."}
              </p>
              {isAuthenticated ? (
                <button
                  className="secondary-button justify-center"
                  onClick={onAddProperty}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Dodaj
                </button>
              ) : (
                <button
                  className="secondary-button justify-center"
                  onClick={onOpenSettings}
                  type="button"
                >
                  <LogIn aria-hidden="true" className="size-4" />
                  Zaloguj się
                </button>
              )}
            </div>
          ) : null}
          {properties.length > 0 && filteredProperties.length === 0 ? (
            <div className="empty-state">
              <SlidersHorizontal aria-hidden="true" className="size-5" />
              <p>Brak wyników dla aktywnych filtrów.</p>
              <button
                className="secondary-button justify-center"
                onClick={onResetFilters}
                type="button"
              >
                Wyczyść filtry
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
