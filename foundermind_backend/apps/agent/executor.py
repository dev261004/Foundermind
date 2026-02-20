import time

from apps.agent.tools.search import search_similar_startups
from apps.agent.tools.market import search_market_data
from apps.agent.tools.funding import search_funding_info
from apps.agent.tools.monetization import generate_monetization_strategy
from apps.agent.tools.customer import generate_customer_profile
from apps.agent.tools.techstack import is_technical_startup, suggest_tech_stack
from apps.agent.tools.swot import generate_swot_analysis

class ToolExecutor:
    """
    Executes startup validation tools in structured sequence.
    Designed to later support planner-driven execution.
    """

    def execute(self, idea: str):
        execution_log = []
        results = {}

        # Step 1: Similar Startups
        start = time.time()
        similar = search_similar_startups(idea)
        results["similar_startups"] = similar
        execution_log.append({
            "step": 1,
            "tool": "search_similar_startups",
            "duration_ms": int((time.time() - start) * 1000)
        })

        # Step 2: Market Data
        start = time.time()
        market = search_market_data(idea)
        results["market_data"] = market
        execution_log.append({
            "step": 2,
            "tool": "search_market_data",
            "duration_ms": int((time.time() - start) * 1000)
        })

        # Step 3: Funding Info
        start = time.time()
        funding = search_funding_info(idea)
        results["funding_info"] = funding
        execution_log.append({
            "step": 3,
            "tool": "search_funding_info",
            "duration_ms": int((time.time() - start) * 1000)
        })

        # Step 4: Monetization
        start = time.time()
        monetization = generate_monetization_strategy(idea)
        results["monetization"] = monetization
        execution_log.append({
            "step": 4,
            "tool": "generate_monetization_strategy",
            "duration_ms": int((time.time() - start) * 1000)
        })

        # Step 5: Customer Profile
        start = time.time()
        customer = generate_customer_profile(idea)
        results["customer_profile"] = customer
        execution_log.append({
            "step": 5,
            "tool": "generate_customer_profile",
            "duration_ms": int((time.time() - start) * 1000)
        })

        # Step 6: Tech Stack (conditional)
        start = time.time()
        if is_technical_startup(idea):
            tech_stack = suggest_tech_stack(idea)
            results["tech_stack"] = tech_stack
        else:
            results["tech_stack"] = "Not a technical startup."
        execution_log.append({
            "step": 6,
            "tool": "suggest_tech_stack",
            "duration_ms": int((time.time() - start) * 1000)
        })

        # Step 7: SWOT
        start = time.time()
        swot = generate_swot_analysis(
            idea,
            similar,
            market,
            funding,
            monetization,
            customer
        )
        results["swot"] = swot
        execution_log.append({
            "step": 7,
            "tool": "generate_swot_analysis",
            "duration_ms": int((time.time() - start) * 1000)
        })

        return {
            "results": results,
            "execution_log": execution_log
        }