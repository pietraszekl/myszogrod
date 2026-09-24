import { LandPlot } from "lucide-react";

export function AppBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-ink)] text-white">
        <LandPlot aria-hidden="true" className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Logbook nieruchomości
        </p>
        <h1 className="truncate text-base font-semibold sm:text-lg">
          Myszogród
        </h1>
      </div>
    </div>
  );
}
