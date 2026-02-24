import os
from mongoengine import connect
from dotenv import load_dotenv
from pathlib import Path

# Load env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_NAME", "foundermind")


def init_mongo():
    connect(
        db=MONGO_DB_NAME,
        host=MONGO_URI
    )
