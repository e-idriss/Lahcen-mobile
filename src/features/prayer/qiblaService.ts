/**
 * Qibla Direction & Geodesic Bearing Service.
 *
 * Calculates the exact great-circle direction and distance from any GPS coordinates
 * on Earth to the Holy Kaaba in Makkah (21.4225° N, 39.8262° E).
 */

export const KAABA_COORDINATES = {
  latitude: 21.4225,
  longitude: 39.8262,
};

/**
 * Computes Qibla direction in degrees clockwise from True North (0°..360°).
 */
export function calculateQiblaDirection(userLat: number, userLng: number): number {
  const kaabaLat = (KAABA_COORDINATES.latitude * Math.PI) / 180;
  const kaabaLng = (KAABA_COORDINATES.longitude * Math.PI) / 180;
  const lat = (userLat * Math.PI) / 180;
  const lng = (userLng * Math.PI) / 180;

  const dLng = kaabaLng - lng;
  const y = Math.sin(dLng);
  const x = Math.cos(lat) * Math.tan(kaabaLat) - Math.sin(lat) * Math.cos(dLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Calculates straight geodesic distance to the Kaaba in kilometers.
 */
export function calculateDistanceToKaaba(userLat: number, userLng: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((KAABA_COORDINATES.latitude - userLat) * Math.PI) / 180;
  const dLng = ((KAABA_COORDINATES.longitude - userLng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((KAABA_COORDINATES.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Converts magnetometer sensor output (x, y) into a MAGNETIC compass heading.
 *
 * This is uncorrected for magnetic declination and is only a fallback for
 * devices that cannot produce a true (geographic-north) heading via
 * `expo-location`'s `watchHeadingAsync`. Prefer the location heading, which
 * the Qibla screen uses first.
 */
export function calculateCompassHeading(x: number, y: number): number {
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  // Normalize to 0..360 (0 = North, 90 = East, 180 = South, 270 = West)
  angle = 90 - angle;
  return (angle + 360) % 360;
}
