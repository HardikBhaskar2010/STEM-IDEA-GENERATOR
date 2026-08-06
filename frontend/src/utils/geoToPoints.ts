/**
 * geoToPoints.ts
 * Converts a GeoJSON FeatureCollection into a flat Float32Array of xyz positions
 * on the surface of a unit sphere, suitable for use as a Three.js BufferGeometry.
 *
 * Only border vertices of country polygons are sampled — this creates the iconic
 * "hollow-oceans, solid-continents" look.
 */

function latLngToXYZ(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function processRing(ring: [number, number][], radius: number, out: number[]) {
  ring.forEach(([lng, lat]) => {
    const [x, y, z] = latLngToXYZ(lat, lng, radius);
    out.push(x, y, z);
  });
}

function processPolygon(polygon: [number, number][][], radius: number, out: number[]) {
  polygon.forEach((ring) => processRing(ring, radius, out));
}

export function geoJsonToPoints(geojson: any, radius = 1): Float32Array {
  const out: number[] = [];

  geojson.features.forEach((feature: any) => {
    const geom = feature.geometry;
    if (!geom) {return;}

    if (geom.type === 'Polygon') {
      processPolygon(geom.coordinates, radius, out);
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((polygon: any) => processPolygon(polygon, radius, out));
    }
  });

  return new Float32Array(out);
}
