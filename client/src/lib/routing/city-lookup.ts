import { routeGameToGeo } from "./route-geo";

/**
 * Resolves a job's destination city/company name (from Funbit telemetry:
 * `job.destinationCity` / `job.destinationCompany`) into a lng/lat point to
 * route to. Uses the cities.json + companies.geojson we copied from
 * TruckNav-Sim's data — GPL-3.0.
 */

interface CityEntry {
  token: string;
  name: string;
  x: number;
  y: number; // game Z axis, despite the name — matches cities.json's own field naming
}

interface CompanyFeature {
  type: "Feature";
  properties: { poiType?: string; poiName?: string };
  geometry: { type: "Point"; coordinates: [number, number] };
}

let citiesPromise: Promise<CityEntry[]> | null = null;
let companiesPromise: Promise<CompanyFeature[]> | null = null;

function loadCities(): Promise<CityEntry[]> {
  citiesPromise ??= fetch("/routing-data/map-data/cities.json").then((r) => r.json());
  return citiesPromise;
}

function loadCompanies(): Promise<CompanyFeature[]> {
  companiesPromise ??= fetch("/routing-data/map-data/companies.geojson")
    .then((r) => r.json())
    .then((geojson) => geojson.features as CompanyFeature[]);
  return companiesPromise;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Tries company name first (more specific — an exact depot, not just "the
 * city somewhere"), falls back to the destination city if no company match.
 * Prefers matching by id/token (destinationCityId etc.) over display name
 * where available — tokens are the raw SCS identifiers and avoid any
 * capitalization/locale mismatch a display-name comparison could hit.
 */
export async function resolveJobDestination(
  destinationCity: string | undefined,
  destinationCompany: string | undefined,
  destinationCityId?: string,
): Promise<[number, number] | null> {
  if (destinationCompany) {
    const companies = await loadCompanies();
    const target = normalize(destinationCompany);
    const match = companies.find(
      (f) => f.properties.poiType === "company" && f.properties.poiName && normalize(f.properties.poiName) === target,
    );
    if (match) return match.geometry.coordinates;
  }

  if (destinationCityId) {
    const cities = await loadCities();
    const match = cities.find((c) => normalize(c.token) === normalize(destinationCityId));
    if (match) return routeGameToGeo(match.x, match.y);
  }

  if (destinationCity) {
    const cities = await loadCities();
    const target = normalize(destinationCity);
    const match = cities.find((c) => normalize(c.name) === target || normalize(c.token) === target);
    if (match) return routeGameToGeo(match.x, match.y);
  }

  return null;
}
