# VehicleTag 🚗◈

A smart QR vehicle contact system. Register your vehicle, get a printable QR sticker, and let anyone reach you safely — without exposing your phone number.

## Features
- 🔒 **Masked Calls** — Anonymous bridge calls (integrate Twilio for full masking)
- 💬 **WhatsApp Messaging** — Direct WhatsApp with pre-filled vehicle context
- 🚨 **Emergency Contacts** — One-tap alert to all emergency contacts
- 🖨️ **QR Sticker PDF** — Printable sticker for windshield placement
- 📊 **Contact Logs** — Full history of who scanned your tag

---

## Project Structure

```
vehicletag/
├── backend/          # Node.js + Express API
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/         # React + Vite
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.jsx       # Homepage
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx     # Vehicle management
    │   │   ├── VehicleDetail.jsx # QR + Emergency + Logs
    │   │   └── ContactPage.jsx   # Public QR scan page
    │   ├── App.jsx
    │   ├── AuthContext.jsx
    │   ├── api.js
    │   └── index.css
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Local Development Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
node server.js
# Server runs on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

---

## Production Deployment (Your Own Domain)

### Option A: VPS (DigitalOcean / Linode / Hetzner) — Recommended

**1. Build frontend:**
```bash
cd frontend
npm run build
# Creates frontend/dist/ folder
```

**2. Configure backend .env:**
```
PORT=5000
JWT_SECRET=your_long_random_secret_here
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

**3. Set up Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Serve frontend
    root /var/www/vehicletag/frontend/dist;
    index index.html;
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # React router fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**4. Start backend with PM2:**
```bash
npm install -g pm2
cd backend
pm2 start server.js --name vehicletag
pm2 save
pm2 startup
```

**5. SSL with Let's Encrypt:**
```bash
sudo certbot --nginx -d yourdomain.com
```

### Option B: Railway / Render (Easy Cloud)

1. Push code to GitHub
2. Create Railway project → Add service → Deploy from GitHub
3. Set environment variables in dashboard
4. Add custom domain in settings

---

## Adding Masked Calling (Twilio Integration)

To enable real masked calls (not just WhatsApp fallback):

1. Create a [Twilio account](https://twilio.com)
2. Get a Twilio phone number
3. Add to `.env`:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```
4. In `server.js`, replace the masked call handler with Twilio's programmable voice API

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register user |
| POST | /api/auth/login | No | Login |
| GET | /api/auth/me | Yes | Get profile |
| GET | /api/vehicles | Yes | List vehicles |
| POST | /api/vehicles | Yes | Add vehicle + generate QR |
| DELETE | /api/vehicles/:id | Yes | Remove vehicle |
| GET | /api/vehicles/:id/emergency-contacts | Yes | List emergency contacts |
| POST | /api/vehicles/:id/emergency-contacts | Yes | Add emergency contact |
| DELETE | /api/emergency-contacts/:id | Yes | Remove contact |
| GET | /api/vehicles/:id/logs | Yes | Contact history |
| GET | /api/public/tag/:tagId | No | Get vehicle (for QR scan) |
| POST | /api/public/contact/:tagId | No | Contact owner via WhatsApp |
| POST | /api/public/emergency/:tagId | No | Trigger emergency alerts |
| GET | /api/dashboard/stats | Yes | Dashboard statistics |

---

## Tech Stack
- **Backend**: Node.js, Express, SQLite (better-sqlite3), JWT, QRCode
- **Frontend**: React 18, React Router v6, Vite, Axios, jsPDF
- **DB**: SQLite (zero config, upgrade to PostgreSQL for scale)
