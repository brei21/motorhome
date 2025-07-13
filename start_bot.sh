#!/bin/bash

echo "🚐 Iniciando Bot de Autocaravana..."

# Activar entorno virtual si existe
if [ -d ".venv" ]; then
    echo "🔧 Activando entorno virtual..."
    source .venv/bin/activate
fi

# Detener procesos anteriores
echo "🛑 Deteniendo instancias anteriores..."
pkill -f "python.*run.py" 2>/dev/null
pkill -f "python.*main.py" 2>/dev/null

# Esperar un momento
sleep 2

# Iniciar el bot
echo "🚀 Iniciando bot..."
python run.py 