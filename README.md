# SOC-AFSEC

Coming-soon landing page + internal CRM for SOC-AFSEC Industries (Mogadishu, Somalia).

## What it does

- **`/`** — Public coming-soon landing page with branding, services, and contact info.
- **`/admin`** — Internal CRM (login required) for managing guard profiles.
- **`/admin/{id}/id-card`** — Generates a printable ID card with a QR code.
- **`/p/{slug}`** — Public profile shown when the QR code is scanned. No login required.

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 6 · PostgreSQL · NextAuth v5 · Vercel Blob (file uploads).

## Environment variables

| Var | Where | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Vercel + local `.env` | Postgres connection string. On Vercel, set automatically when you attach a Vercel Postgres store. |
| `AUTH_SECRET` | Vercel + local `.env` | Signs admin login sessions. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_BASE_URL` | Vercel + local `.env` | Public origin used in QR code URLs. e.g. `https://soc-afsec.com` |
| `BLOB_READ_WRITE_TOKEN` | Vercel | Auto-injected when a Vercel Blob store is attached. Falls back to `/public/uploads/` locally if missing. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | local only | Override the seeded admin credentials. Defaults to `admin@soc-afsec.com` / `ChangeMe123!`. |

## Run locally

You'll need a Postgres database. Easiest: spin up a free one on [Neon](https://neon.tech) or [Supabase](https://supabase.com), or run `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`.

```bash
npm install
# Set DATABASE_URL in .env first, then:
npm run db:push     # create the schema
npm run db:seed     # create the admin user
npm run dev         # http://localhost:3000
```

Local dev without `BLOB_READ_WRITE_TOKEN` writes uploaded photos and medical
documents to `public/uploads/` instead of Vercel Blob.

## Deploy to Vercel

1. **Push to GitHub** (already done).
2. **Import the repo** at [vercel.com/new](https://vercel.com/new). Framework auto-detects.
3. **Attach a Postgres store**: Project → Storage → Create Database → Postgres.
   This sets `DATABASE_URL` automatically.
4. **Attach a Blob store**: Project → Storage → Create Database → Blob.
   This sets `BLOB_READ_WRITE_TOKEN` automatically.
5. Add the remaining env vars in Project → Settings → Environment Variables:
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_BASE_URL` (set to the assigned `*.vercel.app` URL after first deploy, then update once you point a domain)
6. Trigger a redeploy. On first deploy, also run the migration: open the project's Deployment → ⋯ → "Run command" and execute `npx prisma db push`, or run it once locally against the production `DATABASE_URL`.
7. Seed the admin user against production: `DATABASE_URL=<prod url> npm run db:seed`.

## Data model

A `Guard` has identity (name, job title, photo, employee ID), two weapon permits
(hand guns + rifles), a visa permit, medical clearance dates, optional medical
document upload, and an array of `Training` records. Each guard gets a unique
opaque `slug` used in the QR code.

## QR codes

QR codes encode `${NEXT_PUBLIC_BASE_URL}/p/{slug}`. Slugs are 14 chars of
URL-safe base64 (~112 bits of entropy) — not enumerable.
