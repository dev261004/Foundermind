import mongoengine as me
import datetime

IDEA_STATUS_ACTIVE = "active"
IDEA_STATUS_DELETED = "deleted"


class Idea(me.Document):
    user_email = me.StringField(required=True)
    title = me.StringField(required=True)
    description = me.StringField()
    status = me.StringField(default=IDEA_STATUS_ACTIVE)

    created_at = me.DateTimeField(default=datetime.datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "ordering": ["-created_at"]
    }

    def to_json(self):
        data = self.to_mongo().to_dict()
        data["id"] = str(data.pop("_id"))
        data.pop("_cls", None)
        if "created_at" in data and data["created_at"]:
            data["created_at"] = data["created_at"].isoformat()
        if "updated_at" in data and data["updated_at"]:
            data["updated_at"] = data["updated_at"].isoformat()
        return data
