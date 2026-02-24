from apps.agent.planner import PlannerAgent
from apps.agent.executor import ToolExecutor
from apps.agent.critic import CriticAgent


class StartupOrchestrator:

    def run(self, idea: str):

        planner = PlannerAgent()
        executor = ToolExecutor()
        critic = CriticAgent()

        # 1️⃣ Create Plan
        plan = planner.create_plan(idea)

        # 2️⃣ Execute Plan
        execution_data = executor.execute_with_plan(idea, plan)
        results = execution_data["results"]
        execution_log = execution_data["execution_log"]

        # 3️⃣ Critic Evaluation
        critique = critic.review(idea, results)

        # 4️⃣ Optional Re-run Logic (basic version)
        if critique.get("needs_rerun"):
            execution_data = executor.execute_with_plan(idea, plan)
            results = execution_data["results"]
            execution_log += execution_data["execution_log"]

        return {
            "plan": plan,
            "results": results,
            "execution_log": execution_log,
            "critique": critique
        }
