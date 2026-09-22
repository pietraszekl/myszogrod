"use client";

import type { ReactNode } from "react";
import { LogIn, Settings, SlidersHorizontal } from "lucide-react";

import { AppBrand } from "./AppBrand";

type MobileHeaderProps = {
  filterPanel: ReactNode;
  filtersOpen: boolean;
  isAuthenticated: boolean;
  onOpenSettings: () => void;
  onToggleFilters: () => void;
};

export function MobileHeader({
  filterPanel,
  filtersOpen,
  isAuthenticated,
  onOpenSettings,
  onToggleFilters,
}: MobileHeaderProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6 lg:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-[28px] border border-black/10 bg-white/88 px-3 py-3 shadow-[0_18px_70px_rgba(29,38,35,0.12)] backdrop-blur-xl">
        <AppBrand />

        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <button
              className="icon-button"
              aria-label="Zaloguj się"
              onClick={onOpenSettings}
              title="Zaloguj się"
              type="button"
            >
              <LogIn aria-hidden="true" className="size-4" />
            </button>
          ) : null}
          {isAuthenticated ? (
            <>
              <button
                className="icon-button"
                aria-label="Ustawienia projektu"
                onClick={onOpenSettings}
                type="button"
              >
                <Settings aria-hidden="true" className="size-4" />
              </button>
              <button
                className="icon-button"
                aria-label="Filtry mapy"
                aria-pressed={filtersOpen}
                data-active={filtersOpen}
                onClick={onToggleFilters}
                title="Filtry mapy"
                type="button"
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>
      {filterPanel}
    </header>
  );
}
