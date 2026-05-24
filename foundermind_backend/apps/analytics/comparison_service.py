from statistics import mean

from bson import ObjectId

from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import IDEA_STATUS_DELETED, Idea


COMPLETED_STATUSES = ["completed", "partial", "quota_exhausted"]
SECTION_LABELS = {
    "similar_startups": "Similar Startups",
    "market_data": "Market Data",
    "funding_info": "Funding Info",
    "monetization": "Monetization",
    "customer_profile": "Customer Profile",
    "tech_stack": "Tech Stack",
    "swot": "SWOT",
}


def _serialize_datetime(value):
    return value.isoformat() if value else None


def _safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _round(value, digits=2):
    return round(value, digits) if isinstance(value, (int, float)) else None


def _mean(values):
    cleaned = [value for value in values if isinstance(value, (int, float))]
    return round(mean(cleaned), 2) if cleaned else None


def _valid_object_ids(values):
    return [
        ObjectId(str(value))
        for value in values
        if value and ObjectId.is_valid(str(value))
    ]


class ComparisonService:
    @staticmethod
    def get_options(limit=120):
        ideas = list(
            Idea.objects(status__ne=IDEA_STATUS_DELETED)
            .only("id", "title", "description", "user_email", "created_at")
            .order_by("-created_at")
            .limit(limit)
        )
        idea_ids = [str(idea.id) for idea in ideas]
        runs_by_idea = ComparisonService._latest_runs_by_idea(idea_ids)

        recent_runs = list(
            AgentRun.objects(status__in=COMPLETED_STATUSES)
            .only(
                "id",
                "idea_id",
                "status",
                "created_at",
                "idea_type",
                "overall_score",
                "weighted_score",
                "analysis_confidence",
                "iterations_used",
            )
            .order_by("-created_at")
            .limit(limit)
        )
        ideas_by_id = {str(idea.id): idea for idea in ideas}

        return {
            "ideas": [
                ComparisonService._build_idea_option(idea, runs_by_idea.get(str(idea.id)))
                for idea in ideas
                if runs_by_idea.get(str(idea.id))
            ],
            "analysis_runs": [
                ComparisonService._build_run_option(run, ideas_by_id.get(run.idea_id))
                for run in recent_runs
            ],
        }

    @staticmethod
    def compare_analyses(run_ids):
        runs = ComparisonService._runs_by_ids(run_ids)
        if len(runs) < 2:
            return {
                "status": "insufficient_selection",
                "message": "Select at least two completed analysis runs.",
            }

        analyses_by_run = ComparisonService._analyses_by_run([str(run.id) for run in runs])
        ideas_by_id = ComparisonService._ideas_by_ids([run.idea_id for run in runs])
        items = [
            ComparisonService._build_analysis_item(
                run,
                analyses_by_run.get(str(run.id)),
                ideas_by_id.get(run.idea_id),
            )
            for run in runs
        ]

        section_changes = ComparisonService._build_section_changes(items)
        metric_deltas = ComparisonService._build_metric_deltas(items)
        winner = ComparisonService._best_item(items, "weighted_score")

        improved = [
            change for change in section_changes
            if change["trend"] == "improved"
        ]
        degraded = [
            change for change in section_changes
            if change["trend"] == "degraded"
        ]

        return {
            "status": "ready",
            "comparison_type": "analyses",
            "summary": {
                "items_compared": len(items),
                "best_id": winner.get("run_id") if winner else None,
                "best_label": winner.get("label") if winner else None,
                "average_overall_score": _mean([item["overall_score"] for item in items]),
                "score_spread": ComparisonService._spread(
                    [item["overall_score"] for item in items]
                ),
                "improved_count": len(improved),
                "degraded_count": len(degraded),
            },
            "items": items,
            "metric_deltas": metric_deltas,
            "section_changes": section_changes,
            "improved": improved,
            "degraded": degraded,
            "report": ComparisonService._analysis_report(items, improved, degraded, winner),
        }

    @staticmethod
    def compare_ideas(idea_ids):
        ideas = ComparisonService._ideas_by_ids(idea_ids)
        runs_by_idea = ComparisonService._latest_runs_by_idea(list(ideas.keys()))
        analyses_by_run = ComparisonService._analyses_by_run(
            [str(run.id) for run in runs_by_idea.values()]
        )

        items = []
        for idea_id, idea in ideas.items():
            run = runs_by_idea.get(idea_id)
            if not run:
                continue
            items.append(
                ComparisonService._build_idea_item(
                    idea,
                    run,
                    analyses_by_run.get(str(run.id)),
                )
            )

        if len(items) < 2:
            return {
                "status": "insufficient_selection",
                "message": "Select at least two ideas with completed analyses.",
            }

        ranking = sorted(
            items,
            key=lambda item: item["decision_score"] or 0,
            reverse=True,
        )
        winner = ranking[0] if ranking else None

        return {
            "status": "ready",
            "comparison_type": "ideas",
            "summary": {
                "items_compared": len(items),
                "best_id": winner.get("idea_id") if winner else None,
                "best_label": winner.get("label") if winner else None,
                "average_overall_score": _mean([item["overall_score"] for item in items]),
                "score_spread": ComparisonService._spread(
                    [item["overall_score"] for item in items]
                ),
            },
            "items": items,
            "ranking": ranking,
            "side_by_side_metrics": ComparisonService._idea_metrics(items),
            "report": ComparisonService._idea_report(items, ranking),
        }

    @staticmethod
    def _latest_runs_by_idea(idea_ids):
        latest = {}
        if not idea_ids:
            return latest

        runs = (
            AgentRun.objects(
                idea_id__in=idea_ids,
                status__in=COMPLETED_STATUSES,
            )
            .only(
                "id",
                "idea_id",
                "status",
                "created_at",
                "idea_type",
                "overall_score",
                "weighted_score",
                "analysis_confidence",
                "iterations_used",
                "critique",
            )
            .order_by("idea_id", "-created_at")
        )
        for run in runs:
            if run.idea_id not in latest:
                latest[run.idea_id] = run
        return latest

    @staticmethod
    def _runs_by_ids(run_ids):
        object_ids = _valid_object_ids(run_ids)
        if not object_ids:
            return []

        runs = list(
            AgentRun.objects(id__in=object_ids, status__in=COMPLETED_STATUSES)
            .only(
                "id",
                "idea_id",
                "status",
                "created_at",
                "idea_type",
                "overall_score",
                "weighted_score",
                "analysis_confidence",
                "iterations_used",
                "critique",
            )
        )
        order = {str(run_id): index for index, run_id in enumerate(run_ids)}
        return sorted(runs, key=lambda run: order.get(str(run.id), 999))

    @staticmethod
    def _ideas_by_ids(idea_ids):
        object_ids = _valid_object_ids(idea_ids)
        if not object_ids:
            return {}
        return {
            str(idea.id): idea
            for idea in Idea.objects(id__in=object_ids).only(
                "id",
                "title",
                "description",
                "user_email",
                "created_at",
            )
        }

    @staticmethod
    def _analyses_by_run(run_ids):
        if not run_ids:
            return {}
        analyses = (
            IdeaAnalysis.objects(run_id__in=run_ids)
            .only(
                "run_id",
                "similar_startups",
                "market_quantitative_model",
                "funding_info",
                "monetization",
                "customer_profile",
                "tech_stack",
                "swot",
                "report_summary",
                "created_at",
            )
            .order_by("run_id", "-created_at")
        )
        latest = {}
        for analysis in analyses:
            if analysis.run_id not in latest:
                latest[analysis.run_id] = analysis
        return latest

    @staticmethod
    def _build_idea_option(idea, run):
        return {
            "idea_id": str(idea.id),
            "label": idea.title,
            "description": idea.description or "",
            "owner": idea.user_email,
            "created_at": _serialize_datetime(idea.created_at),
            "latest_run_id": str(run.id) if run else None,
            "idea_type": getattr(run, "idea_type", None),
            "status": getattr(run, "status", None),
            "overall_score": _round(getattr(run, "overall_score", None)),
            "weighted_score": _round(getattr(run, "weighted_score", None)),
            "analysis_confidence": _round(getattr(run, "analysis_confidence", None), 3),
        }

    @staticmethod
    def _build_run_option(run, idea):
        return {
            "run_id": str(run.id),
            "idea_id": run.idea_id,
            "label": getattr(idea, "title", None) or f"Run {str(run.id)[-6:]}",
            "status": run.status,
            "idea_type": run.idea_type,
            "created_at": _serialize_datetime(run.created_at),
            "overall_score": _round(run.overall_score),
            "weighted_score": _round(run.weighted_score),
            "analysis_confidence": _round(run.analysis_confidence, 3),
            "iterations_used": run.iterations_used or 0,
        }

    @staticmethod
    def _build_analysis_item(run, analysis, idea):
        section_scores = (run.critique or {}).get("section_scores", {})
        return {
            "run_id": str(run.id),
            "idea_id": run.idea_id,
            "label": getattr(idea, "title", None) or f"Run {str(run.id)[-6:]}",
            "status": run.status,
            "idea_type": run.idea_type or "general",
            "created_at": _serialize_datetime(run.created_at),
            "overall_score": _round(run.overall_score),
            "weighted_score": _round(run.weighted_score),
            "analysis_confidence": _round(run.analysis_confidence, 3),
            "iterations_used": run.iterations_used or 0,
            "section_scores": {
                section: _round(_safe_float(score))
                for section, score in section_scores.items()
            },
            "signals": ComparisonService._analysis_signals(analysis),
            "report_summary": (
                getattr(analysis, "report_summary", None)
                or getattr(run, "report_summary", "")
                or ""
            ),
        }

    @staticmethod
    def _build_idea_item(idea, run, analysis):
        analysis_item = ComparisonService._build_analysis_item(run, analysis, idea)
        signals = analysis_item["signals"]
        decision_score = ComparisonService._decision_score(analysis_item, signals)
        return {
            **analysis_item,
            "idea_id": str(idea.id),
            "owner": idea.user_email,
            "description": idea.description or "",
            "decision_score": decision_score,
        }

    @staticmethod
    def _analysis_signals(analysis):
        market = getattr(analysis, "market_quantitative_model", None) or {}
        similar = getattr(analysis, "similar_startups", None) or []
        funding = getattr(analysis, "funding_info", None) or []
        monetization = getattr(analysis, "monetization", None) or []
        return {
            "tam_billion_usd": _round(_safe_float(market.get("tam_billion_usd"))),
            "cagr": _round(_safe_float(market.get("calculated_cagr")), 4),
            "opportunity_score": _round(_safe_float(market.get("opportunity_score"))),
            "competitor_count": len(similar),
            "funding_signal_count": len(funding),
            "monetization_count": len(monetization),
            "sections_ready": ComparisonService._sections_ready(analysis),
        }

    @staticmethod
    def _sections_ready(analysis):
        if not analysis:
            return 0
        values = [
            getattr(analysis, "similar_startups", None),
            getattr(analysis, "market_quantitative_model", None),
            getattr(analysis, "funding_info", None),
            getattr(analysis, "monetization", None),
            getattr(analysis, "customer_profile", None),
            getattr(analysis, "tech_stack", None),
            getattr(analysis, "swot", None),
        ]
        return sum(1 for value in values if value)

    @staticmethod
    def _build_metric_deltas(items):
        if not items:
            return []
        baseline = items[0]
        metrics = [
            ("overall_score", "Overall Score"),
            ("weighted_score", "Weighted Score"),
            ("analysis_confidence", "Confidence"),
            ("iterations_used", "Iterations"),
        ]
        result = []
        for key, label in metrics:
            values = [
                {
                    "id": item["run_id"],
                    "label": item["label"],
                    "value": item.get(key),
                    "delta_from_first": (
                        _round(item.get(key) - baseline.get(key), 3)
                        if isinstance(item.get(key), (int, float))
                        and isinstance(baseline.get(key), (int, float))
                        else None
                    ),
                }
                for item in items
            ]
            result.append({"metric": key, "label": label, "values": values})
        return result

    @staticmethod
    def _build_section_changes(items):
        sections = sorted({
            section
            for item in items
            for section in (item.get("section_scores") or {})
        })
        changes = []
        for section in sections:
            values = [
                {
                    "id": item["run_id"],
                    "label": item["label"],
                    "value": item.get("section_scores", {}).get(section),
                }
                for item in items
            ]
            numeric_values = [
                value["value"]
                for value in values
                if isinstance(value["value"], (int, float))
            ]
            first = values[0]["value"]
            last = values[-1]["value"]
            delta = (
                _round(last - first)
                if isinstance(first, (int, float))
                and isinstance(last, (int, float))
                else None
            )
            if delta is None or abs(delta) < 0.25:
                trend = "stable"
            elif delta > 0:
                trend = "improved"
            else:
                trend = "degraded"

            changes.append({
                "section": section,
                "label": SECTION_LABELS.get(section, section.replace("_", " ").title()),
                "values": values,
                "delta": delta,
                "trend": trend,
                "spread": ComparisonService._spread(numeric_values),
            })
        return changes

    @staticmethod
    def _idea_metrics(items):
        metrics = [
            ("overall_score", "Overall Score"),
            ("weighted_score", "Weighted Score"),
            ("decision_score", "Decision Score"),
            ("analysis_confidence", "Confidence"),
            ("opportunity_score", "Opportunity"),
            ("tam_billion_usd", "TAM"),
            ("competitor_count", "Competitors"),
            ("funding_signal_count", "Funding Signals"),
        ]
        rows = []
        for key, label in metrics:
            values = []
            for item in items:
                source = item["signals"] if key in item["signals"] else item
                values.append({
                    "id": item["idea_id"],
                    "label": item["label"],
                    "value": source.get(key),
                })
            rows.append({"metric": key, "label": label, "values": values})
        return rows

    @staticmethod
    def _decision_score(item, signals):
        parts = [
            item.get("weighted_score"),
            item.get("overall_score"),
            signals.get("opportunity_score"),
        ]
        score = _mean(parts)
        confidence = item.get("analysis_confidence")
        if score is None:
            return None
        if isinstance(confidence, (int, float)):
            score = (score * 0.85) + ((confidence * 10) * 0.15)
        return round(score, 2)

    @staticmethod
    def _best_item(items, key):
        scored = [
            item for item in items
            if isinstance(item.get(key), (int, float))
        ]
        if not scored:
            return None
        return max(scored, key=lambda item: item.get(key))

    @staticmethod
    def _spread(values):
        cleaned = [value for value in values if isinstance(value, (int, float))]
        if len(cleaned) < 2:
            return 0
        return round(max(cleaned) - min(cleaned), 2)

    @staticmethod
    def _analysis_report(items, improved, degraded, winner):
        if not winner:
            return {
                "title": "No clear winner",
                "summary": "The selected analysis runs do not have enough scored data.",
                "recommendations": [],
            }

        recommendations = []
        if improved:
            recommendations.append(
                f"{len(improved)} sections improved from the first to the latest selected run."
            )
        if degraded:
            recommendations.append(
                f"{len(degraded)} sections degraded and should be reviewed."
            )
        if not recommendations:
            recommendations.append("Scores are stable across the selected runs.")

        return {
            "title": f"Best run: {winner['label']}",
            "summary": (
                "Compare the selected runs by score movement, section deltas, "
                "and quality signals before choosing the reference analysis."
            ),
            "recommendations": recommendations,
        }

    @staticmethod
    def _idea_report(items, ranking):
        if not ranking:
            return {
                "title": "No recommendation",
                "summary": "The selected ideas do not have enough completed analysis data.",
                "recommendations": [],
            }

        winner = ranking[0]
        runner_up = ranking[1] if len(ranking) > 1 else None
        recommendations = [
            f"Prioritize {winner['label']} based on the highest decision score."
        ]
        if runner_up:
            gap = _round(
                (winner.get("decision_score") or 0)
                - (runner_up.get("decision_score") or 0)
            )
            recommendations.append(
                f"Decision gap versus {runner_up['label']}: {gap} points."
            )
        if winner["signals"].get("opportunity_score"):
            recommendations.append(
                f"Market opportunity score: {winner['signals']['opportunity_score']}."
            )

        return {
            "title": f"Recommended idea: {winner['label']}",
            "summary": (
                "The decision score blends weighted score, overall score, "
                "market opportunity, and confidence."
            ),
            "recommendations": recommendations,
        }
