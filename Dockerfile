# Dockerfile para motorhomebot
FROM python:3.12-slim

# 1. Directorio de trabajo
WORKDIR /app

# 2. Copiar e instalar dependencias
COPY requirements.txt .  
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copiar el resto del código
COPY . .

# 4. Arrancar el bot
CMD ["python", "run.py"]