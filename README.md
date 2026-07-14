# Sunotal Fullstack

This repository contains the Sunotal full-stack application (frontend + backend + database). The README below describes how to run locally and basic guidance for deploying to AWS.

## Prerequisites
- Node.js (v18+)
- pnpm (recommended) or npm
- Docker (for local Postgres)

## Local development

1. Start Postgres (from project root):

```bash
docker compose up -d postgres
```

2. Backend

```bash
cd backend
pnpm install
# copy .env.example -> .env and edit if needed
cp .env.example .env
pnpm run dev
```

Server will run at `http://localhost:5000` by default.

3. Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

Server will run at `http://localhost:3000` by default.

4. Seed database (optional):

```bash
cat database/seed.sql | docker exec -i sunotal-db psql -U sunotal -d sunotal
```

## Build for production

Backend:

```bash
# build TS to dist
cd backend
pnpm run build
```

Frontend:

```bash
cd frontend
pnpm run build
```

The backend serves `frontend/dist` when `NODE_ENV=production`.

## Deploying to AWS (recommended minimal approach)

Option A — Static frontend (S3 + CloudFront), backend on ECS/Fargate or EC2:

- Build frontend (`pnpm run build`) and upload `frontend/dist` to an S3 bucket.
- Use CloudFront in front of the S3 bucket for caching and HTTPS.
- Containerize backend (create `Dockerfile` in `backend/`), push image to ECR, and run on ECS/Fargate or EKS.
- Use RDS (Postgres) as the managed database and set `DATABASE_URL` accordingly.

Option B — Single docker-compose on an EC2 instance (simpler but less resilient):

- Create production `docker-compose.prod.yml` that builds frontend and backend images and uses an external Postgres or the included service.
- Use a reverse proxy (nginx) or load balancer to route ports and terminate TLS.

## Secrets and configuration

- Always set `JWT_SECRET` to a secure random value in production.
- Do not commit `.env` files. Use AWS Secrets Manager or environment variables in your deployment platform.

## Database migrations

This project uses `drizzle-kit` for schema migrations. To push schema migrations:

```bash
cd backend
# set DATABASE_URL and other env in .env or environment
dotenv -e .env.production -- drizzle-kit push --config drizzle.config.ts
```

## Notes

- Addresses and orders: frontend currently stores addresses in `localStorage`. For production, implement server-side endpoints and persist addresses in the DB (add JSONB column and API).
- Review `README` and environment files before deploying.
# Sunotal Farms

Farm-fresh produce e-commerce platform — verified Indian farmers, direct to your door.

## Quick start (Ubuntu)

```bash
chmod +x setup.sh start-dev.sh
./setup.sh        # installs Node 20, pnpm, Docker, PostgreSQL, seeds data
./start-dev.sh    # starts backend :5000 + frontend :3000
```

Open **http://localhost:3000**

**Admin panel:** http://localhost:3000/admin/login  
**Credentials:** `admin@sunotal.com` / `admin123`

---

## Features

| Area | What's included |
|---|---|
| Public store | Hero carousel · Category grid · Live product catalogue · Search/filter |
| Cart | Slide-in drawer · Qty controls · Running total · FREE delivery |
| Auth | Register / Login · JWT stored in localStorage · Name shown in header |
| Farmer portal | Registration form → vendor pending queue |
| Admin — Dashboard | Stats cards · Category chart · Recent vendors & users |
| Admin — Products | Full CRUD (add, edit, delete, organic badge, discount) |
| Admin — Vendors | Approve / reject farmer applications, add notes |
| Admin — Users | View all users, toggle active/inactive |

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS v4, shadcn/ui, TanStack Query v5 |
| Backend | Node.js 20, Express 5 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | JWT (jsonwebtoken + bcryptjs) |

## See INSTALL.md for full instructions
