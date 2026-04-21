require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const initSqlJs = require('sql.js');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const DB_PATH = './vehicletag.db';

// ─── Database Setup ───────────────────────────────────────────────────────────
let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      vehicle_type TEXT DEFAULT 'car',
      tag_id TEXT UNIQUE NOT NULL,
      qr_data TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relation TEXT NOT NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS contact_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      contact_type TEXT NOT NULL,
      caller_info TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );
  `);

  saveDb();
  console.log('✅ Database ready');
}

// ─── sql.js helper: replaces better-sqlite3's .get() and .all() ──────────────
function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ error: 'All fields required' });

    const existing = dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    dbRun('INSERT INTO users (id, name, email, phone, password) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, phone, hashedPassword]);

    const token = jwt.sign({ id, email, name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email, phone } });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = dbGet('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json(user);
});

// ─── VEHICLE ROUTES ───────────────────────────────────────────────────────────

app.get('/api/vehicles', authMiddleware, (req, res) => {
  const vehicles = dbAll(`
    SELECT v.*,
      (SELECT COUNT(*) FROM emergency_contacts WHERE vehicle_id = v.id) as emergency_count,
      (SELECT COUNT(*) FROM contact_logs WHERE vehicle_id = v.id) as contact_count
    FROM vehicles v WHERE v.user_id = ?
  `, [req.user.id]);
  res.json(vehicles);
});

app.post('/api/vehicles', authMiddleware, async (req, res) => {
  try {
    const { vehicle_number, vehicle_type } = req.body;
    if (!vehicle_number) return res.status(400).json({ error: 'Vehicle number required' });

    const id = uuidv4();
    const tag_id = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
    const qr_url = `${APP_URL}/contact/${tag_id}`;

    const qr_data = await QRCode.toDataURL(qr_url, {
      width: 300, margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    dbRun('INSERT INTO vehicles (id, user_id, vehicle_number, vehicle_type, tag_id, qr_data) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, vehicle_number.toUpperCase(), vehicle_type || 'car', tag_id, qr_data]);

    const vehicle = dbGet('SELECT * FROM vehicles WHERE id = ?', [id]);
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.delete('/api/vehicles/:id', authMiddleware, (req, res) => {
  const vehicle = dbGet('SELECT * FROM vehicles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  dbRun('DELETE FROM emergency_contacts WHERE vehicle_id = ?', [req.params.id]);
  dbRun('DELETE FROM contact_logs WHERE vehicle_id = ?', [req.params.id]);
  dbRun('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ─── EMERGENCY CONTACTS ───────────────────────────────────────────────────────

app.get('/api/vehicles/:vehicleId/emergency-contacts', authMiddleware, (req, res) => {
  const vehicle = dbGet('SELECT * FROM vehicles WHERE id = ? AND user_id = ?', [req.params.vehicleId, req.user.id]);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const contacts = dbAll('SELECT * FROM emergency_contacts WHERE vehicle_id = ?', [req.params.vehicleId]);
  res.json(contacts);
});

app.post('/api/vehicles/:vehicleId/emergency-contacts', authMiddleware, (req, res) => {
  const vehicle = dbGet('SELECT * FROM vehicles WHERE id = ? AND user_id = ?', [req.params.vehicleId, req.user.id]);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const { name, phone, relation } = req.body;
  if (!name || !phone || !relation) return res.status(400).json({ error: 'All fields required' });

  const id = uuidv4();
  dbRun('INSERT INTO emergency_contacts (id, vehicle_id, name, phone, relation) VALUES (?, ?, ?, ?, ?)',
    [id, req.params.vehicleId, name, phone, relation]);
  res.json({ id, vehicle_id: req.params.vehicleId, name, phone, relation });
});

app.delete('/api/emergency-contacts/:id', authMiddleware, (req, res) => {
  dbRun('DELETE FROM emergency_contacts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ─── PUBLIC ROUTES (QR scan, no auth) ────────────────────────────────────────

app.get('/api/public/tag/:tagId', contactLimiter, (req, res) => {
  const vehicle = dbGet(`
    SELECT v.id, v.vehicle_number, v.vehicle_type, v.tag_id, v.is_active,
      u.name as owner_name
    FROM vehicles v
    JOIN users u ON v.user_id = u.id
    WHERE v.tag_id = ?
  `, [req.params.tagId]);

  if (!vehicle) return res.status(404).json({ error: 'Tag not found' });
  if (!vehicle.is_active) return res.status(403).json({ error: 'Tag deactivated' });

  const masked = vehicle.vehicle_number.slice(0, -4) + '####';
  res.json({ ...vehicle, vehicle_number: masked });
});

app.post('/api/public/contact/:tagId', contactLimiter, (req, res) => {
  try {
    const { message, contact_type, caller_phone } = req.body;
    const vehicle = dbGet('SELECT * FROM vehicles WHERE tag_id = ?', [req.params.tagId]);
    if (!vehicle) return res.status(404).json({ error: 'Tag not found' });

    const id = uuidv4();
    dbRun('INSERT INTO contact_logs (id, vehicle_id, contact_type, caller_info, message) VALUES (?, ?, ?, ?, ?)',
      [id, vehicle.id, contact_type || 'message', caller_phone || 'anonymous', message || '']);

    const owner = dbGet('SELECT phone, name FROM users WHERE id = ?', [vehicle.user_id]);
    const whatsapp_number = owner.phone.replace(/\D/g, '');
    const whatsapp_message = encodeURIComponent(
      `Hello, I am contacting you regarding your vehicle ${vehicle.vehicle_number}. ${message || ''}`
    );

    res.json({
      success: true,
      whatsapp_url: `https://wa.me/${whatsapp_number}?text=${whatsapp_message}`,
      log_id: id
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/public/emergency/:tagId', contactLimiter, (req, res) => {
  try {
    const vehicle = dbGet('SELECT * FROM vehicles WHERE tag_id = ?', [req.params.tagId]);
    if (!vehicle) return res.status(404).json({ error: 'Tag not found' });

    const emergencyContacts = dbAll('SELECT * FROM emergency_contacts WHERE vehicle_id = ?', [vehicle.id]);

    const emergencyMessage = encodeURIComponent(
      `EMERGENCY ALERT: A person has scanned the QR tag for vehicle ${vehicle.vehicle_number}. They may need assistance. Please check immediately!`
    );

    const contacts = emergencyContacts.map(c => ({
      name: c.name,
      relation: c.relation,
      whatsapp_url: `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${emergencyMessage}`
    }));

    dbRun('INSERT INTO contact_logs (id, vehicle_id, contact_type, message) VALUES (?, ?, ?, ?)',
      [uuidv4(), vehicle.id, 'emergency', 'Emergency triggered via QR scan']);

    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CONTACT LOGS ─────────────────────────────────────────────────────────────

app.get('/api/vehicles/:vehicleId/logs', authMiddleware, (req, res) => {
  const vehicle = dbGet('SELECT * FROM vehicles WHERE id = ? AND user_id = ?', [req.params.vehicleId, req.user.id]);
  if (!vehicle) return res.status(404).json({ error: 'Not found' });
  const logs = dbAll('SELECT * FROM contact_logs WHERE vehicle_id = ? ORDER BY created_at DESC LIMIT 50', [req.params.vehicleId]);
  res.json(logs);
});

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const vehicleCount = dbGet('SELECT COUNT(*) as count FROM vehicles WHERE user_id = ?', [req.user.id]).count;
  const vehicleIds = dbAll('SELECT id FROM vehicles WHERE user_id = ?', [req.user.id]).map(v => v.id);

  let totalContacts = 0, totalEmergencies = 0;
  if (vehicleIds.length > 0) {
    const placeholders = vehicleIds.map(() => '?').join(',');
    totalContacts = dbGet(`SELECT COUNT(*) as count FROM contact_logs WHERE vehicle_id IN (${placeholders}) AND contact_type != 'emergency'`, vehicleIds).count;
    totalEmergencies = dbGet(`SELECT COUNT(*) as count FROM contact_logs WHERE vehicle_id IN (${placeholders}) AND contact_type = 'emergency'`, vehicleIds).count;
  }

  res.json({ vehicleCount, totalContacts, totalEmergencies });
});

// ─── PRODUCTION FRONTEND ──────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// ─── START ────────────────────────────────────────────────────────────────────

initDb().then(() => {
  app.listen(PORT, () => console.log(`🚀 VehicleTag server running on port ${PORT}`));
});
