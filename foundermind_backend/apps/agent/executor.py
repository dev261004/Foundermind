from apps.agent.tools.search import search_similar_startups
from apps.agent.tools.market import search_market_data
from apps.agent.tools.funding import search_funding_info
from apps.agent.tools.monetization import generate_monetization_strategy
from apps.agent.tools.customer import generate_customer_profile
from apps.agent.tools.techstack import is_technical_startup, suggest_tech_stack
from apps.agent.tools.swot import generate_swot_analysis


class ToolExecutor:
    """
    Executes tools dynamically based on planner output.
    """

    def execute_with_plan(self, idea: str, plan: dict):

        execution_log = []
        results = {}

        for step in plan.get("steps", []):
            tool_name = step.get("tool")

            try:
                if tool_name == "search_similar_startups":
                    output = search_similar_startups(idea)
                    results["similar_startups"] = output

                elif tool_name == "search_market_data":
                    output = search_market_data(idea)
                    results["market_data"] = output

                elif tool_name == "search_funding_info":
                    output = search_funding_info(idea)
                    results["funding_info"] = output

                elif tool_name == "generate_monetization_strategy":
                    output = generate_monetization_strategy(idea)
                    results["monetization"] = output

                elif tool_name == "generate_customer_profile":
                    output = generate_customer_profile(idea)
                    results["customer_profile"] = output

                elif tool_name == "suggest_tech_stack":
                    if is_technical_startup(idea):
                        output = suggest_tech_stack(idea)
                    else:
                        output = "Not a technical startup."
                    results["tech_stack"] = output

                elif tool_name == "generate_swot_analysis":
                    output = generate_swot_analysis(
                        idea,
                        results.get("similar_startups", ""),
                        results.get("market_data", ""),
                        results.get("funding_info", ""),
                        results.get("monetization", ""),
                        results.get("customer_profile", ""),
                    )
                    results["swot"] = output

                else:
                    execution_log.append({
                     "tool": tool_name,
                     "status": "failed",
                     "error": "Unknown tool"
                     })
                    continue

                execution_log.append({
                    "tool": tool_name,
                    "status": "completed"
                })

            except Exception as e:
                execution_log.append({
                    "tool": tool_name,
                    "status": "failed",
                    "error": str(e)
                })

        return {
            "results": results,
            "execution_log": execution_log
        }
