folder structure

```
FounderMind/
├── foundermind_backend/
│
│   ├── foundermind_backend/            # Django project core
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── wsgi.py
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   └── urls.py
│
│   ├── apps/                           # All feature apps grouped
│   │
│   │   ├── users/
│   │   │   ├── migrations/
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   ├── permissions.py
│   │   │   └── services.py
│   │
│   │   ├── ideas/
│   │   │   ├── migrations/
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   ├── services.py
│   │   │   └── scoring.py
│   │
│   │   ├── agent/                      # AI orchestration app
│   │   │   ├── planner.py
│   │   │   ├── executor.py
│   │   │   ├── critic.py
│   │   │   ├── reporter.py
│   │   │   ├── tools/
│   │   │   │   ├── search.py
│   │   │   │   ├── market.py
│   │   │   │   ├── funding.py
│   │   │   │   ├── monetization.py
│   │   │   │   ├── techstack.py
│   │   │   │   └── swot.py
│   │   │   ├── prompts.py
│   │   │   └── services.py
│   │
│   │   ├── analytics/                  # TAM, charts, risk engine
│   │   │   ├── tam.py
│   │   │   ├── risk_engine.py
│   │   │   ├── competitor_matrix.py
│   │   │   └── services.py
│   │
│   │   ├── pitchdeck/                  # Pitch deck generator
│   │   │   ├── generator.py
│   │   │   ├── templates/
│   │   │   └── services.py
│   │
│   │   └── subscriptions/              # SaaS layer
│   │       ├── models.py
│   │       ├── views.py
│   │       ├── services.py
│   │       └── limits.py
│
│   ├── core/                           # Shared logic
│   │   ├── utils.py
│   │   ├── constants.py
│   │   ├── exceptions.py
│   │   ├── permissions.py
│   │   └── middleware.py
│
│   ├── integrations/                   # External APIs
│   │   ├── gemini_client.py
│   │   ├── serpapi_client.py
│   │   └── vector_store.py
│
│   ├── config/
│   │   ├── celery.py
│   │   └── logging.py
│
│   ├── manage.py
│   └── .env
│
├── requirements.txt
└── docker-compose.yml
```
