/**
 * Campus Geolocation & Navigation Utilities for Moi University Main Campus (Kesses)
 * Spec reference: campus-business-directory-design.md Section 4.1.5
 * Walking speed: ~75 m/min. Max walking threshold: 2 km.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CampusAnchor {
  id: string;
  name: string;
  shortName: string;
  coords: Coordinates;
  landmark: string;
  description: string;
}

export const CAMPUS_ANCHORS: CampusAnchor[] = [
  {
    id: 'main-gate',
    name: 'Moi University Main Gate',
    shortName: 'Moi Main Gate',
    coords: { lat: 0.2831, lng: 35.2905 },
    landmark: 'Opposite administration gate',
    description: 'Central campus entrance facing Kesses commercial strip',
  },
  {
    id: 'kesses-centre',
    name: 'Kesses Centre',
    shortName: 'Kesses Centre',
    coords: { lat: 0.2825, lng: 35.2912 },
    landmark: 'Behind Main Gate, next to Equity Agent & Pharmacy',
    description: 'Immediate shopping row directly behind the university gate',
  },
  {
    id: 'stage',
    name: 'Stage Terminus',
    shortName: 'Stage',
    coords: { lat: 0.2808, lng: 35.2932 },
    landmark: 'Matatu stage, Bata, Stage complex',
    description: 'Transport terminus and main commercial hub',
  },
  {
    id: 'soweto',
    name: 'Soweto (Food & Hostels)',
    shortName: 'Soweto',
    coords: { lat: 0.2848, lng: 35.2942 },
    landmark: 'Green Valley hostel, sunrise study hall & eateries',
    description: 'Student residential cluster known for affordable food & rooms',
  },
  {
    id: 'cheboiywo',
    name: 'Cheboiywo Hostels',
    shortName: 'Cheboiywo',
    coords: { lat: 0.2865, lng: 35.2858 },
    landmark: 'Market road, St. Jude Academy, Total energies',
    description: 'Large private hostel corridor northwest of campus',
  },
  {
    id: 'talai',
    name: 'Talai Corridor',
    shortName: 'Talai',
    coords: { lat: 0.2768, lng: 35.2965 },
    landmark: 'Deliverance Church, Talai junction, yellow container',
    description: 'Hostel zone along the Kesses-Cheptiret road',
  },
];

/**
 * Calculates Haversine distance in meters between two GPS coordinates
 */
export function calculateDistanceMeters(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (coord1.lat * Math.PI) / 180;
  const phi2 = (coord2.lat * Math.PI) / 180;
  const deltaPhi = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLambda = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats distance and walk time (walking speed ~75 m/min)
 */
export function formatDistanceAndWalkTime(meters: number): {
  distanceStr: string;
  walkTimeStr: string;
  minutes: number;
} {
  const minutes = Math.max(1, Math.round(meters / 75));

  let distanceStr: string;
  if (meters < 50) {
    distanceStr = 'At location (<50m)';
  } else if (meters < 1000) {
    distanceStr = `${Math.round(meters / 10) * 10}m`;
  } else {
    distanceStr = `${(meters / 1000).toFixed(1)} km`;
  }

  const walkTimeStr = `${minutes} min walk`;

  return { distanceStr, walkTimeStr, minutes };
}

/**
 * Builds Google Maps navigation / walking direction links (no API key required)
 */
export function buildGoogleMapsUrl(options: {
  destCoords?: Coordinates;
  originCoords?: Coordinates;
  businessName?: string;
  landmark?: string;
}): string {
  const { destCoords, originCoords, businessName, landmark } = options;

  if (destCoords && originCoords) {
    return `https://www.google.com/maps/dir/?api=1&origin=${destCoords ? `${originCoords.lat},${originCoords.lng}` : ''}&destination=${destCoords.lat},${destCoords.lng}&travelmode=walking`;
  }

  if (destCoords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destCoords.lat},${destCoords.lng}&travelmode=walking`;
  }

  const query = `${businessName || 'Business'} ${landmark || ''} Moi University Kesses Eldoret`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
}

export function getCampusOverviewMapUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Moi University Main Campus Kesses Uasin Gishu Kenya')}`;
}

/**
 * Computes Radar X/Y coordinates (-50% to +50%) relative to anchor
 * Range max = 1200 meters.
 */
export function computeRadarPosition(
  anchor: Coordinates,
  target: Coordinates,
  maxRadiusMeters = 1100
): { x: number; y: number; distanceMeters: number; bearingDeg: number } {
  const distanceMeters = calculateDistanceMeters(anchor, target);

  // Bearing angle from anchor to target
  const phi1 = (anchor.lat * Math.PI) / 180;
  const phi2 = (target.lat * Math.PI) / 180;
  const deltaLambda = ((target.lng - anchor.lng) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const bearingRad = Math.atan2(y, x);
  let bearingDeg = (bearingRad * 180) / Math.PI;
  if (bearingDeg < 0) bearingDeg += 360;

  // Normalized distance from 0 to 45% (to stay inside the circle)
  const clampedDistance = Math.min(distanceMeters, maxRadiusMeters);
  const normalizedRadius = (clampedDistance / maxRadiusMeters) * 44; // 0 to 44% of radius

  // Convert bearing (0 deg = North = -Y, 90 deg = East = +X) to Cartesian X and Y
  const angleRad = ((bearingDeg - 90) * Math.PI) / 180;
  const posX = Math.cos(angleRad) * normalizedRadius;
  const posY = Math.sin(angleRad) * normalizedRadius;

  return {
    x: posX,
    y: posY,
    distanceMeters,
    bearingDeg,
  };
}
