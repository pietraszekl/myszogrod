"use client";

import { LogIn, MapPin, Plus, SlidersHorizontal } from "lucide-react";

import { formatPrice, getPropertyRating } from "../property-utils";
import type { Property } from "../types";
import { RatingPill } from "./RatingPill";
import { TypeIcon } from "./TypeIcon";

type PropertyListProps = {
  filteredProperties: Property[];
  isAuthenticated: boolean;
  onAddProperty: () => void;
  onOpenSettings: () => void;
  onResetFilters: () => void;
  onSelectProperty: (propertyId: string) => void;
  properties: Property[];
  propertiesLoadError: string;
  selectedPropertyId: string | null;
};

export function PropertyList({
  filteredProperties,
  isAuthenticated,
  onAddProperty,
  onOpenSettings,
  onResetFilters,
  onSelectProperty,
  properties,
  propertiesLoadError,
  selectedPropertyId,
}: PropertyListProps) {
  return (
    <>
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
              ? "Witaj w Myszogrodzie! To Twój projekt — dodaj pierwszą nieruchomość, żeby zacząć."
              : "Zaloguj się, aby zobaczyć i dodawać nieruchomości."}
          </p>
          {isAuthenticated ? (
            <button className="secondary-button justify-center" onClick={onAddProperty} type="button">
              <Plus aria-hidden="true" className="size-4" />
              Dodaj
            </button>
          ) : (
            <button className="secondary-button justify-center" onClick={onOpenSettings} type="button">
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
          <button className="secondary-button justify-center" onClick={onResetFilters} type="button">
            Wyczyść filtry
          </button>
        </div>
      ) : null}
    </>
  );
}
