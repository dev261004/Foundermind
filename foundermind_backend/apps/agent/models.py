import mongoengine as me
import datetime


class AgentRun(me.Document):
    idea_id = me.StringField(required=True)
    execution_log = me.ListField(me.DictField(), default=list)
    models_used = me.DictField(default=dict)
    status = me.StringField(
        choices=["pending", "running", "completed", "partial", "failed", "quota_exhausted"],
        default="pending"
    )
    critique = me.DictField()
    report_summary = me.StringField()
    idea_type = me.StringField()
    classification_confidence = me.FloatField()
    analysis_confidence = me.FloatField()

    overall_score = me.FloatField()
    weighted_score = me.FloatField()

    iterations_used = me.IntField()
    convergence_reason = me.StringField()

    created_at = me.DateTimeField(default=datetime.datetime.utcnow)
    meta = {
        "ordering": ["-created_at"]
    }


class IdeaAnalysis(me.Document):
    idea_id = me.StringField(required=True)
    run_id = me.StringField()

    similar_startups = me.StringField()
    market_data = me.StringField()
    market_quantitative_model = me.DictField()
    funding_info = me.StringField()
    monetization = me.ListField(me.DictField(), default=list)
    customer_profile = me.StringField()
    tech_stack = me.StringField()
    swot = me.StringField()
    report_summary = me.StringField()

    created_at = me.DateTimeField(default=datetime.datetime.utcnow)
