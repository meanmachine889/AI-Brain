from celery import Celery
from celery.schedules import crontab

from core.config import settings

celery_app = Celery(
    "agency_brain",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["workers.tasks", "workers.ingestion.slack", "workers.ingestion.jira", "workers.ingestion.gmail", "workers.summarizer", "workers.alerts"],
)

celery_app.conf.timezone = "Asia/Kolkata"

celery_app.conf.beat_schedule = {
    # ingest every agency's Slack every 2 hours
    "ingest-slack-every-2h": {
        "task": "workers.ingestion.slack.ingest_all_agencies",
        "schedule": crontab(minute=0, hour="*/2"),
    },
    # ingest every agency's Jira every 2 hours (offset 30m from Slack)
    "ingest-jira-every-2h": {
        "task": "workers.ingestion.jira.ingest_all_agencies",
        "schedule": crontab(minute=30, hour="*/2"),
    },
    # ingest every agency's Gmail every 2 hours (offset 15m)
    "ingest-gmail-every-2h": {
        "task": "workers.ingestion.gmail.ingest_all_agencies",
        "schedule": crontab(minute=15, hour="*/2"),
    },
    # run alert checks once a day at 8am (Asia/Kolkata)
    "alerts-daily-8am": {
        "task": "workers.alerts.check_all",
        "schedule": crontab(minute=0, hour=8),
    },
    # Deferred until those integrations exist:
    # "ingest-gmail-every-2h": {...},
    # "ingest-drive-every-6h": {...},
}
