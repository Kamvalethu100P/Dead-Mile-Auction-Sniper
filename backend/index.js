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

app.post('/api/auction/bids', async (req, res) => {
    const { listing_id, broker_name, amount, contact_info } = req.body;
    try {
        await db.query(`INSERT INTO auction_bids (listing_id, broker_name, amount, contact_info) VALUES (${listing_id}, '${broker_name}', ${amount}, '${contact_info}')`);
        res.status(201).json({ message: 'Bid placed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auction/listings/:id/bids', async (req, res) => {
    const { id } = req.params;
    try {
        const bids = await db.query(`SELECT * FROM auction_bids WHERE listing_id = ${id} ORDER BY amount DESC`);
        res.json(bids);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});
