import { NextResponse } from "next/server";

type SearchResult = { name: string; label: string };
const cache = new Map<string, { at: number; results: SearchResult[] }>();
let lastRequestAt = 0;

// Recherche volontairement lancée par bouton : le service public Nominatim
// n'autorise pas l'auto-complétion et limite les applications à 1 requête/s.
export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get("q")?.trim().slice(0, 120) || "";
  if (query.length < 3) return NextResponse.json({ results: [] });

  const key = query.toLocaleLowerCase("fr-FR");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 1000 * 60 * 60 * 24) {
    return NextResponse.json({ results: cached.results, source: "OpenStreetMap" });
  }

  const remaining = Math.max(0, 1050 - (Date.now() - lastRequestAt));
  if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
  lastRequestAt = Date.now();

  try {
    const endpoint = new URL("https://nominatim.openstreetmap.org/search");
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("limit", "5");
    endpoint.searchParams.set("countrycodes", "fr");
    endpoint.searchParams.set("q", query);
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "Grimoire-Lorcana/1.0 (private collection app)" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error("Place search unavailable");
    const data = await response.json() as Array<{ display_name?: string; name?: string }>;
    const results = data.map((place) => ({
      name: place.name || place.display_name?.split(",")[0] || query,
      label: place.display_name || place.name || query,
    })).filter((place, index, list) => list.findIndex((candidate) => candidate.label === place.label) === index);
    cache.set(key, { at: Date.now(), results });
    return NextResponse.json({ results, source: "OpenStreetMap" });
  } catch {
    return NextResponse.json({ results: [], error: "La recherche de magasins est momentanément indisponible." }, { status: 503 });
  }
}
