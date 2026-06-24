/**
 * Seed data generator — populates the database with realistic demo data
 * for the Dead Mile Auction Sniper platform.
 *
 * Run: node seed-data.js
 * Requires team-db CLI.
 */

const { execSync } = require('child_process');

function dbExec(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  try {
    const out = execSync(`team-db "${escaped}"`, { timeout: 10000 });
    return JSON.parse(out.toString());
  } catch (e) {
    console.error('DB error:', e.message.substring(0, 200));
    return null;
  }
}

// ——— Fleet Trucks ———
const trucks = [
  // Flatbeds
  { plate: 'GP-345-BC', type: 'flatbed', capacity: 24, location: 'Johannesburg', return_destination: 'Durban', status: 'available' },
  { plate: 'GP-789-XD', type: 'flatbed', capacity: 28, location: 'Pretoria', return_destination: 'Cape Town', status: 'available' },
  { plate: 'WC-123-FG', type: 'flatbed', capacity: 22, location: 'Cape Town', return_destination: 'Johannesburg', status: 'available' },
  { plate: 'NL-456-HJ', type: 'flatbed', capacity: 26, location: 'Durban', return_destination: 'Pretoria', status: 'available' },
  { plate: 'EC-789-KL', type: 'flatbed', capacity: 20, location: 'Port Elizabeth', return_destination: 'Johannesburg', status: 'available' },
  // Refrigerated
  { plate: 'GP-111-RT', type: 'refrigerated', capacity: 18, location: 'Johannesburg', return_destination: 'Cape Town', status: 'available' },
  { plate: 'WC-222-RF', type: 'refrigerated', capacity: 15, location: 'Cape Town', return_destination: 'Durban', status: 'available' },
  { plate: 'NL-333-RG', type: 'refrigerated', capacity: 20, location: 'Durban', return_destination: 'Johannesburg', status: 'available' },
  // Box trucks
  { plate: 'GP-444-BX', type: 'box', capacity: 12, location: 'Pretoria', return_destination: 'Bloemfontein', status: 'available' },
  { plate: 'MP-555-BX', type: 'box', capacity: 10, location: 'Nelspruit', return_destination: 'Johannesburg', status: 'available' },
  { plate: 'NW-666-BX', type: 'box', capacity: 14, location: 'Rustenburg', return_destination: 'Pretoria', status: 'available' },
  // Tippers
  { plate: 'GP-777-TP', type: 'tipper', capacity: 30, location: 'Johannesburg', return_destination: 'Kimberley', status: 'available' },
  { plate: 'NL-888-TP', type: 'tipper', capacity: 34, location: 'Richards Bay', return_destination: 'Johannesburg', status: 'available' },
  // Non-available trucks (for stats realism)
  { plate: 'GP-999-BZ', type: 'box', capacity: 10, location: 'Johannesburg', return_destination: 'Pretoria', status: 'busy' },
  { plate: 'WC-000-MT', type: 'flatbed', capacity: 24, location: 'Cape Town', return_destination: 'Port Elizabeth', status: 'maintenance' },
];

// ——— Freight Loads ———
const loads = [
  // General cargo
  { pickup: 'Johannesburg', dropoff: 'Durban', cargo_type: 'electronics', load_size: 12, price: 8500, urgency: 'high' },
  { pickup: 'Johannesburg', dropoff: 'Durban', cargo_type: 'furniture', load_size: 18, price: 12000, urgency: 'medium' },
  { pickup: 'Pretoria', dropoff: 'Cape Town', cargo_type: 'machinery', load_size: 20, price: 22000, urgency: 'high' },
  { pickup: 'Durban', dropoff: 'Johannesburg', cargo_type: 'food', load_size: 15, price: 9500, urgency: 'high' },
  { pickup: 'Cape Town', dropoff: 'Johannesburg', cargo_type: 'general', load_size: 22, price: 18000, urgency: 'medium' },
  { pickup: 'Cape Town', dropoff: 'Durban', cargo_type: 'perishables', load_size: 10, price: 11000, urgency: 'high' },
  { pickup: 'Port Elizabeth', dropoff: 'Johannesburg', cargo_type: 'textiles', load_size: 12, price: 8500, urgency: 'low' },
  { pickup: 'Durban', dropoff: 'Pretoria', cargo_type: 'general', load_size: 20, price: 14000, urgency: 'medium' },
  { pickup: 'Bloemfontein', dropoff: 'Pretoria', cargo_type: 'furniture', load_size: 8, price: 5500, urgency: 'low' },
  { pickup: 'Nelspruit', dropoff: 'Johannesburg', cargo_type: 'general', load_size: 8, price: 5000, urgency: 'medium' },
  { pickup: 'Rustenburg', dropoff: 'Pretoria', cargo_type: 'construction materials', load_size: 10, price: 6500, urgency: 'low' },
  { pickup: 'Kimberley', dropoff: 'Johannesburg', cargo_type: 'minerals', load_size: 25, price: 16000, urgency: 'medium' },
  { pickup: 'Richards Bay', dropoff: 'Johannesburg', cargo_type: 'coal', load_size: 30, price: 20000, urgency: 'high' },
  { pickup: 'Pretoria', dropoff: 'Durban', cargo_type: 'electronics', load_size: 10, price: 7500, urgency: 'high' },
  { pickup: 'Cape Town', dropoff: 'Port Elizabeth', cargo_type: 'food', load_size: 14, price: 9000, urgency: 'medium' },
  { pickup: 'Johannesburg', dropoff: 'Polokwane', cargo_type: 'packaged goods', load_size: 16, price: 11000, urgency: 'medium' },
  { pickup: 'Durban', dropoff: 'Cape Town', cargo_type: 'perishables', load_size: 12, price: 13000, urgency: 'high' },
  { pickup: 'Johannesburg', dropoff: 'Nelspruit', cargo_type: 'general', load_size: 8, price: 4800, urgency: 'low' },
  { pickup: 'Johannesburg', dropoff: 'Cape Town', cargo_type: 'electronics', load_size: 16, price: 20000, urgency: 'high' },
  { pickup: 'Pretoria', dropoff: 'Johannesburg', cargo_type: 'furniture', load_size: 5, price: 3200, urgency: 'medium' },
];

// ——— Users ———
const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'dispatcher', password: 'dispatch123', role: 'dispatcher' },
  { username: 'ops', password: 'ops123', role: 'operator' },
];

async function seed() {
  console.log('🌱 Seeding Dead Mile Auction Sniper database...\n');

  // Clear existing data
  console.log('Clearing existing data...');
  dbExec('DELETE FROM matches');
  dbExec('DELETE FROM freight_loads');
  dbExec('DELETE FROM fleet_trucks');
  dbExec('DELETE FROM users');

  // Insert trucks
  console.log('Inserting fleet trucks...');
  for (const t of trucks) {
    const sql = `INSERT INTO fleet_trucks (plate, type, capacity, location, return_destination, status) VALUES ('${t.plate}', '${t.type}', ${t.capacity}, '${t.location}', '${t.return_destination}', '${t.status}')`;
    dbExec(sql);
  }
  console.log(`  ✓ ${trucks.length} trucks inserted`);

  // Insert loads
  console.log('Inserting freight loads...');
  for (const l of loads) {
    const sql = `INSERT INTO freight_loads (pickup, dropoff, cargo_type, load_size, price, urgency) VALUES ('${l.pickup}', '${l.dropoff}', '${l.cargo_type}', ${l.load_size}, ${l.price}, '${l.urgency}')`;
    dbExec(sql);
  }
  console.log(`  ✓ ${loads.length} loads inserted`);

  // Insert users
  console.log('Inserting users...');
  for (const u of users) {
    const sql = `INSERT INTO users (username, password, role) VALUES ('${u.username}', '${u.password}', '${u.role}')`;
    dbExec(sql);
  }
  console.log(`  ✓ ${users.length} users inserted`);

  // Verify
  const truckCount = dbExec('SELECT COUNT(*) as cnt FROM fleet_trucks');
  const loadCount = dbExec('SELECT COUNT(*) as cnt FROM freight_loads');
  const userCount = dbExec('SELECT COUNT(*) as cnt FROM users');

  console.log('\n📊 Database state:');
  console.log(`  Fleet trucks: ${truckCount?.[0]?.cnt || 0}`);
  console.log(`  Freight loads: ${loadCount?.[0]?.cnt || 0}`);
  console.log(`  Users: ${userCount?.[0]?.cnt || 0}`);
  console.log('\n✅ Seeding complete!');
}

seed().catch(console.error);