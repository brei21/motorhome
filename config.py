"""
Configuración del Bot de Autocaravana
"""
import os
from dataclasses import dataclass
from datetime import time
import pytz

@dataclass(frozen=True)
class Config:
    # Telegram
    TELEGRAM_TOKEN: str
    
    # Zona horaria
    TIMEZONE: pytz.BaseTzInfo
    
    # Base de datos
    DATABASE_PATH: str = "data/motorhome.db"
    
    # Horario del recordatorio diario (09:00 AM España)
    DAILY_REMINDER_TIME: time = time(9, 0)
    
    # Configuración de gráficos
    GRAPH_COLORS = {
        'travel': '#FF6B6B',      # Rojo para viajes
        'parking': '#4ECDC4',     # Turquesa para parking
        'vacation_home': '#45B7D1' # Azul para casa de vacaciones
    }

def load_config() -> Config:
    """Carga la configuración desde variables de entorno"""
    # Token de Telegram
    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        raise ValueError("TELEGRAM_TOKEN no está configurado")
    
    # Zona horaria
    tz_name = os.getenv("TZ", "Europe/Madrid")
    try:
        timezone = pytz.timezone(tz_name)
    except pytz.UnknownTimeZoneError:
        raise ValueError(f"Zona horaria inválida: {tz_name}")
    
    return Config(
        TELEGRAM_TOKEN=token,
        TIMEZONE=timezone
    )

# Instancia global de configuración
config = load_config() 