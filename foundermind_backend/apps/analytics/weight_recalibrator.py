from apps.analytics.models import IdeaTypeWeights
from apps.analytics.agent_metrics import AgentMetricsEngine
from apps.agent.orchestrator import BASE_IDEA_TYPES

from statistics import mean


TARGET_SCORE = 8
LEARNING_RATE = 0.02


class WeightRecalibrator:

    @staticmethod
    def normalize(weights):
        total = sum(weights.values())
        return {k: round(v / total, 4) for k, v in weights.items()}

    @staticmethod
    def recalibrate_for_idea_type(idea_type):

        historical = AgentMetricsEngine.section_average_by_idea_type(idea_type)

        if not historical:
            return {"status": "no_data"}

        base_weights = BASE_IDEA_TYPES.get(idea_type)
        if not base_weights:
            return {"status": "invalid_type"}

        updated_weights = base_weights.copy()

        for section, avg_score in historical.items():

            adjustment = LEARNING_RATE * (TARGET_SCORE - avg_score)

            updated_weights[section] = max(
                0.05,
                updated_weights.get(section, 0.2) + adjustment
            )

        updated_weights = WeightRecalibrator.normalize(updated_weights)

        # Save to DB
        IdeaTypeWeights.objects(
            idea_type=idea_type
        ).update_one(
            set__weights=updated_weights,
            upsert=True
        )

        return {
            "status": "updated",
            "idea_type": idea_type,
            "new_weights": updated_weights
        }