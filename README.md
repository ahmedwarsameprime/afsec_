# SOC-AFSEC

Coming-soon landing page + internal CRM for SOC-AFSEC Industries (Mogadishu, Somalia).

## What it does

- **`/`** — Public coming-soon landing page with branding, services, and contact info.
- **`/admin`** — Internal CRM (login required) for managing guard profiles.
- **`/admin/{id}/id-card`** — Generates a printable ID card with a QR code.
- **`/p/{slug}`** — Public profile shown when the QR code is scanned. No login required.

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 6 · SQLite (dev) · NextAuth v5.

## Run locally

```bash
npm install
npm run db:push     # create the SQLite database
npm run db:seed     # create the admin user
npm run dev         # http://localhost:3000
```

### Default admin login

- Email: `admin@soc-afsec.com`
- Password: `ChangeMe123!`

**Change this immediately** after first login. Set `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` in `.env` before re-running `npm run db:seed` to use
different credentials.

## Environment variables

See `.env`. For production set:

- `DATABASE_URL` — connection string (e.g. Postgres on Vercel)
- `AUTH_SECRET` — random 32+ char string (`openssl rand -base64 32`)
- `NEXT_PUBLIC_BASE_URL` — public origin used in QR code URLs (e.g. `https://soc-afsec.com`)

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import in Vercel — framework is auto-detected.
3. Add the env vars above. For `DATABASE_URL`, attach a Vercel Postgres add-on
   and change `provider = "sqlite"` to `provider = "postgresql"` in
   `prisma/schema.prisma`.
4. Photos currently save to `/public/uploads/`. For Vercel, swap to Vercel Blob
   storage — the upload code lives in `src/app/admin/[id]/page.tsx`.

## Data model

A `Guard` has identity (name, job title, photo, employee ID), two weapon permits
(hand guns + rifles), a visa permit, medical clearance dates, and an array of
`Training` records. Each guard gets a unique opaque `slug` used in the QR code.

## QR codes

QR codes encode `${NEXT_PUBLIC_BASE_URL}/p/{slug}`. Slugs are 14 chars of
URL-safe base64 (~112 bits of entropy) — not enumerable.
