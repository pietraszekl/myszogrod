# Myszogród Architecture Notes

This document records implementation decisions that support `MASTER_PROMPT.md`.

## Locked Product Direction

- The primary product surface is the map.
- Property icon shape represents property type.
- Property marker color represents rating.
- Property data is entered manually by users.
- Supabase Auth, PostgreSQL, Storage, and RLS are the backend foundation.
- Google Maps JavaScript API is the target map implementation.

## Phase 0 Decision

The first screen is a local application shell, not a production data layer. Demo properties are intentionally kept inside the page for visual validation only and must be replaced by Supabase-backed reads during the backend phases.

## Phase 1 Integration

- Supabase clients live in `src/lib/supabase/` and support the browser-safe anon/publishable key.
- Google Maps is loaded through `@vis.gl/react-google-maps` when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAP_ID` are present.
- The local demo map remains as a fallback so development and builds work without external credentials.
- Demo properties now include latitude/longitude coordinates; `x/y` positions only support the fallback map.

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
