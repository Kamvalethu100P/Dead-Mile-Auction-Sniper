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

// Matches
app.get('/api/matches', async (req, res) => {
    try {
        const matches = await db.query('SELECT * FROM matches');
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auction Bids
app.get('/api/auction/trucks', async (req, res) => {
    try {
        const trucks = await db.query("SELECT * FROM fleet_trucks WHERE status IN ('empty', 'returning', 'partial load')");
        res.json(trucks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auction/bid', async (req, res) => {
    const { truck_id, broker_name, bid_amount } = req.body;
    try {
        await db.query(`INSERT INTO auction_bids (truck_id, broker_name, bid_amount) VALUES (${truck_id}, '${broker_name}', ${bid_amount})`);
        res.status(201).json({ message: 'Bid submitted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auction/bids/:truck_id', async (req, res) => {
    const { truck_id } = req.params;
    try {
        const bids = await db.query(`SELECT * FROM auction_bids WHERE truck_id = ${truck_id} ORDER BY bid_amount DESC`);
        res.json(bids);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auction/bid/accept', async (req, res) => {
    const { bid_id } = req.body;
    try {
        const bids = await db.query(`SELECT truck_id FROM auction_bids WHERE id = ${bid_id}`);
        if (bids.length === 0) return res.status(404).json({ error: 'Bid not found' });
        
        const truck_id = bids[0].truck_id;
        await db.query(`UPDATE auction_bids SET status = 'accepted' WHERE id = ${bid_id}`);
        await db.query(`UPDATE auction_bids SET status = 'rejected' WHERE truck_id = ${truck_id} AND id != ${bid_id}`);
        await db.query(`UPDATE fleet_trucks SET status = 'busy' WHERE id = ${truck_id}`);
        
        res.json({ message: 'Bid accepted and truck assigned' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auction/suggest-price/:truck_id', async (req, res) => {
    const { truck_id } = req.params;
    try {
        const trucks = await db.query(`SELECT capacity FROM fleet_trucks WHERE id = ${truck_id}`);
        if (trucks.length === 0) return res.status(404).json({ error: 'Truck not found' });
        
        const capacity = trucks[0].capacity;
        const base = capacity * 300;
        const min = Math.round(base * 0.9);
        const max = Math.round(base * 1.2);
        
        res.json({ 
            recommended_min: min,
            recommended_max: max,
            currency: 'R'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});
