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
    if not MONGO_URI:
        return

    base_uri, separator, query = MONGO_URI.partition("?")
    if base_uri.count("/") == 2:
        base_uri = f"{base_uri}/"

    existing_query = f"?{query}" if separator else ""
    option_separator = "&" if existing_query else "?"
    uri_with_ssl = (
        f"{base_uri}{existing_query}{option_separator}tlsInsecure=true&retryWrites=false"
    )
    
    connect(
        db=MONGO_DB_NAME,
        host=uri_with_ssl,
 
        connect=False   
    )
     
    

