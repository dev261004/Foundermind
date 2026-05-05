from apps.agent.models import AgentRun

agent_run = AgentRun.objects.order_by('-created_at').first()
for log in agent_run.execution_log:
    print("---")
    print("Agent/Tool:", log.get('agent') or log.get('tool'))
    print("Status:", log.get('status'))
    if 'plan_steps' in log:
        print("Plan Steps:", log.get('plan_steps'))
    
    # print part of the tool output if it exists
    if log.get('status') == 'success' and 'result' in log:
        res = str(log.get('result'))
        print("Result Snippet:", res[:200])
        # Check for description keywords
        if 'Odia' in res or 'Rajasthani' in res or 'wage' in res.lower() or 'ITI' in res:
            print(">>> FOUND DESCRIPTION KEYWORDS IN RESULT <<<")

