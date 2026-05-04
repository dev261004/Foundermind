# Foundermind Project - Complete Technical Guide

**Last Updated:** May 2026

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Agent Pipeline (Detailed)](#agent-pipeline-detailed)
5. [Data Flow](#data-flow)
6. [Key Components](#key-components)
7. [Integrations](#integrations)
8. [Database Models](#database-models)
9. [Scoring & Confidence Metrics](#scoring--confidence-metrics)
10. [Error Handling & Resilience](#error-handling--resilience)

---

## Project Overview

**Foundermind** is an AI-powered **startup idea analysis platform** that helps entrepreneurs evaluate their business ideas using an intelligent agent-based pipeline.

### What It Does
Users submit a startup idea description, and the platform automatically:
- Classifies the idea type (tech, marketplace, deeptech, etc.)
- Plans a multi-tool analysis strategy
- Executes tools to gather market research, competitive analysis, and strategic insights
- Critiques and scores the analysis quality
- Generates a comprehensive founder-facing report

### Key Value Propositions
- **Rapid Analysis:** Complete 7-section analysis in ~2-3 minutes
- **Multi-Perspective:** Combines LLM reasoning with external search data
- **Transparent Execution:** Real-time execution logs showing agent progress
- **Fault-Tolerant:** Checkpointing allows resumable failed runs
- **Adaptive Scoring:** Weights analysis based on idea type (tech vs. marketplace vs. deeptech)

---

## Tech Stack

### Backend Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Django 5.2.11 + DRF | REST API for analysis requests |
| **Database (Primary)** | MongoDB (MongoEngine) | Flexible document storage for analysis results |
| **Database (Admin)** | SQLite | Django ORM for user/admin panels |
| **Task Queue** | Celery + Redis | Async agent pipeline execution |
| **LLM Provider** | Google Gemini API | Core reasoning engine |
| **Search API** | SerpAPI | Google search for market research |
| **Auth** | JWT + bcrypt | Secure user authentication |

### Frontend Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 16 + React 19 | Full-stack TypeScript application |
| **State Management** | Zustand | Client-side store for UI state |
| **UI Components** | Radix UI + Tailwind CSS | Accessible, styled UI components |
| **Icons** | Lucide Icons | Modern SVG icons |
| **3D Graphics** | Three.js + react-three-fiber | Interactive data visualizations |
| **Animations** | Framer Motion | Smooth UI transitions |
| **API Client** | Axios | HTTP requests with interceptors |
| **Markdown** | React Markdown | Render analysis text content |

### Key Dependencies Summary
```
Backend:
- python-dotenv (environment management)
- bcrypt (password hashing)
- PyJWT (token generation)
- google-genai (Gemini SDK)
- django-cors-headers (CORS support)
- celery (task queue)
- redis (message broker)
- mongoengine (MongoDB ORM)

Frontend:
- Next.js 16
- React 19
- TypeScript
- Zustand
- Radix UI
- Tailwind CSS
- Three.js
- Framer Motion
```

---

## System Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     FOUNDERMIND SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Next.js)                                        │
│  ├─ IdeaAnalysisPage (Real-time polling)                  │
│  ├─ ResultsDisplay (7-section dashboard)                  │
│  └─ AgentStatus (Execution log tracking)                  │
│                     ↓ REST API (Axios)                    │
│  Backend (Django + DRF)                                   │
│  ├─ /ideas/create/ (Save idea to MongoDB)                │
│  ├─ /agent/start/ (Queue Celery task)                    │
│  ├─ /agent/status/{run_id}/ (Poll run status)            │
│  └─ /agent/results/{run_id}/ (Get analysis results)      │
│                     ↓ Celery Queue                        │
│  Agent Pipeline (Orchestrator)                           │
│  ├─ Stage 1: Classification (Orchestrator.classify_idea) │
│  ├─ Stage 2: Planning (Planner.create_plan)             │
│  ├─ Stage 3: Execution (Executor.execute_with_plan)     │
│  ├─ Stage 4: Enrichment (Orchestrator.enrich_results)   │
│  ├─ Stage 5: Critique (Critic.review_results)           │
│  ├─ Stage 6: Reporting (Reporter.generate_report)       │
│  └─ → Save to MongoDB (AgentRun + IdeaAnalysis)          │
│                                                             │
│  External Integrations                                    │
│  ├─ Google Gemini API (LLM reasoning)                    │
│  ├─ SerpAPI (Google search)                              │
│  └─ MongoDB (persistent storage)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Pattern

**Orchestrated Multi-Agent System with Checkpointing & Iterative Refinement**

- Each agent specializes in a specific task (planning, execution, critique, reporting)
- Agents communicate via structured JSON schemas
- State is checkpointed after each stage for resumability
- Failed tasks can be retried without re-executing completed stages

---

## Agent Pipeline (Detailed)

The core strength of Foundermind is its **5-stage agent-based analysis pipeline**. Here's how each stage works:

### Stage 1: Idea Classification (Orchestrator Agent)

**Purpose:** Categorize the startup idea to customize the analysis approach

**How It Works:**
1. Input: User's idea description
2. LLM uses a hybrid classification approach:
   - Primary: Gemini LLM classifies into categories
   - Fallback: Rule-based heuristics (keyword matching) if LLM fails
3. Output: Idea type + confidence score

**Classification Categories:**
- **Tech:** SaaS, developer tools, infrastructure
- **Marketplace:** Multi-sided platforms (buyer-seller)
- **DeepTech:** Hardware, biotech, advanced materials
- **General:** Everything else

**Why This Matters:** Different idea types get different analysis weights later
- Tech ideas: Emphasize market data (20%) + monetization (25%)
- Marketplace ideas: Emphasize comparable startups (25%) + market data (25%)
- DeepTech ideas: Balanced scoring across all factors

**Models Used:**
- Primary: `gemini-3.1-flash-lite-preview`
- Fallback: `gemma-3-27b-it` (if quota exhausted)

**Example:**
```
Input: "A mobile app for sustainable fashion supply chain tracking"
Output: {
  "idea_type": "tech",
  "confidence": 0.92,
  "reasoning": "SaaS application with tech-stack focus"
}
```

---

### Stage 2: Planning (Planner Agent)

**Purpose:** Dynamically determine which tools to run and in what order

**How It Works:**
1. Input: Idea description + classification type
2. Planner LLM decides:
   - Which tools are most relevant for THIS idea
   - What order to run them (some tools might depend on others)
   - Tool parameters and search queries
3. Output: Structured JSON execution plan

**Available Tools:**

| Tool | Purpose | Example |
|------|---------|---------|
| `search_similar_startups` | Find comparable companies & funding | "Similar to Stripe: payment infrastructure" |
| `search_market_data` | TAM, growth rates, market trends | "TAM for logistics software: $XX billion" |
| `search_funding_info` | Recent capital patterns in the space | "Series A funding in edtech grew 40%" |
| `generate_monetization_strategy` | Revenue models & pricing strategies | "Freemium model for B2B users" |
| `generate_customer_profile` | Target audience & buyer personas | "Early-adopter CTOs at Series A startups" |
| `suggest_tech_stack` | Technical recommendations | "Python/FastAPI backend, React frontend" |
| `generate_swot_analysis` | Strategic analysis framework | "Strengths: existing user base..." |

**Plan Example:**
```json
{
  "tools": [
    {
      "name": "search_similar_startups",
      "order": 1,
      "query": "sustainable fashion supply chain software",
      "depends_on": []
    },
    {
      "name": "search_market_data",
      "order": 2,
      "query": "fashion tech market size growth",
      "depends_on": []
    },
    {
      "name": "generate_monetization_strategy",
      "order": 3,
      "query": "B2B SaaS subscription for fashion",
      "depends_on": ["search_market_data"]
    }
  ]
}
```

**Model Used:** `gemini-2.5-flash` (most powerful, balanced reasoning)

---

### Stage 3: Execution (Tool Executor Agent)

**Purpose:** Run all planned tools in sequence, gathering raw data

**How It Works:**
1. Input: Execution plan from Stage 2
2. Executor processes tools sequentially:
   - Respects dependencies (waits for prerequisite tools)
   - Adds 3-second delay between requests to manage API rate limits
   - Calls external APIs (Gemini, SerpAPI)
   - Serializes results (JSON for structured, strings for unstructured text)
3. Checkpointing: Records each completed tool to skip on retry
4. Output: Raw analysis data for all tools

**Execution Features:**

**Rate Limiting & Resilience:**
- 3-second inter-tool delay (prevents overwhelming APIs)
- Exponential backoff on rate limit errors:
  - Primary model: Wait 15s → 30s → 60s before retry
  - Fallback model: Wait 15s → 30s before retry
- Transient error retry (auto-retry for 500/502/503/504 HTTP errors)
- 60-second per-request timeout

**Checkpointing:**
- Each completed tool is logged with timestamp and result
- If task fails mid-execution:
  - Can retry the same task
  - Executor skips already-completed tools
  - Resumes from next incomplete tool
- Enables fast recovery without wasting API calls

**Example Execution Log:**
```
[
  {
    "tool": "search_similar_startups",
    "agent": "executor",
    "status": "success",
    "result": "[{\"name\": \"Vestiaire Collective\", ...}, ...]",
    "model_used": "gemini-3.1-flash-lite-preview",
    "timestamp": "2026-05-04T10:23:15Z"
  },
  {
    "tool": "search_market_data",
    "agent": "executor",
    "status": "success",
    "result": "Global fashion market is $1.5T, growing 8% CAGR...",
    "model_used": "gemini-3.1-flash-lite-preview",
    "timestamp": "2026-05-04T10:23:20Z"
  }
]
```

**Models Used:**
- Heavy lifting: `gemini-3.1-flash-lite-preview` (cheaper, fast)
- Fallback: `gemma-4-31b-it` (open-source alternative)

---

### Stage 4: Enrichment (Orchestrator Agent)

**Purpose:** Extract quantitative insights from raw market data

**How It Works:**
1. Input: Raw market_data from Stage 3
2. Orchestrator applies analytics engine:
   - **Market Model Engine:** Extracts TAM, CAGR, growth rates from unstructured text
   - Converts "Global fashion market is $1.5T growing 8% CAGR" → structured data
3. Output: Quantitative market model for scoring validation

**Example Output:**
```json
{
  "market_quantitative_model": {
    "tam": 1500000000,
    "tam_currency": "USD",
    "cagr": 0.08,
    "market_growth_rate": 0.08,
    "opportunity_score": 0.85,
    "market_confidence": 0.9
  }
}
```

---

### Stage 5: Critique & Scoring (Critic Agent)

**Purpose:** Review execution quality and identify gaps; assign 1-10 scores

**How It Works:**
1. Input: All execution results from Stage 3
2. Critic LLM evaluates each section:
   - similar_startups: Relevance, depth, competitive insights
   - market_data: Quantifiable metrics, trend clarity
   - funding_info: Capital patterns, deal signals
   - monetization: Business model viability
   - customer_profile: Persona clarity, TAM alignment
   - tech_stack: Technical feasibility
   - swot: Insight depth
3. Assigns 1-10 score per section
4. Flags missing/poor sections for potential re-execution
5. Output: Critique JSON with scores + recommendations

**Scoring Criteria (1-10 scale):**
- **1-3:** Missing, irrelevant, or generic
- **4-6:** Adequate but shallow
- **7-8:** Good depth and specificity
- **9-10:** Excellent, actionable insights

**Critic Output Example:**
```json
{
  "similar_startups": {
    "score": 8,
    "feedback": "Good competitive set identified"
  },
  "market_data": {
    "score": 9,
    "feedback": "Clear TAM and growth metrics"
  },
  "monetization": {
    "score": 5,
    "feedback": "Generic model, lacks pricing specifics"
  },
  "overall_score": 7.5,
  "issues_found": ["Missing competitor pricing data"],
  "rerun_recommendations": []
}
```

**Model Used:** `gemini-3.1-flash-lite-preview`

---

### Stage 6: Report Generation (Reporter Agent)

**Purpose:** Create a founder-facing narrative summary

**How It Works:**
1. Input: All tool outputs + critique results
2. Reporter LLM synthesizes key insights:
   - Converts raw data into compelling narrative
   - Highlights top competitive advantages
   - Flags market risks
   - Provides actionable next steps
3. Gracefully handles missing sections (doesn't break if a tool failed)
4. Output: Plain-text summary report

**Example Report Section:**
```
"Your sustainable fashion supply chain idea targets a $1.5B market growing 8% annually.
Competitors like Vestiaire Collective and Fashionphile have demonstrated demand.
Key advantage: B2B focus on manufacturing transparency.
Recommended first users: eco-luxury brands and mid-market fashion retailers.
Technical stack: Node.js backend, React frontend, PostgreSQL database."
```

**Model Used:** `gemini-3.1-flash-lite-preview`

---

### Stage 7: Scoring & Weighting (Orchestrator Agent)

**Purpose:** Calculate final overall score based on idea type

**How It Works:**

**Weighted Score Formula:**
```
weighted_score = Σ(idea_type_weight[section] × section_score)
```

**Weight Matrices by Idea Type:**

**Tech Ideas (SaaS, Developer Tools):**
```
- similar_startups: 15% (competitive landscape)
- market_data: 20% (TAM validation)
- funding_info: 10% (capital availability)
- monetization: 25% (revenue model critical)
- customer_profile: 15% (target market clarity)
- tech_stack: 15% (technical feasibility)
```

**Marketplace Ideas (Multi-Sided Platforms):**
```
- similar_startups: 25% (critical to understand competitors)
- market_data: 25% (both-sides need validation)
- funding_info: 10%
- monetization: 15% (takes-rate model)
- customer_profile: 15% (dual personas needed)
- tech_stack: 10%
```

**DeepTech Ideas (Hardware, Biotech):**
```
- similar_startups: 15%
- market_data: 20%
- funding_info: 20% (longer capital requirements)
- monetization: 15%
- customer_profile: 15%
- tech_stack: 15%
```

**Analysis Confidence Metric:**
```
analysis_confidence = 
  0.4 × (overall_score / 10) +
  0.4 × (average_section_scores / 10) +
  0.2 × classification_confidence
```

This blends the Critic's overall assessment (40%), consistency across sections (40%), and confidence in the idea classification (20%).

---

## Data Flow

### Complete User Journey

```
1. USER CREATES IDEA
   ├─ User fills form: "I'm building a sustainable fashion tracking app"
   ├─ Frontend: POST /ideas/create/
   └─ Backend: Create Idea document in MongoDB

2. USER CLICKS "ANALYZE"
   ├─ Frontend: POST /agent/start/
   ├─ Backend: CreateAgentRun(idea_id, status="pending")
   ├─ Backend: Queue Celery task: run_startup_analysis(run_id)
   └─ Frontend: Start polling GET /agent/status/{run_id}/

3. CELERY TASK STARTS (Background Process)
   │
   ├─ STAGE 1: Classification
   │  └─ Orchestrator.classify_idea()
   │     ├─ LLM: Classify idea type
   │     └─ Save: IdeaClassification(type="tech", confidence=0.92)
   │
   ├─ STAGE 2: Planning
   │  └─ Planner.create_plan()
   │     ├─ LLM: Which tools to run?
   │     ├─ Output: ExecutionPlan with 7 tools in sequence
   │     └─ Log: execution_log entry (tool="planning", status="success")
   │
   ├─ STAGE 3: Execution
   │  └─ Executor.execute_with_plan()
   │     ├─ For each tool in plan:
   │     │  ├─ Check if already completed (checkpointing)
   │     │  ├─ Wait 3 seconds (rate limiting)
   │     │  ├─ Call tool:
   │     │  │  ├─ If search_similar_startups: Call Gemini + SerpAPI
   │     │  │  ├─ If search_market_data: Call Gemini search
   │     │  │  ├─ If generate_swot: Call Gemini LLM
   │     │  │  └─ etc.
   │     │  ├─ Serialize result (JSON or string)
   │     │  ├─ Log: execution_log entry (tool_name, status, result)
   │     │  └─ Save to ToolResult collection
   │     └─ All tool outputs collected in results dict
   │
   ├─ STAGE 4: Enrichment
   │  └─ Orchestrator.enrich_results()
   │     ├─ MarketModelEngine.extract_quantitative_data()
   │     │  └─ Parse "Global market $1.5B, 8% CAGR" → {tam: 1.5B, cagr: 0.08}
   │     └─ Add market_quantitative_model to results
   │
   ├─ STAGE 5: Critique
   │  └─ Critic.review_results()
   │     ├─ LLM: Score each section 1-10
   │     ├─ Identify weak sections
   │     └─ Output: Critique JSON with scores
   │
   ├─ STAGE 6: Reporting
   │  └─ Reporter.generate_report()
   │     ├─ LLM: Synthesize narrative summary
   │     └─ Output: Plain-text report_summary
   │
   ├─ STAGE 7: Final Scoring
   │  └─ Orchestrator.calculate_scores()
   │     ├─ weighted_score = Σ(type_weights × section_scores)
   │     ├─ analysis_confidence = blended metric
   │     └─ Log all scores
   │
   └─ SAVE RESULTS
      ├─ Create IdeaAnalysis(
      │    similar_startups: [...],
      │    market_data: "string",
      │    market_quantitative_model: {...},
      │    funding_info: [...],
      │    monetization: [...],
      │    customer_profile: {...},
      │    tech_stack: {...},
      │    swot: {...},
      │    report_summary: "string"
      │  )
      ├─ Update AgentRun(
      │    status: "completed",
      │    overall_score: 7.5,
      │    weighted_score: 7.2,
      │    analysis_confidence: 0.78,
      │    critique: {...},
      │    execution_log: [all entries],
      │    models_used: ["gemini-3.1-flash-lite-preview", ...]
      │  )
      └─ Frontend polls and gets updated status

4. FRONTEND DISPLAYS RESULTS
   ├─ IdeaAnalysisPage component fetches AgentRun
   ├─ Renders 7-section dashboard:
   │  ├─ Comparable Startups (similar_startups)
   │  ├─ Market Data (market_data + quantitative_model)
   │  ├─ Funding Landscape (funding_info)
   │  ├─ Monetization Strategy (monetization)
   │  ├─ Customer Profile (customer_profile)
   │  ├─ Suggested Tech Stack (tech_stack)
   │  └─ Strategic SWOT (swot)
   ├─ Summary panel shows:
   │  ├─ report_summary (narrative)
   │  ├─ overall_score (from Critic)
   │  ├─ weighted_score (type-adjusted)
   │  ├─ analysis_confidence
   │  └─ Execution log with timestamps
   └─ User can expand each section, read full text, export PDF
```

### Database Schema

**Three Main Collections (MongoDB):**

#### Idea
```javascript
{
  _id: ObjectId,
  user_email: "founder@example.com",
  title: "Sustainable Fashion Supply Chain App",
  description: "Mobile app for tracking sustainable fashion...",
  status: "analyzed" | "pending" | "failed",
  created_at: ISODate,
  updated_at: ISODate
}
```

#### AgentRun
```javascript
{
  _id: ObjectId,
  idea_id: ObjectId (ref to Idea),
  status: "pending" | "running" | "completed" | "failed" | "partial" | "quota_exhausted",
  
  // Execution Tracking
  execution_log: [
    {
      tool: "search_similar_startups",
      agent: "executor",
      status: "success" | "failed" | "skipped",
      result: JSON.stringify(tool_output),
      model_used: "gemini-3.1-flash-lite-preview",
      error: null,
      timestamp: ISODate
    },
    ...
  ],
  
  // Critique Data
  critique: {
    similar_startups: {score: 8, feedback: "..."},
    market_data: {score: 9, feedback: "..."},
    funding_info: {score: 7, feedback: "..."},
    monetization: {score: 5, feedback: "..."},
    customer_profile: {score: 7, feedback: "..."},
    tech_stack: {score: 8, feedback: "..."},
    swot: {score: 6, feedback: "..."},
    overall_score: 7.5,
    issues_found: ["..."],
    rerun_recommendations: []
  },
  
  // Scoring
  overall_score: 7.5,
  weighted_score: 7.2,
  analysis_confidence: 0.78,
  
  // Report
  report_summary: "Your sustainable fashion idea targets...",
  
  // Metadata
  models_used: ["gemini-3.1-flash-lite-preview", "gemini-2.5-flash"],
  started_at: ISODate,
  completed_at: ISODate,
  duration_seconds: 147
}
```

#### IdeaAnalysis
```javascript
{
  _id: ObjectId,
  run_id: ObjectId (ref to AgentRun),
  idea_id: ObjectId (ref to Idea),
  
  // Tool Results
  similar_startups: [
    {
      name: "Vestiaire Collective",
      description: "Luxury consignment platform",
      funding: "$X million",
      focus_area: "sustainable fashion resale"
    },
    ...
  ],
  
  market_data: "Global fashion market is $1.5T...",
  
  market_quantitative_model: {
    tam: 1500000000,
    tam_currency: "USD",
    cagr: 0.08,
    market_growth_rate: 0.08,
    opportunity_score: 0.85,
    market_confidence: 0.9
  },
  
  funding_info: [
    {
      company: "Fashion Tech Startup",
      round: "Series A",
      amount: "$5M",
      year: 2025
    },
    ...
  ],
  
  monetization: [
    {
      model: "B2B SaaS Subscription",
      price_point: "$299-$999/month",
      target_customer: "Mid-market fashion brands",
      viability: "High"
    },
    ...
  ],
  
  customer_profile: {
    primary_personas: [
      {
        name: "Sustainability Manager",
        company_size: "100-500 employees",
        pain_point: "Lack of supply chain transparency"
      }
    ],
    tam_customers: 15000,
    tam_arpu: 500
  },
  
  tech_stack: {
    backend: "Node.js, Express",
    frontend: "React, TypeScript",
    database: "PostgreSQL",
    infrastructure: "AWS, Docker",
    integrations: ["Stripe", "Twilio"]
  },
  
  swot: {
    strengths: ["B2B focus", "Existing demand signals"],
    weaknesses: ["Competitive landscape"],
    opportunities: ["Regulatory compliance needs"],
    threats: ["Large enterprise competitors"]
  },
  
  created_at: ISODate
}
```

---

## Key Components

### Backend: Core Agents

#### 1. **Orchestrator** (`orchestrator.py`)
```
Responsibilities:
├─ classify_idea(idea_description) → idea_type, confidence
├─ create_execution_plan(idea_type) → tool_sequence
├─ enrich_results(tool_outputs) → quantitative_model
├─ calculate_weighted_scores(section_scores, idea_type) → final_score
└─ monitor_execution(execution_log) → status_updates
```

**Key Methods:**
- `run_analysis(idea)`: Master orchestration function that calls all stages
- `classify_idea()`: LLM-based or rule-based categorization
- `calculate_weighted_scores()`: Applies idea-type weights to section scores

#### 2. **Planner** (`planner.py`)
```
Responsibilities:
└─ create_plan(idea_description, idea_type) → ExecutionPlan JSON
   ├─ Decide which tools are relevant
   ├─ Determine tool order (dependency graph)
   └─ Set tool parameters and search queries
```

**Key Methods:**
- `create_plan()`: LLM prompts Gemini to generate JSON execution plan

#### 3. **Tool Executor** (`executor.py`)
```
Responsibilities:
├─ execute_with_plan(execution_plan, existing_results) → all_tool_outputs
│  ├─ Check checkpoint (skip completed tools)
│  ├─ For each tool:
│  │  ├─ Wait 3 seconds
│  │  ├─ Call tool function
│  │  ├─ Handle rate limits & transient errors
│  │  ├─ Serialize result
│  │  └─ Log execution_log entry
│  └─ Return aggregated results
├─ search_similar_startups(query) → List[Dict]
├─ search_market_data(query) → str
├─ search_funding_info(query) → List[Dict]
├─ generate_monetization_strategy(idea) → List[Dict]
├─ generate_customer_profile(idea) → Dict
├─ suggest_tech_stack(idea) → Dict
└─ generate_swot_analysis(idea, competitors) → Dict
```

**Key Features:**
- **Checkpointing:** Skips already-completed tools
- **Rate Limiting:** 3-second delay + exponential backoff
- **Error Handling:** Transient error retry logic
- **Serialization:** JSON for structured, strings for text

#### 4. **Critic** (`critic.py`)
```
Responsibilities:
└─ review_results(all_tool_outputs) → Critique JSON
   ├─ Score similar_startups (1-10)
   ├─ Score market_data (1-10)
   ├─ Score funding_info (1-10)
   ├─ Score monetization (1-10)
   ├─ Score customer_profile (1-10)
   ├─ Score tech_stack (1-10)
   ├─ Score swot (1-10)
   ├─ Calculate overall_score
   └─ Flag weak sections & rerun recommendations
```

**Scoring Logic:**
- 1-3: Missing/irrelevant
- 4-6: Adequate but shallow
- 7-8: Good depth
- 9-10: Excellent, actionable

#### 5. **Reporter** (`reporter.py`)
```
Responsibilities:
└─ generate_report(all_tool_outputs, critique) → report_summary (string)
   ├─ Synthesize narrative summary
   ├─ Highlight competitive advantages
   ├─ Flag market risks
   ├─ Gracefully handle missing sections
   └─ Provide actionable next steps
```

**Key Feature:**
- Doesn't break if tools failed; synthesizes from available data

---

### Frontend: Main Components

#### IdeaAnalysisPage.tsx
**Purpose:** Main results dashboard
**Functionality:**
- Polls `/agent/status/{run_id}/` every 2-3 seconds during analysis
- Displays 7-section dashboard with real-time updates
- Shows execution log with timestamps
- Renders results in cards with icons and formatting
- PDF export button for summaries

**Data Flow:**
```
1. Get run_id from URL params
2. Poll for status
3. When status="completed", fetch IdeaAnalysis
4. Render results in 7 sections
5. Display execution_log in timeline view
```

**Result Sections Rendered:**
1. Comparable Startups → renders as list with icons
2. Market Data → renders as text + quantitative model
3. Funding Landscape → renders as table
4. Monetization Strategy → renders as list
5. Customer Profile → renders as personas + TAM metrics
6. Tech Stack → renders as tech choices
7. Strategic SWOT → renders as matrix

---

## Integrations

### 1. Google Gemini LLM Client

**File:** `gemini_client.py`

**Features:**
- **Dual-Model Strategy:** Primary model + fallback model
  - Primary: `gemini-2.5-flash` (Planner) or `gemini-3.1-flash-lite-preview` (Executor)
  - Fallback: `gemma-4-31b-it` (if primary quota exhausted)
- **Rate Limit Handling:**
  - 429 response → wait 15s, 30s, 60s with exponential backoff
  - Switch to fallback if rate limits persist
- **Transient Error Retry:**
  - Auto-retry on 500, 502, 503, 504 HTTP errors
- **Timeout Management:**
  - 60-second per-request timeout
  - 65-second guard timeout (ensures cleanup)
- **Thread-Safe:** Process-aware locking for concurrent requests

**Key Methods:**
```python
def call_gemini_api(
    prompt: str,
    model: str = "gemini-2.5-flash",
    temperature: float = 0.7,
    max_tokens: int = 4000
) -> str:
    # Call Gemini with fallback logic
    pass

def call_gemini_with_fallback(
    prompt: str,
    primary_model: str,
    fallback_model: str
) -> Tuple[str, str]:  # (response, model_used)
    pass
```

**Example Usage:**
```python
response, model_used = gemini_client.call_gemini_with_fallback(
    prompt="Classify this startup idea: ...",
    primary_model="gemini-2.5-flash",
    fallback_model="gemma-3-27b-it"
)
print(f"Response: {response}")
print(f"Model used: {model_used}")
```

### 2. SerpAPI Search

**File:** `serpapi_client.py`

**Features:**
- Wraps Google search API
- Returns organic search results (top 5)
- 30-second timeout
- Basic error logging

**Key Methods:**
```python
def search(query: str, num_results: int = 5) -> List[Dict]:
    # Returns: [{"title": "...", "link": "...", "snippet": "..."}, ...]
    pass
```

**Example Usage:**
```python
results = serpapi_client.search("sustainable fashion market trends")
for result in results:
    print(f"{result['title']}: {result['snippet']}")
```

### 3. MongoDB Integration

**Via:** MongoEngine ORM

**Collections:**
- `Idea` - User startup ideas
- `AgentRun` - Analysis execution records
- `IdeaAnalysis` - Structured analysis results
- `IdeaTypeWeights` - Scoring configuration per idea type

**Connection:** Django settings via `MONGODB_URI`

---

## Database Models

### Complete Model Reference

#### IdeaTypeWeights (Scoring Configuration)

**Purpose:** Stores weighted importance of each section per idea type

**Schema:**
```javascript
{
  idea_type: "tech" | "marketplace" | "deeptech" | "general",
  weights: {
    similar_startups: 0.15,
    market_data: 0.20,
    funding_info: 0.10,
    monetization: 0.25,
    customer_profile: 0.15,
    tech_stack: 0.15,
    swot: 0.0  // varies by type
  },
  created_at: ISODate
}
```

#### Execution Log Entry

**Schema:**
```javascript
{
  tool: string,                    // e.g., "search_similar_startups"
  agent: string,                   // "executor", "planner", "critic", etc.
  status: "success" | "failed" | "skipped",
  result: string,                  // JSON stringified result
  model_used: string,              // "gemini-3.1-flash-lite-preview"
  error: string | null,            // error message if failed
  timestamp: ISODate,
  duration_ms: number              // execution time
}
```

---

## Scoring & Confidence Metrics

### Overall Score (1-10)
- Assigned by Critic agent
- Reflects quality of analysis depth across sections
- Used in final report

### Section Scores (1-10 each)
- Scored by Critic for each of 7 sections
- Criteria varies per section:
  - **Similar Startups:** Relevance, depth, competitive insights
  - **Market Data:** Quantifiable metrics, trend clarity
  - **Funding Info:** Capital patterns, deal signals
  - **Monetization:** Business model viability, pricing specificity
  - **Customer Profile:** Persona clarity, TAM alignment
  - **Tech Stack:** Technical feasibility, modern stack
  - **SWOT:** Insight depth, strategic value

### Weighted Score
```
weighted_score = Σ(idea_type_weights[section] × section_score[section])
```

**Example Calculation:**
```
Idea Type: "tech"
Weights: {similar: 0.15, market: 0.20, funding: 0.10, monetization: 0.25, customer: 0.15, tech: 0.15}
Scores: {similar: 8, market: 9, funding: 7, monetization: 5, customer: 7, tech: 8}

weighted_score = (0.15×8) + (0.20×9) + (0.10×7) + (0.25×5) + (0.15×7) + (0.15×8)
              = 1.2 + 1.8 + 0.7 + 1.25 + 1.05 + 1.2
              = 7.2
```

### Analysis Confidence
```
confidence = 
  0.4 × (overall_score / 10) +
  0.4 × (average_section_scores / 10) +
  0.2 × classification_confidence
```

**Interpretation:**
- 0.8+: High confidence in analysis quality
- 0.6-0.8: Moderate confidence
- <0.6: Low confidence (may need rerun)

---

## Error Handling & Resilience

### Task Timeout Strategy

| Limit | Value | Action |
|-------|-------|--------|
| Soft Limit | 5 minutes (300s) | Task switches to background |
| Hard Limit | 6 minutes (360s) | Celery kills task forcibly |
| Per-Request | 60s | LLM API call timeout |

### Failure Modes & Recovery

#### 1. **API Rate Limit (429)**
```
Detection: HTTP 429 from Gemini
Recovery:
├─ Exponential backoff: 15s → 30s → 60s
├─ Switch to fallback model
├─ If fallback also rate-limited: Mark as "quota_exhausted"
└─ Frontend can retry later
```

#### 2. **Transient API Error (500/502/503)**
```
Detection: HTTP 5xx error
Recovery:
├─ Auto-retry immediately
├─ Retry up to 3 times
└─ If all fail: Mark tool as failed, continue with others
```

#### 3. **Tool Execution Failure**
```
Detection: Tool function throws exception
Status Saved: "partial"
Recovery:
├─ Log error to execution_log with timestamp
├─ Mark tool as failed (skip on future retry)
├─ Continue with remaining tools
└─ Critic marks section with lower score
```

#### 4. **Task Timeout**
```
Detection: Task exceeds 6-minute hard limit
Recovery:
├─ Celery kills task
├─ AgentRun marked as "partial" (if some tools completed)
├─ Frontend can retry: will skip completed tools via checkpointing
└─ Same AgentRun ID continues execution
```

### Resumability via Checkpointing

**How It Works:**
1. Each completed tool is logged with timestamp + result
2. On retry, Executor scans execution_log
3. If tool already completed: **skip it**
4. If tool failed/incomplete: **run it**
5. Prevents wasted API calls and speeds up recovery

**Example:**
```
First attempt (failed after 3/7 tools):
├─ search_similar_startups: SUCCESS ✓
├─ search_market_data: SUCCESS ✓
├─ search_funding_info: SUCCESS ✓
├─ generate_monetization_strategy: FAILED ✗
├─ generate_customer_profile: SKIPPED (not reached)
└─ ...

Second attempt (same run_id):
├─ search_similar_startups: SKIPPED (already done) ⏩
├─ search_market_data: SKIPPED (already done) ⏩
├─ search_funding_info: SKIPPED (already done) ⏩
├─ generate_monetization_strategy: RUNNING (retry) ↻
├─ generate_customer_profile: RUNNING
└─ ... (rest of pipeline continues)
```

### Fallback Models

| Stage | Primary Model | Fallback Model | Use Case |
|-------|---|---|---|
| Planning | `gemini-2.5-flash` | `gemma-3-27b-it` | If quota exhausted |
| Execution | `gemini-3.1-flash-lite` | `gemma-4-31b-it` | If primary fails |
| Critic | `gemini-3.1-flash-lite` | Rule-based scoring | If LLM fails |
| Reporter | `gemini-3.1-flash-lite` | Generic template | If LLM fails |

---

## Quick Reference: Key Concepts

### Agent Roles

| Agent | Input | Output | Model |
|-------|-------|--------|-------|
| **Orchestrator** | Idea description | Classification type, weights | Gemini 3.1 |
| **Planner** | Idea + type | Tool sequence JSON | Gemini 2.5 |
| **Executor** | Plan + tools | Raw tool outputs | Gemini 3.1 |
| **Critic** | All outputs | Section scores (1-10) | Gemini 3.1 |
| **Reporter** | All outputs + critique | Narrative summary | Gemini 3.1 |

### Pipeline Stages (Sequential)

1. **Classification** → Idea type + confidence
2. **Planning** → Tool selection + ordering
3. **Execution** → Data gathering (7 tools)
4. **Enrichment** → Quantitative model extraction
5. **Critique** → Quality scoring (1-10 per section)
6. **Reporting** → Narrative synthesis
7. **Scoring** → Type-weighted final score

### Status Values

| Status | Meaning | Can Retry? |
|--------|---------|-----------|
| `pending` | Queued, not started | Yes |
| `running` | Actively executing | No |
| `completed` | All stages passed | No (cache result) |
| `partial` | Some tools failed | Yes (checkpointing) |
| `failed` | Critical failure (all tools failed) | Yes |
| `quota_exhausted` | API quota limit hit | Yes (exponential backoff) |

### Key API Endpoints

```
POST   /ideas/create/                    Create new idea
POST   /agent/start/                     Start analysis
GET    /agent/status/{run_id}/           Poll run status
GET    /agent/results/{run_id}/          Get analysis results
POST   /agent/retry/{run_id}/            Retry failed analysis
```

---

## Interview Tips

### How to Explain This Project

**30-Second Pitch:**
> "Foundermind is an AI-powered startup analysis platform. Users submit an idea, and our agent pipeline automatically analyzes it across 7 dimensions: market size, comparable startups, funding patterns, monetization strategy, customer profile, tech stack, and SWOT analysis. The system uses orchestrated LLM agents with checkpointing for fault tolerance, and dynamically weights the final score based on idea type."

**Key Strengths to Highlight:**
1. **Multi-Agent Orchestration:** Specialized agents for planning, execution, critique, reporting
2. **Checkpointing & Resumability:** Failed tasks can retry without wasting API calls
3. **Adaptive Scoring:** Different idea types (tech vs. marketplace) get different weights
4. **Transparent Execution:** Real-time execution logs show what each agent is doing
5. **Rate Limit Handling:** Exponential backoff + fallback models for resilience
6. **Quantitative Enrichment:** Extract structured data (TAM, CAGR) from unstructured text

### Common Interview Questions You'll Face

**Q: How do you ensure analysis quality?**
> "The Critic agent scores each section 1-10 based on specificity, relevance, and actionability. The Reporter agent synthesizes insights into a founder-facing narrative. If sections score low, we can rerun specific tools."

**Q: What happens if an API call fails?**
> "We have exponential backoff for rate limits (15s → 30s → 60s), transient error retry for 5xx errors, and fallback models for quota exhaustion. Plus, checkpointing means failed tasks resume without re-executing completed tools."

**Q: Why use multiple agents instead of one?**
> "Separation of concerns. The Planner decides what to do, the Executor does it, the Critic reviews quality, and the Reporter synthesizes insights. Each agent is optimized for its task and can be tested/improved independently."

**Q: How is the final score calculated?**
> "We blend a Critic-assigned score (overall quality), type-specific weights (tech ideas emphasize monetization, marketplaces emphasize competitive analysis), and classification confidence. This gives different idea types fair assessment."

**Q: What's the typical end-to-end latency?**
> "2-3 minutes for a full analysis. 7 tools × 3-second inter-tool delay = 21 seconds plus LLM reasoning time (~90 seconds total for all stages)."

---

## Advanced Q&A for Technical Interviews

### Why Use Django Instead of Other Frameworks?

**Question:** "Why did you choose Django for the backend instead of FastAPI, Node.js, or other frameworks?"

**Answer:**
> "Django is the best choice for this project for several reasons:
>
> **1. Mature ORM & Admin Panel:**
> - Built-in Django ORM for SQLite (user management, authentication, admin dashboard)
> - Automatic admin interface for managing idea types, weights, user accounts
> - Django Rest Framework (DRF) provides powerful REST API capabilities with built-in authentication, permissions, throttling
>
> **2. Authentication & Security:**
> - Production-ready JWT integration via Django-REST-framework-simplejwt
> - Built-in CSRF protection, SQL injection prevention
> - Middleware architecture for request validation (our custom `auth_middleware.py`)
> - User permission system out of the box
>
> **3. MongoEngine Integration:**
> - Django works seamlessly with MongoDB via MongoEngine
> - We get both relational data (users, auth) in SQLite + document data (ideas, analysis) in MongoDB
> - Django ORM + MongoEngine gives us the flexibility of both worlds
>
> **4. Async Task Processing:**
> - Django integrates perfectly with Celery for background jobs
> - Our agent pipeline runs asynchronously without blocking the HTTP request
> - Easy to manage task queues, retries, timeouts
> - Celery + Redis broker handles 6-minute analysis tasks smoothly
>
> **5. Middleware & Extensibility:**
> - Custom logging, error handling, rate limiting via Django middleware
> - Settings management (base, development, production) is built-in
> - Easy to scale with caching, throttling, pagination
>
> **Why not FastAPI?**
> FastAPI is great for pure API services, but we need:
> - Admin dashboard (Django provides this out-of-box)
> - Complex permissions & authentication (Django is more mature)
> - Monolithic app with both sync APIs and async tasks (Django handles this elegantly)
>
> **Why not Node.js/Express?**
> Node.js excels at I/O-heavy systems, but our workload is:
> - Heavy Python AI/ML computation (LLM calls, text processing)
> - Complex data transformations (market model extraction, SWOT analysis)
> - Django's Python ecosystem (numpy, pandas, genai SDK) is richer than Node's
> - We'd be fighting against the language choice trying to integrate heavy Python libraries
>
> Django's philosophy of 'batteries included' is perfect for a full-stack application managing users, auth, async tasks, and complex business logic."

---

### Why Not Use LangChain or LangGraph?

**Question:** "Why did you build a custom agent pipeline instead of using LangChain or LangGraph?"

**Answer:**
> "This is a great question. LangChain and LangGraph are powerful frameworks, but they weren't the right choice for Foundermind. Here's why:
>
> **What LangChain/LangGraph Provide:**
> - Pre-built LLM integrations (easy model swapping)
> - Chain/graph abstractions (define workflows declaratively)
> - Memory management (conversation history)
> - Tool calling abstractions
> - Agent loop utilities
>
> **Why They Don't Fit Our Use Case:**
>
> **1. Over-Engineering for Our Needs:**
> - LangChain is designed for general chatbots, Q&A systems, document search
> - Our pipeline is highly specialized: we need specific agents (Planner, Executor, Critic, Reporter) with custom logic
> - Using LangChain would add dependency overhead without providing value for our unique orchestration pattern
> - We'd be fighting the framework to do what we want
>
> **2. Checkpointing & Resumability:**
> - Our pipeline needs fine-grained checkpointing: save state after EACH tool execution
> - If a tool fails at position 5/7, we resume from position 6 (not from the start)
> - LangChain/LangGraph don't offer this level of granular checkpointing
> - We built custom checkpoint logic in ToolExecutor that maps execution_log entries to tool results
> - This would be very difficult to implement on top of LangChain's abstractions
>
> **3. Custom Scoring & Weighting Logic:**
> - Our Critic agent doesn't just critique—it assigns section-specific scores (1-10 per section)
> - We map section scores back to tool names for selective reruns
> - Different idea types get different weight vectors (tech vs. marketplace vs. deeptech)
> - Final score is a weighted sum: `score = Σ(weight[section] × section_score)`
> - LangChain is too generic for this custom business logic
>
> **4. Architectural Control:**
> - We need to control the exact flow: Classification → Planning → Execution → Enrichment → Critique → Reporting
> - Each stage has specific error handling, timeout logic, fallback models
> - LangChain abstracts away the control we need; we'd be debugging framework internals
> - Building custom gives us 100% control over behavior and debugging
>
> **5. Cost & Latency Optimization:**
> - We can implement rate limiting (3-second inter-tool delay) precisely
> - We can implement exponential backoff for Gemini API specifically (15s → 30s → 60s)
> - We can serialize results intelligently (JSON for structured, strings for text)
> - LangChain would add overhead we don't need
>
> **6. Model Fallback Strategy:**
> - We have custom fallback logic: if Gemini is quota-exhausted, switch to Gemma
> - This is embedded in our `gemini_client.py` with specific retry counts and delays
> - LangChain's model abstraction wouldn't give us this fine-grained control
>
> **Real Example: Tool Rerun Logic**
> When Critic gives market_data a score of 4/10:
> ```
> Critic output: {
>   \"section_scores\": {\"market_data\": 4, ...},
>   \"needs_rerun\": true,
>   \"rerun_tools\": [\"search_market_data\"]
> }
> 
> Orchestrator logic:
> 1. Extract rerun_tools from critique
> 2. Map \"market_data\" → \"search_market_data\" tool
> 3. Create minimal plan with just that tool
> 4. Execute with checkpoints=execution_log (skip already-done tools)
> 5. Merge results with existing analysis
> 6. Re-critique to see if market_data score improved
> ```
> This selective-rerun pattern is impossible in LangChain's default agent loop."

**When Would We Use LangChain?**
> "If we were building a simple chatbot or Q&A system, LangChain would be perfect. But Foundermind needs custom orchestration, and the cost of fitting into LangChain's abstractions outweighs the benefits."

---

### What is the Main Purpose of the Orchestrator?

**Question:** "Explain the role and importance of the Orchestrator agent in the system."

**Answer:**
> "The Orchestrator is the **master conductor** of the entire analysis pipeline. It's NOT a tool-executing agent—it's the system controller that makes high-level decisions."

**The Orchestrator Has 5 Key Responsibilities:**

**1. Idea Classification (Strategic)**
```
Purpose: Categorize the startup idea into types (tech, marketplace, deeptech, general)

Why it matters:
├─ Different idea types require different analysis focus
├─ Tech ideas → emphasize monetization (25%) + market data (20%)
├─ Marketplace ideas → emphasize comparable startups (25%) + market data (25%)
├─ DeepTech ideas → balanced scoring
└─ Classification confidence (0-1) feeds into final confidence metric

Code:
├─ classify_idea() → uses hybrid LLM + rule-based approach
├─ Returns: idea_type, classification_confidence, classification_source
└─ Stores weights that will be used for final scoring
```

**2. Pipeline Orchestration (Flow Control)**
```
Purpose: Determine the sequence of agents and manage the overall workflow

The Orchestrator ensures:
├─ Classification happens FIRST (need idea type before planning)
├─ Planning happens SECOND (need plan before execution)
├─ Execution happens THIRD (run all tools)
├─ Enrichment happens FOURTH (extract quantitative data)
├─ Critique happens FIFTH (score sections)
├─ Reporting happens SIXTH (synthesize narrative)
└─ Scoring happens LAST (compute weighted scores)

Why it matters:
└─ Dependencies matter: can't execute without a plan, can't critique without results
```

**3. Results Enrichment (Data Processing)**
```
Purpose: Transform raw tool outputs into structured, actionable data

Example:
Input (from search_market_data tool):
  "Global fashion market is $1.5T, growing 8% annually with 12% CAGR in eco-fashion"

Enrichment process:
  ├─ Call MarketModelEngine.extract_structured_market_data()
  ├─ Extract: TAM=$1.5T, growth_rate=8%, CAGR=12%
  ├─ Build quantitative model with opportunity_score
  └─ Return structured JSON with numeric values

Output:
{
  "market_quantitative_model": {
    "tam": 1500000000,
    "cagr": 0.08,
    "opportunity_score": 0.85,
    "market_confidence": 0.9
  }
}

Why it matters:
└─ Raw text from LLM is hard to score; numbers are precise and comparable
```

**4. Quality Control & Iteration (Score-Based Rerun)**
```
Purpose: Ensure analysis quality by triggering reruns when scores are low

Decision Logic:
  IF any section_score < 6:
    ├─ Identify low-scoring sections
    ├─ Map sections to their source tools (market_data → search_market_data)
    ├─ Create a rerun plan with JUST those tools
    ├─ Execute with checkpointing (skip already-done tools)
    ├─ Re-enrich and re-critique
    └─ Check if score improved
  ELSE:
    └─ Accept analysis, move to reporting

Example:
First run: market_data scores 4/10 (too generic)
  → Orchestrator triggers rerun of search_market_data tool
  → Tool executes again with refined prompts
  → Result re-analyzed

Second run: market_data scores 8/10 (good!)
  → Accept, move forward

Why it matters:
├─ Ensures minimum quality threshold (6/10 per section)
├─ Iterative refinement without re-executing everything
└─ Transparent: execution log shows exactly what was rerun and why
```

**5. Confidence Scoring (Final Metric)**
```
Purpose: Calculate how confident we are in the overall analysis

Formula:
  confidence = 
    0.4 × (overall_score / 10) +
    0.4 × (section_avg_score / 10) +
    0.2 × classification_confidence

Why it matters:
├─ Blends three signals:
│  ├─ Critic's overall assessment (40% weight)
│  ├─ Consistency across sections (40% weight)
│  └─ Classification accuracy (20% weight)
├─ Range: 0-1
│  ├─ 0.8+: High confidence, results are good
│  ├─ 0.6-0.8: Moderate confidence
│  └─ <0.6: Low confidence, should maybe rerun
└─ Used by frontend to show confidence indicator to user
```

**What the Orchestrator Does NOT Do:**
```
❌ Doesn't execute tools directly (Executor does that)
❌ Doesn't review/score results (Critic does that)
❌ Doesn't generate narrative (Reporter does that)
❌ Doesn't search for data (Planner & Executor do that)
```

**Real Example: Full Orchestrator Flow**

```
User submits: "I'm building a sustainable fashion supply chain app"

Orchestrator.run() starts:

1. CLASSIFY:
   └─ classify_idea()
      ├─ LLM: Classify as "tech"
      ├─ Confidence: 0.92
      └─ Get weights: {similar: 0.15, market: 0.20, ...}

2. PLAN:
   └─ Planner.create_plan()
      ├─ Decide which 7 tools to run
      └─ Return execution plan

3. EXECUTE:
   └─ Executor.execute_with_plan()
      ├─ search_similar_startups → Vestiaire Collective, Fashionphile, etc.
      ├─ search_market_data → $1.5T market, 8% growth
      ├─ search_funding_info → Recent Series A rounds in fashion tech
      ├─ ... (4 more tools)
      └─ Return: {"similar_startups": [...], "market_data": "...", ...}

4. ENRICH:
   └─ enrich_results()
      ├─ Extract from "market is $1.5T, growing 8%"
      └─ Build: {tam: 1.5B, cagr: 0.08, opportunity_score: 0.85}

5. CRITIQUE:
   └─ Critic.review()
      ├─ Score each section:
      │  ├─ similar_startups: 8/10 (good, relevant competitors)
      │  ├─ market_data: 4/10 (TOO LOW! Generic insights)
      │  ├─ funding_info: 7/10
      │  ├─ monetization: 5/10 (TOO LOW!)
      │  └─ swot: 6/10
      └─ Return: {section_scores: {...}, needs_rerun: true, 
                   rerun_tools: ["search_market_data", "generate_monetization_strategy"]}

6. DECISION POINT (Orchestrator Logic):
   ├─ Check: Are any scores < 6? YES (market_data=4, monetization=5)
   ├─ Check: Has Critic marked needs_rerun? YES
   ├─ Check: Max iterations not reached? YES (1/3)
   └─ DECISION: Trigger rerun!

7. RERUN EXECUTION:
   └─ Executor.execute_with_plan(rerun_plan)
      ├─ search_market_data → NEW execution (not skipped, forced rerun)
      │  └─ Result: Better metrics, competitive landscape, TAM breakdown
      ├─ generate_monetization_strategy → NEW execution
      │  └─ Result: B2B SaaS pricing, freemium model specifics
      └─ Skip all other tools (already in checkpoint)

8. RE-ENRICH & RE-CRITIQUE:
   ├─ Enrich new market_data
   ├─ Critic reviews again
   ├─ market_data now scores 8/10 ✓
   ├─ monetization now scores 7/10 ✓
   └─ All sections >= 6? YES → Stop iterating

9. REPORT:
   └─ Reporter.generate_report()
      └─ "Your sustainable fashion idea targets a $1.5B market..."

10. SCORING:
    ├─ weighted_score = (0.20×8) + (0.20×8) + (0.15×7) + (0.25×7) + (0.20×6) = 7.3
    ├─ confidence = 0.4×(7.5/10) + 0.4×(7.2/10) + 0.2×0.92 = 0.75
    └─ Return all results with iterations_used=2, convergence_reason="All sections above threshold"

11. FRONTEND:
    └─ Display: Analysis completed in 2 iterations, confidence 75%, score 7.3/10
```

**Why the Orchestrator Matters:**
1. **Central Brain:** Makes all high-level decisions about pipeline flow
2. **Quality Guardian:** Ensures analysis meets minimum standards (scores >= 6)
3. **Cost Optimizer:** Reruns only low-scoring sections, not everything
4. **Transparent:** Logs every decision for debugging and user feedback
5. **Configurable:** Can adjust `LOW_SCORE_THRESHOLD`, `MAX_ITERATIONS` without touching other agents

The Orchestrator is what makes this a **production-grade system** instead of just a simple LLM chain."

---

## Conclusion

Foundermind demonstrates:
- **Complex AI Orchestration:** Multi-agent system with clear separation of concerns
- **Production-Ready Patterns:** Checkpointing, rate limiting, fallback models
- **Full-Stack Development:** Django backend + Next.js frontend + MongoDB
- **User-Centric Design:** Real-time feedback, transparent execution logs
- **Entrepreneurial Focus:** Helps founders make data-driven decisions about their ideas

Good luck with your interview! 🚀
