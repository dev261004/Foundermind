import datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response
from mongoengine.errors import ValidationError

from .models import Idea, IDEA_STATUS_DELETED
from apps.agent.models import AgentRun, IdeaAnalysis
from apps.agent.services import StartupAnalysisService

from core.permissions import jwt_required

DEFAULT_HISTORY_SORT = "date-desc"
VALID_HISTORY_STATUS_FILTERS = {"all", "active", "completed", "partial", "failed", "quota_exhausted", "cancelled"}
VALID_HISTORY_SORTS = {"date-asc", "date-desc", "score-asc", "score-desc"}


def _serialize_datetime(value):
    return value.isoformat() if value else None


def _get_visible_ideas(email):
    return Idea.objects(user_email=email, status__ne=IDEA_STATUS_DELETED)


def _build_preview(analysis):
    if not analysis:
        return ""

    for field_name in (
        "report_summary",
        "market_data",
        "customer_profile",
        "monetization",
        "similar_startups",
        "funding_info",
        "swot",
        "tech_stack",
    ):
        raw_value = getattr(analysis, field_name, "")
        if not isinstance(raw_value, str):
            continue

        cleaned = " ".join(raw_value.split()).strip()
        if cleaned:
            return f"{cleaned[:217].rstrip()}..." if len(cleaned) > 220 else cleaned

    return ""


def _count_ready_sections(analysis):
    if not analysis:
        return 0

    values = [
        getattr(analysis, "similar_startups", None),
        getattr(analysis, "market_data", None),
        getattr(analysis, "funding_info", None),
        getattr(analysis, "monetization", None),
        getattr(analysis, "customer_profile", None),
        getattr(analysis, "tech_stack", None),
        getattr(analysis, "swot", None),
        getattr(analysis, "market_quantitative_model", None),
    ]

    return sum(1 for value in values if value)


def _get_latest_runs_by_idea(idea_ids):
    if not idea_ids:
        return {}

    latest_runs = {}
    runs = (
        AgentRun.objects(
            idea_id__in=idea_ids,
            status__nin=["pending", "running"],
        )
        .only(
            "id",
            "idea_id",
            "status",
            "created_at",
            "idea_type",
            "analysis_confidence",
            "overall_score",
        )
        .order_by("idea_id", "-created_at")
    )

    for run in runs:
        if run.idea_id not in latest_runs:
            latest_runs[run.idea_id] = run

    return latest_runs


def _get_latest_analyses_by_run(run_ids):
    if not run_ids:
        return {}

    latest_analyses = {}
    analyses = (
        IdeaAnalysis.objects(run_id__in=run_ids)
        .only(
            "run_id",
            "created_at",
            "similar_startups",
            "market_data",
            "market_quantitative_model",
            "funding_info",
            "monetization",
            "customer_profile",
            "tech_stack",
            "swot",
            "report_summary",
        )
        .order_by("run_id", "-created_at")
    )

    for analysis in analyses:
        if analysis.run_id not in latest_analyses:
            latest_analyses[analysis.run_id] = analysis

    return latest_analyses


def _get_latest_analyses_by_idea(idea_ids):
    if not idea_ids:
        return {}

    latest_analyses = {}
    analyses = (
        IdeaAnalysis.objects(idea_id__in=idea_ids)
        .only(
            "idea_id",
            "created_at",
            "similar_startups",
            "market_data",
            "market_quantitative_model",
            "funding_info",
            "monetization",
            "customer_profile",
            "tech_stack",
            "swot",
            "report_summary",
        )
        .order_by("idea_id", "-created_at")
    )

    for analysis in analyses:
        if analysis.idea_id not in latest_analyses:
            latest_analyses[analysis.idea_id] = analysis

    return latest_analyses


def _build_history_entry(idea, latest_run, latest_analysis):
    analyzed_at = (
        getattr(latest_analysis, "created_at", None)
        or getattr(latest_run, "created_at", None)
        or getattr(idea, "updated_at", None)
        or getattr(idea, "created_at", None)
    )

    return {
        "idea_id": str(idea.id),
        "title": idea.title,
        "description": idea.description,
        "status": getattr(latest_run, "status", None) or idea.status,
        "created_at": _serialize_datetime(getattr(idea, "created_at", None)),
        "updated_at": _serialize_datetime(getattr(idea, "updated_at", None)),
        "analyzed_at": _serialize_datetime(analyzed_at),
        "agent_run_id": str(latest_run.id) if latest_run else None,
        "idea_type": getattr(latest_run, "idea_type", None),
        "analysis_confidence": getattr(latest_run, "analysis_confidence", None),
        "overall_score": getattr(latest_run, "overall_score", None),
        "sections_ready": _count_ready_sections(latest_analysis),
        "preview": _build_preview(latest_analysis),
    }


def _matches_history_search(item, search_term):
    searchable_fields = (
        item.get("title"),
        item.get("description"),
        item.get("idea_type"),
        item.get("status"),
        item.get("preview"),
    )
    haystack = " ".join(str(value).lower() for value in searchable_fields if value)
    return search_term in haystack


def _apply_history_filters(history, search_term, status_filter):
    filtered_history = history

    if search_term:
        filtered_history = [
            item for item in filtered_history
            if _matches_history_search(item, search_term)
        ]

    if status_filter != "all":
        filtered_history = [
            item for item in filtered_history
            if (item.get("status") or "").lower() == status_filter
        ]

    return filtered_history


def _sort_history(history, sort_by):
    if sort_by.startswith("score"):
        history.sort(
            key=lambda item: item["overall_score"] if isinstance(item.get("overall_score"), (int, float)) else -1,
            reverse=sort_by.endswith("desc"),
        )
        return history

    history.sort(
        key=lambda item: item["analyzed_at"] or item["updated_at"] or item["created_at"] or "",
        reverse=sort_by.endswith("desc"),
    )
    return history


@api_view(['POST'])
def create_idea(request):
    user_email = request.data.get("user_email")
    title = request.data.get("title")
    description = request.data.get("description", "")

    if not title:
        return Response({"error": "Missing title"}, status=400)

    idea = Idea(
        user_email=user_email,
        title=title,
        description=description
    )
    idea.save()

    return Response({
        "message": "Idea created successfully",
        "idea": idea.to_json()
    })


@api_view(["PATCH"])
def update_idea(request, idea_id):
    try:
        idea = Idea.objects(id=idea_id, status__ne=IDEA_STATUS_DELETED).first()
    except ValidationError:
        idea = None

    if not idea:
        return Response({"error": "Idea not found"}, status=404)

    title = (request.data.get("title") or "").strip()
    description = (request.data.get("description") or "").strip()
    reset_analysis = bool(request.data.get("reset_analysis"))

    if not title:
        return Response({"error": "Missing title"}, status=400)

    changed = title != idea.title or description != (idea.description or "")

    if changed:
        idea.title = title
        idea.description = description
        idea.updated_at = datetime.datetime.utcnow()
        idea.save()

    if changed and reset_analysis:
        StartupAnalysisService.delete_analysis_artifacts_for_idea(str(idea.id))

    return Response({
        "message": "Idea updated successfully" if changed else "Idea unchanged",
        "idea": idea.to_json(),
        "rerun_required": bool(changed and reset_analysis),
    })


@api_view(['GET'])
@jwt_required
def get_ideas(request):
    email = request.user_email
    ideas = _get_visible_ideas(email)

    return Response({
        "ideas": [idea.to_json() for idea in ideas]
    })


@api_view(['GET'])
@jwt_required
def get_idea_history(request):
    email = request.user_email
    raw_search = (request.query_params.get("search") or "").strip().lower()
    search_term = raw_search if len(raw_search) >= 3 else ""
    status_filter = (request.query_params.get("status") or "all").strip().lower()
    sort_by = (request.query_params.get("sort") or DEFAULT_HISTORY_SORT).strip().lower()

    if status_filter not in VALID_HISTORY_STATUS_FILTERS:
        status_filter = "all"

    if sort_by not in VALID_HISTORY_SORTS:
        sort_by = DEFAULT_HISTORY_SORT

    ideas = list(
        _get_visible_ideas(email).only(
            "id",
            "title",
            "description",
            "status",
            "created_at",
            "updated_at",
        )
    )
    idea_ids = [str(idea.id) for idea in ideas]

    latest_runs_by_idea = _get_latest_runs_by_idea(idea_ids)
    latest_analyses_by_run = _get_latest_analyses_by_run(
        [str(run.id) for run in latest_runs_by_idea.values()]
    )
    latest_analyses_by_idea = _get_latest_analyses_by_idea(
        [idea_id for idea_id in idea_ids if idea_id not in latest_runs_by_idea]
    )

    history = []

    for idea in ideas:
        idea_id = str(idea.id)
        latest_run = latest_runs_by_idea.get(idea_id)
        latest_analysis = (
            latest_analyses_by_run.get(str(latest_run.id))
            if latest_run
            else latest_analyses_by_idea.get(idea_id)
        )

        if not latest_analysis and not latest_run:
            continue

        history.append(_build_history_entry(idea, latest_run, latest_analysis))

    history = _apply_history_filters(history, search_term, status_filter)
    history = _sort_history(history, sort_by)

    return Response({
        "history": history,
        "count": len(history),
    })


@api_view(['DELETE'])
@jwt_required
def delete_idea(request, idea_id):
    email = request.user_email

    try:
        deleted_idea = (
            Idea.objects(
                id=idea_id,
                user_email=email,
                status__ne=IDEA_STATUS_DELETED,
            )
            .modify(
                new=True,
                set__status=IDEA_STATUS_DELETED,
                set__updated_at=datetime.datetime.utcnow(),
            )
        )
    except ValidationError:
        deleted_idea = None

    if not deleted_idea:
        return Response({"error": "Idea not found"}, status=404)

    return Response({
        "message": "Idea deleted successfully",
        "idea_id": str(deleted_idea.id),
        "status": deleted_idea.status,
    })
