#!/bin/bash

BASE_URL="http://localhost:8000/api/v1"

echo "1. Creating a very vague idea..."
CREATE_RESP=$(curl -s -X POST "$BASE_URL/ideas/create/" \
  -H "Content-Type: application/json" \
  -d '{"user_email": "test@example.com", "title": "A new app", "description": "It helps people do things faster."}')

echo "Create Response: $CREATE_RESP"
IDEA_ID=$(echo $CREATE_RESP | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)

if [ -z "$IDEA_ID" ]; then
  echo "Failed to get Idea ID"
  exit 1
fi

echo "Idea ID: $IDEA_ID"

echo "2. Starting analysis..."
START_RESP=$(curl -s -X POST "$BASE_URL/agent/start/" \
  -H "Content-Type: application/json" \
  -d "{\"idea_id\": \"$IDEA_ID\"}")

echo "Start Response: $START_RESP"
RUN_ID=$(echo $START_RESP | grep -o '"agent_run_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
  echo "Failed to get Run ID"
  exit 1
fi

echo "Run ID: $RUN_ID"

echo "3. Polling for status..."
for i in {1..20}; do
  sleep 3
  STATUS_RESP=$(curl -s "$BASE_URL/agent/status/$RUN_ID/")
  STATUS=$(echo $STATUS_RESP | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  echo "Current status: $STATUS"
  
  if [ "$STATUS" == "awaiting_clarification" ]; then
    echo "SUCCESS: Idea description quality checker is working and requested clarification!"
    echo "Full status response: $STATUS_RESP"
    exit 0
  fi
  
  if [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ] || [ "$STATUS" == "partial" ]; then
    echo "Finished with status: $STATUS"
    echo "Full status response: $STATUS_RESP"
    exit 0
  fi
done

echo "Timed out waiting for status change."
