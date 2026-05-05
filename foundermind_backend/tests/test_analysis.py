from apps.ideas.models import Idea
from apps.agent.models import AgentRun
from apps.agent.tasks import run_startup_analysis

idea = Idea.objects.order_by('-created_at').first()
print(f"Testing idea: {idea.title}")

agent_run = AgentRun(idea_id=str(idea.id))
agent_run.save()

print(f"Running analysis for run_id: {agent_run.id}...")
result = run_startup_analysis(str(agent_run.id))
print("Analysis finished with result:", result)

agent_run.reload()
from apps.agent.models import IdeaAnalysis
analysis = IdeaAnalysis.objects(run_id=str(agent_run.id)).first()
if analysis:
    print("Has Market Data:", bool(analysis.market_data))
    print("Report summary:")
    print(analysis.report_summary)
