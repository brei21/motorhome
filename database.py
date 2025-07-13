"""
Base de datos del Bot de Autocaravana
"""
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from config import config

class Database:
    def __init__(self):
        self.db_path = config.DATABASE_PATH
        self._ensure_data_dir()
        self._init_database()
    
    def _ensure_data_dir(self):
        """Asegura que existe el directorio de datos"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
    
    def _init_database(self):
        """Inicializa las tablas de la base de datos"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabla de registros diarios
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
            
            # Tabla de registros de kilometraje
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS odometer_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    kilometers INTEGER NOT NULL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabla de registros de mantenimiento
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
            
            # Tabla de registros de repostajes
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS fuel_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    amount REAL NOT NULL,
                    price_per_liter REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
    
    # Métodos para daily_records
    def add_daily_record(self, date: str, status: str, latitude: Optional[float] = None, 
                        longitude: Optional[float] = None, location_name: Optional[str] = None) -> int:
        """Añade un registro diario"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO daily_records (date, status, latitude, longitude, location_name)
                VALUES (?, ?, ?, ?, ?)
            """, (date, status, latitude, longitude, location_name))
            conn.commit()
            return int(cursor.lastrowid) if cursor.lastrowid else 0
    
    def get_daily_record(self, date: str) -> Optional[Dict]:
        """Obtiene un registro diario por fecha"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM daily_records WHERE date = ?", (date,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_daily_records(self, limit: int = 30) -> List[Dict]:
        """Obtiene los últimos registros diarios"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM daily_records 
                ORDER BY date DESC 
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_stats_by_status(self) -> Dict[str, int]:
        """Obtiene estadísticas por estado"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT status, COUNT(*) as count 
                FROM daily_records 
                GROUP BY status
            """)
            return {row[0]: row[1] for row in cursor.fetchall()}
    
    # Métodos para odometer_records
    def add_odometer_record(self, date: str, kilometers: int, notes: Optional[str] = None) -> int:
        """Añade un registro de kilometraje"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO odometer_records (date, kilometers, notes)
                VALUES (?, ?, ?)
            """, (date, kilometers, notes))
            conn.commit()
            return int(cursor.lastrowid) if cursor.lastrowid else 0
    
    def get_odometer_records(self, limit: int = 20) -> List[Dict]:
        """Obtiene los últimos registros de kilometraje con cálculo de diferencia"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    o1.*,
                    CASE 
                        WHEN o2.kilometers IS NOT NULL 
                        THEN o1.kilometers - o2.kilometers 
                        ELSE 0 
                    END as km_difference
                FROM odometer_records o1
                LEFT JOIN odometer_records o2 ON o2.date = (
                    SELECT MAX(date) 
                    FROM odometer_records o3 
                    WHERE o3.date < o1.date
                )
                ORDER BY o1.date DESC 
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_total_kilometers(self) -> int:
        """Obtiene el total de kilómetros recorridos (diferencia entre primer y último registro)"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    CASE 
                        WHEN COUNT(*) > 1 
                        THEN MAX(kilometers) - MIN(kilometers)
                        ELSE 0 
                    END as total_km
                FROM odometer_records
            """)
            result = cursor.fetchone()[0]
            return int(result) if result else 0
    
    # Métodos para maintenance_records
    def add_maintenance_record(self, date: str, type_: str, description: str, 
                             cost: Optional[float] = None) -> int:
        """Añade un registro de mantenimiento"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO maintenance_records (date, type, description, cost)
                VALUES (?, ?, ?, ?)
            """, (date, type_, description, cost))
            conn.commit()
            return int(cursor.lastrowid) if cursor.lastrowid else 0
    
    def get_maintenance_records(self, limit: int = 20) -> List[Dict]:
        """Obtiene los últimos registros de mantenimiento"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM maintenance_records 
                ORDER BY date DESC 
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_total_maintenance_cost(self) -> float:
        """Obtiene el coste total de mantenimiento"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT SUM(cost) FROM maintenance_records WHERE cost IS NOT NULL")
            result = cursor.fetchone()[0]
            return result if result else 0.0
    
    # Métodos para fuel_records
    def add_fuel_record(self, date: str, amount: float, price_per_liter: float) -> int:
        """Añade un registro de repostaje"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO fuel_records (date, amount, price_per_liter)
                VALUES (?, ?, ?)
            """, (date, amount, price_per_liter))
            conn.commit()
            return int(cursor.lastrowid) if cursor.lastrowid else 0
    
    def get_fuel_records(self, limit: int = 20) -> List[Dict]:
        """Obtiene los últimos registros de repostajes"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM fuel_records 
                ORDER BY date DESC 
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_total_fuel_cost(self) -> float:
        """Obtiene el coste total de combustible"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT SUM(amount * price_per_liter) FROM fuel_records")
            result = cursor.fetchone()[0]
            return result if result else 0.0

# Instancia global de la base de datos
db = Database() 