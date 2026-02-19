from django.db import models

# Create your models here.
import mongoengine as me
import datetime

class User(me.Document):
    email = me.StringField(required=True, unique=True)
    password_hash = me.StringField(required=True)
    created_at = me.DateTimeField(default=datetime.datetime.utcnow)
