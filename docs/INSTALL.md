# Sunotal Farms — Installation Guide

## Requirements

| Tool | Min version | Install |
|---|---|---|
| Ubuntu | 22.04 LTS+ | — |
| Node.js | 20 LTS | via NodeSource (script handles this) |
| pnpm | 9+ | `npm i -g pnpm` |
| Docker | 24+ | script installs automatically |
| RAM | 2 GB | — |

---

## Automated setup (recommended)

```bash
unzip sunotal-farms.zip
cd sunotal-farms
chmod +x setup.sh start-dev.sh
./setup.sh
```

The script installs all tools, starts PostgreSQL via Docker, runs migrations, and seeds the database.

Then start the app:
```bash
./start-dev.sh
# Frontend → http://localhost:3000
# Backend  → http://localhost:5000
```

---

## Manual step-by-step

### 1 — Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # v20.x.x
```

### 2 — pnpm

```bash
npm install -g pnpm
```

### 3 — Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker   # or log out/in
```

### 4 — Start PostgreSQL

```bash
docker compose up -d postgres
# wait ~5s, then verify:
docker exec sunotal-db pg_isready -U sunotal
```

### 5 — Backend

```bash
cd backend
cp .env.example .env          # edit JWT_SECRET for production
pnpm install
pnpm db:push                  # creates tables
docker exec -i sunotal-db psql -U sunotal -d sunotal < ../database/seed.sql
cd ..
```

### 6 — Frontend

```bash
cd frontend
pnpm install
cd ..
```

### 7 — Run

```bash
# Terminal 1
cd backend && pnpm dev        # :5000

# Terminal 2
cd frontend && pnpm dev       # :3000
```

---

## Default credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@sunotal.com | admin123 |
| User | priya@example.com | admin123 |

---

## Production build

```bash
# Build frontend (outputs frontend/dist/)
cd frontend && pnpm build && cd ..

# Build backend (outputs backend/dist/)
cd backend && pnpm build && cd ..

# Run everything from one process (backend serves frontend)
cd backend
NODE_ENV=production node dist/index.js
# → http://localhost:5000  (serves the full app)
```

### Systemd service

```ini
# /etc/systemd/system/sunotal.service
[Unit]
Description=Sunotal Farms
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/sunotal-farms/backend
EnvironmentFile=/home/ubuntu/sunotal-farms/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sunotal
```

### Nginx + HTTPS (optional)

```nginx
# /etc/nginx/sites-available/sunotal
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sunotal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# HTTPS via Certbot:
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | (weak default) | **Change before production!** |
| `PORT` | — | 5000 | Backend port |
| `NODE_ENV` | — | development | Set to `production` for prod |
| `FRONTEND_URL` | — | http://localhost:3000 | CORS allowed origin |

Generate a strong secret:
```bash
openssl rand -hex 64
```

---

## API reference

Base: `http://localhost:5000/api`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /healthz | — | Health check |
| POST | /auth/register | — | Create user account |
| POST | /auth/login | — | Login → JWT |
| GET | /auth/me | Bearer | Current user |
| POST | /admin/login | — | Admin login → JWT |
| GET | /admin/stats | Admin JWT | Dashboard data |
| GET | /products | — | List (filter: category, search) |
| POST | /products | Admin JWT | Create product |
| PUT | /products/:id | Admin JWT | Update product |
| DELETE | /products/:id | Admin JWT | Delete product |
| GET | /vendors | — | List vendors |
| POST | /vendors | — | Farmer registration |
| PUT | /vendors/:id | Admin JWT | Update vendor / approve |
| DELETE | /vendors/:id | Admin JWT | Remove vendor |
| GET | /users | Admin JWT | List users |
| PUT | /users/:id | Admin JWT | Edit user |
| PATCH | /users/:id/status | Admin JWT | Toggle active |
| DELETE | /users/:id | Admin JWT | Delete user |

---

## Troubleshooting

**Port already in use**
```bash
sudo lsof -i :3000   # find occupant
sudo lsof -i :5000
kill -9 <PID>
```

**Database connection refused**
```bash
docker compose up -d postgres
docker logs sunotal-db
```

**Frontend can't reach API**
- Confirm backend is running: `curl http://localhost:5000/api/healthz`
- The Vite dev server proxies `/api` → `localhost:5000` automatically
- In production `NODE_ENV=production` the backend serves the frontend directly

**pnpm install fails (EACCES)**
```bash
sudo chown -R $USER ~/.local/share/pnpm
pnpm install
```
