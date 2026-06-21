# CEO Operating System — Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Project Settings → Database → Connection String**
3. Select **"Transaction" pooler (port 6543)** — required for Prisma

Copy the connection string. It looks like:
```
postgresql://postgres.YOURREF:YOURPASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## Step 2: Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
# Required
DATABASE_URL="postgresql://postgres.YOURREF:YOURPASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Optional (for Google OAuth)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

To generate `NEXTAUTH_SECRET`:
```bash
# On Mac/Linux:
openssl rand -base64 32
# On Windows (PowerShell):
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

---

## Step 3: Run Database Migrations

```bash
# Push schema to Supabase
npm run db:migrate
# Enter a migration name like: init

# Or if you want to push without migration history:
npx prisma db push
```

---

## Step 4: Seed Demo Data (Optional)

```bash
npm run db:seed
```

This creates:
- **Company**: Acme Corp (Demo)
- **CEO login**: `ceo@acme.com` / `password123`
- **Dept Head login**: `mike@acme.com` (Marketing) / `password123`
- 7 departments with pre-configured KPIs
- 7 days of sample metrics
- Sample employees and goals

---

## Step 5: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 6: Deploy to Vercel

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add all environment variables
4. Deploy!

---

## Key Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client types |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio (DB browser) |

---

## First Steps After Setup

1. **Register** your account at `/register`
2. Go through **onboarding** → your workspace is created automatically
3. **Invite dept heads** from Settings → Users
4. Each dept head sets up their KPI targets in Settings → KPIs
5. Teams submit daily metrics from their department pages
6. CEO dashboard will populate as data flows in

---

## Architecture Overview

- **Framework**: Next.js 16 App Router + TypeScript
- **Database**: PostgreSQL (Supabase) via Prisma v7
- **Auth**: NextAuth.js v5 (credentials + Google OAuth)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Charts**: Recharts
- **File uploads**: UploadThing (for expense receipts)
