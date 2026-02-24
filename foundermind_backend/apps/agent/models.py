import mongoengine as me
import datetime


class AgentRun(me.Document):
    idea_id = me.StringField(required=True)
    execution_log = me.ListField(me.DictField())
    status = me.StringField(default="completed")
    critique = me.DictField()
    created_at = me.DateTimeField(default=datetime.datetime.utcnow)


class IdeaAnalysis(me.Document):
    idea_id = me.StringField(required=True)

    similar_startups = me.StringField()
    market_data = me.StringField()
    funding_info = me.StringField()
    monetization = me.StringField()
    customer_profile = me.StringField()
    tech_stack = me.StringField()
    swot = me.StringField()

    created_at = me.DateTimeField(default=datetime.datetime.utcnow)
