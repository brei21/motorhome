-- Create tables for the Motorhome Web App

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Daily Logs Table (bitácora diaria)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('travel', 'parking', 'motorhome_area', 'vacation_home')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_name TEXT,
    notes TEXT,
    accommodation_cost NUMERIC,
    daily_expenses NUMERIC,
    daily_expenses_notes TEXT,
    visited_places TEXT[] DEFAULT '{}',
    grey_water_emptied BOOLEAN DEFAULT FALSE,
    black_water_emptied BOOLEAN DEFAULT FALSE,
    fresh_water_filled BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    photo_urls TEXT[] DEFAULT '{}',
    source TEXT DEFAULT 'web' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS daily_logs_date_idx ON public.daily_logs (date DESC);

-- Odometer Logs Table
CREATE TABLE IF NOT EXISTS public.odometer_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID,
    date DATE NOT NULL,
    kilometers INTEGER NOT NULL,
    notes TEXT,
    source TEXT DEFAULT 'web' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS odometer_logs_date_idx ON public.odometer_logs (date DESC, created_at DESC);

-- Maintenance Logs Table
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('repair', 'improvement', 'maintenance')),
    description TEXT NOT NULL,
    cost NUMERIC,
    odometer_at INTEGER,
    due_odometer INTEGER,
    due_date DATE,
    attachment_urls TEXT[] DEFAULT '{}',
    source TEXT DEFAULT 'web' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS maintenance_logs_date_idx ON public.maintenance_logs (date DESC);

-- Fuel Records Table
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    price_per_liter NUMERIC NOT NULL,
    odometer_at INTEGER,
    station_name TEXT,
    full_tank BOOLEAN DEFAULT TRUE,
    source TEXT DEFAULT 'web' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS fuel_logs_date_idx ON public.fuel_logs (date DESC);

-- Maintenance Reminders Table
CREATE TABLE IF NOT EXISTS public.maintenance_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('km', 'time', 'custom')),
    description TEXT NOT NULL,
    frequency INTEGER NOT NULL,
    last_done_km INTEGER,
    last_done_date DATE,
    next_due_km INTEGER,
    next_due_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
    source TEXT DEFAULT 'web' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trips Table (viajes)
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    start_odometer INTEGER NOT NULL,
    end_odometer INTEGER,
    start_location TEXT,
    end_location TEXT,
    notes TEXT,
    start_checklist JSONB DEFAULT '{}'::jsonb,
    end_checklist JSONB DEFAULT '{}'::jsonb,
    source TEXT DEFAULT 'web' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS trips_started_idx ON public.trips (started_at DESC);

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;

ALTER TABLE public.odometer_logs
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;

ALTER TABLE public.fuel_logs
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;

ALTER TABLE public.maintenance_logs
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS daily_logs_trip_idx ON public.daily_logs (trip_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS odometer_logs_trip_idx ON public.odometer_logs (trip_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS fuel_logs_trip_idx ON public.fuel_logs (trip_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS maintenance_logs_trip_idx ON public.maintenance_logs (trip_id, date DESC, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'odometer_logs_trip_id_fkey') THEN
    ALTER TABLE public.odometer_logs
      ADD CONSTRAINT odometer_logs_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_logs_trip_id_fkey') THEN
    ALTER TABLE public.fuel_logs
      ADD CONSTRAINT fuel_logs_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_logs_trip_id_fkey') THEN
    ALTER TABLE public.maintenance_logs
      ADD CONSTRAINT maintenance_logs_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Auth settings for the local PIN-protected app
CREATE TABLE IF NOT EXISTS public.auth_settings (
    id SMALLINT PRIMARY KEY,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
    attempt_key TEXT PRIMARY KEY,
    failure_count INTEGER NOT NULL DEFAULT 0,
    last_failed_at TIMESTAMP WITH TIME ZONE,
    locked_until TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.favorite_places (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('camping', 'parking', 'viewpoint', 'workshop', 'fuel', 'other')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    notes TEXT,
    source TEXT DEFAULT 'web' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS favorite_places_type_idx ON public.favorite_places (type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.vehicle_profile (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nickname TEXT,
    plate TEXT,
    model TEXT,
    year INTEGER,
    tire_pressure TEXT,
    tire_size TEXT,
    oil_type TEXT,
    battery_notes TEXT,
    gas_notes TEXT,
    dimensions TEXT,
    insurance_due_date DATE,
    inspection_due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vehicle_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('insurance', 'inspection', 'technical_sheet', 'receipt', 'warranty', 'manual', 'other')),
    document_url TEXT,
    expires_at DATE,
    notes TEXT,
    source TEXT DEFAULT 'web' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS vehicle_documents_expires_idx ON public.vehicle_documents (expires_at ASC);

CREATE TABLE IF NOT EXISTS public.action_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    source TEXT DEFAULT 'web' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS action_audit_logs_created_idx ON public.action_audit_logs (created_at DESC);

-- Railway/PostgreSQL directo: la proteccion vive en Next.js + PIN, no en politicas externas.
ALTER TABLE public.daily_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.odometer_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_login_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_places DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_audit_logs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for anon" ON public.daily_logs;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.odometer_logs;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.fuel_logs;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.maintenance_reminders;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.trips;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.auth_settings;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.auth_login_attempts;

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS daily_expenses NUMERIC,
  ADD COLUMN IF NOT EXISTS daily_expenses_notes TEXT,
  ADD COLUMN IF NOT EXISTS visited_places TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_status_check;

ALTER TABLE public.daily_logs
  ADD CONSTRAINT daily_logs_status_check
  CHECK (status IN ('travel', 'parking', 'motorhome_area', 'vacation_home'));

ALTER TABLE public.odometer_logs
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.maintenance_logs
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_odometer INTEGER,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.fuel_logs
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS odometer_at INTEGER,
  ADD COLUMN IF NOT EXISTS station_name TEXT,
  ADD COLUMN IF NOT EXISTS full_tank BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.maintenance_reminders
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS start_checklist JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS end_checklist JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.vehicle_profile
  ADD COLUMN IF NOT EXISTS tire_size TEXT,
  ADD COLUMN IF NOT EXISTS battery_notes TEXT,
  ADD COLUMN IF NOT EXISTS gas_notes TEXT,
  ADD COLUMN IF NOT EXISTS dimensions TEXT;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'daily_logs',
    'odometer_logs',
    'maintenance_logs',
    'fuel_logs',
    'maintenance_reminders',
    'trips',
    'auth_settings',
    'favorite_places',
    'vehicle_profile',
    'vehicle_documents'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'set_' || table_name || '_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  END LOOP;
END $$;
