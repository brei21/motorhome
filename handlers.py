"""
Handlers del Bot de Autocaravana
"""
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
from telegram.ext import ContextTypes, ConversationHandler
from datetime import datetime
from typing import Dict, Any
from database import db
from config import config

# Estados para las conversaciones
# Estados para las conversaciones
ASKING_LOCATION = 1
ASKING_KILOMETERS = 2
ASKING_MAINTENANCE_TYPE = 3
ASKING_MAINTENANCE_DESCRIPTION = 4
ASKING_MAINTENANCE_COST = 5
ASKING_FUEL_AMOUNT = 6
ASKING_FUEL_PRICE = 7
# Estados para recordatorios
ASKING_REMINDER_TYPE = 8
ASKING_REMINDER_TEMPLATE = 9
ASKING_REMINDER_DESCRIPTION = 10
ASKING_REMINDER_FREQUENCY = 11
ASKING_REMINDER_LAST_DONE = 12
CONFIRM_REMINDER = 13
# Estados para completar recordatorios
ASKING_COMPLETION_DATE = 14

# --- Textos centralizados ---
ERROR_INVALID_NUMBER = "❌ Por favor, introduce un número válido. Inténtalo de nuevo:"
ERROR_NEGATIVE_NUMBER = "❌ El valor debe ser mayor que 0. Inténtalo de nuevo:"
ERROR_LOCATION = "❌ La ubicación debe tener al menos 3 caracteres. Inténtalo de nuevo:"
ERROR_MAINTENANCE_DESC = "❌ La descripción debe tener al menos 3 caracteres. Inténtalo de nuevo:"
ERROR_CANCELLED = "❌ Operación cancelada."
SUCCESS_REGISTERED = "✅ Registro completado correctamente."
SUCCESS_CANCELLED = "❌ Registro cancelado."

# --- Utilidades de respuesta ---
async def reply_error(update, text, reply_markup=None):
    await update.message.reply_text(text, reply_markup=reply_markup)

async def reply_success(update, text, reply_markup=None):
    await update.message.reply_text(text, reply_markup=reply_markup)

# --- Configuración de logging ---
logging.basicConfig(level=logging.INFO)

# Emojis y textos
STATUS_EMOJIS = {
    'travel': '🚗',
    'parking': '🅿️', 
    'vacation_home': '🏠'
}

STATUS_NAMES = {
    'travel': 'De viaje',
    'parking': 'En parking',
    'vacation_home': 'En casa de vacaciones'
}

MAINTENANCE_TYPES = {
    'repair': '🔧 Reparación',
    'improvement': '⚡ Mejora',
    'maintenance': '🛠️ Mantenimiento'
}

def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """Retorna el teclado del menú principal"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📅 Registro Diario", callback_data="daily_record"),
            InlineKeyboardButton("🛣️ Kilometraje", callback_data="kilometers")
        ],
        [
            InlineKeyboardButton("🔧 Mantenimiento", callback_data="maintenance"),
            InlineKeyboardButton("⛽ Repostajes", callback_data="fuel")
        ],
        [
            InlineKeyboardButton("🔔 Recordatorios", callback_data="reminders"),
            InlineKeyboardButton("📊 Estadísticas", callback_data="stats")
        ],
        [
            InlineKeyboardButton("❓ Ayuda", callback_data="help")
        ]
    ])

def get_daily_status_keyboard() -> InlineKeyboardMarkup:
    """Retorna el teclado para seleccionar estado diario"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🚗 De viaje", callback_data="status_travel"),
            InlineKeyboardButton("🅿️ En parking", callback_data="status_parking")
        ],
        [
            InlineKeyboardButton("🏠 Casa vacaciones", callback_data="status_vacation_home")
        ],
        [
            InlineKeyboardButton("🔙 Volver", callback_data="main_menu")
        ]
    ])

def get_stats_keyboard() -> InlineKeyboardMarkup:
    """Retorna el teclado de estadísticas SOLO con listados"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📍 Registros de ubicación", callback_data="stats_list_daily"),
        ],
        [
            InlineKeyboardButton("🛣️ Kilometraje", callback_data="stats_list_km"),
        ],
        [
            InlineKeyboardButton("🔧 Mantenimiento", callback_data="stats_list_maintenance"),
        ],
        [
            InlineKeyboardButton("⛽ Repostajes", callback_data="stats_list_fuel"),
        ],
        [
            InlineKeyboardButton("🔙 Volver", callback_data="main_menu")
        ]
    ])

def get_maintenance_type_keyboard() -> InlineKeyboardMarkup:
    """Retorna el teclado para tipos de mantenimiento"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🔧 Reparación", callback_data="maintenance_repair"),
            InlineKeyboardButton("⚡ Mejora", callback_data="maintenance_improvement")
        ],
        [
            InlineKeyboardButton("🛠️ Mantenimiento", callback_data="maintenance_maintenance")
        ],
        [
            InlineKeyboardButton("🔙 Volver", callback_data="main_menu")
        ]
    ])

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Comando /start - Reiniciar bot"""
    user = update.effective_user
    # Configurar chat_id para el scheduler
    from main import daily_scheduler
    if daily_scheduler:
        daily_scheduler.set_chat_id(update.effective_chat.id)
        logging.info(f"✅ Chat ID configurado para recordatorios: {update.effective_chat.id}")

    welcome_text = (
        f"🚐 Hola {user.first_name}!\n\n"
        "Bot de Autocaravana reiniciado correctamente ✅\n\n"
        "El bot está listo para usar. Usa /menu para ver el menú principal.\n\n"
        "¿Necesitas ayuda? Usa /help"
    )

    # Orden: menu, daily, km, maintenance, fuel, stats, help, start
    keyboard = [
        [InlineKeyboardButton("🏠 Menú principal", callback_data="main_menu")],
        [InlineKeyboardButton("📅 Registro Diario", callback_data="daily_record")],
        [InlineKeyboardButton("🛣️ Kilometraje", callback_data="kilometers")],
        [InlineKeyboardButton("🔧 Mantenimiento", callback_data="maintenance")],
        [InlineKeyboardButton("⛽ Repostaje", callback_data="fuel")],
        [InlineKeyboardButton("📊 Estadísticas", callback_data="stats")],
        [InlineKeyboardButton("❓ Ayuda", callback_data="help")],
        [InlineKeyboardButton("🔄 Reiniciar", callback_data="start")],
    ]
    await update.message.reply_text(
        welcome_text,
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Comando /menu - Menú principal"""
    user = update.effective_user
    
    # Configurar chat_id para el scheduler
    from main import daily_scheduler
    if daily_scheduler:
        daily_scheduler.set_chat_id(update.effective_chat.id)
        logging.info(f"✅ Chat ID configurado para recordatorios: {update.effective_chat.id}")
    
    menu_text = f"""
🚐 Bot de Autocaravana 🏕️

Hola {user.first_name}! ¿Qué quieres hacer hoy?

Este bot te ayudará a:
• 📍 Registrar la ubicación diaria de tu autocaravana
• 📊 Ver estadísticas de uso
• 🛣️ Controlar el kilometraje
• 🔧 Gestionar mantenimientos
• ⛽ Registrar repostajes
• 🔔 Gestionar recordatorios de mantenimiento
"""
    
    await update.message.reply_text(
        menu_text,
        reply_markup=get_main_menu_keyboard()
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Comando /help - Ayuda"""
    help_text = (
        "📚 Ayuda del Bot de Autocaravana\n\n"
        "Comandos disponibles:\n"
        "• /menu - Menú principal\n"
        "• /daily - Registro manual del estado diario\n"
        "• /km - Registrar kilometraje\n"
        "• /maintenance - Registrar mantenimiento\n"
        "• /fuel - Registrar repostaje\n"
        "• /stats - Ver estadísticas\n"
        "• /help - Esta ayuda\n"
        "• /start - Reiniciar bot\n\n"
        "Funcionalidades:\n"
        "• 📅 Registro automático: Todos los días a las 09:00 AM te preguntará dónde está la autocaravana\n"
        "• 📊 Estadísticas: Listas de todos los registros\n"
        "• 🛣️ Kilometraje: Control del odómetro total\n"
        "• 🔧 Mantenimiento: Registro de reparaciones y mejoras con costes\n"
        "• ⛽ Repostajes: Registro de combustible con importe y precio por litro\n"
        "• 🔔 Recordatorios: Gestión de recordatorios de mantenimiento por kilometraje y tiempo\n\n"
        "Estados de la autocaravana:\n"
        "• 🚗 De viaje - Registra ubicación por texto\n"
        "• 🅿️ En parking - La autocaravana está en un parking\n"
        "• 🏠 Casa vacaciones - La autocaravana está en una casa de vacaciones"
    )
    help_text = help_text.replace('"', '').replace("'", '').replace('*', '')
    await update.message.reply_text(
        help_text,
        reply_markup=get_main_menu_keyboard()
    )

async def daily_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Comando /daily - Registro manual del estado diario"""
    await update.message.reply_text(
        "📅 Registro Diario\n\n¿Dónde está la autocaravana hoy?",
        reply_markup=get_daily_status_keyboard()
    )

async def km_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Comando /km - Registrar kilometraje"""
    # Determinar si es un comando o un callback
    if update.callback_query:
        await update.callback_query.answer()
        await update.callback_query.edit_message_text(
            "🛣️ Registrar Kilometraje\n\nPor favor, introduce el número de kilómetros:",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Volver", callback_data="kilometers")]
            ])
        )
    else:
        await update.message.reply_text(
            "🛣️ Registrar Kilometraje\n\nPor favor, introduce el número de kilómetros:",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Volver", callback_data="kilometers")]
            ])
        )
    return ASKING_KILOMETERS

async def add_kilometers_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Callback para añadir kilometraje desde el menú"""
    return await km_command(update, context)

async def maintenance_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Comando /maintenance - Registrar mantenimiento"""
    await update.message.reply_text(
        "🔧 Registro de Mantenimiento\n\n¿Qué tipo de registro quieres añadir?",
        reply_markup=get_maintenance_type_keyboard()
    )

async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Comando /stats - Ver estadísticas"""
    # Determinar si es un comando o un callback
    if update.callback_query:
        await update.callback_query.answer()
        await update.callback_query.edit_message_text(
            "📊 Estadísticas\n\n¿Qué estadísticas quieres ver?",
            reply_markup=get_stats_keyboard()
        )
    else:
        await update.message.reply_text(
            "📊 Estadísticas\n\n¿Qué estadísticas quieres ver?",
            reply_markup=get_stats_keyboard()
        )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Maneja todos los callbacks de botones"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    if data == "main_menu":
        await show_main_menu(query)
    elif data == "daily_record":
        await show_daily_status_menu(query)
    elif data.startswith("status_"):
        await handle_status_selection(query, context, data.replace("status_", ""))
    elif data == "kilometers":
        await show_kilometers_menu(query)
    elif data == "maintenance":
        await show_maintenance_menu(query)
    elif data == "fuel":
        await show_fuel_menu(query)
    elif data == "reminders":
        await show_reminders_menu(query)
    elif data == "stats":
        await show_stats_menu(query)
    elif data.startswith("stats_"):
        await handle_stats_selection(query, data.replace("stats_", ""))
    elif data == "add_maintenance":
        # Este callback será manejado por el ConversationHandler
        pass
    elif data == "add_location":
        # Este callback será manejado por el ConversationHandler
        pass
    elif data == "add_fuel":
        # Este callback será manejado por el ConversationHandler
        pass
    elif data == "add_kilometers":
        # Este callback será manejado por el ConversationHandler
        pass
    elif data == "add_reminder":
        await add_reminder_callback(update, context)
    elif data == "complete_reminder":
        await show_complete_reminder_menu(query)
    elif data.startswith("complete_reminder_"):
        await handle_complete_reminder(update, context)
    elif data == "list_reminders":
        await show_reminders_list(query)
    elif data == "list_fuel":
        await show_fuel_list(query)
    elif data.startswith("maintenance_"):
        await handle_maintenance_type_selection(query, data.replace("maintenance_", ""))
    elif data in ["completion_today", "completion_other_date"]:
        await handle_completion_date(update, context)
    elif data == "cancel_location":
        await cancel_location_callback(update, context)
    elif data == "help":
        await show_help(query)

async def show_main_menu(query) -> None:
    """Muestra el menú principal"""
    await query.edit_message_text(
        "🚐 Bot de Autocaravana\n\n¿Qué quieres hacer?",
        reply_markup=get_main_menu_keyboard()
    )

async def show_daily_status_menu(query) -> None:
    """Muestra el menú de estado diario"""
    await query.edit_message_text(
        "📅 Registro Diario\n\n¿Dónde está la autocaravana hoy?",
        reply_markup=get_daily_status_keyboard()
    )

async def handle_status_selection(query, context, status: str) -> None:
    """Maneja la selección de estado diario"""
    today = datetime.now().strftime('%Y-%m-%d')
    
    if status == 'travel':
        # Para viajes, usar el ConversationHandler de ubicación
        await query.edit_message_text(
            "🚗 De viaje\n\nEscribe la ubicación donde te encuentras:",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Volver", callback_data="cancel_location")]
            ])
        )
        # Guardar el estado en el contexto para la conversación
        context.user_data['waiting_for_location'] = True
        context.user_data['status_to_save'] = status
        return
    else:
        # Para otros estados, guardar directamente
        db.add_daily_record(today, status)
        status_name = STATUS_NAMES.get(status, status)
        emoji = STATUS_EMOJIS.get(status, "📝")
        
        await query.edit_message_text(
            f"{emoji} Registro guardado\n\n"
            f"Fecha: {datetime.now().strftime('%d/%m/%Y')}\n"
            f"Estado: {status_name}\n\n"
            "✅ Registro completado correctamente.",
            reply_markup=get_main_menu_keyboard()
        )

async def show_kilometers_menu(query) -> None:
    """Muestra el menú de kilometraje"""
    total_km = db.get_total_kilometers()
    recent_records = db.get_odometer_records(limit=5)
    
    text = f"🛣️ Kilometraje\n\n"
    text += f"📊 Total acumulado: {total_km:,} km\n\n".replace(',', '.')
    
    if recent_records:
        text += "📋 Últimos registros:\n"
        for record in recent_records:
            date = datetime.strptime(record['date'], '%Y-%m-%d').strftime('%d/%m')
            odometer = record['kilometers']
            km_difference = record.get('km_difference', 0)
            
            if km_difference > 0:
                text += f"• {date}: {odometer:,} km (+{km_difference:,} km)\n".replace(',', '.')
            else:
                text += f"• {date}: {odometer:,} km\n".replace(',', '.')
    
    text += "\n¿Qué quieres hacer?"
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("➕ Registrar KM", callback_data="add_kilometers")],
        [InlineKeyboardButton("📋 Ver todos", callback_data="list_kilometers")],
        [InlineKeyboardButton("🔙 Volver", callback_data="main_menu")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard)

async def show_maintenance_menu(query) -> None:
    """Muestra el menú de mantenimiento"""
    total_cost = db.get_total_maintenance_cost()
    recent_records = db.get_maintenance_records(limit=5)
    
    text = f"🔧 Mantenimiento\n\n"
    text += f"💰 Coste total: {total_cost:,.2f} €\n\n"
    
    if recent_records:
        text += "📋 Últimos registros:\n"
        for record in recent_records:
            date = datetime.strptime(record['date'], '%Y-%m-%d').strftime('%d/%m')
            type_name = MAINTENANCE_TYPES.get(record['type'], record['type'])
            cost_text = f" ({record['cost']}€)" if record['cost'] else ""
            text += f"• {date}: {type_name}{cost_text}\n"
    
    text += "\n¿Qué quieres hacer?"
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("➕ Registrar mantenimiento", callback_data="add_maintenance")],
        [InlineKeyboardButton("📋 Ver todos", callback_data="list_maintenance")],
        [InlineKeyboardButton("🔙 Volver", callback_data="main_menu")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard)

async def show_fuel_menu(query) -> None:
    """Muestra el menú de repostajes"""
    total_cost = db.get_total_fuel_cost()
    recent_records = db.get_fuel_records(limit=5)
    
    text = f"⛽ Repostajes\n\n"
    text += f"💰 Coste total: {total_cost:,.2f} €\n\n"
    
    if recent_records:
        text += "📋 Últimos registros:\n"
        for record in recent_records:
            date = datetime.strptime(record['date'], '%Y-%m-%d').strftime('%d/%m')
            amount = record['amount']
            price = record['price_per_liter']
            liters = amount / price
            text += f"• {date}: {amount:.2f}€ ({price:.3f}€/L) - {liters:.2f}L\n"
    
    text += "\n¿Qué quieres hacer?"
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("➕ Registrar repostaje", callback_data="add_fuel")],
        [InlineKeyboardButton("📋 Ver todos", callback_data="list_fuel")],
        [InlineKeyboardButton("🔙 Volver", callback_data="main_menu")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard)

async def show_stats_menu(query) -> None:
    """Muestra el menú de estadísticas"""
    await query.edit_message_text(
        "📊 Estadísticas\n\n¿Qué estadísticas quieres ver?",
        reply_markup=get_stats_keyboard()
    )

async def handle_stats_selection(query, stat_type: str) -> None:
    """Maneja la selección de tipo de estadística SOLO con listados"""
    if stat_type == "list_daily":
        await show_daily_records_list(query)
    elif stat_type == "list_km":
        await show_kilometers_list(query)
    elif stat_type == "list_maintenance":
        await show_maintenance_list(query)
    elif stat_type == "list_fuel":
        await show_fuel_list(query)

async def show_daily_records_list(query) -> None:
    """Muestra la lista de registros de ubicación"""
    records = db.get_daily_records(limit=20)
    
    if not records:
        await query.edit_message_text(
            "📍 **Registros de Ubicación**\n\nNo hay registros disponibles.",
            reply_markup=get_stats_keyboard()
        )
        return
    
    text = "📍 **Registros de Ubicación**\n\n"
    
    for record in records:
        date = datetime.strptime(record['date'], '%Y-%m-%d').strftime('%d/%m/%Y')
        status = record['status']
        
        if status == 'travel':
            # Para viajes: fecha - "De viaje" - ubicación introducida por el usuario
            if record['location_name']:
                if "," in record['location_name']:
                    # Si la ubicación es GPS, mostrar coordenadas y enlace
                    latlon = record['location_name']
                    text += f"• {date} - 🚗 De viaje - [Ver en mapa](https://maps.google.com/?q={latlon})\n"
                else:
                    # Si es texto normal, mostrar la ubicación
                    text += f"• {date} - 🚗 De viaje - {record['location_name']}\n"
            else:
                # Si no hay ubicación registrada
                text += f"• {date} - 🚗 De viaje - Sin ubicación\n"
        elif status == 'parking':
            # Para parking: fecha - parking
            text += f"• {date} - 🅿️ parking\n"
        elif status == 'vacation_home':
            # Para casa de vacaciones: fecha - Casa de vacaciones
            text += f"• {date} - 🏠 Casa de vacaciones\n"
    
    # Dividir en múltiples mensajes si es muy largo
    if len(text) > 4000:
        parts = [text[i:i+4000] for i in range(0, len(text), 4000)]
        for i, part in enumerate(parts):
            if i == 0:
                await query.edit_message_text(part)
            else:
                await query.message.reply_text(part)
        
        await query.message.reply_text(
            "📋 Lista completada.",
            reply_markup=get_stats_keyboard()
        )
    else:
        await query.edit_message_text(
            text,
            reply_markup=get_stats_keyboard()
        )

async def show_kilometers_list(query) -> None:
    """Muestra la lista de registros de kilometraje"""
    records = db.get_odometer_records(limit=30)
    if not records:
        await query.edit_message_text(
            "🛣️ Registros de Kilometraje\n\nNo hay registros disponibles.",
            reply_markup=get_stats_keyboard()
        )
        return
    
    text = "🛣️ Registros de Kilometraje\n\n"
    total_km = 0
    
    for record in records:
        date = datetime.strptime(record['date'], '%Y-%m-%d').strftime('%d/%m/%Y')
        odometer = record['kilometers']
        km_difference = record.get('km_difference', 0)
        notes = record['notes'] or ""
        
        # Mostrar odómetro total y diferencia
        if km_difference > 0:
            text += f"• {date} - {odometer:,} km (+{km_difference:,} km)".replace(',', '.')
        else:
            text += f"• {date} - {odometer:,} km".replace(',', '.')
        
        if notes:
            text += f" ({notes})"
        text += "\n"
        
        total_km += km_difference
    
    # Añadir línea separadora y total
    text += "\n" + "─" * 40 + "\n"
    text += f"🛣️ Total de kilómetros recorridos: {total_km:,} km".replace(',', '.')
    
    await query.edit_message_text(text, reply_markup=get_stats_keyboard())

async def show_maintenance_list(query) -> None:
    """Muestra la lista de registros de mantenimiento"""
    records = db.get_maintenance_records(limit=30)
    if not records:
        await query.edit_message_text(
            "🔧 Registros de Mantenimiento\n\nNo hay registros disponibles.",
            reply_markup=get_stats_keyboard()
        )
        return
    
    text = "🔧 Registros de Mantenimiento\n\n"
    total_cost = 0
    
    for record in records:
        date = datetime.strptime(record['date'], '%Y-%m-%d').strftime('%d/%m/%Y')
        desc = record['description']
        cost = record['cost'] or 0
        total_cost += cost
        
        # Formatear el coste para mostrar
        cost_display = f"{cost:.2f}€" if cost > 0 else "0.00€"
        
        text += f"• {date} - {desc} - {cost_display}\n"
    
    # Añadir línea separadora y sumatorio
    text += "\n" + "─" * 40 + "\n"
    text += f"💰 Total gastado en mantenimiento: {total_cost:.2f}€"
    
    await query.edit_message_text(text, reply_markup=get_stats_keyboard())

async def show_fuel_list(query) -> None:
    """Muestra la lista de registros de repostajes"""
    records = db.get_fuel_records(limit=30)
    if not records:
        await query.edit_message_text(
            "⛽ Registros de Repostajes\n\nNo hay registros disponibles.",
            reply_markup=get_stats_keyboard()
        )
        return
    
    text = "⛽ Registros de Repostajes\n\n"
    total_cost = 0
    
    for record in records:
        date = datetime.strptime(record['date'], '%Y-%m-%d').strftime('%d/%m/%Y')
        amount = record['amount']
        price = record['price_per_liter']
        liters = amount / price
        total_cost += amount
        
        text += f"• {date} - {amount:.2f}€ - {price:.3f}€/L ({liters:.2f}L)\n"
    
    # Añadir línea separadora y sumatorio
    text += "\n" + "─" * 40 + "\n"
    text += f"💰 Total gastado en combustible: {total_cost:.2f}€"
    
    await query.edit_message_text(text, reply_markup=get_stats_keyboard())

async def show_help(query) -> None:
    """Muestra la ayuda"""
    help_text = """
📚 Ayuda del Bot de Autocaravana

Comandos disponibles:
• /menu - Menú principal
• /daily - Registro manual del estado diario
• /km - Registrar kilometraje
• /maintenance - Registrar mantenimiento
• /fuel - Registrar repostaje
• /stats - Ver estadísticas
• /help - Esta ayuda
• /start - Reiniciar bot

Funcionalidades:
• 📅 Registro automático: Todos los días a las 09:00 AM te preguntará dónde está la autocaravana
• 📊 Estadísticas: Listas de todos los registros
• 🛣️ Kilometraje: Control del odómetro total
• 🔧*Mantenimiento: Registro de reparaciones y mejoras con costes
• ⛽ Repostajes: Registro de combustible con importe y precio por litro
• 🔔 Recordatorios: Gestión de recordatorios de mantenimiento por kilometraje y tiempo

Estados de la autocaravana:
• 🚗 De viaje - Registra ubicación por texto
• 🅿️*En parking - La autocaravana está en un parking
• 🏠 Casa vacaciones - La autocaravana está en una casa de vacaciones
"""
    
    await query.edit_message_text(
        help_text,
        reply_markup=get_main_menu_keyboard()
    )

# Handlers para conversaciones
async def handle_kilometers_input(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Maneja la entrada de kilometraje"""
    try:
        kilometers = int(update.message.text)
        if kilometers < 0:
            await reply_error(update, ERROR_NEGATIVE_NUMBER)
            return ASKING_KILOMETERS
        today = datetime.now().strftime('%Y-%m-%d')
        db.add_odometer_record(today, kilometers)
        await reply_success(update,
            f"✅ Kilometraje registrado\n\n"
            f"Fecha: {datetime.now().strftime('%d/%m/%Y')}\n"
            f"Kilómetros: {kilometers:,} km\n\n"
            f"{SUCCESS_REGISTERED}".replace(',', '.'),
            reply_markup=get_main_menu_keyboard()
        )
        context.user_data.clear()
        return ConversationHandler.END
    except ValueError:
        await reply_error(update, ERROR_INVALID_NUMBER)
        return ASKING_KILOMETERS

async def cancel_conversation(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancela cualquier conversación"""
    context.user_data.clear()
    await reply_error(update, ERROR_CANCELLED, reply_markup=get_main_menu_keyboard())
    return ConversationHandler.END

# Funciones para mantenimiento
async def add_maintenance_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Callback para añadir mantenimiento desde el menú"""
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        "🔧 Registro de Mantenimiento\n\n¿Qué tipo de registro quieres añadir?",
        reply_markup=get_maintenance_type_keyboard()
    )
    return ASKING_MAINTENANCE_TYPE

async def handle_maintenance_type_selection(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Maneja la selección del tipo de mantenimiento"""
    query = update.callback_query
    await query.answer()
    
    maintenance_type = query.data.replace("maintenance_", "")
    context.user_data['maintenance_type'] = maintenance_type
    
    type_name = MAINTENANCE_TYPES.get(maintenance_type, maintenance_type)
    
    await query.edit_message_text(
        f"🔧 **{type_name}**\n\n"
        f"Por favor, describe qué trabajo se realizó:\n\n"
        f"Ejemplo: 'Cambio de aceite y filtro de aire'",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("🔙 Cancelar", callback_data="cancel_maintenance")
        ]])
    )
    
    return ASKING_MAINTENANCE_DESCRIPTION

async def handle_maintenance_description(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Maneja la entrada de la descripción del mantenimiento"""
    description = update.message.text.strip()
    if len(description) < 3:
        await reply_error(update, ERROR_MAINTENANCE_DESC)
        return ASKING_MAINTENANCE_DESCRIPTION
    context.user_data['maintenance_description'] = description
    await reply_success(update,
        "💰 Coste del mantenimiento\n\n"
        "Por favor, introduce el coste en euros (solo números):\n\n"
        "Ejemplo: 150.50\n"
        "Si no hay coste, escribe 0",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("🔙 Cancelar", callback_data="cancel_maintenance")
        ]])
    )
    return ASKING_MAINTENANCE_COST

async def handle_maintenance_cost(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Maneja la entrada del coste del mantenimiento"""
    try:
        cost_text = update.message.text.strip().replace(',', '.')
        cost = float(cost_text)
        if cost < 0:
            await reply_error(update, ERROR_NEGATIVE_NUMBER)
            return ASKING_MAINTENANCE_COST
        today = datetime.now().strftime('%Y-%m-%d')
        maintenance_type = context.user_data.get('maintenance_type')
        description = context.user_data.get('maintenance_description')
        db.add_maintenance_record(today, maintenance_type, description, cost)
        context.user_data.clear()
        type_name = MAINTENANCE_TYPES.get(maintenance_type, maintenance_type)
        cost_text = f" ({cost:.2f}€)" if cost > 0 else " (Sin coste)"
        await reply_success(update,
            f"✅ Mantenimiento registrado\n\n"
            f"Fecha: {datetime.now().strftime('%d/%m/%Y')}\n"
            f"Tipo: {type_name}\n"
            f"Descripción: {description}\n"
            f"Coste: {cost_text}\n\n"
            f"{SUCCESS_REGISTERED}",
            reply_markup=get_main_menu_keyboard()
        )
        return ConversationHandler.END
    except ValueError:
        await reply_error(update, ERROR_INVALID_NUMBER)
        return ASKING_MAINTENANCE_COST

async def cancel_maintenance_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancela la conversación de mantenimiento"""
    query = update.callback_query
    await query.answer()
    
    # Limpiar datos temporales
    context.user_data.clear()
    
    await query.edit_message_text(
        "❌ Registro de mantenimiento cancelado.",
        reply_markup=get_main_menu_keyboard()
    )
    
    return ConversationHandler.END

# Funciones para registro de ubicación
async def add_location_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Callback para añadir ubicación desde el menú de viaje"""
    query = update.callback_query
    await query.answer()
    
    # Guardar que estamos en estado de viaje
    context.user_data['travel_status'] = True
    
    await query.edit_message_text(
        "📍 Registrar Ubicación\n\n"
        "Por favor, escribe tu ubicación actual:\n\n"
        "Ejemplo: 'Madrid, España' o 'Camping Los Pinos, Valencia'",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("🔙 Volver", callback_data="cancel_location")
        ]])
    )
    
    return ASKING_LOCATION

async def handle_location_input(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Maneja la entrada de la ubicación"""
    # Verificar si estamos esperando ubicación desde el menú de estado diario
    if context.user_data.get('waiting_for_location'):
        location = update.message.text.strip()
        if len(location) < 3:
            await reply_error(update, ERROR_LOCATION)
            return ASKING_LOCATION
        today = datetime.now().strftime('%Y-%m-%d')
        status = context.user_data.get('status_to_save', 'travel')
        db.add_daily_record(today, status, location_name=location)
        context.user_data.clear()
        await reply_success(update,
            f"✅ Registro guardado\n\n"
            f"Fecha: {datetime.now().strftime('%d/%m/%Y')}\n"
            f"Estado: De viaje\n"
            f"Ubicación: {location}\n\n"
            f"{SUCCESS_REGISTERED}",
            reply_markup=get_main_menu_keyboard()
        )
        return ConversationHandler.END
    return ConversationHandler.END

async def cancel_location_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancela el registro de ubicación"""
    query = update.callback_query
    await query.answer()
    
    # Limpiar datos temporales
    context.user_data.clear()
    
    await query.edit_message_text(
        "❌ Registro de ubicación cancelado.",
        reply_markup=get_main_menu_keyboard()
    )
    
    return ConversationHandler.END 

# Nuevo handler para mensajes de ubicación GPS
async def handle_gps_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Maneja la ubicación GPS enviada por el usuario"""
    if update.message.location:
        lat = update.message.location.latitude
        lon = update.message.location.longitude
        today = datetime.now().strftime('%Y-%m-%d')
        # Guardar como texto "lat,lon"
        db.add_daily_record(today, 'travel', location_name=f"{lat},{lon}")
        await update.message.reply_text(
            f"✅ Ubicación registrada\n\n"
            f"Fecha: {datetime.now().strftime('%d/%m/%Y')}\n"
            f"Estado: De viaje\n"
            f"Ubicación: [Ver en mapa](https://maps.google.com/?q={lat},{lon})\n\n"
            "✅ Registro completado correctamente."
        )
        return ConversationHandler.END
    else:
        await update.message.reply_text(
            "❌ No se recibió la ubicación. Por favor, escribe la ubicación manualmente."
        )
        return ASKING_LOCATION

# Funciones para manejar repostajes
async def add_fuel_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Callback para añadir repostaje desde el menú"""
    # Determinar si es un comando o un callback
    if update.callback_query:
        await update.callback_query.answer()
        await update.callback_query.edit_message_text(
            "⛽ Registrar Repostaje\n\nPor favor, introduce el importe del repostaje en euros:"
        )
    else:
        await update.message.reply_text(
            "⛽ Registrar Repostaje\n\nPor favor, introduce el importe del repostaje en euros:"
        )
    return ASKING_FUEL_AMOUNT

async def handle_fuel_amount(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Maneja la entrada del importe del repostaje"""
    try:
        amount = float(update.message.text.replace(',', '.'))
        if amount <= 0:
            await reply_error(update, ERROR_NEGATIVE_NUMBER)
            return ASKING_FUEL_AMOUNT
        context.user_data['fuel_amount'] = amount
        await reply_success(update,
            f"✅ Importe registrado: {amount:.2f}€\n\nAhora introduce el precio por litro en euros:")
        return ASKING_FUEL_PRICE
    except ValueError:
        await reply_error(update, ERROR_INVALID_NUMBER)
        return ASKING_FUEL_AMOUNT

async def handle_fuel_price(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Maneja la entrada del precio por litro"""
    try:
        price = float(update.message.text.replace(',', '.'))
        if price <= 0:
            await reply_error(update, ERROR_NEGATIVE_NUMBER)
            return ASKING_FUEL_PRICE
        amount = context.user_data.get('fuel_amount', 0)
        liters = amount / price
        today = datetime.now().strftime('%Y-%m-%d')
        db.add_fuel_record(today, amount, price)
        context.user_data.clear()
        await reply_success(update,
            f"✅ Repostaje registrado\n\n"
            f"Fecha: {datetime.now().strftime('%d/%m/%Y')}\n"
            f"Importe del repostaje: {amount:.2f}€\n"
            f"Precio por litro: {price:.3f}€/L\n"
            f"Litros repostados: {liters:.2f}L\n\n"
            f"{SUCCESS_REGISTERED}",
            reply_markup=get_main_menu_keyboard()
        )
        return ConversationHandler.END
    except ValueError:
        await reply_error(update, ERROR_INVALID_NUMBER)
        return ASKING_FUEL_PRICE

async def cancel_fuel_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancela la conversación de repostaje"""
    context.user_data.clear()
    await update.callback_query.answer()
    await update.callback_query.edit_message_text(
        SUCCESS_CANCELLED,
        reply_markup=get_main_menu_keyboard()
    )
    return ConversationHandler.END
# Handler global de errores
async def error_handler(update, context):
    logging.error(msg="Exception while handling an update:", exc_info=context.error)
    if update and hasattr(update, 'message') and update.message:
        await reply_error(update, "❌ Ha ocurrido un error inesperado. Intenta de nuevo más tarde.")

async def show_reminders_menu(query) -> None:
    """Muestra el menú de recordatorios de mantenimiento"""
    reminders = db.get_maintenance_reminders(status='active')
    current_odometer = db.get_current_odometer()
    
    text = "🔔 Recordatorios de Mantenimiento\n\n"
    
    if not reminders:
        text += "✅ No hay recordatorios activos.\n\n"
        text += "Puedes crear recordatorios para:\n"
        text += "• Cambio de aceite (cada 10.000 km)\n"
        text += "• Filtros de aire (cada 15.000 km)\n"
        text += "• ITV anual\n"
        text += "• Mantenimientos personalizados\n"
    else:
        text += "📋 Recordatorios activos:\n\n"
        
        for reminder in reminders:
            emoji = "🛣️" if reminder['type'] == 'km' else "📅"
            text += f"{emoji} **{reminder['description']}**\n"
            
            if reminder['type'] == 'km' and current_odometer:
                km_remaining = reminder['next_due_km'] - current_odometer
                if km_remaining <= 0:
                    text += f"   ⚠️ **¡VENCIDO!** ({abs(km_remaining):,} km de retraso)\n".replace(',', '.')
                else:
                    text += f"   📍 {km_remaining:,} km restantes\n".replace(',', '.')
            elif reminder['type'] == 'time' and reminder['next_due_date']:
                from datetime import datetime
                due_date = datetime.strptime(reminder['next_due_date'], '%Y-%m-%d')
                today = datetime.now()
                days_remaining = (due_date - today).days
                
                if days_remaining <= 0:
                    text += f"   ⚠️ **¡VENCIDO!** ({abs(days_remaining)} días de retraso)\n"
                else:
                    text += f"   📅 {days_remaining} días restantes\n"
            
            text += "\n"
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("➕ Añadir recordatorio", callback_data="add_reminder")],
        [InlineKeyboardButton("✅ Marcar completado", callback_data="complete_reminder")],
        [InlineKeyboardButton("📋 Ver todos", callback_data="list_reminders")],
        [InlineKeyboardButton("🔙 Volver", callback_data="main_menu")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard) 

async def show_reminders_list(query) -> None:
    """Muestra la lista completa de recordatorios"""
    reminders = db.get_maintenance_reminders()
    if not reminders:
        await query.edit_message_text(
            "🔔 Recordatorios de Mantenimiento\n\nNo hay recordatorios registrados.",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]
            ])
        )
        return
    text = "🔔 Todos los Recordatorios\n\n"
    for reminder in reminders:
        emoji = "🛣️" if reminder['type'] == 'km' else "📅"
        status_emoji = "✅" if reminder['status'] == 'completed' else "⚠️" if reminder['status'] == 'overdue' else "⏳"
        text += f"{emoji} {reminder['description']} {status_emoji}\n"
        if reminder['type'] == 'km':
            if reminder['last_done_km']:
                text += f"   Último: {reminder['last_done_km']:,} km\n".replace(',', '.')
            if reminder['next_due_km']:
                text += f"   Próximo: {reminder['next_due_km']:,} km\n".replace(',', '.')
        elif reminder['type'] == 'time':
            from datetime import datetime
            if reminder['last_done_date']:
                last_date = datetime.strptime(reminder['last_done_date'], '%Y-%m-%d').strftime('%d-%m-%Y')
                text += f"   Último: {last_date}\n"
            if reminder['next_due_date']:
                next_date = datetime.strptime(reminder['next_due_date'], '%Y-%m-%d').strftime('%d-%m-%Y')
                text += f"   Próximo: {next_date}\n"
        text += f"   Frecuencia: {reminder['frequency']}\n\n"
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]
    ])
    await query.edit_message_text(text, reply_markup=keyboard)

async def show_complete_reminder_menu(query) -> None:
    """Muestra el menú para marcar recordatorios como completados"""
    reminders = db.get_maintenance_reminders(status='active')
    if not reminders:
        await query.edit_message_text(
            "✅ No hay recordatorios activos para marcar como completados.",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]
            ])
        )
        return
    text = "✅ Marcar como Completado\n\nSelecciona el recordatorio que has completado:\n\n"
    keyboard_buttons = []
    for reminder in reminders:
        emoji = "🛣️" if reminder['type'] == 'km' else "📅"
        button_text = f"{emoji} {reminder['description']}"
        callback_data = f"complete_reminder_{reminder['id']}"
        keyboard_buttons.append([InlineKeyboardButton(button_text, callback_data=callback_data)])
    keyboard_buttons.append([InlineKeyboardButton("🔙 Volver", callback_data="reminders")])
    keyboard = InlineKeyboardMarkup(keyboard_buttons)
    await query.edit_message_text(text, reply_markup=keyboard)

async def handle_complete_reminder(update, context):
    query = update.callback_query
    await query.answer()
    data = query.data
    if data.startswith("complete_reminder_"):
        reminder_id = int(data.split('_')[-1])
        # Guardar el ID del recordatorio en el contexto
        context.user_data['completing_reminder_id'] = reminder_id
        # Obtener información del recordatorio
        reminders = db.get_maintenance_reminders()
        reminder = next((r for r in reminders if r['id'] == reminder_id), None)
        if not reminder:
            await query.edit_message_text(
                "❌ Recordatorio no encontrado.",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]
                ])
            )
            return
        context.user_data['completing_reminder'] = reminder
        # Preguntar fecha de completado
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("✅ Hoy", callback_data="completion_today")],
            [InlineKeyboardButton("📅 Otra fecha", callback_data="completion_other_date")],
            [InlineKeyboardButton("🔙 Volver", callback_data="complete_reminder")]
        ])
        await query.edit_message_text(
            f"¿Cuándo completaste **{reminder['description']}**?",
            reply_markup=keyboard
        )
        return ASKING_COMPLETION_DATE

async def handle_completion_date(update, context):
    if update.callback_query:
        query = update.callback_query
        await query.answer()
        data = query.data
        if data == "completion_today":
            from datetime import datetime
            completion_date = datetime.now().strftime('%Y-%m-%d')
            await complete_reminder_with_date(update, context, completion_date)
        elif data == "completion_other_date":
            await query.edit_message_text(
                "Introduce la fecha de completado en formato DD-MM-AAAA (por ejemplo: 15-07-2024):",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🔙 Volver", callback_data="complete_reminder")]
                ])
            )
            return ASKING_COMPLETION_DATE
    else:
        # Usuario introdujo fecha manualmente
        completion_date_text = update.message.text.strip()
        try:
            from datetime import datetime
            completion_date_obj = datetime.strptime(completion_date_text, '%d-%m-%Y')
            completion_date = completion_date_obj.strftime('%Y-%m-%d')
            await complete_reminder_with_date(update, context, completion_date)
        except Exception:
            await update.message.reply_text(
                "❌ Formato de fecha incorrecto. Introduce la fecha en formato DD-MM-AAAA (por ejemplo: 15-07-2024):",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🔙 Volver", callback_data="complete_reminder")]
                ])
            )
            return ASKING_COMPLETION_DATE

async def complete_reminder_with_date(update, context, completion_date):
    reminder = context.user_data.get('completing_reminder')
    reminder_id = context.user_data.get('completing_reminder_id')
    if not reminder or not reminder_id:
        await (update.callback_query.edit_message_text if update.callback_query else update.message.reply_text)(
            "❌ Error: Recordatorio no encontrado.",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]
            ])
        )
        return ConversationHandler.END
    # Calcular próxima fecha
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    completion_date_obj = datetime.strptime(completion_date, '%Y-%m-%d')
    if reminder['type'] == 'km':
        # Para recordatorios por kilometraje, actualizar kilometraje
        current_odometer = db.get_current_odometer() or 0
        next_due_km = current_odometer + reminder['frequency']
        db.update_maintenance_reminder(
            reminder_id, 
            status='completed',
            last_done_km=current_odometer,
            next_due_km=next_due_km
        )
        completion_display = completion_date_obj.strftime('%d-%m-%Y')
        resumen = f"✅ **{reminder['description']}** marcado como completado.\n\nFecha de completado: {completion_display}\nPróximo mantenimiento: {next_due_km:,} km".replace(',', '.')
    else:
        # Para recordatorios por tiempo, calcular próxima fecha
        next_due_date_obj = completion_date_obj + relativedelta(months=reminder['frequency'])
        next_due_date = next_due_date_obj.strftime('%Y-%m-%d')
        db.update_maintenance_reminder(
            reminder_id, 
            status='completed',
            last_done_date=completion_date,
            next_due_date=next_due_date
        )
        completion_display = completion_date_obj.strftime('%d-%m-%Y')
        next_due_display = next_due_date_obj.strftime('%d-%m-%Y')
        resumen = f"✅ **{reminder['description']}** marcado como completado.\n\nFecha de completado: {completion_display}\nPróximo mantenimiento: {next_due_display}"
    # Limpiar datos temporales
    context.user_data.clear()
    # Mostrar resumen y luego el menú de recordatorios para evitar botones inactivos
    if update.callback_query:
        await update.callback_query.edit_message_text(resumen)
        await show_reminders_menu(update.callback_query)
    else:
        await update.message.reply_text(resumen)
    return ConversationHandler.END

# Sugerencias típicas
REMINDER_KM_TEMPLATES = [
    ("Cambio de aceite", 10000),
    ("Filtros de aire", 15000),
    ("Filtros de combustible", 20000),
    ("Neumáticos", 50000),
    ("Otro", None)
]
REMINDER_TIME_TEMPLATES = [
    ("ITV", 12),
    ("Seguro", 12),
    ("Revisión general", 12),
    ("Otro", None)
]

async def add_reminder_callback(update, context):
    import logging
    query = update.callback_query
    await query.answer()
    logging.info("add_reminder_callback: mostrando menú de tipo de recordatorio")
    # Preguntar tipo de recordatorio
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛣️ Por kilometraje", callback_data="reminder_type_km")],
        [InlineKeyboardButton("📅 Por tiempo", callback_data="reminder_type_time")],
        [InlineKeyboardButton("🔧 Personalizado", callback_data="reminder_type_custom")],
        [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]
    ])
    await query.edit_message_text(
        "➕ Añadir Recordatorio\n\n¿Qué tipo de recordatorio quieres crear?",
        reply_markup=keyboard
    )
    logging.info("add_reminder_callback: retornando estado ASKING_REMINDER_TYPE")
    return ASKING_REMINDER_TYPE

async def handle_reminder_type(update, context):
    import logging
    query = update.callback_query
    await query.answer()
    t = query.data
    context.user_data['reminder_type'] = t
    logging.info(f"handle_reminder_type: tipo seleccionado: {t}")
    if t == "reminder_type_km":
        # Sugerir plantillas por km, manejando el caso 'Otro' (km=None)
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton(
                f"{name} ({km:,} km)".replace(',', '.') if km is not None else name,
                callback_data=f"template_km_{i}")]
            for i, (name, km) in enumerate(REMINDER_KM_TEMPLATES)
        ] + [[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
        await query.edit_message_text(
            "¿Qué mantenimiento quieres registrar?",
            reply_markup=keyboard
        )
        logging.info("handle_reminder_type: retornando estado ASKING_REMINDER_TEMPLATE")
        return ASKING_REMINDER_TEMPLATE
    elif t == "reminder_type_time":
        # Sugerir plantillas por tiempo
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton(f"{name} ({months} meses)" if months else name, callback_data=f"template_time_{i}")]
            for i, (name, months) in enumerate(REMINDER_TIME_TEMPLATES)
        ] + [[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
        await query.edit_message_text(
            "¿Qué mantenimiento quieres registrar?",
            reply_markup=keyboard
        )
        logging.info("handle_reminder_type: retornando estado ASKING_REMINDER_TEMPLATE")
        return ASKING_REMINDER_TEMPLATE
    else:
        # Personalizado
        await query.edit_message_text(
            "Escribe una breve descripción del recordatorio:",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
        )
        logging.info("handle_reminder_type: retornando estado ASKING_REMINDER_DESCRIPTION")
        return ASKING_REMINDER_DESCRIPTION

async def handle_reminder_template(update, context):
    query = update.callback_query
    await query.answer()
    t = context.user_data.get('reminder_type')
    idx = int(query.data.split('_')[-1])
    if t == "reminder_type_km":
        name, km = REMINDER_KM_TEMPLATES[idx]
        context.user_data['reminder_description'] = name
        context.user_data['reminder_frequency'] = km
        if name == "Otro":
            await query.edit_message_text(
                "Escribe una breve descripción del recordatorio:",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
            return ASKING_REMINDER_DESCRIPTION
        else:
            await query.edit_message_text(
                f"¿Cada cuántos kilómetros quieres que se repita? (por defecto: {km:,} km)",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("Usar valor por defecto", callback_data="use_default_km")],
                    [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]
                ])
            )
            return ASKING_REMINDER_FREQUENCY
    elif t == "reminder_type_time":
        name, months = REMINDER_TIME_TEMPLATES[idx]
        context.user_data['reminder_description'] = name
        context.user_data['reminder_frequency'] = months
        if name == "Otro":
            await query.edit_message_text(
                "Escribe una breve descripción del recordatorio:",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
            return ASKING_REMINDER_DESCRIPTION
        else:
            await query.edit_message_text(
                f"¿Cada cuántos meses quieres que se repita? (por defecto: {months} meses)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("Usar valor por defecto", callback_data="use_default_time")], [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
            return ASKING_REMINDER_FREQUENCY

async def handle_reminder_description(update, context):
    desc = update.message.text.strip()
    context.user_data['reminder_description'] = desc
    t = context.user_data['reminder_type']
    if t == "reminder_type_km":
        await update.message.reply_text(
            "¿Cada cuántos kilómetros quieres que se repita?",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
        )
        return ASKING_REMINDER_FREQUENCY
    elif t == "reminder_type_time":
        await update.message.reply_text(
            "¿Cada cuántos meses quieres que se repita?",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
        )
        return ASKING_REMINDER_FREQUENCY
    else:
        # Personalizado: preguntar tipo de frecuencia
        await update.message.reply_text(
            "¿La frecuencia será por kilómetros, por tiempo o ambos? (escribe 'km', 'meses' o 'ambos')",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
        )
        context.user_data['custom_reminder_step'] = 'ask_type'
        return ASKING_REMINDER_FREQUENCY

async def handle_reminder_frequency(update, context):
    t = context.user_data.get('reminder_type')
    # Personalizado: gestionar pasos
    if t == "reminder_type_custom" and context.user_data.get('custom_reminder_step'):
        step = context.user_data['custom_reminder_step']
        user_input = update.message.text.strip().lower() if update.message else None
        if step == 'ask_type':
            if user_input in ['km', 'kilometros', 'kilómetros']:
                context.user_data['custom_reminder_kind'] = 'km'
                context.user_data['custom_reminder_step'] = 'ask_km_freq'
                await update.message.reply_text(
                    "¿Cada cuántos kilómetros quieres que se repita?",
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
                )
                return ASKING_REMINDER_FREQUENCY
            elif user_input in ['meses', 'mes', 'tiempo']:
                context.user_data['custom_reminder_kind'] = 'meses'
                context.user_data['custom_reminder_step'] = 'ask_month_freq'
                await update.message.reply_text(
                    "¿Cada cuántos meses quieres que se repita?",
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
                )
                return ASKING_REMINDER_FREQUENCY
            elif user_input == 'ambos':
                context.user_data['custom_reminder_kind'] = 'ambos'
                context.user_data['custom_reminder_step'] = 'ask_km_freq_ambos'
                await update.message.reply_text(
                    "¿Cada cuántos kilómetros quieres que se repita?",
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
                )
                return ASKING_REMINDER_FREQUENCY
            else:
                await update.message.reply_text("Por favor, escribe 'km', 'meses' o 'ambos'.")
                return ASKING_REMINDER_FREQUENCY
        elif step == 'ask_km_freq':
            try:
                freq = int(update.message.text.strip())
                if freq <= 0:
                    raise ValueError()
            except Exception:
                await update.message.reply_text("Por favor, introduce un número válido y mayor que cero.")
                return ASKING_REMINDER_FREQUENCY
            context.user_data['reminder_frequency'] = freq
            # Preguntar último realizado (km)
            await update.message.reply_text(
                "¿Cuándo fue el último mantenimiento? (escribe el número de kilómetros o deja vacío si no lo recuerdas)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("No lo recuerdo", callback_data="no_last_done")], [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
            # Limpiar paso
            context.user_data.pop('custom_reminder_step', None)
            return ASKING_REMINDER_LAST_DONE
        elif step == 'ask_month_freq':
            try:
                freq = int(update.message.text.strip())
                if freq <= 0:
                    raise ValueError()
            except Exception:
                await update.message.reply_text("Por favor, introduce un número válido y mayor que cero.")
                return ASKING_REMINDER_FREQUENCY
            context.user_data['reminder_frequency'] = freq
            # Preguntar último realizado (meses)
            await update.message.reply_text(
                "¿Cuándo fue el último mantenimiento? (escribe la fecha en formato DD-MM-AAAA o deja vacío si no lo recuerdas)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("No lo recuerdo", callback_data="no_last_done")], [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
            context.user_data.pop('custom_reminder_step', None)
            return ASKING_REMINDER_LAST_DONE
        elif step == 'ask_km_freq_ambos':
            try:
                freq_km = int(update.message.text.strip())
                if freq_km <= 0:
                    raise ValueError()
            except Exception:
                await update.message.reply_text("Por favor, introduce un número válido y mayor que cero.")
                return ASKING_REMINDER_FREQUENCY
            context.user_data['reminder_frequency_km'] = freq_km
            context.user_data['custom_reminder_step'] = 'ask_month_freq_ambos'
            await update.message.reply_text(
                "¿Cada cuántos meses quieres que se repita?",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
            return ASKING_REMINDER_FREQUENCY
        elif step == 'ask_month_freq_ambos':
            try:
                freq_month = int(update.message.text.strip())
                if freq_month <= 0:
                    raise ValueError()
            except Exception:
                await update.message.reply_text("Por favor, introduce un número válido y mayor que cero.")
                return ASKING_REMINDER_FREQUENCY
            context.user_data['reminder_frequency_month'] = freq_month
            # Preguntar último realizado (ambos)
            await update.message.reply_text(
                "¿Cuándo fue el último mantenimiento? (escribe el número de kilómetros, la fecha en formato DD-MM-AAAA, o ambos separados por coma. Ejemplo: 50000, 01-08-2025)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("No lo recuerdo", callback_data="no_last_done")], [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
            context.user_data.pop('custom_reminder_step', None)
            return ASKING_REMINDER_LAST_DONE
    # Fin personalizado
    # ---
    if update.callback_query:
        query = update.callback_query
        await query.answer()
        if query.data == "use_default_km":
            freq = context.user_data.get('reminder_frequency')
        elif query.data == "use_default_time":
            freq = context.user_data.get('reminder_frequency')
        else:
            freq = None
        context.user_data['reminder_frequency'] = freq
        # Preguntar último realizado
        if t == "reminder_type_km":
            await query.edit_message_text(
                "¿Cuándo fue el último mantenimiento? (escribe el número de kilómetros o deja vacío si no lo recuerdas)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("No lo recuerdo", callback_data="no_last_done")], [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
        else:
            await query.edit_message_text(
                "¿Cuándo fue el último mantenimiento? (escribe la fecha en formato DD-MM-AAAA o deja vacío si no lo recuerdas)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("No lo recuerdo", callback_data="no_last_done")], [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
        return ASKING_REMINDER_LAST_DONE
    else:
        freq = update.message.text.strip()
        try:
            freq = int(freq)
            if freq <= 0:
                raise ValueError()
        except Exception:
            await update.message.reply_text("Por favor, introduce un número válido y mayor que cero.")
            return ASKING_REMINDER_FREQUENCY
        context.user_data['reminder_frequency'] = freq
        # Preguntar último realizado
        if t == "reminder_type_km":
            await update.message.reply_text(
                "¿Cuándo fue el último mantenimiento? (escribe el número de kilómetros o deja vacío si no lo recuerdas)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("No lo recuerdo", callback_data="no_last_done")], [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
        else:
            await update.message.reply_text(
                "¿Cuándo fue el último mantenimiento? (escribe la fecha en formato DD-MM-AAAA o deja vacío si no lo recuerdas)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("No lo recuerdo", callback_data="no_last_done")], [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]])
            )
        return ASKING_REMINDER_LAST_DONE

async def handle_reminder_last_done(update, context):
    t = context.user_data['reminder_type']
    # Personalizado: ambos
    if t == "reminder_type_custom" and context.user_data.get('custom_reminder_kind') == 'ambos':
        if update.callback_query:
            query = update.callback_query
            await query.answer()
            last_done = None
        else:
            last_done = update.message.text.strip()
            if not last_done:
                last_done = None
        desc = context.user_data['reminder_description']
        freq_km = context.user_data['reminder_frequency_km']
        freq_month = context.user_data['reminder_frequency_month']
        # Parsear ambos valores
        last_done_km = None
        last_done_date = None
        from datetime import datetime
        from dateutil.relativedelta import relativedelta
        if last_done:
            # Permitir "km, fecha" o solo uno
            parts = [p.strip() for p in last_done.split(',')]
            for p in parts:
                if p.isdigit():
                    last_done_km = int(p)
                else:
                    try:
                        last_done_date_obj = datetime.strptime(p, '%d-%m-%Y')
                        last_done_date = last_done_date_obj.strftime('%Y-%m-%d')
                    except Exception:
                        pass
        if last_done_km is None:
            last_done_km = db.get_current_odometer() or 0
        if last_done_date is None:
            last_done_date_obj = datetime.now()
            last_done_date = last_done_date_obj.strftime('%Y-%m-%d')
        next_due_km = last_done_km + freq_km
        next_due_date_obj = datetime.strptime(last_done_date, '%Y-%m-%d') + relativedelta(months=freq_month)
        next_due_date = next_due_date_obj.strftime('%Y-%m-%d')
        context.user_data['last_done_km'] = last_done_km
        context.user_data['next_due_km'] = next_due_km
        context.user_data['last_done_date'] = last_done_date
        context.user_data['next_due_date'] = next_due_date
        # Resumen
        last_done_display = datetime.strptime(last_done_date, '%Y-%m-%d').strftime('%d-%m-%Y')
        next_due_display = next_due_date_obj.strftime('%d-%m-%Y')
        resumen = f"{desc} cada {freq_km:,} km y cada {freq_month} meses\nÚltimo: {last_done_km:,} km, {last_done_display}\nPróximo: {next_due_km:,} km, {next_due_display}".replace(',', '.')
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("✅ Confirmar y guardar", callback_data="confirm_reminder")],
            [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]
        ])
        await (update.callback_query.edit_message_text if update.callback_query else update.message.reply_text)(
            f"¿Quieres guardar este recordatorio?\n\n{resumen}",
            reply_markup=keyboard
        )
        return CONFIRM_REMINDER
    # ---
    if update.callback_query:
        query = update.callback_query
        await query.answer()
        last_done = None
    else:
        last_done = update.message.text.strip()
        if not last_done:
            last_done = None
    # Guardar y calcular próximo
    desc = context.user_data['reminder_description']
    freq = context.user_data.get('reminder_frequency')
    if t == "reminder_type_km" or (t == "reminder_type_custom" and context.user_data.get('custom_reminder_kind') == 'km'):
        if last_done:
            try:
                last_done_km = int(last_done)
            except Exception:
                await update.message.reply_text("Por favor, introduce un número válido de kilómetros.")
                return ASKING_REMINDER_LAST_DONE
        else:
            last_done_km = db.get_current_odometer() or 0
        next_due_km = last_done_km + freq
        context.user_data['last_done_km'] = last_done_km
        context.user_data['next_due_km'] = next_due_km
        resumen = f"{desc} cada {freq:,} km\nÚltimo: {last_done_km:,} km\nPróximo: {next_due_km:,} km".replace(',', '.')
    elif t == "reminder_type_time" or (t == "reminder_type_custom" and context.user_data.get('custom_reminder_kind') == 'meses'):
        from datetime import datetime
        from dateutil.relativedelta import relativedelta
        if last_done:
            # Validar formato DD-MM-AAAA
            try:
                last_done_date_obj = datetime.strptime(last_done, '%d-%m-%Y')
                last_done_date = last_done_date_obj.strftime('%Y-%m-%d')
            except Exception:
                await update.message.reply_text("Por favor, introduce la fecha en formato DD-MM-AAAA (por ejemplo: 15-07-2024).")
                return ASKING_REMINDER_LAST_DONE
        else:
            last_done_date_obj = datetime.now()
            last_done_date = last_done_date_obj.strftime('%Y-%m-%d')
        next_due_date_obj = last_done_date_obj + relativedelta(months=freq)
        next_due_date = next_due_date_obj.strftime('%Y-%m-%d')
        context.user_data['last_done_date'] = last_done_date
        context.user_data['next_due_date'] = next_due_date
        # Formatear fechas para mostrar en DD-MM-AAAA
        last_done_display = last_done_date_obj.strftime('%d-%m-%Y')
        next_due_display = next_due_date_obj.strftime('%d-%m-%Y')
        resumen = f"{desc} cada {freq} meses\nÚltimo: {last_done_display}\nPróximo: {next_due_display}"
    # Confirmar
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Confirmar y guardar", callback_data="confirm_reminder")],
        [InlineKeyboardButton("🔙 Volver", callback_data="reminders")]
    ])
    await (update.callback_query.edit_message_text if update.callback_query else update.message.reply_text)(
        f"¿Quieres guardar este recordatorio?\n\n{resumen}",
        reply_markup=keyboard
    )
    return CONFIRM_REMINDER

async def handle_reminder_confirm(update, context):
    query = update.callback_query
    await query.answer()
    t = context.user_data['reminder_type']
    desc = context.user_data['reminder_description']
    # Personalizado ambos
    if t == "reminder_type_custom" and context.user_data.get('custom_reminder_kind') == 'ambos':
        freq_km = context.user_data['reminder_frequency_km']
        freq_month = context.user_data['reminder_frequency_month']
        last_done_km = context.user_data['last_done_km']
        next_due_km = context.user_data['next_due_km']
        last_done_date = context.user_data['last_done_date']
        next_due_date = context.user_data['next_due_date']
        # Guardar dos recordatorios: uno por km y otro por meses
        db.add_maintenance_reminder('km', desc, freq_km, last_done_km=last_done_km, next_due_km=next_due_km)
        db.add_maintenance_reminder('time', desc, freq_month, last_done_date=last_done_date, next_due_date=next_due_date)
    elif t == "reminder_type_km" or (t == "reminder_type_custom" and context.user_data.get('custom_reminder_kind') == 'km'):
        freq = context.user_data['reminder_frequency']
        last_done_km = context.user_data['last_done_km']
        next_due_km = context.user_data['next_due_km']
        db.add_maintenance_reminder('km', desc, freq, last_done_km=last_done_km, next_due_km=next_due_km)
    else:
        freq = context.user_data['reminder_frequency']
        last_done_date = context.user_data['last_done_date']
        next_due_date = context.user_data['next_due_date']
        db.add_maintenance_reminder('time', desc, freq, last_done_date=last_done_date, next_due_date=next_due_date)
    context.user_data.clear()
    await query.edit_message_text(
        "✅ Recordatorio guardado correctamente.",
        reply_markup=get_main_menu_keyboard()
    )
    return ConversationHandler.END