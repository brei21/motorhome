-- Create tables for the Motorhome Web App

-- Daily Records Table
CREATE TABLE public.daily_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('travel', 'parking', 'vacation_home')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Odometer Records Table
CREATE TABLE public.odometer_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    kilometers INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Maintenance Records Table
CREATE TABLE public.maintenance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('repair', 'improvement', 'maintenance')),
    description TEXT NOT NULL,
    cost NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fuel Records Table
CREATE TABLE public.fuel_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    price_per_liter NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Maintenance Reminders Table
CREATE TABLE public.maintenance_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('km', 'time', 'custom')),
    description TEXT NOT NULL,
    frequency INTEGER NOT NULL,
    last_done_km INTEGER,
    last_done_date DATE,
    next_due_km INTEGER,
    next_due_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) and configure for single user with master PIN
-- Since this is a single user app, we allow all operations to authenticated anon keys
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odometer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_reminders ENABLE ROW LEVEL SECURITY;

-- Note: Because we are securing the App via Next.js Middleware (Master PIN),
-- any request reaching Supabase from the Server Actions is essentially safe for this use case.
-- We can create fully permissive policies for the anon key since Next.js acts as the gatekeeper.
CREATE POLICY "Allow all operations for anon" ON public.daily_records FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.odometer_records FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.maintenance_records FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.fuel_records FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.maintenance_reminders FOR ALL USING (true);
