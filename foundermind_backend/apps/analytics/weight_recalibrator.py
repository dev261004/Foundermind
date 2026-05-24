from apps.analytics.models import IdeaTypeWeights
from apps.analytics.agent_metrics import AgentMetricsEngine
from apps.agent.orchestrator import BASE_IDEA_TYPES

import datetime


TARGET_SCORE = 8
LEARNING_RATE = 0.02


class WeightRecalibrator:

    @staticmethod
    def normalize(weights):
        total = sum(weights.values())
        if not total:
            return weights
        return {k: round(v / total, 4) for k, v in weights.items()}

    @staticmethod
    def canonical_sections_for_idea_type(idea_type):
        return set(BASE_IDEA_TYPES.get(idea_type, {}).keys())

    @staticmethod
    def canonicalize_weights(idea_type, weights):
        base_weights = BASE_IDEA_TYPES.get(idea_type)
        if not base_weights:
            return None

        canonical = {
            section: max(0.05, float(weights.get(section, base_weight)))
            for section, base_weight in base_weights.items()
        }
        return WeightRecalibrator.normalize(canonical)

    @staticmethod
    def current_weights_for_idea_type(idea_type):
        saved_weights = IdeaTypeWeights.objects(idea_type=idea_type).first()
        if saved_weights and saved_weights.weights:
            return dict(saved_weights.weights)

        base_weights = BASE_IDEA_TYPES.get(idea_type)
        if not base_weights:
            return None

        return base_weights.copy()

    @staticmethod
    def preview_recalibration_for_idea_type(idea_type):

        historical = AgentMetricsEngine.section_average_by_idea_type(idea_type)

        if not historical:
            return {"status": "no_data"}

        current_weights = WeightRecalibrator.current_weights_for_idea_type(idea_type)
        if not current_weights:
            return {"status": "invalid_type"}

        canonical_weights = WeightRecalibrator.canonicalize_weights(
            idea_type,
            current_weights,
        )
        if not canonical_weights:
            return {"status": "invalid_type"}

        canonical_sections = WeightRecalibrator.canonical_sections_for_idea_type(
            idea_type
        )
        weighted_section_scores = {
            section: score
            for section, score in historical.items()
            if section in canonical_sections
        }
        if not weighted_section_scores:
            return {"status": "no_weighted_section_data"}

        updated_weights = canonical_weights.copy()

        for section, avg_score in weighted_section_scores.items():

            adjustment = LEARNING_RATE * (TARGET_SCORE - avg_score)

            updated_weights[section] = max(
                0.05,
                updated_weights.get(section, 0.2) + adjustment,
            )

        updated_weights = WeightRecalibrator.normalize(updated_weights)
        changes = {
            section: round(
                updated_weights.get(section, 0) - current_weights.get(section, 0),
                4
            )
            for section in sorted(set(current_weights) | set(updated_weights))
        }
        canonical_changes = {
            section: round(
                updated_weights.get(section, 0) - canonical_weights.get(section, 0),
                4
            )
            for section in sorted(canonical_sections)
        }
        cleaned_sections = sorted(set(current_weights) - canonical_sections)
        has_material_change = any(
            abs(delta) >= 0.001
            for delta in changes.values()
        )

        return {
            "status": "ready",
            "idea_type": idea_type,
            "current_weights": current_weights,
            "canonical_current_weights": canonical_weights,
            "suggested_weights": updated_weights,
            "changes": changes,
            "canonical_changes": canonical_changes,
            "section_averages": historical,
            "weighted_section_averages": weighted_section_scores,
            "cleaned_sections": cleaned_sections,
            "has_material_change": has_material_change,
        }

    @staticmethod
    def recalibrate_for_idea_type(idea_type):

        preview = WeightRecalibrator.preview_recalibration_for_idea_type(idea_type)

        if preview["status"] != "ready":
            return {"status": preview["status"]}

        if not preview["has_material_change"]:
            return {
                "status": "unchanged",
                "idea_type": idea_type,
                "previous_weights": preview["current_weights"],
                "new_weights": preview["suggested_weights"],
                "changes": preview["changes"],
                "section_averages": preview["section_averages"],
                "cleaned_sections": preview["cleaned_sections"],
                "reason": (
                    "No material weight change was found. "
                    "The weighted sections have similar historical scores."
                ),
            }

        updated_at = datetime.datetime.utcnow()

        IdeaTypeWeights.objects(
            idea_type=idea_type
        ).update_one(
            set__weights=preview["suggested_weights"],
            set__updated_at=updated_at,
            upsert=True
        )

        return {
            "status": "updated",
            "idea_type": idea_type,
            "previous_weights": preview["current_weights"],
            "new_weights": preview["suggested_weights"],
            "changes": preview["changes"],
            "section_averages": preview["section_averages"],
            "cleaned_sections": preview["cleaned_sections"],
            "updated_at": updated_at.isoformat(),
        }
