"""
Bot de Autocaravana - Archivo Principal
"""
import asyncio
import logging
import nest_asyncio
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ConversationHandler
from telegram import BotCommand, Update

# Aplicar nest_asyncio para resolver problemas de event loop
nest_asyncio.apply()

from config import config
from database import db
from handlers import (
    start_command, help_command, daily_command, km_command, 
    maintenance_command, stats_command, button_callback,
    handle_kilometers_input, cancel_conversation, ASKING_KILOMETERS,
    add_kilometers_callback, add_maintenance_callback, handle_maintenance_type_selection,
    handle_maintenance_description, handle_maintenance_cost, cancel_maintenance_callback,
    ASKING_MAINTENANCE_TYPE, ASKING_MAINTENANCE_DESCRIPTION, ASKING_MAINTENANCE_COST,
    add_location_callback, handle_location_input, cancel_location_callback, ASKING_LOCATION,
    menu_command, handle_gps_location, add_fuel_callback, handle_fuel_amount, 
    handle_fuel_price, cancel_fuel_callback, ASKING_FUEL_AMOUNT, ASKING_FUEL_PRICE
)
from scheduler import DailyReminderScheduler

# Configurar logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Variable global para el scheduler
daily_scheduler = None

async def setup_commands(application: Application):
    """Configura los comandos del bot"""
    await application.bot.set_my_commands([
        BotCommand("menu", "Menú principal"),
        BotCommand("start", "Reiniciar bot"),
        BotCommand("daily", "Registro manual del estado diario"),
        BotCommand("km", "Registrar kilometraje"),
        BotCommand("maintenance", "Registrar mantenimiento"),
        BotCommand("fuel", "Registrar repostaje"),
        BotCommand("stats", "Ver estadísticas"),
        BotCommand("help", "Ayuda")
    ])

def setup_handlers(application: Application):
    """Configura todos los handlers del bot"""
    
    # Handler para mensajes de ubicación GPS (debe ir PRIMERO)
    application.add_handler(MessageHandler(filters.LOCATION, handle_gps_location))
    
    # Handlers de comandos
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("menu", menu_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("daily", daily_command))
    application.add_handler(CommandHandler("stats", stats_command))
    application.add_handler(CommandHandler("maintenance", maintenance_command))
    application.add_handler(CommandHandler("fuel", add_fuel_callback))
    
    # Handler de conversación para kilometraje
    km_conversation = ConversationHandler(
        entry_points=[
            CommandHandler("km", km_command),
            CallbackQueryHandler(add_kilometers_callback, pattern="^add_kilometers$")
        ],
        states={
            ASKING_KILOMETERS: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_kilometers_input)
            ]
        },
        fallbacks=[CommandHandler("cancel", cancel_conversation)]
    )
    application.add_handler(km_conversation)
    
    # Handler de conversación para mantenimiento
    maintenance_conversation = ConversationHandler(
        entry_points=[
            CommandHandler("maintenance", maintenance_command),
            CallbackQueryHandler(add_maintenance_callback, pattern="^add_maintenance$")
        ],
        states={
            ASKING_MAINTENANCE_TYPE: [
                CallbackQueryHandler(handle_maintenance_type_selection, pattern="^maintenance_"),
                CallbackQueryHandler(cancel_maintenance_callback, pattern="^cancel_maintenance$")
            ],
            ASKING_MAINTENANCE_DESCRIPTION: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_maintenance_description),
                CallbackQueryHandler(cancel_maintenance_callback, pattern="^cancel_maintenance$")
            ],
            ASKING_MAINTENANCE_COST: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_maintenance_cost),
                CallbackQueryHandler(cancel_maintenance_callback, pattern="^cancel_maintenance$")
            ]
        },
        fallbacks=[CommandHandler("cancel", cancel_conversation)]
    )
    application.add_handler(maintenance_conversation)
    
    # Handler de conversación para ubicación
    location_conversation = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(add_location_callback, pattern="^add_location$")
        ],
        states={
            ASKING_LOCATION: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_location_input),
                CallbackQueryHandler(cancel_location_callback, pattern="^cancel_location$")
            ]
        },
        fallbacks=[CommandHandler("cancel", cancel_conversation)]
    )
    application.add_handler(location_conversation)
    
    # Handler de conversación para repostajes
    fuel_conversation = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(add_fuel_callback, pattern="^add_fuel$")
        ],
        states={
            ASKING_FUEL_AMOUNT: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_fuel_amount),
                CallbackQueryHandler(cancel_fuel_callback, pattern="^cancel_fuel$")
            ],
            ASKING_FUEL_PRICE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_fuel_price),
                CallbackQueryHandler(cancel_fuel_callback, pattern="^cancel_fuel$")
            ]
        },
        fallbacks=[CommandHandler("cancel", cancel_conversation)]
    )
    application.add_handler(fuel_conversation)
    
    # Handler adicional para manejar texto cuando esperamos ubicación desde estado diario
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_location_input))
    
    # Handler de callbacks de botones
    application.add_handler(CallbackQueryHandler(button_callback))

async def on_start(update, context):
    """Callback cuando un usuario inicia el bot"""
    global daily_scheduler
    
    if daily_scheduler and update.effective_user:
        # Configurar el chat_id para el scheduler
        daily_scheduler.set_chat_id(update.effective_chat.id)
        logger.info(f"Chat ID configurado para recordatorios: {update.effective_chat.id}")

async def main():
    """Función principal del bot"""
    global daily_scheduler
    
    print("🚐 Iniciando Bot de Autocaravana...")
    
    # Crear aplicación
    application = Application.builder().token(config.TELEGRAM_TOKEN).build()
    
    # Configurar handlers
    setup_handlers(application)
    
    # Configurar comandos
    await setup_commands(application)
    
    # Configurar callback para cuando se inicia el bot
    # Nota: start_command ya maneja el callback, no necesitamos duplicar
    
    # Inicializar scheduler
    daily_scheduler = DailyReminderScheduler(application.bot)
    daily_scheduler.start()
    
    # Configurar chat_id cuando se inicie el bot
    # Esto se hará en el primer /start
    
    print("✅ Bot configurado correctamente")
    print("📅 Recordatorio diario programado a las 09:00 AM")
    print("🚀 Bot iniciado - Esperando mensajes...")
    
    # Iniciar el bot
    await application.run_polling()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Bot detenido por el usuario")
        if daily_scheduler:
            daily_scheduler.stop()
    except Exception as e:
        print(f"❌ Error en el bot: {e}")
        if daily_scheduler:
            daily_scheduler.stop() 