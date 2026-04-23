import os
from mongoengine import connect
from dotenv import load_dotenv
from pathlib import Path

# Load env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MONGO_URI = os.getenv("MONGO_DB_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "foundermind")


def init_mongo():
    uri_with_ssl = MONGO_URI.rstrip('/') + '?tlsInsecure=true&retryWrites=false'
    
    connect(
        db=MONGO_DB_NAME,
        host=uri_with_ssl,
 
        connect=False   
    )
     
    

