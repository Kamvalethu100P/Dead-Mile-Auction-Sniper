/**
 * Geo-utilities for distance estimation between South African cities.
 * Uses known coordinates for major hubs and Haversine formula.
 */

// Known coordinates for major South African logistics hubs
const CITY_COORDS = {
  'johannesburg': { lat: -26.2041, lon: 28.0473 },
  'pretoria': { lat: -25.7479, lon: 28.2293 },
  'durban': { lat: -29.8587, lon: 31.0218 },
  'cape town': { lat: -33.9249, lon: 18.4241 },
  'port elizabeth': { lat: -33.9608, lon: 25.6022 },
  'east london': { lat: -33.0153, lon: 27.9116 },
  'bloemfontein': { lat: -29.0852, lon: 26.1596 },
  'nelspruit': { lat: -25.4745, lon: 30.9703 },
  'polokwane': { lat: -23.8962, lon: 29.4487 },
  'kimberley': { lat: -28.7282, lon: 24.7499 },
  'rustenburg': { lat: -25.6768, lon: 27.2493 },
  'richards bay': { lat: -28.7808, lon: 32.0383 },
  'vereeniging': { lat: -26.6720, lon: 27.9310 },
  'witbank': { lat: -25.8720, lon: 29.2300 },
  'george': { lat: -33.9630, lon: 22.4616 },
  'upington': { lat: -28.4478, lon: 21.2561 },
};

/**
 * Normalize a city name for lookup.
 */
function normalizeCity(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolve city name to coordinates. Returns null if unknown.
 */
function resolveCoords(name) {
  const key = normalizeCity(name);
  // Try exact match first
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // Try partial match (e.g., "Johannesburg, Gauteng" -> "johannesburg")
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (key.includes(city)) return coords;
  }
  return null;
}

/**
 * Haversine distance between two lat/lon points in km.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Estimate distance between two city names in km.
 * Falls back to string-length heuristic if city not in database.
 */
function estimateDistance(from, to) {
  const fromCoord = resolveCoords(from);
  const toCoord = resolveCoords(to);

  if (fromCoord && toCoord) {
    return haversineKm(fromCoord.lat, fromCoord.lon, toCoord.lat, toCoord.lon);
  }

  // Fallback: rough heuristic based on character differences
  // This is intentionally crude — in production you'd use a geocoding API
  const fallback = Math.abs(from.length - to.length) * 30 + 50;
  return Math.min(fallback, 1200);
}

/**
 * Estimate route overlap percentage between a truck's return route and a load's route.
 * Returns 0-100 where 100 means the load is perfectly on the way back.
 *
 * Logic: If the truck is at location A, returning to B,
 * and the load goes from C to D, how much of the load's route aligns
 * with the truck's return path?
 *
 * Simplified: overlap is high if the load's pickup is near the truck's location
 * and the load's dropoff is near the truck's return destination.
 */
function calculateRouteOverlap(truckLocation, truckReturnDest, loadPickup, loadDropoff) {
  const dTruckToPickup = estimateDistance(truckLocation, loadPickup);
  const dDropoffToReturn = estimateDistance(loadDropoff, truckReturnDest);
  const dTruckToReturn = estimateDistance(truckLocation, truckReturnDest);
  const dPickupToDropoff = estimateDistance(loadPickup, loadDropoff);

  if (dTruckToReturn === 0) return 100; // Truck already at return destination

  // How much of the truck's return journey is "covered" by picking up and dropping off?
  // Ideal: pickup is near current location, dropoff is near return destination
  // Penalize if pickup is far from truck or dropoff is far from return dest
  
  // Score based on proximity: lower distances = higher score
  const pickupProximity = Math.max(0, 1 - dTruckToPickup / dTruckToReturn);
  const dropoffProximity = Math.max(0, 1 - dDropoffToReturn / dTruckToReturn);

  // Also check if the load's route generally heads in the direction of the return
  const directionAlignment = dTruckToReturn > 0 && dPickupToDropoff > 0
    ? Math.max(0, 1 - Math.abs(dTruckToReturn - (dTruckToPickup + dPickupToDropoff + dDropoffToReturn)) / dTruckToReturn)
    : 0;

  // Combine: 50% pickup proximity, 30% dropoff proximity, 20% direction alignment
  const score = (pickupProximity * 50 + dropoffProximity * 30 + directionAlignment * 20);

  return Math.min(100, Math.round(score));
}

module.exports = {
  estimateDistance,
  calculateRouteOverlap,
  resolveCoords,
  CITY_COORDS,
};