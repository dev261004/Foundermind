import datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response
from mongoengine.errors import ValidationError

from .models import Idea, IDEA_STATUS_DELETED
from apps.agent.models import AgentRun, IdeaAnalysis

from core.permissions import jwt_required


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
    ideas = _get_visible_ideas(email)

    history = []

    for idea in ideas:
        idea_id = str(idea.id)
        latest_run = (
            AgentRun.objects(
                idea_id=idea_id,
                status__nin=["pending", "running"],
            )
            .order_by("-created_at")
            .first()
        )
        latest_analysis = (
            IdeaAnalysis.objects(run_id=str(latest_run.id)).order_by("-created_at").first()
            if latest_run
            else IdeaAnalysis.objects(idea_id=idea_id).order_by("-created_at").first()
        )

        if not latest_analysis and not latest_run:
            continue

        analyzed_at = (
            getattr(latest_analysis, "created_at", None)
            or getattr(latest_run, "created_at", None)
            or getattr(idea, "updated_at", None)
            or getattr(idea, "created_at", None)
        )

        history.append({
            "idea_id": idea_id,
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
        })

    history.sort(
        key=lambda item: item["analyzed_at"] or item["updated_at"] or item["created_at"] or "",
        reverse=True,
    )

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
