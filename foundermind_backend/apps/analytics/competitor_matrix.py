from collections import defaultdict

from bson import ObjectId

from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import Idea


class CompetitorMatrix:
    DEFAULT_LIMIT = 12
    ANALYSIS_LIMIT = 250

    @staticmethod
    def _serialize_datetime(value):
        return value.isoformat() if value else None

    @staticmethod
    def _valid_object_ids(values):
        return [
            ObjectId(value)
            for value in values
            if value and ObjectId.is_valid(str(value))
        ]

    @staticmethod
    def _build_context_maps(analyses):
        run_ids = {analysis.run_id for analysis in analyses if analysis.run_id}
        idea_ids = {analysis.idea_id for analysis in analyses if analysis.idea_id}

        runs_by_id = {}
        valid_run_ids = CompetitorMatrix._valid_object_ids(run_ids)
        if valid_run_ids:
            runs_by_id = {
                str(run.id): run
                for run in AgentRun.objects(id__in=valid_run_ids).only(
                    "id",
                    "idea_id",
                    "idea_type",
                    "created_at",
                )
            }

        missing_run_idea_ids = [
            idea_id
            for idea_id in idea_ids
            if not any(run.idea_id == idea_id for run in runs_by_id.values())
        ]
        runs_by_idea = {}
        if missing_run_idea_ids:
            fallback_runs = (
                AgentRun.objects(idea_id__in=missing_run_idea_ids)
                .only("id", "idea_id", "idea_type", "created_at")
                .order_by("idea_id", "-created_at")
            )
            for run in fallback_runs:
                if run.idea_id not in runs_by_idea:
                    runs_by_idea[run.idea_id] = run

        valid_idea_ids = CompetitorMatrix._valid_object_ids(idea_ids)
        ideas_by_id = {}
        if valid_idea_ids:
            ideas_by_id = {
                str(idea.id): idea
                for idea in Idea.objects(id__in=valid_idea_ids).only("id", "title")
            }

        return runs_by_id, runs_by_idea, ideas_by_id

    @staticmethod
    def top_competitors(limit=DEFAULT_LIMIT, idea_type=None):
        analyses = list(
            IdeaAnalysis.objects()
            .only("idea_id", "run_id", "similar_startups", "created_at")
            .order_by("-created_at")
            .limit(CompetitorMatrix.ANALYSIS_LIMIT)
        )

        runs_by_id, runs_by_idea, ideas_by_id = CompetitorMatrix._build_context_maps(
            analyses
        )
        competitors = defaultdict(
            lambda: {
                "company_name": "",
                "category_tag": "",
                "url": "",
                "appearances": 0,
                "idea_types": set(),
                "latest_seen_at": None,
                "latest_idea_title": "",
            }
        )

        for analysis in analyses:
            run = runs_by_id.get(analysis.run_id) or runs_by_idea.get(analysis.idea_id)
            run_idea_type = getattr(run, "idea_type", None) or "general"

            if idea_type and run_idea_type != idea_type:
                continue

            for item in analysis.similar_startups or []:
                raw_name = (item.get("company_name") or "").strip()
                if not raw_name:
                    continue

                key = raw_name.lower()
                competitor = competitors[key]
                competitor["company_name"] = competitor["company_name"] or raw_name
                competitor["category_tag"] = (
                    competitor["category_tag"]
                    or (item.get("category_tag") or "Competitor").strip()
                )
                competitor["url"] = competitor["url"] or (item.get("url") or "")
                competitor["appearances"] += 1
                competitor["idea_types"].add(run_idea_type)

                seen_at = getattr(analysis, "created_at", None)
                if (
                    seen_at
                    and (
                        competitor["latest_seen_at"] is None
                        or seen_at > competitor["latest_seen_at"]
                    )
                ):
                    idea = ideas_by_id.get(analysis.idea_id)
                    competitor["latest_seen_at"] = seen_at
                    competitor["latest_idea_title"] = getattr(idea, "title", "")

        ranked = sorted(
            competitors.values(),
            key=lambda item: (
                item["appearances"],
                item["latest_seen_at"].timestamp()
                if item["latest_seen_at"] else 0,
            ),
            reverse=True,
        )

        result = []
        for item in ranked[:limit]:
            signal_strength = min(
                100,
                (item["appearances"] * 18) + (len(item["idea_types"]) * 8),
            )
            result.append({
                "company_name": item["company_name"],
                "category_tag": item["category_tag"],
                "url": item["url"],
                "appearances": item["appearances"],
                "idea_types": sorted(item["idea_types"]),
                "latest_seen_at": CompetitorMatrix._serialize_datetime(
                    item["latest_seen_at"]
                ),
                "latest_idea_title": item["latest_idea_title"],
                "signal_strength": signal_strength,
            })

        return result
