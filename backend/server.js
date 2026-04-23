require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ─── Database Setup ───────────────────────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      vehicle_type TEXT DEFAULT 'car',
      tag_id TEXT UNIQUE NOT NULL,
      qr_data TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relation TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contact_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      contact_type TEXT NOT NULL,
      caller_info TEXT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Database ready');
}

async function dbGet(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0];
}

async function dbAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function dbRun(sql, params = []) {
  await pool.query(sql, params);
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://vehicletag.shreecomp.in', 'https://vehicletag.vercel.app'] }));
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

    const existing = await dbGet('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await dbRun('INSERT INTO users (id, name, email, phone, password) VALUES ($1, $2, $3, $4, $5)',
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
    const user = await dbGet('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await dbGet('SELECT id, name, email, phone, created_at FROM users WHERE id = $1', [req.user.id]);
  res.json(user);
});

// ─── VEHICLE ROUTES ───────────────────────────────────────────────────────────

app.get('/api/vehicles', authMiddleware, async (req, res) => {
  const vehicles = await dbAll(`
    SELECT v.*,
      (SELECT COUNT(*) FROM emergency_contacts WHERE vehicle_id = v.id) as emergency_count,
      (SELECT COUNT(*) FROM contact_logs WHERE vehicle_id = v.id) as contact_count
    FROM vehicles v WHERE v.user_id = $1
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

    await dbRun('INSERT INTO vehicles (id, user_id, vehicle_number, vehicle_type, tag_id, qr_data) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, req.user.id, vehicle_number.toUpperCase(), vehicle_type || 'car', tag_id, qr_data]);

    const vehicle = await dbGet('SELECT * FROM vehicles WHERE id = $1', [id]);
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.delete('/api/vehicles/:id', authMiddleware, async (req, res) => {
  const vehicle = await dbGet('SELECT * FROM vehicles WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  await dbRun('DELETE FROM emergency_contacts WHERE vehicle_id = $1', [req.params.id]);
  await dbRun('DELETE FROM contact_logs WHERE vehicle_id = $1', [req.params.id]);
  await dbRun('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ─── EMERGENCY CONTACTS ───────────────────────────────────────────────────────

app.get('/api/vehicles/:vehicleId/emergency-contacts', authMiddleware, async (req, res) => {
  const vehicle = await dbGet('SELECT * FROM vehicles WHERE id = $1 AND user_id = $2', [req.params.vehicleId, req.user.id]);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const contacts = await dbAll('SELECT * FROM emergency_contacts WHERE vehicle_id = $1', [req.params.vehicleId]);
  res.json(contacts);
});

app.post('/api/vehicles/:vehicleId/emergency-contacts', authMiddleware, async (req, res) => {
  const vehicle = await dbGet('SELECT * FROM vehicles WHERE id = $1 AND user_id = $2', [req.params.vehicleId, req.user.id]);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const { name, phone, relation } = req.body;
  if (!name || !phone || !relation) return res.status(400).json({ error: 'All fields required' });

  const id = uuidv4();
  await dbRun('INSERT INTO emergency_contacts (id, vehicle_id, name, phone, relation) VALUES ($1, $2, $3, $4, $5)',
    [id, req.params.vehicleId, name, phone, relation]);
  res.json({ id, vehicle_id: req.params.vehicleId, name, phone, relation });
});

app.delete('/api/emergency-contacts/:id', authMiddleware, async (req, res) => {
  await dbRun('DELETE FROM emergency_contacts WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ─── PUBLIC ROUTES (QR scan, no auth) ────────────────────────────────────────

app.get('/api/public/tag/:tagId', contactLimiter, async (req, res) => {
  const vehicle = await dbGet(`
    SELECT v.id, v.vehicle_number, v.vehicle_type, v.tag_id, v.is_active,
      u.name as owner_name
    FROM vehicles v
    JOIN users u ON v.user_id = u.id
    WHERE v.tag_id = $1
  `, [req.params.tagId]);

  if (!vehicle) return res.status(404).json({ error: 'Tag not found' });
  if (!vehicle.is_active) return res.status(403).json({ error: 'Tag deactivated' });

  const masked = vehicle.vehicle_number.slice(0, -4) + '####';
  res.json({ ...vehicle, vehicle_number: masked });
});

app.post('/api/public/contact/:tagId', contactLimiter, async (req, res) => {
  try {
    const { message, contact_type, caller_phone } = req.body;
    const vehicle = await dbGet('SELECT * FROM vehicles WHERE tag_id = $1', [req.params.tagId]);
    if (!vehicle) return res.status(404).json({ error: 'Tag not found' });

    const id = uuidv4();
    await dbRun('INSERT INTO contact_logs (id, vehicle_id, contact_type, caller_info, message) VALUES ($1, $2, $3, $4, $5)',
      [id, vehicle.id, contact_type || 'message', caller_phone || 'anonymous', message || '']);

    const owner = await dbGet('SELECT phone, name FROM users WHERE id = $1', [vehicle.user_id]);
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

app.post('/api/public/emergency/:tagId', contactLimiter, async (req, res) => {
  try {
    const vehicle = await dbGet('SELECT * FROM vehicles WHERE tag_id = $1', [req.params.tagId]);
    if (!vehicle) return res.status(404).json({ error: 'Tag not found' });

    const emergencyContacts = await dbAll('SELECT * FROM emergency_contacts WHERE vehicle_id = $1', [vehicle.id]);

    const emergencyMessage = encodeURIComponent(
      `EMERGENCY ALERT: A person has scanned the QR tag for vehicle ${vehicle.vehicle_number}. They may need assistance. Please check immediately!`
    );

    const contacts = emergencyContacts.map(c => ({
      name: c.name,
      relation: c.relation,
      whatsapp_url: `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${emergencyMessage}`
    }));

    await dbRun('INSERT INTO contact_logs (id, vehicle_id, contact_type, message) VALUES ($1, $2, $3, $4)',
      [uuidv4(), vehicle.id, 'emergency', 'Emergency triggered via QR scan']);

    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CONTACT LOGS ─────────────────────────────────────────────────────────────

app.get('/api/vehicles/:vehicleId/logs', authMiddleware, async (req, res) => {
  const vehicle = await dbGet('SELECT * FROM vehicles WHERE id = $1 AND user_id = $2', [req.params.vehicleId, req.user.id]);
  if (!vehicle) return res.status(404).json({ error: 'Not found' });
  const logs = await dbAll('SELECT * FROM contact_logs WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 50', [req.params.vehicleId]);
  res.json(logs);
});

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  const countRow = await dbGet('SELECT COUNT(*) as count FROM vehicles WHERE user_id = $1', [req.user.id]);
  const vehicleCount = countRow.count;
  const vehicleRows = await dbAll('SELECT id FROM vehicles WHERE user_id = $1', [req.user.id]);
  const vehicleIds = vehicleRows.map(v => v.id);

  let totalContacts = 0, totalEmergencies = 0;
  if (vehicleIds.length > 0) {
    const placeholders = vehicleIds.map((_, i) => `$${i + 1}`).join(',');
    const r1 = await dbGet(`SELECT COUNT(*) as count FROM contact_logs WHERE vehicle_id IN (${placeholders}) AND contact_type != 'emergency'`, vehicleIds);
    totalContacts = r1.count;
    const r2 = await dbGet(`SELECT COUNT(*) as count FROM contact_logs WHERE vehicle_id IN (${placeholders}) AND contact_type = 'emergency'`, vehicleIds);
    totalEmergencies = r2.count;
  }

  res.json({ vehicleCount, totalContacts, totalEmergencies });
});


initDb().then(() => {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`🚀 VehicleTag server running on port ${PORT}`));
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
const adminMiddleware = (req, res, next) => {
  if (req.user.id !== '01') return res.status(403).json({ error: 'Forbidden' });
  next();
};

app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await dbGet('SELECT COUNT(*) as count FROM users', []);
    const vehicles = await dbGet('SELECT COUNT(*) as count FROM vehicles', []);
    const logs = await dbGet('SELECT COUNT(*) as count FROM contact_logs', []);
    res.json({ users: users.count, vehicles: vehicles.count, logs: logs.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await dbAll('SELECT id, name, email, phone, created_at FROM users ORDER BY created_at DESC', []);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/vehicles', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const vehicles = await dbAll(`
      SELECT v.*, u.name as owner_name, u.email as owner_email
      FROM vehicles v JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
    `, []);
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbRun('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2FA ROUTES ───────────────────────────────────────────────────────────────
const speakeasy = require('speakeasy');
const QRCodeLib = require('qrcode');

app.post('/api/auth/2fa/setup', authMiddleware, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `VehicleTag (${req.user.email})` });
    await dbRun('UPDATE users SET totp_secret=$1 WHERE id=$2', [secret.base32, req.user.id]);
    const qrCode = await QRCodeLib.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/2fa/verify', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await dbGet('SELECT totp_secret FROM users WHERE id=$1', [req.user.id]);
    const valid = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token, window: 1 });
    if (!valid) return res.status(400).json({ error: 'Invalid code' });
    await dbRun('UPDATE users SET totp_enabled=TRUE WHERE id=$1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/2fa/validate', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await dbGet('SELECT totp_secret, totp_enabled FROM users WHERE id=$1', [req.user.id]);
    if (!user.totp_enabled) return res.json({ success: true });
    const valid = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token, window: 1 });
    if (!valid) return res.status(400).json({ error: 'Invalid code' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/2fa/status', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT totp_enabled FROM users WHERE id=$1', [req.user.id]);
    res.json({ enabled: user.totp_enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
