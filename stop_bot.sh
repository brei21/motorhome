#!/bin/bash

echo "🛑 Deteniendo Bot de Autocaravana..."

# Buscar y matar procesos del bot
pkill -f "python.*run.py" 2>/dev/null
pkill -f "python.*main.py" 2>/dev/null

echo "✅ Procesos detenidos"
echo "🚀 Puedes iniciar el bot con: ./start_bot.sh" 