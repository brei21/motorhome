# 🚐 Bot de Autocaravana

Un bot de Telegram inteligente para gestionar el estado diario de tu autocaravana, con funcionalidades de registro automático, estadísticas y mantenimiento.

## ✨ Funcionalidades

### 📅 Registro Diario Automático
- **Recordatorio automático** todos los días a las 09:00 AM
- **Tres estados posibles**:
  - 🚗 **De viaje** - Registra ubicación GPS
  - 🅿️ **En parking** - Solo registra estado
  - 🏠 **Casa de vacaciones** - Solo registra estado

### 📊 Estadísticas en Texto
- **Lista de registros diarios** con fecha, estado y ubicación
- **Lista de kilometraje** con total acumulado
- **Lista de mantenimientos** con costes totales
- **Lista de repostajes** con litros y costes

### 🛣️ Gestión de Kilometraje
- **Registro manual** de kilómetros cuando quieras
- **Historial completo** de registros
- **Total acumulado** y estadísticas

### 🔧 Registro de Mantenimiento
- **Tres tipos**: Reparaciones, Mejoras, Mantenimiento
- **Control de costes** con descripción detallada
- **Historial completo** de trabajos realizados

### ⛽ Registro de Repostajes
- **Importe total** y **precio por litro**
- **Cálculo automático** de litros repostados
- **Historial completo** de repostajes

## 🚀 Instalación

### Requisitos
- Python 3.11+
- Token de bot de Telegram

### Instalación Rápida

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repo>
   cd motorhomebot
   ```

2. **Crear entorno virtual**:
   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate  # En macOS/Linux
   ```

3. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno**:
   ```bash
   cp env.example .env
   # Editar .env con tu token de Telegram
   ```

5. **Iniciar el bot**:
   ```bash
   ./start_bot.sh
   ```

## 📱 Uso

### Comandos Principales
- `/menu` - Menú principal
- `/start` - Reiniciar bot
- `/daily` - Registro manual del estado diario
- `/km` - Registrar kilometraje
- `/maintenance` - Registrar mantenimiento
- `/fuel` - Registrar repostaje
- `/stats` - Ver estadísticas
- `/help` - Ayuda detallada

### Flujo de Uso Diario
1. **09:00 AM** - El bot te pregunta automáticamente dónde está la autocaravana
2. **Selecciona el estado** con los botones inline
3. **Si es viaje** - Escribe la ubicación como texto
4. **Confirmación** - El bot confirma el registro

## 🗄️ Base de Datos

El bot utiliza SQLite con tres tablas principales:

- **`daily_records`** - Registros diarios de estado
- **`odometer_records`** - Registros de kilometraje
- **`maintenance_records`** - Registros de mantenimiento

Los datos se almacenan en `data/motorhome.db`

## 📊 Estadísticas Disponibles

### Lista de Registros Diarios
- Registros cronológicos con fecha, estado y ubicación
- Emojis para identificar rápidamente cada estado
- Enlaces a mapas para ubicaciones registradas

### Lista de Kilometraje
- Registros de odómetro con fechas
- Total acumulado de kilómetros
- Diferencia entre registros consecutivos

### Lista de Mantenimientos
- Registros con fecha, tipo, descripción y coste
- Total acumulado de gastos en mantenimiento
- Organización por tipo de trabajo

### Lista de Repostajes
- Registros con fecha, importe, precio por litro y litros
- Total acumulado de gastos en combustible
- Control de consumo de combustible

## 🔧 Mantenimiento

### Scripts de Gestión
- `./start_bot.sh` - Iniciar el bot
- `./stop_bot.sh` - Detener el bot
- `python main.py` - Ejecución directa

### Logs
El bot genera logs detallados con:
- Registro de comandos ejecutados
- Errores y excepciones
- Estado del scheduler
- Confirmaciones de recordatorios

## 🎯 Características Técnicas

- **Arquitectura asíncrona** con python-telegram-bot 20+
- **Scheduler automático** con APScheduler
- **Estadísticas en texto** sin dependencias de gráficos
- **Base de datos SQLite** para persistencia
- **Interfaz intuitiva** con botones inline
- **Manejo de errores** robusto

## 🚀 Despliegue

### Desarrollo Local
```bash
./start_bot.sh
```

### Producción (Recomendado)
- Usar un servidor VPS
- Configurar systemd service
- Usar PM2 o similar para gestión de procesos
- Configurar logs rotativos

## 📈 Roadmap

- [ ] Exportación de datos a Excel/PDF
- [ ] Integración con Google Maps
- [ ] Alertas de mantenimiento programado
- [ ] Compartir estadísticas
- [ ] Soporte para múltiples autocaravanas
- [ ] API REST para integraciones

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o sugerencias:
1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles

---

**Desarrollado con ❤️ para la comunidad de autocaravanas** 