import os
from dotenv import load_dotenv
from dataclasses import dataclass
from datetime import time
import pytz

@dataclass(frozen=True)
class Config:
    # Telegram
    TELEGRAM_TOKEN: str

    # Zona horaria
    TIMEZONE: pytz.BaseTzInfo

    # Base de datos (SQLite, para compatibilidad)
    DATABASE_PATH: str = "data/motorhome.db"

    # Supabase/Postgres (añade la variable aquí)
    SUPABASE_URL: str = None

    # Horario del recordatorio diario (09:00 AM España)
    DAILY_REMINDER_TIME: time = time(9, 0)

    # Configuración de gráficos
    GRAPH_COLORS = {
        'travel': '#FF6B6B',
        'parking': '#4ECDC4',
        'vacation_home': '#45B7D1'
    }

def load_config() -> Config:
    """Carga la configuración desde variables de entorno o .env"""
    load_dotenv()

    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        raise ValueError("TELEGRAM_TOKEN no está configurado")

    tz_name = os.getenv("TZ", "Europe/Madrid")
    try:
        timezone = pytz.timezone(tz_name)
    except pytz.UnknownTimeZoneError:
        raise ValueError(f"Zona horaria inválida: {tz_name}")

    # Nueva línea: Supabase/Postgres URL (opcional)
    supabase_url = os.getenv("SUPABASE_URL")

    return Config(
        TELEGRAM_TOKEN=token,
        TIMEZONE=timezone,
        SUPABASE_URL=supabase_url
    )

config = load_config()
