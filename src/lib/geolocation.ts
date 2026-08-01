/**
 * Geolocation utility functions for attendance system
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationWithRadius extends Coordinates {
  radius: number; // in meters
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a student's location is within the allowed radius
 * @param studentLocation Student's current coordinates
 * @param allowedLocation Allowed location with radius
 * @returns Object with isWithin boolean and distance in meters
 */
export function isWithinRadius(
  studentLocation: Coordinates,
  allowedLocation: LocationWithRadius
): { isWithin: boolean; distance: number } {
  const distance = calculateDistance(
    studentLocation.latitude,
    studentLocation.longitude,
    allowedLocation.latitude,
    allowedLocation.longitude
  );

  return {
    isWithin: distance <= allowedLocation.radius,
    distance,
  };
}

/**
 * Format distance for human-readable display
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "25m" or "1.2km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Get accuracy status based on GPS accuracy
 * @param accuracy Accuracy in meters
 * @returns Status object with level and message
 */
export function getAccuracyStatus(accuracy: number): {
  level: "good" | "fair" | "poor";
  message: string;
} {
  if (accuracy <= 20) {
    return {
      level: "good",
      message: "GPS signal is strong",
    };
  } else if (accuracy <= 50) {
    return {
      level: "fair",
      message: "GPS signal is moderate",
    };
  } else {
    return {
      level: "poor",
      message: "GPS signal is weak - move to an open area",
    };
  }
}
