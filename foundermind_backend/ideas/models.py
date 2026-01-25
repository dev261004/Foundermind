from django.db import models

# Create your models here.
import mongoengine as me
import datetime
from users.models import User


class Idea(me.Document):
    user_email = me.StringField(required=True)  # simple ref
    idea = me.StringField(required=True)
    similar_startups = me.StringField()
    swot = me.StringField()
    market_data = me.StringField()
    funding_info = me.StringField()
    monetization = me.StringField()
    customer_profile = me.StringField()
    tech_stack = me.StringField()
    created_at = me.DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        'ordering': ['-created_at']
    }

def to_json(self):
    data = self.to_mongo().to_dict()
    data["id"] = str(data.pop("_id"))
    return data
