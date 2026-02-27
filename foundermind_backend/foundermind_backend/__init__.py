from integrations.mongo import init_mongo

init_mongo()

from config.celery import app as celery_app

__all__ = ("celery_app",)