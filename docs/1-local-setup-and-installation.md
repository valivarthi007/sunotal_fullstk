# 1. Local Setup and Installation Guide

This guide provides step-by-step instructions for installing and running the Sunotal application locally.

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js**: Version 20 or higher.
- **pnpm**: Package Manager (v9+).
- **Docker & Docker Compose**: For local PostgreSQL database containerization.

---

## 2. Directory Structure Setup

The project is structured as a monorepo workspace containing separate modules:
- `/backend`: Express REST API.
- `/frontend`: Vite + React + TypeScript client.
- `/database`: Docker Compose configuration.

---

## 3. Step-by-Step Installation

### Step 3.1: Start the Local PostgreSQL Database
Run the Docker container to spin up PostgreSQL on port 5432:
```bash
docker compose up -d
```
*Note: This starts PostgreSQL with database name `sunotal`, user `sunotal`, and password `sunotalpass123`.*

### Step 3.2: Configure the Backend Service
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Install the dependencies:
   ```bash
   pnpm install
   ```
4. Push database schemas (runs Drizzle Kit structure push):
   ```bash
   pnpm run db:push
   ```
5. Seed the initial admin user credentials (`admin@sunotal.com` / `admin123`):
   ```bash
   pnpm run db:seed
   ```
6. Start the API development server (listens on Port 5000):
   ```bash
   pnpm run dev
   ```

### Step 3.3: Configure the Frontend Web App
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   pnpm install
   ```
3. Start the Vite development server (listens on Port 3000):
   ```bash
   pnpm run dev
   ```

---

## 4. Local Validation

Open your browser and verify the local installation:
- **Public Storefront**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
  - *Email*: `admin@sunotal.com`
  - *Password*: `admin123`
- **Backend API Base**: [http://localhost:5000/api](http://localhost:5000/api)
