# Myszogród Architecture Notes

This document records implementation decisions that support `MASTER_PROMPT.md`.

## Locked Product Direction

- The primary product surface is the map.
- Property icon shape represents property type.
- Property marker color represents rating.
- Property data is entered manually by users.
- Supabase Auth, PostgreSQL, Storage, and RLS are the backend foundation.
- OpenFreeMap with MapLibre GL JS is the target map implementation.

## Phase 0 Decision

The first screen is a local application shell, not a production data layer. Demo properties are intentionally kept inside the page for visual validation only and must be replaced by Supabase-backed reads during the backend phases.

## Phase 1 Integration

- Supabase clients live in `src/lib/supabase/` and use the browser-safe publishable key, with anon key support kept only as a fallback.
- OpenFreeMap is loaded through `maplibre-gl` using the public `https://tiles.openfreemap.org/styles/liberty` style.
- No map API key or billing account is required for the current map provider.
- Demo properties now include latitude/longitude coordinates used directly by MapLibre markers.

## Planned Frontend Structure

As features grow, code should move toward:

```text
src/
  app/
  components/
    ui/
    map/
    properties/
    projects/
  features/
    auth/
    projects/
    properties/
    ratings/
  lib/
    supabase/
    validation/
    design/
```

## Data Modeling Checkpoint

Before Phase 4 implementation, decide the exact model for type-specific data:

- shared `properties` core table,
- `property_types`,
- configurable `criteria`,
- `property_ratings`,
- likely `land_properties` and `house_properties` for type-specific fields if the domain model warrants it.

This decision must be documented before migrations are written.
