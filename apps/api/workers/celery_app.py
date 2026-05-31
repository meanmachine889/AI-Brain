from celery import Celery
from celery.schedules import crontab

from core.config import settings

celery_app = Celery(
    "agency_brain",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["workers.tasks", "workers.ingestion.slack", "workers.summarizer", "workers.alerts"],
)

celery_app.conf.timezone = "Asia/Kolkata"

celery_app.conf.beat_schedule = {
    # ingest every agency's Slack every 2 hours
    "ingest-slack-every-2h": {
        "task": "workers.ingestion.slack.ingest_all_agencies",
        "schedule": crontab(minute=0, hour="*/2"),
    },
    # run alert checks once a day at 8am (Asia/Kolkata)
    "alerts-daily-8am": {
        "task": "workers.alerts.check_all",
        "schedule": crontab(minute=0, hour=8),
    },
    # Deferred until those integrations exist (Step 13):
    # "ingest-gmail-every-2h": {...},
    # "ingest-jira-every-2h":  {...},
    # "ingest-drive-every-6h": {...},
}
