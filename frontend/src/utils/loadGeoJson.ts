/**
 * loadGeoJson.ts
 * Fetches the world GeoJSON from a public CDN and caches it in memory.
 */

let cached: any = null;

export async function loadGeoJson(): Promise<any> {
  if (cached) return cached;
  const res = await fetch(
    'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'
  );
  if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
  cached = await res.json();
  return cached;
}
