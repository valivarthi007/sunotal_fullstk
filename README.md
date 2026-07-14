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
