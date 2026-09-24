"use client";

import type { ReactNode } from "react";
import { Settings, SlidersHorizontal } from "lucide-react";

import type { Property } from "../types";
import { AppBrand } from "./AppBrand";
import { PropertyList } from "./PropertyList";

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
          <PropertyList
            filteredProperties={filteredProperties}
            isAuthenticated={isAuthenticated}
            onAddProperty={onAddProperty}
            onOpenSettings={onOpenSettings}
            onResetFilters={onResetFilters}
            onSelectProperty={onSelectProperty}
            properties={properties}
            propertiesLoadError={propertiesLoadError}
            selectedPropertyId={selectedPropertyId}
          />
        </div>
      </div>
    </aside>
  );
}
