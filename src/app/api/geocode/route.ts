import { NextResponse } from "next/server";

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

const nominatimSearchUrl = "https://nominatim.openstreetmap.org/search";
const geocodeCache = new Map<string, { label: string; lat: number; lng: number }>();

function normalizeQuery(query: string) {
  return query.replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawQuery = requestUrl.searchParams.get("q") ?? "";
  const query = normalizeQuery(rawQuery);

  if (!query) {
    return NextResponse.json({ error: "Podaj adres do sprawdzenia." }, { status: 400 });
  }

  const cacheKey = query.toLocaleLowerCase("pl-PL");
  const cachedResult = geocodeCache.get(cacheKey);

  if (cachedResult) {
    return NextResponse.json(cachedResult);
  }

  const geocodeUrl = new URL(nominatimSearchUrl);
  geocodeUrl.searchParams.set("addressdetails", "1");
  geocodeUrl.searchParams.set("countrycodes", "pl");
  geocodeUrl.searchParams.set("format", "jsonv2");
  geocodeUrl.searchParams.set("limit", "1");
  geocodeUrl.searchParams.set("q", `${query}, Polska`);

  try {
    const response = await fetch(geocodeUrl, {
      headers: {
        "Accept-Language": "pl",
        "User-Agent": "myszogrod/0.1 contact:local-development",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Geocoder nie odpowiedział poprawnie. Spróbuj ponownie za chwilę." },
        { status: 502 },
      );
    }

    const results = (await response.json()) as NominatimResult[];
    const firstResult = Array.isArray(results) ? results[0] : null;
    const lat = Number(firstResult?.lat);
    const lng = Number(firstResult?.lon);

    if (!firstResult || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Nie znaleziono tej lokalizacji. Doprecyzuj adres lub dodaj nazwę miasta." },
        { status: 404 },
      );
    }

    const result = {
      label: firstResult.display_name ?? query,
      lat,
      lng,
    };

    geocodeCache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Nie udało się połączyć z geocoderem." },
      { status: 502 },
    );
  }
}
