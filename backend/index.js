require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { runMatchingEngine, calculateRevenueLeakage, computeMatch } = require('./matching-engine');

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// Health
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Dead Mile API is running' });
});

// ============================================================
// Users
// ============================================================
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.query('SELECT id, username, role FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// Fleet Trucks
// ============================================================
app.get('/api/fleet', async (req, res) => {
    try {
        const trucks = await db.query('SELECT * FROM fleet_trucks');
        res.json(trucks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/fleet', async (req, res) => {
    const { plate, type, capacity, location, return_destination, status } = req.body;
    try {
        await db.query(`INSERT INTO fleet_trucks (plate, type, capacity, location, return_destination, status) VALUES ('${plate}', '${type}', ${capacity}, '${location}', '${return_destination}', '${status}')`);
        res.status(201).json({ message: 'Truck added' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/fleet/bulk', async (req, res) => {
    const trucks = req.body;
    if (!Array.isArray(trucks)) {
        return res.status(400).json({ error: 'Expected an array of trucks' });
    }
    try {
        for (const truck of trucks) {
            const { plate, type, capacity, location, return_destination, status } = truck;
            await db.query(`INSERT INTO fleet_trucks (plate, type, capacity, location, return_destination, status) VALUES ('${plate}', '${type}', ${capacity}, '${location}', '${return_destination}', '${status}')`);
        }
        res.status(201).json({ message: `${trucks.length} trucks added` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/fleet/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`DELETE FROM fleet_trucks WHERE id = ${id}`);
        res.json({ message: 'Truck deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// Freight Loads
// ============================================================
app.get('/api/loads', async (req, res) => {
    try {
        const loads = await db.query('SELECT * FROM freight_loads');
        res.json(loads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/loads', async (req, res) => {
    const { pickup, dropoff, cargo_type, load_size, price, urgency } = req.body;
    try {
        await db.query(`INSERT INTO freight_loads (pickup, dropoff, cargo_type, load_size, price, urgency) VALUES ('${pickup}', '${dropoff}', '${cargo_type}', ${load_size}, ${price}, '${urgency}')`);
        res.status(201).json({ message: 'Load added' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/loads/bulk', async (req, res) => {
    const loads = req.body;
    if (!Array.isArray(loads)) {
        return res.status(400).json({ error: 'Expected an array of loads' });
    }
    try {
        for (const load of loads) {
            const { pickup, dropoff, cargo_type, load_size, price, urgency } = load;
            await db.query(`INSERT INTO freight_loads (pickup, dropoff, cargo_type, load_size, price, urgency) VALUES ('${pickup}', '${dropoff}', '${cargo_type}', ${load_size}, ${price}, '${urgency}')`);
        }
        res.status(201).json({ message: `${loads.length} loads added` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/loads/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`DELETE FROM freight_loads WHERE id = ${id}`);
        res.json({ message: 'Load deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// AI Matching Engine — The Core
// ============================================================

/**
 * GET /api/matches
 *
 * Runs the full matching engine across all available trucks and loads.
 * Returns scored matches sorted by match quality, plus aggregate stats.
 *
 * Query params:
 *   ?tier=high_priority — filter to HIGH_PRIORITY only
 *   ?tier=good_match   — filter to GOOD_MATCH only
 *   ?min_score=50      — minimum score threshold
 *   ?limit=20          — max results
 */
app.get('/api/matches', async (req, res) => {
    try {
        const trucks = await db.query('SELECT * FROM fleet_trucks');
        const loads = await db.query('SELECT * FROM freight_loads');

        const result = runMatchingEngine(trucks, loads);

        let matches = result.matches;
        const { stats } = result;

        // Apply filters
        const { tier, min_score, limit } = req.query;

        if (tier === 'high_priority') {
            matches = matches.filter(m => m.tier === 'HIGH_PRIORITY');
        } else if (tier === 'good_match') {
            matches = matches.filter(m => m.tier === 'GOOD_MATCH');
        }

        if (min_score) {
            const threshold = parseFloat(min_score);
            if (!isNaN(threshold)) {
                matches = matches.filter(m => m.score >= threshold);
            }
        }

        if (limit) {
            const max = parseInt(limit, 10);
            if (!isNaN(max) && max > 0) {
                matches = matches.slice(0, max);
            }
        }

        res.json({ matches, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/matches/:truckId/:loadId
 *
 * Score one specific truck-load pair (manual evaluation).
 */
app.get('/api/matches/score/:truckId/:loadId', async (req, res) => {
    try {
        const { truckId, loadId } = req.params;
        const trucks = await db.query(`SELECT * FROM fleet_trucks WHERE id = ${truckId}`);
        const loads = await db.query(`SELECT * FROM freight_loads WHERE id = ${loadId}`);

        if (!trucks || trucks.length === 0) {
            return res.status(404).json({ error: 'Truck not found' });
        }
        if (!loads || loads.length === 0) {
            return res.status(404).json({ error: 'Load not found' });
        }

        const match = computeMatch(trucks[0], loads[0]);
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/matches/revenue-leakage
 *
 * Revenue leakage analytics dashboard data.
 * Shows how much money is being lost to empty kilometres
 * and what the matching engine is recovering.
 */
app.get('/api/matches/revenue-leakage', async (req, res) => {
    try {
        const trucks = await db.query('SELECT * FROM fleet_trucks');
        const loads = await db.query('SELECT * FROM freight_loads');

        const result = runMatchingEngine(trucks, loads);

        // Save high-priority matches to the database
        const matchesToSave = result.matches.filter(m => m.tier !== 'IGNORE');
        // Clear old matches and insert new ones for data consistency
        await db.query('DELETE FROM matches');
        for (const m of matchesToSave) {
            await db.query(
                `INSERT INTO matches (truck_id, load_id, score, estimated_revenue, route_alignment, fuel_gain, status)
                 VALUES (${m.truck_id}, ${m.load_id}, ${m.score}, ${m.estimated_revenue}, ${m.route_alignment}, ${m.fuel_gain}, '${m.tier}')`
            );
        }

        const leakage = calculateRevenueLeakage(trucks, loads, result.matches);
        res.json(leakage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/matches/:matchId/book
 *
 * Book/confirm a match (simulated).
 */
app.post('/api/matches/:matchId/book', async (req, res) => {
    try {
        const { matchId } = req.params;
        await db.query(`UPDATE matches SET status = 'booked' WHERE id = ${matchId}`);
        res.json({ message: 'Match booked successfully', match_id: matchId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// Auction/Bidding Endpoints (for upcoming auction mode)
// ============================================================

/**
 * GET /api/auctions
 *
 * Returns available loads that are in auction mode —
 * loads that have multiple good matches competing for them.
 */
app.get('/api/auctions', async (req, res) => {
    try {
        const trucks = await db.query('SELECT * FROM fleet_trucks');
        const loads = await db.query('SELECT * FROM freight_loads');

        const result = runMatchingEngine(trucks, loads);

        // Group matches by load to find competitive loads
        const loadGroups = {};
        for (const match of result.matches) {
            if (!loadGroups[match.load_id]) {
                loadGroups[match.load_id] = [];
            }
            loadGroups[match.load_id].push(match);
        }

        // Find loads with 2+ GOOD_MATCH or HIGH_PRIORITY matches = auction candidates
        const auctionCandidates = [];
        for (const [loadId, groupMatches] of Object.entries(loadGroups)) {
            const strongMatches = groupMatches.filter(m => m.score >= 70);
            if (strongMatches.length >= 2) {
                auctionCandidates.push({
                    load_id: parseInt(loadId),
                    load_pickup: strongMatches[0].load_pickup,
                    load_dropoff: strongMatches[0].load_dropoff,
                    cargo_type: strongMatches[0].cargo_type,
                    load_size: strongMatches[0].load_size,
                    price: strongMatches[0].price,
                    match_count: strongMatches.length,
                    competing_trucks: strongMatches.map(m => ({
                        truck_id: m.truck_id,
                        plate: m.truck_plate,
                        type: m.truck_type,
                        score: m.score,
                        estimated_revenue: m.estimated_revenue,
                    })),
                    suggested_starting_bid: Math.round(strongMatches[0].price * 0.85), // 85% of asking
                });
            }
        }

        res.json({
            auctions: auctionCandidates,
            total_auctions: auctionCandidates.length,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// Start
// ============================================================
app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});
