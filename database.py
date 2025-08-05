"""
Base de datos del Bot de Autocaravana (compatible con SQLite y PostgreSQL/Supabase)
"""
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from config import config

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

import sqlite3

class BaseDatabase:
    def add_daily_record(self, *args, **kwargs): raise NotImplementedError()
    def get_daily_record(self, *args, **kwargs): raise NotImplementedError()
    def get_daily_records(self, *args, **kwargs): raise NotImplementedError()
    def get_stats_by_status(self, *args, **kwargs): raise NotImplementedError()
    def add_odometer_record(self, *args, **kwargs): raise NotImplementedError()
    def get_odometer_records(self, *args, **kwargs): raise NotImplementedError()
    def get_total_kilometers(self, *args, **kwargs): raise NotImplementedError()
    def add_maintenance_record(self, *args, **kwargs): raise NotImplementedError()
    def get_maintenance_records(self, *args, **kwargs): raise NotImplementedError()
    def get_total_maintenance_cost(self, *args, **kwargs): raise NotImplementedError()
    def add_fuel_record(self, *args, **kwargs): raise NotImplementedError()
    def get_fuel_records(self, *args, **kwargs): raise NotImplementedError()
    def get_total_fuel_cost(self, *args, **kwargs): raise NotImplementedError()
    def add_maintenance_reminder(self, *args, **kwargs): raise NotImplementedError()
    def get_maintenance_reminders(self, *args, **kwargs): raise NotImplementedError()
    def update_maintenance_reminder(self, *args, **kwargs): raise NotImplementedError()
    def delete_maintenance_reminder(self, *args, **kwargs): raise NotImplementedError()
    def get_current_odometer(self, *args, **kwargs): raise NotImplementedError()

#########################
#   SQLite DATABASE     #
#########################
class SQLiteDatabase(BaseDatabase):
    def __init__(self):
        self.db_path = config.DATABASE_PATH
        self._ensure_data_dir()
        self._init_database()

    def _ensure_data_dir(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def _init_database(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS daily_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL UNIQUE,
                    status TEXT NOT NULL CHECK (status IN ('travel', 'parking', 'vacation_home')),
                    latitude REAL,
                    longitude REAL,
                    location_name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS odometer_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    kilometers INTEGER NOT NULL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS maintenance_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('repair', 'improvement', 'maintenance')),
                    description TEXT NOT NULL,
                    cost REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS fuel_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    amount REAL NOT NULL,
                    price_per_liter REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS maintenance_reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL CHECK (type IN ('km', 'time', 'custom')),
                    description TEXT NOT NULL,
                    frequency INTEGER NOT NULL,
                    last_done_km INTEGER,
                    last_done_date DATE,
                    next_due_km INTEGER,
                    next_due_date DATE,
                    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    # Incluye aquí tus métodos existentes: add_daily_record, get_daily_record, etc.
    # Puedes copiar/pegar los que tienes. Solo cambia el nombre de la clase.
    # TODO: Copia aquí tus métodos ya definidos en la versión SQLite.

#########################
#   POSTGRES DATABASE   #
#########################
class PostgresDatabase(BaseDatabase):
    def __init__(self):
        self.conn_kwargs = self._get_conn_kwargs()
        # Las tablas debes crearlas manualmente en Supabase

    def _get_conn_kwargs(self):
        import urllib.parse as urlparse
        url = config.SUPABASE_URL
        result = urlparse.urlparse(url)
        return {
            "dbname": result.path[1:],
            "user": result.username,
            "password": result.password,
            "host": result.hostname,
            "port": result.port,
            "sslmode": "require"
        }

    def _connect(self):
        return psycopg2.connect(**self.conn_kwargs, cursor_factory=psycopg2.extras.RealDictCursor)

    # Ejemplo de método: (Copia tus métodos y cambia ? por %s y adaptaciones menores)
    def add_daily_record(self, date: str, status: str, latitude: Optional[float] = None, 
                        longitude: Optional[float] = None, location_name: Optional[str] = None) -> int:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO daily_records (date, status, latitude, longitude, location_name)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (date) DO UPDATE
                        SET status = EXCLUDED.status,
                            latitude = EXCLUDED.latitude,
                            longitude = EXCLUDED.longitude,
                            location_name = EXCLUDED.location_name
                    RETURNING id;
                """, (date, status, latitude, longitude, location_name))
                result = cursor.fetchone()
                return int(result["id"]) if result else 0

    def get_daily_record(self, date: str) -> Optional[Dict]:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM daily_records WHERE date = %s", (date,))
                row = cursor.fetchone()
                return dict(row) if row else None
    # Continúa igual para los demás métodos (ver comentario arriba)

# --- Factory para seleccionar la DB correcta ---

if hasattr(config, "SUPABASE_URL") and config.SUPABASE_URL and psycopg2:
    db = PostgresDatabase()
else:
    db = SQLiteDatabase()
