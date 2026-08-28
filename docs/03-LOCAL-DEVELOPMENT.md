# Chapter 3: Local Development & Testing Guide

This guide takes you step-by-step through setting up Sunotal on your local development machine.

---

## 1. Prerequisites

Before starting, ensure your local computer has the following software installed:
- **Node.js**: Version 20.x or higher (`node -v`)
- **pnpm**: Version 9.x or higher (`npm install -g pnpm`)
- **Docker & Docker Compose**: For running local PostgreSQL database (`docker --version`)
- **Git**: For version control (`git --version`)

---

## 2. Step-by-Step Local Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/valivarthi007/sunotal_fullstk.git
cd sunotal_fullstk
```

### Step 2: Environment Configuration
Copy the sample environment file to create your local `.env`:
```bash
cp backend/.env.example backend/.env
```
Key variables inside `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://sunotal:sunotalpass123@localhost:5432/sunotal
SESSION_SECRET=sunotal-super-secret-session-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=jcs-raju-sunotal-final
```

### Step 3: Start Local Database (PostgreSQL)
Run Docker Compose to start a local PostgreSQL 16 container:
```bash
docker-compose up -d postgres
```
This starts PostgreSQL on port `5432` with username `sunotal`, password `sunotalpass123`, and database `sunotal`.

### Step 4: Install Dependencies & Run DB Migrations
Install dependencies and push database schema tables to PostgreSQL:
```bash
cd backend
pnpm install
pnpm run db:push
```
To populate the database with default seed data (admin user, sample products, categories, and banners):
```bash
pnpm run db:seed
```

### Step 5: Start Local Development Servers
You can start the full stack using the automated script:
```bash
./start-dev.sh
```
Or start frontend and backend manually in separate terminal tabs:

**Terminal 1 (Backend Services)**:
```bash
cd backend
pnpm run dev
```
*(Runs on `http://localhost:5000`)*

**Terminal 2 (Frontend Web App)**:
```bash
cd frontend
pnpm install
pnpm run dev
```
*(Runs on `http://localhost:5000` or `http://localhost:3000`)*

---

## 3. Seed User Credentials for Testing

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@sunotal.com` | `admin123` | Full administrative dashboard, quotation approvals, inventory, products, banners. |
| **Vendor / Farmer** | `farmer@sunotal.com` | `farmer123` | Quotation submission, vendor profile, sales tracking. |
| **Customer / Buyer** | `user@sunotal.com` | `user123` | Browsing products, cart, checkout, order tracking. |

---

## 4. Running Test Suites

Sunotal includes unit tests (Vitest) and end-to-end tests (Playwright).

### A. Backend Unit Tests (Vitest)
```bash
cd backend
pnpm run test
```

### B. Frontend Unit Tests (Vitest)
```bash
cd frontend
pnpm run test
```

### C. End-to-End E2E Tests (Playwright)
```bash
cd frontend
pnpm run test:e2e
```
