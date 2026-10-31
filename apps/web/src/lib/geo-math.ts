/**
 * Distance and direction between two points, computed on the device -- no
 * network needed, so they work offline. The same maths as
 * apps/api/src/lib/geoMath.ts, copied rather than shared because the API is
 * deployed separately. The distance is a straight line over the ground, NOT
 * a road distance, and callers should say so.
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Great-circle distance between two lat/lng points, in kilometers. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

const COMPASS_POINTS = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
];

/**
 * Compass direction from point 1 to point 2, in 8-point resolution
 * ("north-east" rather than a raw degree figure) -- plain-language
 * direction is what a person needs, not a bearing in degrees.
 */
export function compassBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): string {
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lng2 - lng1));
  const bearingDeg = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const index = Math.round(bearingDeg / 45) % 8;
  return COMPASS_POINTS[index];
}

/** "850 m" under a kilometre (to the nearest 10 m), "2.3 km" above. */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round((km * 1000) / 10) * 10;
    if (meters < 10) return "under 10 m";
    if (meters >= 1000) return "1.0 km";
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}
