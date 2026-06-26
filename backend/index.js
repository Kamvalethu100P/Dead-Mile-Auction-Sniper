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

// ============================================================
// EFT Invoicing System
// ============================================================

const PLAN_TIERS = {
  'Growth': { price: 20000, gmv_percent: 7, label: 'Growth Fleet', max_trucks: 35, features: ['Up to 35 trucks', '7% GMV fee', 'Basic matching engine', 'Email support'] },
  'Professional': { price: 35000, gmv_percent: 10, label: 'Professional Fleet', max_trucks: 150, features: ['Up to 150 trucks', '10% GMV fee', 'Advanced matching engine', 'Priority support', 'Revenue analytics'] },
  'Enterprise': { price: 65000, gmv_percent: 15, label: 'Enterprise Fleet', max_trucks: 'Unlimited', features: ['Unlimited trucks', '15% GMV fee', 'Full AI matching engine', 'Dedicated account manager', 'Custom integrations', 'Advanced analytics'] },
};

async function getNextInvoiceNumber() {
  const result = await db.query("SELECT COUNT(*) as cnt FROM invoices");
  const count = (result && result[0] && result[0].cnt) || 0;
  const year = new Date().getFullYear();
  const padded = String(count + 1).padStart(4, '0');
  return `DMA-${year}-${padded}`;
}

app.post('/api/invoices/create', async (req, res) => {
  try {
    const { customer_name, company, email, phone, plan_tier } = req.body;
    if (!customer_name || !company || !email || !plan_tier) {
      return res.status(400).json({ error: 'Missing required fields: customer_name, company, email, plan_tier' });
    }
    const plan = PLAN_TIERS[plan_tier];
    if (!plan) {
      return res.status(400).json({ error: `Invalid plan tier: ${plan_tier}. Must be Growth, Professional, or Enterprise` });
    }
    const invoice_number = await getNextInvoiceNumber();
    const result = await db.query(
      `INSERT INTO invoices (invoice_number, customer_name, company, email, phone, plan_tier, amount, gmv_percent)
       VALUES ('${invoice_number}', '${customer_name.replace(/'/g, "''")}', '${company.replace(/'/g, "''")}', '${email}', '${(phone || '').replace(/'/g, "''")}', '${plan_tier}', ${plan.price}, ${plan.gmv_percent})`
    );
    const invoice = (await db.query(`SELECT * FROM invoices WHERE invoice_number = '${invoice_number}'`))[0];
    if (!invoice) {
      // Get by last insert if number lookup fails
      const all = await db.query("SELECT * FROM invoices ORDER BY id DESC LIMIT 1");
      return res.status(201).json({ ...all[0], plan_details: plan });
    }
    res.status(201).json({ ...invoice, plan_details: plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await db.query('SELECT * FROM invoices ORDER BY id DESC');
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isNumber = /^\d+$/.test(id);
    let invoice;
    if (isNumber) {
      invoice = (await db.query(`SELECT * FROM invoices WHERE id = ${id}`))[0];
    } else {
      invoice = (await db.query(`SELECT * FROM invoices WHERE invoice_number = '${id.replace(/'/g, "''")}'`))[0];
    }
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const plan = PLAN_TIERS[invoice.plan_tier] || {};
    res.json({ ...invoice, plan_details: plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const isNumber = /^\d+$/.test(id);
    let invoice;
    if (isNumber) {
      invoice = (await db.query(`SELECT * FROM invoices WHERE id = ${id}`))[0];
    } else {
      invoice = (await db.query(`SELECT * FROM invoices WHERE invoice_number = '${id.replace(/'/g, "''")}'`))[0];
    }
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const plan = PLAN_TIERS[invoice.plan_tier] || {};
    const createdDate = new Date(invoice.created_at || Date.now());
    const formattedDate = createdDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
    const dueDate = new Date(createdDate);
    dueDate.setDate(dueDate.getDate() + 30);
    const formattedDue = dueDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${invoice.invoice_number} — Dead Mile Auction Sniper</title>
<style>
  @page { margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #e94560; padding-bottom: 20px; }
  .header h1 { font-size: 28px; color: #e94560; }
  .header .invoice-meta { text-align: right; }
  .header .invoice-meta h2 { font-size: 24px; color: #1a1a2e; }
  .header .invoice-meta p { color: #666; }
  .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .details .bill-to { flex: 1; }
  .details .bill-to h3 { font-size: 16px; color: #e94560; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .details .bill-to p { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background: #1a1a2e; color: white; padding: 12px 15px; text-align: left; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 12px 15px; border-bottom: 1px solid #eee; }
  .total-row td { font-weight: bold; font-size: 18px; border-top: 2px solid #1a1a2e; border-bottom: none; }
  .total-row .amount { color: #e94560; font-size: 22px; }
  .banking { background: #f8f9fa; border: 2px solid #e94560; border-radius: 8px; padding: 25px; margin-bottom: 30px; }
  .banking h3 { color: #1a1a2e; margin-bottom: 15px; font-size: 18px; }
  .banking .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e0e0e0; }
  .banking .detail-row:last-child { border-bottom: none; }
  .banking .label { font-weight: 600; color: #555; }
  .banking .value { font-family: monospace; font-size: 16px; color: #1a1a2e; }
  .reference { background: #e94560; color: white; text-align: center; padding: 12px; border-radius: 6px; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin-bottom: 30px; }
  .footer { text-align: center; color: #999; font-size: 13px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
  .print-btn { display: block; margin: 20px auto; padding: 12px 30px; background: #1a1a2e; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
  @media print { .print-btn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Download PDF</button>

  <div class="header">
    <div>
      <h1>Dead Mile Auction Sniper</h1>
      <p style="color:#666;margin-top:4px;">Logistics Intelligence Platform</p>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p><strong>${invoice.invoice_number}</strong></p>
      <p>Date: ${formattedDate}</p>
      <p>Due: ${formattedDue}</p>
    </div>
  </div>

  <div class="details">
    <div class="bill-to">
      <h3>Bill To</h3>
      <p><strong>${invoice.customer_name}</strong></p>
      <p>${invoice.company}</p>
      <p>${invoice.email}</p>
      ${invoice.phone ? `<p>${invoice.phone}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Details</th>
        <th style="text-align:right">Amount (ZAR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${plan.label || invoice.plan_tier}</strong></td>
        <td>Monthly subscription. ${plan.max_trucks ? 'Up to ' + plan.max_trucks + ' trucks.' : ''} ${plan.gmv_percent ? plan.gmv_percent + '% GMV fee on matched loads.' : ''}</td>
        <td style="text-align:right">R ${(invoice.amount || 0).toLocaleString('en-ZA')}.00</td>
      </tr>
      <tr>
        <td colspan="2" style="text-align:right"><strong>Monthly GMV Fee</strong></td>
        <td style="text-align:right">${invoice.gmv_percent || 0}% of GMV</td>
      </tr>
      <tr class="total-row">
        <td colspan="2" style="text-align:right">Total Due</td>
        <td class="amount" style="text-align:right">R ${(invoice.amount || 0).toLocaleString('en-ZA')}.00</td>
      </tr>
    </tbody>
  </table>

  <div class="banking">
    <h3>EFT Payment Details</h3>
    <div class="detail-row">
      <span class="label">Bank</span>
      <span class="value">Standard Bank</span>
    </div>
    <div class="detail-row">
      <span class="label">Account Number</span>
      <span class="value">10243855972</span>
    </div>
    <div class="detail-row">
      <span class="label">Branch Code</span>
      <span class="value">051001</span>
    </div>
    <div class="detail-row">
      <span class="label">Account Type</span>
      <span class="value">Business Cheque Account</span>
    </div>
  </div>

  <div class="reference">
    Payment Reference: ${invoice.invoice_number} — ${invoice.company}
  </div>

  <div class="footer">
    <p>Dead Mile Auction Sniper &copy; ${new Date().getFullYear()}. All rights reserved.</p>
    <p>For queries: accounts@deadmile.dev</p>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
