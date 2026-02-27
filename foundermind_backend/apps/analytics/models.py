import mongoengine as me
import datetime


class IdeaTypeWeights(me.Document):

    idea_type = me.StringField(required=True, unique=True)
    weights = me.DictField()

    updated_at = me.DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "idea_type_weights"
    }