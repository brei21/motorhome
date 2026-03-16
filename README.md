# 🚐 Motorhome Web App

Una aplicación web premium diseñada para gestionar la vida nómada en autocaravana, furgoneta o camper. Centraliza tus registros diarios, consumos de combustible, mantenimiento y planificación de rutas en una interfaz elegante y optimizada para iPad y dispositivos móviles.

## ✨ Características Principales

- **Dashboard Bento Box:** Una vista general moderna con widgets interactivos para clima, ubicación, gastos y recordatorios.
- **Planificador de Rutas:** Integración con mapas interactivos (Leaflet) y OSRM para calcular trazados reales de carretera, distancias entre paradas y kilometraje total.
- **Bitácora Diaria:** Registra tus pernoctas, notas de viaje y el estado de tus depósitos de agua (Limpias, Grises, Negras) con seguimiento de días transcurridos.
- **Control de Gastos:** Clasificación de gastos en Gasolina y Alojamiento (Campings/Parkings) con visualización en gráficos donut.
- **Gestión de Mantenimiento:** Historial de revisiones, mejoras y averías para tener tu vehículo siempre a punto.
- **Seguridad:** Acceso protegido mediante Código PIN maestro.

## 🛠️ Tecnologías

- **Frontend:** Next.js (App Router), React, TypeScript.
- **Estilos:** Vanilla CSS con diseño moderno tipo "Bento Box".
- **Backend/DB:** Supabase (Auth, PostgreSQL, Edge Functions).
- **Mapas:** React-Leaflet, OSRM (Open Source Routing Machine), Nominatim.
- **Iconos:** Lucide React.

## 🚀 Despliegue en Railway

Esta aplicación está optimizada para ser desplegada en [Railway](https://railway.app/).

### 1. Variables de Entorno Requeridas

Debes configurar las siguientes variables en el panel de Railway:

| Variable | Descripción |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto en Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase |
| `MASTER_PIN` | Código PIN para acceder a la aplicación |

### 2. Comandos de Build y Start

- **Build:** `npm run build`
- **Start:** `npm run start`

## 💻 Desarrollo Local

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Configura tu archivo `.env.local` con las credenciales de Supabase.

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 📄 Licencia

Este proyecto es de uso privado para la gestión personal de autocaravanas.

---
*Desarrollado con ❤️ para aventureros de la carretera.*
