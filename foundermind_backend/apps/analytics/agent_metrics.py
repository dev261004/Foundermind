from apps.agent.models import AgentRun
from statistics import mean
from collections import defaultdict

class AgentMetricsEngine:

    @staticmethod
    def _get_completed_runs(limit=None):
        query = AgentRun.objects(status="completed")
        if limit:
            query = query.limit(limit)
        return list(query)

    # -------------------------------------------------
    # 1️⃣ Average Overall Score
    # -------------------------------------------------
    @staticmethod
    def average_overall_score():
        runs = AgentMetricsEngine._get_completed_runs()
        scores = [r.overall_score for r in runs if r.overall_score]
        return round(mean(scores), 2) if scores else 0

    # -------------------------------------------------
    # 2️⃣ Average Score by Idea Type
    # -------------------------------------------------
    @staticmethod
    def average_score_by_idea_type():
        runs = AgentMetricsEngine._get_completed_runs()

        grouped = {}
        for r in runs:
            if not r.idea_type or not r.overall_score:
                continue

            grouped.setdefault(r.idea_type, []).append(r.overall_score)

        return {
            idea_type: round(mean(scores), 2)
            for idea_type, scores in grouped.items()
        }

    # -------------------------------------------------
    # 3️⃣ Tool Failure Rate
    # -------------------------------------------------
    @staticmethod
    def tool_failure_rate():
        runs = AgentMetricsEngine._get_completed_runs()

        tool_stats = {}

        for r in runs:
            for entry in r.execution_log or []:
                if entry.get("tool"):
                    tool = entry["tool"]
                    tool_stats.setdefault(tool, {"total": 0, "fail": 0})
                    tool_stats[tool]["total"] += 1
                    if entry.get("status") == "failed":
                        tool_stats[tool]["fail"] += 1

        result = {}
        for tool, stats in tool_stats.items():
            failure_rate = (
                stats["fail"] / stats["total"]
                if stats["total"] > 0 else 0
            )
            result[tool] = round(failure_rate, 3)

        return result

    # -------------------------------------------------
    # 4️⃣ Self-Healing Ratio
    # -------------------------------------------------
    @staticmethod
    def self_healing_ratio():
        runs = AgentMetricsEngine._get_completed_runs()

        rerun_count = 0
        for r in runs:
            if r.iterations_used and r.iterations_used > 0:
                rerun_count += 1

        total = len(runs)
        return round(rerun_count / total, 3) if total > 0 else 0

    # -------------------------------------------------
    # 5️⃣ Confidence Calibration Error
    # -------------------------------------------------
    @staticmethod
    def confidence_calibration_error():

        runs = AgentMetricsEngine._get_completed_runs()

        errors = []

        for r in runs:
            if r.analysis_confidence and r.overall_score:
                predicted = r.analysis_confidence
                actual = r.overall_score / 10
                errors.append(abs(predicted - actual))

        return round(mean(errors), 3) if errors else 0

    # -------------------------------------------------
    # 6️⃣ Intelligence Index
    # -------------------------------------------------
    @staticmethod
    def intelligence_index():

        avg_score = AgentMetricsEngine.average_overall_score() / 10
        calibration_error = AgentMetricsEngine.confidence_calibration_error()
        tool_failures = AgentMetricsEngine.tool_failure_rate()

        avg_failure = mean(tool_failures.values()) if tool_failures else 0

        index = (
            (avg_score * 0.4) +
            ((1 - calibration_error) * 0.3) +
            ((1 - avg_failure) * 0.3)
        )

        return round(index * 10, 2)




@staticmethod
def section_average_by_idea_type(idea_type):

    runs = AgentRun.objects(
        status="completed",
        idea_type=idea_type
    )

    section_scores = defaultdict(list)

    for r in runs:
        critique = r.critique or {}
        sections = critique.get("section_scores", {})

        for section, score in sections.items():
            section_scores[section].append(score)

    return {
        section: round(mean(scores), 2)
        for section, scores in section_scores.items()
        if scores
    }