import mongoengine as me
import datetime


class AgentRun(me.Document):
    idea_id = me.StringField(required=True)
    execution_log = me.ListField(me.DictField(), default=list)
    models_used = me.DictField(default=dict)
    status = me.StringField(
        choices=["pending", "running", "completed", "partial", "failed", "quota_exhausted", "awaiting_clarification"],
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
    iteration_scores = me.ListField(me.FloatField(), default=list)

    # Description quality & clarification fields
    original_description = me.StringField()
    refined_description = me.StringField()
    quality_score = me.IntField()
    quality_missing_signals = me.ListField(me.StringField())
    clarification_questions = me.ListField(me.StringField())
    clarification_answers = me.DictField()

    created_at = me.DateTimeField(default=datetime.datetime.utcnow)
    meta = {
        "ordering": ["-created_at"],
        "strict": False
    }


class IdeaAnalysis(me.Document):
    idea_id = me.StringField(required=True)
    run_id = me.StringField()

    similar_startups = me.ListField(me.DictField(), default=list)
    market_data = me.StringField()
    market_quantitative_model = me.DictField()
    funding_info = me.ListField(me.DictField(), default=list)
    monetization = me.ListField(me.DictField(), default=list)
    customer_profile = me.DictField(default=dict)
    tech_stack = me.DictField(default=dict)
    swot = me.DictField(default=dict)
    report_summary = me.StringField()

    created_at = me.DateTimeField(default=datetime.datetime.utcnow)
