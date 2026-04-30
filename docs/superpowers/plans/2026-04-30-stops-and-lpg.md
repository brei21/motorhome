# Paradas Diarias y GLP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured daily stops and GLP consumption tracking connected to trips and dashboard totals.

**Architecture:** Keep the existing Next.js server-action pattern. Store daily stops as JSONB on `daily_logs` for flexible route points; store GLP in a dedicated `lpg_logs` table so vivienda fuel is not mixed with vehicle gasoline. Dashboard and trip detail aggregate GLP into total costs while showing it separately.

**Tech Stack:** Next.js 16, React 19, TypeScript, PostgreSQL, existing server actions and API routes.

---

### Task 1: Data Model

**Files:**
- Modify: `db/schema.sql`
- Modify: `src/lib/data-tables.ts`
- Modify: `scripts/reset-db.mjs`

- [ ] Add `stops JSONB DEFAULT '[]'::jsonb` to `daily_logs`.
- [ ] Add `lpg_logs` table with trip link, date, amount, quantity, unit, price, place, usage, notes.
- [ ] Include `lpg_logs` in export/reset table lists.

### Task 2: Server Actions and API

**Files:**
- Modify: `src/app/actions/daily-records.ts`
- Create: `src/app/actions/lpg-records.ts`
- Create: `src/app/api/lpg-logs/route.ts`
- Modify: `src/app/api/records/route.ts`

- [ ] Normalize daily stops in `createDailyRecord` and `getDailyRecords`.
- [ ] Add GLP create/list/total functions linked to active trip.
- [ ] Allow `lpg_logs` edit/delete via generic records API.

### Task 3: UI

**Files:**
- Modify: `src/app/(app)/daily/page.tsx`
- Modify: `src/app/(app)/daily/page.module.css`
- Create: `src/app/(app)/lpg/page.tsx`
- Create: `src/app/(app)/lpg/page.module.css`
- Modify: `src/components/TopNavigation.tsx`

- [ ] Replace flat visited-place entry with start/visit/overnight stops UI.
- [ ] Add GLP page with date defaulting to today and editable for past records.
- [ ] Add GLP navigation item.

### Task 4: Dashboard and Trip Detail

**Files:**
- Modify: `src/app/(app)/page.tsx`
- Modify: `src/app/api/dashboard/route.ts`
- Modify: `src/components/DashboardClient.tsx`
- Modify: `src/app/(app)/trips/[id]/page.tsx`
- Modify: `src/app/actions/trips.ts`

- [ ] Include GLP totals in dashboard payload and total cost.
- [ ] Show last GLP and GLP spend in dashboard.
- [ ] Include GLP records and structured stops in trip timeline.

### Task 5: Verification

- [ ] Run `npm run lint -- --max-warnings=0`.
- [ ] Run `npm run build`.
- [ ] Commit and push to `main` after passing checks.
