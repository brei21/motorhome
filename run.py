#!/usr/bin/env python3
"""
Script de ejecución local para el Bot de Autocaravana
"""
import sys
import os
import asyncio
from dotenv import load_dotenv

# Cargar variables de entorno desde .env si existe
load_dotenv()

import nest_asyncio
nest_asyncio.apply()

from main import main

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Bot detenido por el usuario")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1) 