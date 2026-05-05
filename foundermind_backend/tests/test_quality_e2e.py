
import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_quality_checker_e2e():
    # 1. Create a very vague idea
    idea_data = {
        "user_email": "test@example.com",
        "title": "A new app",
        "description": "It helps people do things faster."
    }
    
    print(f"Creating idea: {idea_data['title']}")
    resp = requests.post(f"{BASE_URL}/api/ideas/create/", json=idea_data)
    if resp.status_code != 200:
        print(f"Failed to create idea: {resp.text}")
        return
    
    idea_id = resp.json()["idea"]["id"]
    print(f"Idea created with ID: {idea_id}")
    
    # 2. Start analysis
    print("Starting analysis...")
    resp = requests.post(f"{BASE_URL}/api/agent/start/", json={"idea_id": idea_id})
    if resp.status_code != 200:
        print(f"Failed to start analysis: {resp.text}")
        return
    
    run_id = resp.json()["agent_run_id"]
    print(f"Agent run started with ID: {run_id}")
    
    # 3. Poll for status
    print("Polling for status (waiting for quality check to complete)...")
    for _ in range(15):
        time.sleep(2)
        resp = requests.get(f"{BASE_URL}/api/agent/status/{run_id}/")
        status_data = resp.json()
        status = status_data["status"]
        print(f"Current status: {status}")
        
        if status == "awaiting_clarification":
            print("SUCCESS: Idea description quality checker is working and requested clarification!")
            print("Questions:")
            print(json.dumps(status_data.get("clarification_questions", []), indent=2))
            return
        elif status == "completed" or status == "failed":
            print(f"Finished with status: {status}")
            if "execution_log" in status_data:
                for entry in status_data["execution_log"]:
                    if entry.get("agent") == "quality_check":
                        print("Quality check log found:")
                        print(json.dumps(entry, indent=2))
            return
    
    print("Timed out waiting for status change.")

if __name__ == "__main__":
    test_quality_checker_e2e()
