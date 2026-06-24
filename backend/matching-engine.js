/**
 * Dead Mile Auction Sniper — AI Matching Engine
 *
 * Core algorithm that scores the compatibility between empty-returning trucks
 * and available freight loads. Produces a 0-100 match score broken into
 * weighted components, with tier classification and detailed diagnostics.
 */

const { estimateDistance, calculateRouteOverlap } = require('./geoutils');

// Weight configuration for each factor
const WEIGHTS = {
  ROUTE_OVERLAP: 40,    // 0-40 points — route alignment efficiency
  REVENUE_PER_KM: 30,   // 0-30 points — financial viability
  TRUCK_COMPAT: 15,     // 0-15 points — type/capacity fit
  TIME_FEASIBILITY: 15, // 0-15 points — timing/urgency match
};

// Cargo type compatibility mapping (truck types × cargo types)
const CARGO_COMPATIBILITY = {
  flatbed: ['general', 'machinery', 'construction', 'steel', 'timber', 'containers', 'pipes'],
  refrigerated: ['food', 'pharmaceuticals', 'perishables', 'dairy', 'meat', 'produce'],
  box: ['general', 'electronics', 'furniture', 'packaged goods', 'retail', 'textiles'],
  tipper: ['aggregates', 'sand', 'gravel', 'coal', 'minerals', 'waste', 'construction materials'],
};

/**
 * Calculate the route overlap efficiency score (0-40 points).
 * Measures how well a load's route aligns with a truck's empty return journey.
 */
function scoreRouteOverlap(truck, load) {
  const overlapPct = calculateRouteOverlap(
    truck.location,
    truck.return_destination,
    load.pickup,
    load.dropoff
  );

  // Map 0-100% overlap to 0-40 points
  // 100% overlap = 40pts, 50% = 20pts, 0% = 0pts
  const score = Math.round((overlapPct / 100) * WEIGHTS.ROUTE_OVERLAP);

  return {
    score,
    maxScore: WEIGHTS.ROUTE_OVERLAP,
    routeOverlapPct: overlapPct,
    details: {
      truckLocation: truck.location,
      truckReturnDest: truck.return_destination,
      loadPickup: load.pickup,
      loadDropoff: load.dropoff,
    },
  };
}

/**
 * Calculate the revenue per km score (0-30 points).
 * Higher R/km is better. This measures financial viability.
 */
function scoreRevenuePerKm(truck, load) {
  const distance = estimateDistance(load.pickup, load.dropoff);
  const emptyReturnDistance = estimateDistance(truck.location, truck.return_destination);

  if (distance === 0) {
    return { score: 0, maxScore: WEIGHTS.REVENUE_PER_KM, revenuePerKm: 0, estimatedDistance: 0 };
  }

  const revenuePerKm = load.price / distance;
  const fuelCostPerKm = 12.50; // Approximate diesel cost per km in ZAR (2025)
  const marginPerKm = revenuePerKm - fuelCostPerKm;

  // Score calculation:
  // R0/km → 0pts, R10/km → 10pts, R20/km → 20pts, R30+/km → 30pts (max)
  // Break-even at ~R12.50/km (fuel + maintenance overhead)
  const rawScore = Math.round((marginPerKm / 30) * WEIGHTS.REVENUE_PER_KM);
  const score = Math.max(0, Math.min(WEIGHTS.REVENUE_PER_KM, rawScore));

  return {
    score,
    maxScore: WEIGHTS.REVENUE_PER_KM,
    revenuePerKm: Math.round(revenuePerKm * 100) / 100,
    marginPerKm: Math.round(marginPerKm * 100) / 100,
    estimatedDistance: Math.round(distance),
    totalRevenue: load.price,
    savingsFromDeadhead: emptyReturnDistance > 0
      ? Math.round(Math.min(distance, emptyReturnDistance) * revenuePerKm)
      : 0,
  };
}

/**
 * Calculate truck compatibility score (0-15 points).
 * Checks vehicle type, capacity, and special handling.
 */
function scoreTruckCompatibility(truck, load) {
  let score = 0;
  const breakdown = [];

  // 1. Cargo type compatibility (0-8 points)
  const compatibleTypes = CARGO_COMPATIBILITY[truck.type] || ['general'];
  const loadType = load.cargo_type ? load.cargo_type.toLowerCase() : 'general';

  // Check if load type directly matches
  if (compatibleTypes.includes(loadType)) {
    score += 8;
    breakdown.push({ factor: 'cargo_type', points: 8, note: `${truck.type} is compatible with ${loadType}` });
  } else {
    // Partial match: check if the load type is a subtype or there's overlap
    const partialMatch = compatibleTypes.some(t => loadType.includes(t) || t.includes(loadType));
    if (partialMatch) {
      score += 4;
      breakdown.push({ factor: 'cargo_type', points: 4, note: `Partial compatibility: ${truck.type} → ${loadType}` });
    } else {
      breakdown.push({ factor: 'cargo_type', points: 0, note: `${truck.type} not suitable for ${loadType}` });
    }
  }

  // 2. Capacity check (0-5 points)
  // Load size should not exceed 90% of truck capacity for safe transport
  if (truck.capacity > 0) {
    const loadPercent = (load.load_size / truck.capacity) * 100;
    if (loadPercent <= 90) {
      const capacityPoints = loadPercent <= 50 ? 5 : 3; // More points for under-50% utilization
      score += capacityPoints;
      breakdown.push({ factor: 'capacity', points: capacityPoints, note: `Load uses ${Math.round(loadPercent)}% of capacity` });
    } else if (loadPercent <= 100) {
      score += 1;
      breakdown.push({ factor: 'capacity', points: 1, note: `Load uses ${Math.round(loadPercent)}% — tight fit` });
    } else {
      breakdown.push({ factor: 'capacity', points: 0, note: `Load exceeds capacity by ${Math.round(loadPercent - 100)}%` });
    }
  }

  // 3. Special handling readiness (0-2 points)
  if (truck.status === 'available') {
    score += 2;
    breakdown.push({ factor: 'availability', points: 2, note: 'Truck is available now' });
  } else {
    breakdown.push({ factor: 'availability', points: 0, note: `Truck status: ${truck.status}` });
  }

  return { score, maxScore: WEIGHTS.TRUCK_COMPAT, breakdown };
}

/**
 * Calculate time feasibility score (0-15 points).
 * Higher urgency loads need available trucks nearby.
 */
function scoreTimeFeasibility(truck, load) {
  const distance = estimateDistance(truck.location, load.pickup);
  let score = 0;
  const breakdown = [];

  // 1. Proximity to pickup (0-8 points)
  // Closer is better: <50km → 8pts, <200km → 5pts, <500km → 2pts, else 0
  if (distance < 50) {
    score += 8;
    breakdown.push({ factor: 'proximity', points: 8, note: `Only ${distance}km to pickup` });
  } else if (distance < 200) {
    score += 5;
    breakdown.push({ factor: 'proximity', points: 5, note: `${distance}km to pickup` });
  } else if (distance < 500) {
    score += 2;
    breakdown.push({ factor: 'proximity', points: 2, note: `${distance}km to pickup — moderate distance` });
  } else {
    breakdown.push({ factor: 'proximity', points: 0, note: `${distance}km to pickup — too far` });
  }

  // 2. Urgency match (0-7 points)
  const urgencyScores = { high: 7, medium: 4, low: 1 };
  const urgencyPoints = urgencyScores[load.urgency] || 1;
  score += urgencyPoints;

  // Bonus if high urgency AND truck is very close
  if (load.urgency === 'high' && distance < 100) {
    score = Math.min(WEIGHTS.TIME_FEASIBILITY, score + 3); // Urgency bonus
    breakdown.push({ factor: 'urgency_bonus', points: 3, note: 'High urgency + close proximity — ideal' });
  }

  breakdown.push({ factor: 'urgency', points: urgencyPoints, note: `Load urgency: ${load.urgency}` });

  // Consolidate and cap at maxScore
  const finalScore = Math.min(WEIGHTS.TIME_FEASIBILITY, score);

  return { score: finalScore, maxScore: WEIGHTS.TIME_FEASIBILITY, breakdown };
}

/**
 * Compute the overall match score (0-100) between a truck and a load.
 * @param {Object} truck - Fleet truck record
 * @param {Object} load - Freight load record
 * @returns {Object} Complete match assessment
 */
function computeMatch(truck, load) {
  const route = scoreRouteOverlap(truck, load);
  const revenue = scoreRevenuePerKm(truck, load);
  const compat = scoreTruckCompatibility(truck, load);
  const time = scoreTimeFeasibility(truck, load);

  const totalScore = route.score + revenue.score + compat.score + time.score;
  const clampedScore = Math.max(0, Math.min(100, totalScore));

  // Classification tiers
  let tier;
  if (clampedScore >= 90) tier = 'HIGH_PRIORITY';
  else if (clampedScore >= 70) tier = 'GOOD_MATCH';
  else tier = 'IGNORE';

  // Estimated revenue (what the truck earns by taking this load instead of running empty)
  const estimatedRevenue = revenue.totalRevenue || 0;

  // Fuel efficiency gain: if they take this load, they save the empty return distance fuel
  // and earn revenue on a trip they'd otherwise do for free
  const emptyReturnDistance = estimateDistance(truck.location, truck.return_destination);
  const loadDistance = revenue.estimatedDistance || 0;
  // Fuel saved = the shorter of the load route vs empty return
  const fuelSavedKm = Math.min(emptyReturnDistance, loadDistance);
  const fuelCostPerKm = 12.50;
  const fuelSavings = Math.round(fuelSavedKm * fuelCostPerKm);

  return {
    truck_id: truck.id,
    load_id: load.id,
    truck_plate: truck.plate,
    truck_type: truck.type,
    truck_location: truck.location,
    truck_return: truck.return_destination,
    load_pickup: load.pickup,
    load_dropoff: load.dropoff,
    cargo_type: load.cargo_type,
    load_size: load.load_size,
    price: load.price,
    score: clampedScore,
    tier,
    estimated_revenue: estimatedRevenue,
    route_alignment: route.routeOverlapPct,
    fuel_gain: fuelSavings,
    breakdown: {
      route_overlap: route,
      revenue_per_km: revenue,
      truck_compatibility: compat,
      time_feasibility: time,
    },
  };
}

/**
 * Run the matching engine: cross all available trucks against all pending loads.
 * Filters out IGNORE-tier results and sorts by descending score.
 *
 * @param {Array} trucks - Array of fleet truck objects
 * @param {Array} loads - Array of freight load objects
 * @returns {Object} { matches, stats }
 */
function runMatchingEngine(trucks, loads) {
  const results = [];

  for (const truck of trucks) {
    // Only match available trucks that are on return/empty trips
    if (truck.status !== 'available') continue;

    for (const load of loads) {
      const match = computeMatch(truck, load);
      results.push(match);
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Compute aggregate stats
  const highPriority = results.filter(m => m.tier === 'HIGH_PRIORITY');
  const goodMatches = results.filter(m => m.tier === 'GOOD_MATCH');
  const ignored = results.filter(m => m.tier === 'IGNORE');

  const totalPotentialRevenue = results.reduce((sum, m) => sum + m.estimated_revenue, 0);
  const totalFuelSaved = results.reduce((sum, m) => sum + m.fuel_gain, 0);

  const stats = {
    total_matches: results.length,
    high_priority: highPriority.length,
    good_matches: goodMatches.length,
    ignored: ignored.length,
    total_potential_revenue: totalPotentialRevenue,
    total_potential_fuel_savings: totalFuelSaved,
    average_score: results.length > 0
      ? Math.round(results.reduce((s, m) => s + m.score, 0) / results.length)
      : 0,
  };

  // Return non-Ignore matches sorted (but include all in stats)
  return {
    matches: results.filter(m => m.tier !== 'IGNORE'),
    all_matches: results,
    stats,
  };
}

/**
 * Calculate revenue leakage analytics.
 * Shows how much money is being lost to empty kilometres.
 */
function calculateRevenueLeakage(trucks, loads, matches) {
  const totalTrucks = trucks.length;
  const availableTrucks = trucks.filter(t => t.status === 'available').length;
  const busyTrucks = trucks.filter(t => t.status === 'busy').length;
  const maintenanceTrucks = trucks.filter(t => t.status === 'maintenance').length;

  // Calculate total empty km
  let totalEmptyKm = 0;
  let totalRecoverableRevenue = 0;

  for (const truck of trucks) {
    if (truck.return_destination && truck.location) {
      const dist = estimateDistance(truck.location, truck.return_destination);
      totalEmptyKm += dist;

      // If this truck could carry a load at R14/km average (typical SA freight rate)
      const potentialRevenue = dist * 14; // R14/km average
      totalRecoverableRevenue += potentialRevenue;
    }
  }

  // Recovered km from active matches
  const matchedKm = matches.reduce((sum, m) => sum + (m.fuel_gain / 12.50 || 0), 0);
  const recoveredKm = Math.round(matchedKm);
  const recoveryRate = totalEmptyKm > 0 ? Math.round((recoveredKm / totalEmptyKm) * 100) : 0;

  // Lost revenue = potential revenue minus what's captured
  const captureRate = totalRecoverableRevenue > 0
    ? Math.round((matches.reduce((s, m) => s + m.estimated_revenue, 0) / totalRecoverableRevenue) * 100)
    : 0;

  // Average match score
  const avgScore = matches.length > 0
    ? Math.round(matches.reduce((s, m) => s + m.score, 0) / matches.length)
    : 0;

  return {
    fleet_summary: {
      total_trucks: totalTrucks,
      available: availableTrucks,
      busy: busyTrucks,
      maintenance: maintenanceTrucks,
    },
    empty_km_analysis: {
      total_empty_km: Math.round(totalEmptyKm),
      recovered_km: recoveredKm,
      recovery_rate: recoveryRate,
      avg_empty_km_per_truck: totalTrucks > 0 ? Math.round(totalEmptyKm / totalTrucks) : 0,
    },
    revenue_analysis: {
      total_potential_revenue: Math.round(totalRecoverableRevenue),
      captured_revenue: matches.reduce((s, m) => s + m.estimated_revenue, 0),
      lost_revenue: Math.round(totalRecoverableRevenue) - matches.reduce((s, m) => s + m.estimated_revenue, 0),
      capture_rate: captureRate,
      avg_match_score: avgScore,
    },
    top_opportunities: matches
      .filter(m => m.tier === 'HIGH_PRIORITY')
      .sort((a, b) => b.estimated_revenue - a.estimated_revenue)
      .slice(0, 10),
  };
}

module.exports = {
  computeMatch,
  runMatchingEngine,
  calculateRevenueLeakage,
  WEIGHTS,
};