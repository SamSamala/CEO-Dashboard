# CEO Business Operating System

A complete business operating system for founders and their teams. Track KPIs, manage approvals, monitor department health, detect bottlenecks, and run your entire company from one dashboard.

## Deploy in 3 clicks (no technical setup)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SamSamala/CEO-Dashboard&env=DATABASE_URL,NEXTAUTH_SECRET&envDescription=DATABASE_URL%3A+Get+a+free+connection+string+from+neon.tech+%7C+NEXTAUTH_SECRET%3A+Any+random+string+of+40%2B+characters&envLink=https%3A%2F%2Fneon.tech&project-name=my-business-os&repository-name=business-os)

1. Click the button above and log in to Vercel
2. You'll be asked for two values:
   - **DATABASE_URL** → Go to [neon.tech](https://neon.tech), sign up free, create a project, copy the connection string and paste it here
   - **NEXTAUTH_SECRET** → Type any random string of 40+ characters (just smash your keyboard)
3. Click **Deploy**
4. Visit your URL → Register → Follow the setup wizard

That's it. No terminal, no config files.

## Add your team

Once you're logged in as CEO:

1. Go to **Settings → Roles & Permissions** to create roles for your team
2. Go to **Settings → User Management → Add Employees** to create accounts
3. Share your app URL with employees — they log in from any device, anywhere

## What it includes

- CEO executive dashboard with health score, bottleneck detection, action items
- Department KPI tracking (submit metrics, see trends, compare to targets)
- Approval workflows with configurable thresholds
- Hiring pipeline with candidate tracking
- Budget allocation and expense tracking
- Goal management (OKRs)
- Custom role system with granular permissions
- Employee account management (hire, fire, suspend with notes)
- Audit log of every action
- Data import from CSV/Excel
- Automated alerts and reports

## Running locally

```bash
# 1. Copy the env file and fill in your database URL
cp .env.example .env

# 2. Install and start
npm install
npm run dev
```

The build command (`npm run build`) automatically runs database migrations — no manual setup needed.

## Demo

After running `npx tsx prisma/seed.ts`:

| Role | Email | Password |
|---|---|---|
| CEO | ceo@acme.com | password123 |
| Marketing Head | mike@acme.com | password123 |
| Sales Head | lisa@acme.com | password123 |
