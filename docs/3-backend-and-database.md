# 3. Backend REST API & Database Design

This guide details the backend REST API structure, token verification middleware, validation schemas, and database entity models.

---

## 1. REST API Routing Architecture

The Express server initializes inside `backend/src/index.ts` and distributes routes via structured modules:

- **`/api/auth/*`**: Customer authentication (register, login, credentials verification).
- **`/api/products/*`**: Public and administrative product catalog endpoints. Incorporates AWS S3 client uploads and Lambda S3 cleanup invocations.
- **`/api/admin/*`**: Admin login, statistics aggregates, and user listing queries.
- **`/api/vendors/*`**: Vendor applications, status reviews, and profile updates.
- **`/api/inventory/*`**: Stock adjustments and vendor logs.

---

## 2. Authentication Middleware & Security

Authorization headers are validated inside [auth.ts](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/src/lib/auth.ts):
- **`signToken`**: Compiles `userId`, `email`, and `role` claims into a signed stateless JSON Web Token (JWT) using `jsonwebtoken` with a default expiration of 7 days.
- **`requireAuth`**: Validates the incoming `Authorization: Bearer <token>` header, decodes the JWT signature, and attaches the payload directly to the Express `req.user` context.
- **`requireAdmin`**: Extends `requireAuth` by confirming `req.user.role === 'admin'` before letting requests resolve.

---

## 3. Database Schema Models (Drizzle ORM)

Database entities are declared in `backend/src/schema/` using TypeScript:

### Users Table (`users.ts`)
Stores account profiles:
- `id` (serial primary key)
- `name` (varchar)
- `email` (varchar, unique indexed)
- `passwordHash` (text)
- `role` (varchar: 'user', 'admin')
- `active` (boolean, defaults true)
- `phone` / `city` / `createdAt`

### Vendors Table (`vendors.ts`)
Stores registration applications:
- `id` (serial primary key)
- `userId` (foreign key to users)
- `firstName` / `lastName`
- `location` / `produce`
- `status` (varchar: 'pending', 'approved', 'rejected')
- `createdAt`

### Products Table (`products.ts`)
Stores catalog listings:
- `id` (serial primary key)
- `name` / `description`
- `price` (integer in paise/cents)
- `unit` (varchar: e.g. "1 kg", "500g")
- `category` (varchar: vegetables, fruits, dairy, dry-fruits, grains)
- `image` (text - stores CDN or S3 bucket url)
- `createdAt`
