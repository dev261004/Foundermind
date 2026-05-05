from mongoengine import Document, StringField, DateTimeField
from datetime import datetime


class User(Document):
    email = StringField(required=True, unique=True)
    password_hash = StringField(required=True)
    password_reset_token_hash = StringField(null=True)
    password_reset_expires_at = DateTimeField(null=True)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "users"
    }
