"""
Scheduler para recordatorios automáticos del Bot de Autocaravana
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from telegram import Bot
from config import config
from database import db
from handlers import get_daily_status_keyboard, STATUS_NAMES, STATUS_EMOJIS

class DailyReminderScheduler:
    def __init__(self, bot: Bot):
        self.bot = bot
        self.scheduler = AsyncIOScheduler()
        self.chat_id = None
    
    def set_chat_id(self, chat_id: int):
        self.chat_id = chat_id
    
    def start(self):
        self.scheduler.add_job(
            self.send_daily_reminder,
            CronTrigger(
                hour=config.DAILY_REMINDER_TIME.hour,
                minute=config.DAILY_REMINDER_TIME.minute,
                timezone=config.TIMEZONE
            ),
            id='daily_reminder',
            name='Recordatorio diario de autocaravana',
            replace_existing=True
        )
        self.scheduler.start()
        print(f"✅ Scheduler iniciado - Recordatorio diario a las {config.DAILY_REMINDER_TIME.strftime('%H:%M')}")

    def stop(self):
        self.scheduler.shutdown()
        print("🛑 Scheduler detenido")
    
    async def send_daily_reminder(self):
        if not self.chat_id:
            print("⚠️ No hay chat_id configurado para enviar recordatorio")
            return
        
        today = datetime.now().strftime('%Y-%m-%d')
        existing_record = db.get_daily_record(today)
        if existing_record:
            status_name = STATUS_NAMES.get(existing_record['status'], existing_record['status'])
            emoji = STATUS_EMOJIS.get(existing_record['status'], "📝")
            await self.bot.send_message(
                chat_id=self.chat_id,
                text=f"📅 **Recordatorio Diario**\n\n"
                     f"Ya registraste el estado de hoy:\n"
                     f"{emoji} **{status_name}**\n\n"
                     f"Si necesitas cambiarlo, usa /daily"
            )
            return
        
        try:
            await self.bot.send_message(
                chat_id=self.chat_id,
                text="📅 **¡Buenos días!** 🌅\n\n"
                     "Es hora de registrar dónde está la autocaravana hoy.\n\n"
                     "¿Dónde está la autocaravana?",
                reply_markup=get_daily_status_keyboard()
            )
            print(f"✅ Recordatorio diario enviado a {self.chat_id}")
        except Exception as e:
            print(f"❌ Error enviando recordatorio: {e}")
    
    async def send_test_reminder(self):
        if not self.chat_id:
            print("⚠️ No hay chat_id configurado para enviar recordatorio de prueba")
            return
        try:
            await self.bot.send_message(
                chat_id=self.chat_id,
                text="🧪 **Recordatorio de Prueba**\n\n"
                     "Este es un recordatorio de prueba para verificar que el sistema funciona.\n\n"
                     "¿Dónde está la autocaravana?",
                reply_markup=get_daily_status_keyboard()
            )
            print(f"✅ Recordatorio de prueba enviado a {self.chat_id}")
        except Exception as e:
            print(f"❌ Error enviando recordatorio de prueba: {e}")

daily_scheduler = None
