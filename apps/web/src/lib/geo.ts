import type { GeoPoint, GeoPolygon } from "@rakkhanet/shared-types";

/**
 * MongoDB/GeoJSON stores coordinates as [longitude, latitude]; Leaflet wants
 * [latitude, longitude]. Mixing these up is the most common geospatial bug
 * in this codebase -- these two functions are the only place that
 * conversion should ever happen.
 */
export function geoPointToLatLng(point: GeoPoint): [number, number] {
  return [point.coordinates[1], point.coordinates[0]];
}

export function geoPolygonToLatLngs(polygon: GeoPolygon): [number, number][][] {
  return polygon.coordinates.map((ring) =>
    ring.map(([lng, lat]) => [lat, lng] as [number, number]),
  );
}
