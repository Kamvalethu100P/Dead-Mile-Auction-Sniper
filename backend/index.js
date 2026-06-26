require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Dead Mile API is running' });
});

// Users
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.query('SELECT id, username, role FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fleet Trucks
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

// Freight Loads
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
        await db.query(`INSERT INTO freight_loads (pickup, dropoff, cargo_type, load_size, price, urgency, payment_status) VALUES ('${pickup}', '${dropoff}', '${cargo_type}', ${load_size}, ${price}, '${urgency}', 'unpaid')`);
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
            await db.query(`INSERT INTO freight_loads (pickup, dropoff, cargo_type, load_size, price, urgency, payment_status) VALUES ('${pickup}', '${dropoff}', '${cargo_type}', ${load_size}, ${price}, '${urgency}', 'unpaid')`);
        }
        res.status(201).json({ message: `${loads.length} loads added` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/loads/:id/pay', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`UPDATE freight_loads SET payment_status = 'pending_verification' WHERE id = ${id}`);
        res.json({ message: 'Payment submitted for verification' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/loads/:id/verify', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`UPDATE freight_loads SET payment_status = 'verified' WHERE id = ${id}`);
        res.json({ message: 'Payment verified' });
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

// Matches
app.get('/api/matches', async (req, res) => {
    try {
        const trucks = await db.query("SELECT * FROM fleet_trucks WHERE status = 'available'");
        const loads = await db.query("SELECT * FROM freight_loads");
        const { runMatchingEngine } = require('./matching-engine');
        const { matches } = runMatchingEngine(trucks, loads);
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/matches/score/:truckId/:loadId', async (req, res) => {
    const { truckId, loadId } = req.params;
    try {
        const truck = (await db.query(`SELECT * FROM fleet_trucks WHERE id = ${truckId}`))[0];
        const load = (await db.query(`SELECT * FROM freight_loads WHERE id = ${loadId}`))[0];
        if (!truck || !load) return res.status(404).json({ error: 'Truck or load not found' });
        const { computeMatch } = require('./matching-engine');
        const match = computeMatch(truck, load);
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/matches/:matchId/book', async (req, res) => {
    const { truck_id, load_id } = req.body; 
    try {
        await db.query(`UPDATE fleet_trucks SET status = 'busy' WHERE id = ${truck_id}`);
        await db.query(`INSERT INTO matches (truck_id, load_id, status) VALUES (${truck_id}, ${load_id}, 'booked')`);
        res.json({ message: 'Match booked successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/matches/revenue-leakage', async (req, res) => {
    try {
        const trucks = await db.query('SELECT * FROM fleet_trucks');
        const loads = await db.query('SELECT * FROM freight_loads');
        
        const { runMatchingEngine, calculateRevenueLeakage } = require('./matching-engine');
        const { matches } = runMatchingEngine(trucks, loads);
        const leakage = calculateRevenueLeakage(trucks, loads, matches);
        
        res.json(leakage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auction Mode
const DISTANCES = {
    'Johannesburg': { 'Durban': 600, 'Cape Town': 1400, 'Pretoria': 60 },
    'Pretoria': { 'Johannesburg': 60, 'Durban': 650, 'Cape Town': 1450 },
    'Durban': { 'Johannesburg': 600, 'Pretoria': 650, 'Cape Town': 1600 },
    'Cape Town': { 'Johannesburg': 1400, 'Pretoria': 1450, 'Durban': 1600 }
};

const getDistance = (from, to) => {
    if (DISTANCES[from] && DISTANCES[from][to]) return DISTANCES[from][to];
    if (DISTANCES[to] && DISTANCES[to][from]) return DISTANCES[to][from];
    return 500; // Default
};

app.post('/api/auction/listings', async (req, res) => {
    const { truck_id, route_from, route_to, available_capacity } = req.body;
    try {
        const distance = getDistance(route_from, route_to);
        const capacityFactor = available_capacity / 30; // Scale relative to 30-ton truck
        const suggested_min = Math.round(15 * distance * capacityFactor);
        const suggested_max = Math.round(20 * distance * capacityFactor);

        await db.query(`INSERT INTO auction_listings (truck_id, route_from, route_to, available_capacity, suggested_min_price, suggested_max_price) VALUES (${truck_id}, '${route_from}', '${route_to}', ${available_capacity}, ${suggested_min}, ${suggested_max})`);
        res.status(201).json({ message: 'Auction listing created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auction/listings', async (req, res) => {
    try {
        const listings = await db.query(`
            SELECT al.*, ft.plate, ft.type 
            FROM auction_listings al
            JOIN fleet_trucks ft ON al.truck_id = ft.id
            WHERE al.status = 'active'
        `);
        res.json(listings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// Payment Verification System
// ============================================================

const BANK_DETAILS = {
  bank: 'Standard Bank',
  account_number: '10243855972',
  branch_code: '051001',
  reference: 'DEAD MILE AUCTION SNIPER',
  pop_email: 'kamva100@proton.me',
};

/**
 * POST /api/payments/proceed
 * Creates a payment record for a load and sets it to pending_verification.
 * This is the ONLY endpoint that should trigger bank details to be shown.
 */
app.post('/api/payments/proceed', async (req, res) => {
  try {
    const { load_id } = req.body;
    if (!load_id) {
      return res.status(400).json({ error: 'load_id is required' });
    }

    // Verify the load exists
    const load = (await db.query(`SELECT * FROM freight_loads WHERE id = ${load_id}`))[0];
    if (!load) {
      return res.status(404).json({ error: 'Load not found' });
    }

    // Check if already has a payment
    const existing = await db.query(`SELECT * FROM payments WHERE load_id = ${load_id} AND status != 'verified'`);
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Payment already in progress for this load', payment_id: existing[0].id });
    }

    // Create payment record (starts as pending_verification)
    const result = await db.query(
      `INSERT INTO payments (load_id, amount) VALUES (${load_id}, ${load.price})`
    );

    // Get the created payment
    const payments = await db.query(`SELECT * FROM payments WHERE load_id = ${load_id} ORDER BY id DESC LIMIT 1`);
    const payment = payments[0];

    // Update load payment status
    await db.query(`UPDATE freight_loads SET payment_status = 'pending_verification' WHERE id = ${load_id}`);

    res.status(201).json({
      payment_id: payment.id,
      load_id: load.id,
      amount: load.price,
      status: 'pending_verification',
      message: 'Payment initiated. Bank details are now available.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/bank-details/{payment_id}
 * GATEKEPT: Returns bank details ONLY if a payment record exists.
 * Returns 403 if no valid payment record is found.
 */
app.get('/api/payments/bank-details/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;
    const payment = (await db.query(`SELECT * FROM payments WHERE id = ${payment_id}`))[0];

    if (!payment) {
      return res.status(403).json({ error: 'No payment initiated. Bank details are only available after proceeding to pay.' });
    }

    res.json({
      payment_id: payment.id,
      load_id: payment.load_id,
      amount: payment.amount,
      status: payment.status,
      bank_details: BANK_DETAILS,
      instructions: [
        '1. Transfer the exact amount to the Standard Bank account below.',
        `2. Use the reference: ${BANK_DETAILS.reference}`,
        `3. Email your Proof of Payment (POP) to ${BANK_DETAILS.pop_email}`,
        '4. Your load will be activated once payment is verified.',
      ],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/verify/{payment_id}
 * Admin endpoint — marks payment as verified and activates the load.
 */
app.post('/api/payments/verify/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;
    const payment = (await db.query(`SELECT * FROM payments WHERE id = ${payment_id}`))[0];

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'verified') {
      return res.status(409).json({ error: 'Payment already verified' });
    }

    // Mark payment as verified
    await db.query(
      `UPDATE payments SET status = 'verified', verified_at = datetime('now') WHERE id = ${payment_id}`
    );

    // Update the load payment status
    await db.query(
      `UPDATE freight_loads SET payment_status = 'verified' WHERE id = ${payment.load_id}`
    );

    res.json({
      message: 'Payment verified successfully',
      payment_id: payment.id,
      load_id: payment.load_id,
      status: 'verified',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loads/{id}/payment-status
 * Returns the payment status of a load.
 */
app.get('/api/loads/:id/payment-status', async (req, res) => {
  try {
    const { id } = req.params;
    const load = (await db.query(`SELECT id, pickup, dropoff, price, payment_status FROM freight_loads WHERE id = ${id}`))[0];

    if (!load) {
      return res.status(404).json({ error: 'Load not found' });
    }

    // Get associated payment records
    const payments = await db.query(`SELECT id, amount, status, created_at, verified_at FROM payments WHERE load_id = ${id} ORDER BY id DESC`);

    res.json({
      load_id: load.id,
      payment_status: load.payment_status || 'pending',
      route: `${load.pickup} → ${load.dropoff}`,
      amount: load.price,
      payments: payments || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});
