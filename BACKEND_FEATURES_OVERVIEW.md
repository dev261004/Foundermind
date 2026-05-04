# Foundermind Backend - Comprehensive Features Overview

## Executive Summary

Foundermind is an AI-powered startup analysis and validation platform built with Django 5.2 and MongoDB. The backend implements a sophisticated multi-agent AI system orchestrated with Celery, integrating Google Gemini AI for intelligent analysis and SerpAPI for market research. The platform transforms raw startup ideas into validated, data-backed business concepts through intelligent research, strategic analysis, and comprehensive scoring.

---

## 1. API ENDPOINTS

### 1.1 Authentication & User Management
**Base URL:** `api/v1/users/`

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| POST | `/register/` | User registration | `email`, `password` | `access_token`, `refresh_token`, `email` |
| POST | `/login/` | User authentication | `email`, `password` | `access_token`, `refresh_token`, `email` |

**Features:**
- Email-based registration with bcrypt password hashing
- JWT token generation for secure API access
- Access tokens for authentication, refresh tokens for token renewal

---

### 1.2 Idea Management
**Base URL:** `api/v1/ideas/`

| Method | Endpoint | Purpose | Auth Required | Input | Output |
|--------|----------|---------|---|-------|--------|
| POST | `/create/` | Create new startup idea | No | `user_email`, `title`, `description` | `message`, `idea` (with ID, timestamps) |
| GET | `/` | List all ideas for user | Yes (JWT) | None | Array of idea objects |
| GET | `/history/` | Get idea analysis history | Yes (JWT) | None | History with latest analysis status, scores, previews |

**Features:**
- Create and persist startup ideas in MongoDB
- Retrieve user's full idea history with analysis metadata
- Track analysis status, confidence scores, section completion
- Build preview text from available analysis data
- Count completed analysis sections

---

### 1.3 AI Analysis & Agent Orchestration
**Base URL:** `api/v1/agent/`

| Method | Endpoint | Purpose | Auth Required | Input | Output |
|--------|----------|---------|---|-------|--------|
| POST | `/start/` | Start or resume analysis | No | `idea_id`, `force` (optional) | `agent_run_id`, `status`, `result` (cached/async/sync_fallback modes) |
| POST | `/run/` | Synchronous analysis execution | No | `idea_id` | Analysis results with all sections |
| GET | `/status/<run_id>/` | Check analysis status | No | None | Current analysis status and progress |

**Features:**
- **Async/Cached execution modes:** Return cached results if available, queue new analysis if not
- **Resume capability:** Can resume from previous checkpoint if analysis was interrupted
- **Force re-analysis:** `force=true` parameter triggers fresh analysis regardless of cached results
- **Status polling:** Real-time status updates during analysis execution
- **Fallback modes:** Graceful handling with sync execution if async queue fails

---

### 1.4 Analytics & Insights
**Base URL:** `api/v1/agent_analysis/`

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/summary/` | Get platform analytics | None | Average scores, metrics by idea type, tool failure rates |

**Features:**
- **Average Overall Score:** Platform-wide scoring average
- **Score by Idea Type:** Performance metrics per classification (tech, marketplace, deeptech, general)
- **Tool Failure Rate:** Reliability metrics for each analysis tool
- **Self-Healing Ratio:** Percentage of analyses that required rerun for quality improvement
- **Confidence Calibration Error:** Measure of prediction confidence accuracy
- **Intelligence Index:** Overall platform capability metric

---

## 2. CORE FEATURES IMPLEMENTED

### 2.1 Multi-Agent Orchestration System

The analysis engine uses a 4-agent collaborative system:

#### **Agent 1: Idea Classification Agent**
- **Role:** Categorize startup ideas into types
- **Classification Types:** 
  - `tech` - Software/SaaS/platform companies
  - `marketplace` - Marketplace/e-commerce models
  - `deeptech` - Biotech/agriculture/medical startups
  - `general` - All others
- **Classification Methods:**
  1. LLM-based classification using Gemini 3.1 Flash Lite
  2. Rule-based fallback using keyword matching
  3. Hybrid approach with confidence scoring
- **Outputs:**
  - `idea_type` - Assigned category
  - `classification_confidence` - 0-1 confidence score
  - `weights_used` - Dynamic weights for scoring this idea type

#### **Agent 2: Planner Agent**
- **Role:** Strategic execution planning
- **Responsibilities:**
  - Analyzes the startup idea
  - Decides which tools to execute
  - Determines optimal execution order
  - Manages tool dependencies
- **Output:** Structured JSON execution plan with step ordering
- **Model:** Gemini 2.5 Flash

#### **Agent 3: Tool Executor**
- **Role:** Execute planned analysis tools
- **Execution Features:**
  - **Checkpoint management:** Resume from saved successful tool outputs
  - **Inter-tool delays:** 3-second gaps to respect API rate limits
  - **Result serialization:** JSON-compatible output from all tools
  - **Parallel dependency tracking:** Execute independent tools concurrently
- **Responsibilities:**
  - Search for similar startups
  - Gather market data
  - Research funding information
  - Generate monetization strategies
  - Create customer profiles
  - Suggest tech stacks
  - Perform SWOT analysis

#### **Agent 4: Critic Agent**
- **Role:** Quality assurance and analysis validation
- **Responsibilities:**
  - Review each section for relevance and specificity
  - Validate logical consistency
  - Check completeness of analysis
  - Suggest section reruns if quality is below threshold
  - Score each section 1-10
- **Output:** Critique report with scores and recommendations
- **Convergence:** Stops when all sections meet minimum score (5) or max iterations reached

#### **Agent 5: Reporter Agent**
- **Role:** Synthesize findings into founder-facing insights
- **Responsibilities:**
  - Create executive summary from available data
  - Handle missing sections gracefully (no fabrication)
  - Flag failed tool outputs
  - Provide actionable recommendations
- **Output:** Concise, readable analysis summary
- **Models:** Gemini 3.1 Flash Lite (primary), Gemma 3 27B (fallback)

---

### 2.2 Comprehensive Analysis Tools

#### **Tool 1: Similar Startups Search** (`search_similar_startups`)
- **Purpose:** Identify competitive landscape and relevant companies
- **Process:**
  1. Search for companies similar to the startup idea
  2. Use SerpAPI for Google search results
  3. Parse results with Gemini to extract structured data
- **Output Fields:**
  - `company_name` - Company or product name
  - `category_tag` - 1-3 word category label
  - `description` - Relevance summary
  - `url` - Source URL
  - `icon_type` - Visual classification (shield, newspaper, building, circle, globe, code, chart, bolt)
- **Icon Type Mapping:**
  - `shield` - Fact-checkers, trust/safety tools
  - `newspaper` - Media companies, journalism tools
  - `building` - Institutions, nonprofits, government
  - `circle` - Rating systems, review platforms
  - `globe` - International organizations, global NGOs
  - `code` - Developer tools, APIs, technical platforms
  - `chart` - Analytics, data intelligence, market research
  - `bolt` - Real-time tools, AI-powered services

#### **Tool 2: Market Data Research** (`search_market_data`)
- **Purpose:** Gather quantitative and qualitative market insights
- **Features:**
  - Market size estimation (current and future)
  - Growth rate analysis
  - TAM/SAM/SOM calculations
  - CAGR (Compound Annual Growth Rate) extraction
- **Output Fields:**
  - `market_size_current_billion_usd` - Current market size
  - `market_size_future_billion_usd` - Projected future size
  - `forecast_years` - Projection timeline
  - `reported_cagr_percent` - Historical growth rate
- **Data Extraction:** LLM-based parsing with regex fallback for structured data

#### **Tool 3: Funding Intelligence** (`search_funding_info`)
- **Purpose:** Research funding trends and comparable companies
- **Process:**
  1. Search for funded companies in similar space
  2. Extract funding stage and amount
  3. Identify investor patterns
- **Output Fields:**
  - `company_name` - Company receiving funding
  - `funding_amount` - Formatted string (e.g., "$32.5M")
  - `funding_stage` - Pre-Seed, Seed, Series A-D+, Grant, Undisclosed
  - `description` - Why this funding is relevant
  - `investors` - List of investor names/types
  - `relevance_score` - 0-10 relevance to startup
  - `url` - Source URL

#### **Tool 4: Monetization Strategy Generator** (`generate_monetization_strategy`)
- **Purpose:** Generate business model recommendations
- **Features:**
  - Always returns exactly 4 distinct strategies
  - Strategies ranked by revenue potential
  - Fit assessment for each model
- **Output Fields:**
  - `strategy_name` - e.g., "SaaS Subscription (B2B/Enterprise)"
  - `type` - B2B, API, B2C, or Institutional
  - `description` - 2-3 sentences on strategy fit
  - `fit_score` - High, Medium, or Low
  - `revenue_potential` - 0-100 scale

#### **Tool 5: Customer Profile Generator** (`generate_customer_profile`)
- **Purpose:** Define ideal customer persona
- **Output Fields:**
  - `persona_name` - Archetype (e.g., "The Busy Professional")
  - `age_range` - Target age bracket
  - `profession` - Professional background description
  - `buying_behavior_tags` - Array of behavioral labels
  - `quote` - Authentic first-person frustration/desire
  - `demographics` - Income, location, education
  - `brand_affinities` - Companies this persona uses
  - `persona_strength` - 0-100 confidence score
  - `needs` - Array with text and emoji icons
  - `pain_points` - Frustrations with severity ratings
  - `buying_behavior` - Purchase patterns with emojis
  - `value_proposition` - Key benefits to persona

#### **Tool 6: Tech Stack Recommender** (`suggest_tech_stack`)
- **Purpose:** Suggest appropriate technology architecture
- **Features:**
  - Detects technical vs. non-technical ideas
  - Generates tech stack recommendations
  - Provides confidence and gradient styling
- **Technical Detection Keywords:** AI, API, app, automation, blockchain, cloud, data, database, developer, devops, ML, mobile, platform, SaaS, software, web, backend, frontend, pipeline, agent, LLM, scraping, analytics, dashboard
- **Output Fields:**
  - Technology recommendations with gradient styling
  - Confidence levels (Essential, Recommended, Optional)
  - Tailwind color gradients for UI rendering

#### **Tool 7: SWOT Analysis Generator** (`generate_swot_analysis`)
- **Purpose:** Comprehensive strategic assessment
- **Output Sections:**
  - **Critical Insight:** Single most dangerous threat or critical weakness
  - **Competitive Position:** Stance (Vulnerable, At Risk, Defensible, Strong) with 0-100 score
  - **Strengths:** Array of competitive advantages with deep dives and strategic imperatives
  - **Weaknesses:** Array of vulnerabilities with severity (1-3) ratings
  - **Opportunities:** Growth possibilities with exploration details
  - **Threats:** External risks with mitigation strategies
- **Specificity:** All insights grounded in actual market/product data

---

### 2.3 Intelligent Scoring & Convergence System

#### **Dynamic Weighting by Idea Type**

Based on startup classification, different sections are weighted:

```python
BASE_IDEA_TYPES = {
    "tech": {
        "similar_startups": 0.15,
        "market_data": 0.20,
        "funding_info": 0.15,
        "monetization": 0.25,
        "swot": 0.25,
    },
    "marketplace": {
        "similar_startups": 0.25,
        "market_data": 0.25,
        "funding_info": 0.20,
        "monetization": 0.15,
        "swot": 0.15,
    },
    "deeptech": {
        "similar_startups": 0.15,
        "market_data": 0.25,
        "funding_info": 0.25,
        "monetization": 0.15,
        "swot": 0.20,
    },
    "general": {
        "similar_startups": 0.20,
        "market_data": 0.20,
        "funding_info": 0.20,
        "monetization": 0.20,
        "swot": 0.20,
    },
}
```

#### **Convergence Logic**
- **Target Overall Score:** 8.0/10
- **Target Weighted Score:** 7.5/10
- **Minimum Section Score:** 5.0/10
- **Process:**
  1. Critic agent scores each section
  2. If section < 5 or overall < 8, Critic suggests reruns
  3. Execute suggested tools
  4. Repeat until convergence or max iterations reached
  5. Calculate weighted score based on idea type weights

#### **Scoring Components**
- `overall_score` - Raw average of all sections (1-10)
- `weighted_score` - Idea-type-adjusted score (1-10)
- `classification_confidence` - Confidence in idea type (0-1)
- `analysis_confidence` - Confidence in analysis quality (0-1)
- `iterations_used` - Number of critic/rerun cycles

---

### 2.4 Market Analysis Engine

#### **TAM/SAM/SOM Calculation** (MarketModelEngine)

```python
TAM = Total Addressable Market (current market size)
SAM = Serviceable Available Market (30% of TAM by default)
SOM = Serviceable Obtainable Market (5% of SAM by default)
CAGR = Compound Annual Growth Rate
```

#### **Market Opportunity Scoring**
- **TAM Score (0-10):** Based on market size
  - ≥$50B → 10
  - $10-50B → 8
  - $1-10B → 6
  - <$1B → 4
  
- **CAGR Score (0-10):** Based on growth rate
  - ≥20% → 10
  - 10-20% → 8
  - 5-10% → 6
  - <5% → 4
  
- **Opportunity Score:** Weighted composite
  - (TAM_Score × 0.4) + (CAGR_Score × 0.4) + (Competition_Score × 0.2)

---

### 2.5 Quality Assurance & Drift Detection

#### **Market Drift Detection** (`DriftDetector`)
- **Purpose:** Detect when market conditions change and reweight
- **Mechanism:**
  - Compares 30-window recent average vs. historical baseline
  - Triggers at >1.0 point drift
  - Auto-recalibrates weights if drift detected
- **Output:** Drift status, magnitude, and recalibration recommendations

#### **Tool Drift Detection** (`ToolDriftDetector`)
- **Purpose:** Monitor tool performance degradation
- **Mechanism:**
  - Compares recent tool success rates vs. historical baseline
  - Threshold: 15% degradation
  - Window: Last 50 runs
- **Output:** Per-tool drift status and success rate changes

#### **Weight Recalibration** (`WeightRecalibrator`)
- **Purpose:** Dynamically adjust scoring weights based on performance
- **Process:**
  1. Analyze historical section scores for idea type
  2. Calculate adjustment based on learning rate (0.02)
  3. Increase weight for underperforming sections
  4. Normalize weights to sum to 1.0
  5. Persist updated weights to MongoDB
- **Target:** All sections converge toward score of 8

---

### 2.6 Analytics & Performance Metrics

#### **Agent Metrics Engine** (`AgentMetricsEngine`)

Provides platform-wide analytics:

1. **Average Overall Score** - Mean of all completed runs
2. **Score by Idea Type** - Breakdown of performance by classification
3. **Tool Failure Rate** - Success/failure ratio per tool
4. **Self-Healing Ratio** - Percentage of analyses requiring reruns
5. **Confidence Calibration Error** - Gap between predicted and actual confidence
6. **Intelligence Index** - Overall platform capability composite

#### **Execution Logging**
- Full execution log for every analysis run
- Timestamp tracking for all operations
- Tool-level success/failure status
- Error type classification
- Model usage tracking
- Convergence reason recording

---

## 3. DATABASE MODELS

### 3.1 User Model
```python
Collection: users

Fields:
- _id: ObjectId (MongoDB auto-generated)
- email: String (required, unique)
- password_hash: String (bcrypt hashed)
- created_at: DateTime (default: current UTC time)
```

---

### 3.2 Idea Model
```python
Collection: ideas

Fields:
- _id: ObjectId (MongoDB auto-generated)
- user_email: String (required, indexed)
- title: String (required)
- description: String (optional)
- status: String (default: "active")
- created_at: DateTime (auto-generated)
- updated_at: DateTime (auto-generated)

Indexes:
- user_email
- created_at (for ordering)
```

---

### 3.3 Agent Run Model
```python
Collection: agent_runs

Fields:
- _id: ObjectId
- idea_id: String (required, indexed)
- execution_log: List[Dict] - Complete execution history
- models_used: Dict[String, String] - Model usage per tool/agent
- status: String (enum: "pending", "running", "completed", "partial", "failed", "quota_exhausted")
- critique: Dict - Critic agent's feedback
- report_summary: String - Executive summary
- idea_type: String - Classification (tech/marketplace/deeptech/general)
- classification_confidence: Float (0-1)
- analysis_confidence: Float (0-1)
- overall_score: Float (1-10)
- weighted_score: Float (1-10)
- iterations_used: Integer - Convergence cycles
- convergence_reason: String - Why analysis stopped
- created_at: DateTime

Statuses:
- pending: Queued, not yet started
- running: Currently executing
- completed: All sections complete, meets quality threshold
- partial: Some sections complete, analysis interrupted
- failed: Critical error occurred
- quota_exhausted: LLM API quota exhausted
```

---

### 3.4 Idea Analysis Model
```python
Collection: idea_analysis

Fields:
- _id: ObjectId
- idea_id: String (required, indexed)
- run_id: String - Links to AgentRun
- similar_startups: List[Dict] - Competitor landscape
- market_data: String - Qualitative market research
- market_quantitative_model: Dict - TAM/SAM/SOM/CAGR calculations
- funding_info: List[Dict] - Funding rounds and investors
- monetization: List[Dict] - 4 revenue strategies
- customer_profile: Dict - ICP definition
- tech_stack: Dict - Technology recommendations
- swot: Dict - Strategic analysis
- report_summary: String - Founder-facing summary
- created_at: DateTime

Relationships:
- Links to AgentRun via run_id
- Links to Idea via idea_id
```

---

### 3.5 Idea Type Weights Model
```python
Collection: idea_type_weights

Fields:
- _id: ObjectId
- idea_type: String (required, unique)
- weights: Dict[String, Float] - Section weight distribution
- updated_at: DateTime (auto-updated on recalibration)

Example weights:
{
  "similar_startups": 0.15,
  "market_data": 0.20,
  "funding_info": 0.15,
  "monetization": 0.25,
  "swot": 0.25
}
```

---

## 4. SERVICES & BUSINESS LOGIC

### 4.1 Startup Analysis Service
**Location:** `apps/agent/services.py` - `StartupAnalysisService`

**Key Methods:**
- `build_run_response()` - Formats analysis for API response
- `build_resume_execution_log()` - Prepares checkpoint data for resumption
- `_build_results_from_execution_log()` - Reconstructs results from log
- `_normalize_similar_startups()` - Validates and filters startup data
- `_normalize_funding_info()` - Formats funding data (max 5 items)
- `run_analysis()` - Synchronous analysis execution

**Status Categories:**
- `RESULT_AVAILABLE_STATUSES` = {completed, partial, quota_exhausted}
- `RESUMABLE_STATUSES` = {partial, quota_exhausted, failed}

---

### 4.2 Startup Orchestrator Service
**Location:** `apps/agent/orchestrator.py` - `StartupOrchestrator`

**Key Methods:**
- `classify_idea()` - Idea type classification
- `get_weights_for_idea_type()` - Fetch dynamic weights from DB
- `hybrid_classify_idea()` - LLM + rule-based fallback classification
- `rule_based_classification()` - Keyword-based classification
- `llm_based_classification()` - Gemini-powered classification

**Classification Logic:**
1. Attempt LLM classification (higher confidence)
2. Fall back to rule-based if LLM fails
3. Return (category, confidence, source, model_used)

---

### 4.3 Tool Executor Service
**Location:** `apps/agent/executor.py` - `ToolExecutor`

**Key Methods:**
- `execute_with_plan()` - Main execution engine
- `_find_checkpoint()` - Locate previous successful tool execution
- `_restore_results()` - Load cached tool outputs from checkpoints
- `_serialize_result()` - Convert results to JSON strings
- `_deserialize_result()` - Parse JSON results back to objects

**Tool-to-Result Mapping:**
```python
{
    "search_similar_startups": "similar_startups",
    "search_market_data": "market_data",
    "search_funding_info": "funding_info",
    "generate_monetization_strategy": "monetization",
    "generate_customer_profile": "customer_profile",
    "suggest_tech_stack": "tech_stack",
    "generate_swot_analysis": "swot",
}
```

**Execution Features:**
- 3-second inter-tool delay
- Dependency tracking
- Parallel execution for independent tools
- Structured result validation

---

### 4.4 Critic Agent Service
**Location:** `apps/agent/critic.py` - `CriticAgent`

**Review Dimensions:**
- Relevance to idea
- Specificity (not generic)
- Logical consistency
- Completeness

**Output:**
```json
{
  "overall_score": 1-10,
  "section_scores": {
    "similar_startups": 1-10,
    "market_data": 1-10,
    "funding_info": 1-10,
    "monetization": 1-10,
    "swot": 1-10
  },
  "issues_found": ["..."],
  "rerun_tools": ["tool_name_if_needed"],
  "needs_rerun": true/false
}
```

---

### 4.5 Reporter Agent Service
**Location:** `apps/agent/reporter.py` - `ReporterAgent`

**Features:**
- Synthesis of successful tool outputs
- Graceful handling of missing sections (no fabrication)
- Flag failed tools explicitly
- Actionable recommendations for founders

**Input:**
- Startup idea description
- Results dictionary
- Full execution log

**Output:**
- Readable founder-facing summary
- List of successful tools with outputs
- List of failed tools with errors
- Model used for generation

---

## 5. INTEGRATION POINTS

### 5.1 Google Gemini AI Integration
**Location:** `integrations/gemini_client.py`

**Features:**
- Multi-model support with fallback chains
- Automatic rate limit handling (15s, 30s, 60s backoffs)
- Transient error retry logic (10s delay, max 2 retries)
- Quota exhaustion detection and custom exception
- Request timeout: 60 seconds
- Thread-safe client initialization

**Models Configured:**
- `gemini-2.5-flash` - Planner agent (fast, accurate planning)
- `gemini-3.1-flash-lite-preview` - Critic, Reporter, Tool execution
- `gemma-4-31b-it` - Light tool execution fallback
- `gemma-3-27b-it` - Alternative fallback
- `gemini-2.5-flash-lite` - Gemini fallback

**Error Handling:**
- Rate limit errors (429) with exponential backoff
- Transient errors (500, 502, 503, 504) with retries
- Custom `LLMQuotaExhaustedError` for quota exhaustion

---

### 5.2 SerpAPI Integration
**Location:** `integrations/serpapi_client.py`

**Features:**
- Google search wrapper with configurable result count
- 30-second timeout
- Error logging for failed requests
- Graceful fallback (returns empty list on error)
- Organic results extraction

**Usage:**
```python
search_google(query: str, num_results: int = 5) -> List[Dict]
```

---

### 5.3 MongoDB Integration
**Location:** `integrations/mongo.py`

**Features:**
- MongoEngine ORM for schema-less document storage
- MongoDB Atlas support with SSL/TLS
- Configurable database name (default: "foundermind")
- Connection pooling with retryWrites disabled

**Collections:**
- `users` - User accounts
- `ideas` - Startup ideas
- `agent_runs` - Analysis execution records
- `idea_analysis` - Analysis results
- `idea_type_weights` - Dynamic weight configurations

---

## 6. CELERY TASK QUEUE

### 6.1 Main Analysis Task
**Task ID:** `apps.agent.tasks.run_startup_analysis`

**Parameters:**
- `run_id` (String) - AgentRun MongoDB ID

**Features:**
- **Soft time limit:** 300 seconds (analysis execution)
- **Hard time limit:** 360 seconds (force shutdown safety margin)
- **Async execution:** Queued via Redis broker
- **Fallback:** Eager execution if async queue unavailable

**Workflow:**
1. Idea classification
2. Execution plan creation
3. Tool execution with checkpoints
4. Critic review and scoring
5. Synthesis and reporting
6. Result persistence

---

### 6.2 Scheduled Analytics Tasks
**Location:** `config/celery.py`

**Beat Schedule:**

| Task | Schedule | Interval | Purpose |
|------|----------|----------|---------|
| `drift_monitor_task` | Hourly | 3600s | Detect market drift by idea type |
| `idea_type_drift_monitor_task` | Hourly | 3600s | Monitor per-type drift metrics |
| `tool_drift_monitor_task` | Hourly | 3600s | Detect tool performance degradation |

---

## 7. AUTHENTICATION & SECURITY

### 7.1 JWT Authentication
**Location:** `apps/users/jwt_utils.py` + `core/permissions.py`

**Features:**
- JWT token generation with email payload
- Bearer token extraction from Authorization header
- Token validation and decoding
- Decorator-based view protection: `@jwt_required`

**Token Flow:**
1. POST `/api/v1/users/register/` → Get tokens
2. POST `/api/v1/users/login/` → Get tokens
3. Use `Authorization: Bearer {access_token}` for protected endpoints

---

### 7.2 Password Hashing
**Library:** bcrypt

**Process:**
- Registration: Hash with bcrypt.gensalt()
- Login: Compare using bcrypt.checkpw()
- Never stores plaintext passwords

---

## 8. CONFIGURATION & DEPLOYMENT

### 8.1 Settings Structure
**Location:** `foundermind_backend/settings/`

**Environments:**
- `base.py` - Shared configuration
- `development.py` - Development overrides
- `production.py` - Production overrides

**Key Settings:**
```python
INSTALLED_APPS:
  - django.contrib.admin/auth/sessions/messages/staticfiles
  - rest_framework
  - corsheaders
  - apps.agent
  - apps.users
  - apps.ideas

MIDDLEWARE:
  - corsheaders
  - SecurityMiddleware
  - SessionMiddleware
  - CSRF
  - AuthenticationMiddleware
  - MessageMiddleware
  - ClickjackingProtection

CORS_ALLOW_ALL_ORIGINS = True (development)
DEBUG = False (base)
```

---

### 8.2 Celery Configuration
**Location:** `config/celery.py`

```python
CELERY_BROKER_URL = "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = "redis://localhost:6379/0"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
```

---

### 8.3 LLM Model Configuration
**Location:** `foundermind_backend/settings/base.py`

```python
AGENT_MODELS = {
    "planner": "gemini-2.5-flash",
    "critic": "gemini-3.1-flash-lite-preview",
    "reporter": "gemini-3.1-flash-lite-preview",
    "tool_heavy": "gemini-3.1-flash-lite-preview",
    "tool_light": "gemma-4-31b-it",
    "fallback_gemini": "gemini-2.5-flash-lite",
    "fallback_gemma": "gemma-3-27b-it",
}
```

---

## 9. EXECUTION FLOW

### Complete Analysis Workflow

```
1. START_ANALYSIS API CALL
   ↓
2. CREATE AGENT_RUN
   - Initial status: "pending"
   - If force=true, resume from checkpoint
   ↓
3. QUEUE CELERY TASK (or eager execution)
   ↓
4. IDEA CLASSIFICATION
   - LLM-based or rule-based classification
   - Fetch dynamic weights for idea type
   ↓
5. PLANNER AGENT
   - Analyze startup idea
   - Create execution plan
   - Determine tool order & dependencies
   ↓
6. TOOL EXECUTION (with Critic Feedback Loop)
   - Restore results from checkpoints if resuming
   - For each planned tool:
     a. Search/generate based on startup idea
     b. Serialize to JSON
     c. Save execution log entry
     d. Persist to DB
   - 3-second inter-tool delay
   ↓
7. CRITIC AGENT
   - Review all completed sections
   - Score each 1-10
   - Calculate overall and weighted scores
   - If score < threshold:
     → Identify weak sections
     → Suggest tool reruns
     → LOOP BACK TO STEP 6
   - If score adequate:
     → Proceed to synthesis
   ↓
8. REPORTER AGENT
   - Synthesize results into narrative
   - Generate founder-facing summary
   - Flag failed tools
   ↓
9. PERSIST ANALYSIS
   - Create/update IdeaAnalysis document
   - Store in idea_analysis collection
   - Update AgentRun status → "completed"/"partial"
   ↓
10. RETURN RESPONSE
    - Full analysis with all sections
    - Execution log details
    - Confidence and scoring metrics
```

---

## 10. KEY FEATURES MATRIX

| Feature | Status | Implementation | Maturity |
|---------|--------|-----------------|----------|
| User Registration/Login | ✅ Implemented | JWT-based auth | Production-ready |
| Idea CRUD | ✅ Implemented | MongoDB persistence | Production-ready |
| Idea Classification | ✅ Implemented | LLM + rule-based | Production-ready |
| Similar Startups Search | ✅ Implemented | SerpAPI + Gemini | Production-ready |
| Market Data Research | ✅ Implemented | LLM-based analysis | Production-ready |
| Funding Intelligence | ✅ Implemented | Search + parsing | Production-ready |
| Monetization Strategy | ✅ Implemented | 4 model generation | Production-ready |
| Customer Profile | ✅ Implemented | ICP generation | Production-ready |
| Tech Stack Recommendation | ✅ Implemented | Technical detection | Production-ready |
| SWOT Analysis | ✅ Implemented | Comprehensive analysis | Production-ready |
| Critic Quality Review | ✅ Implemented | Iterative improvement | Production-ready |
| Convergence Logic | ✅ Implemented | Score-based convergence | Production-ready |
| Market Drift Detection | ✅ Implemented | Statistical monitoring | Production-ready |
| Tool Drift Detection | ✅ Implemented | Performance tracking | Production-ready |
| Weight Recalibration | ✅ Implemented | Dynamic adjustment | Production-ready |
| Analytics Summary | ✅ Implemented | Metrics aggregation | Production-ready |
| Async Task Execution | ✅ Implemented | Celery + Redis | Production-ready |
| Checkpoint/Resume | ✅ Implemented | Execution log checkpoints | Production-ready |
| Pitch Deck Generator | ❌ Not implemented | Generator class exists (empty) | Planned |
| Subscription Tiers | ❌ Not fully implemented | Models created (empty) | In progress |
| Usage Rate Limiting | ❌ Not fully implemented | Limits module created (empty) | Planned |

---

## 11. ERROR HANDLING & RESILIENCE

### 11.1 Error Types Handled

| Error | Handler | Recovery |
|-------|---------|----------|
| LLM Quota Exhausted | Custom exception | Mark run as `quota_exhausted`, suggest retry |
| Tool Failure | Catch & log | Continue with available sections, flag in critique |
| Invalid JSON from LLM | Regex fallback | Extract numeric data or use defaults |
| API Timeouts | Retry with backoff | Up to 2 retries, graceful degradation |
| Missing Sections | Reporter gracefully handles | Flag as unavailable, no fabrication |
| Classification Failure | Rule-based fallback | Use keyword-based classification with 0.6 confidence |
| Celery Queue Unavailable | Eager execution | Run synchronously, return results immediately |

---

### 11.2 Graceful Degradation

- **Partial Completion:** Can mark analysis as "partial" if some tools fail
- **Section Summaries:** Report accurately reflects what succeeded/failed
- **Fallback Models:** Multiple LLM model options with automatic fallback
- **Checkpoint Recovery:** Resume from last successful tool execution
- **Data Validation:** All structured outputs validated before persistence

---

## 12. API RESPONSE EXAMPLES

### 12.1 Start Analysis Response (Async Mode)
```json
{
  "agent_run_id": "507f1f77bcf86cd799439011",
  "status": "pending",
  "mode": "async"
}
```

### 12.2 Start Analysis Response (Cached Mode)
```json
{
  "agent_run_id": "507f1f77bcf86cd799439011",
  "status": "completed",
  "mode": "cached",
  "result": {
    "similar_startups": [...],
    "market_data": "...",
    "market_quantitative_model": {...},
    "funding_info": [...],
    "monetization": [...],
    "customer_profile": {...},
    "tech_stack": {...},
    "swot": {...},
    "report_summary": "...",
    "overall_score": 8.2,
    "weighted_score": 8.1,
    "idea_type": "tech",
    "analysis_confidence": 0.85
  }
}
```

### 12.3 Analytics Summary Response
```json
{
  "average_overall_score": 7.8,
  "score_by_idea_type": {
    "tech": 8.1,
    "marketplace": 7.6,
    "deeptech": 7.4,
    "general": 7.9
  },
  "tool_failure_rate": {
    "search_similar_startups": 0.02,
    "search_market_data": 0.05,
    "search_funding_info": 0.03,
    "generate_monetization_strategy": 0.0,
    "generate_customer_profile": 0.01,
    "suggest_tech_stack": 0.0,
    "generate_swot_analysis": 0.02
  },
  "self_healing_ratio": 0.45,
  "confidence_calibration_error": 0.12,
  "intelligence_index": 7.9
}
```

---

## 13. SUMMARY

The Foundermind backend is a sophisticated, production-ready AI analysis platform featuring:

✅ **Intelligent Multi-Agent System** - 5-agent collaborative architecture
✅ **Comprehensive Analysis Tools** - 7 specialized research and generation tools
✅ **Dynamic Scoring & Weights** - Idea-type adaptive evaluation system
✅ **Quality Assurance** - Critic agent with iterative improvement
✅ **Market Intelligence** - TAM/SAM/SOM calculations and drift detection
✅ **Resilience & Recovery** - Checkpoint system, graceful degradation, fallbacks
✅ **Analytics & Metrics** - Platform-wide performance monitoring
✅ **Async Task Processing** - Celery queue with Redis broker
✅ **Secure Authentication** - JWT-based API protection
✅ **MongoDB Persistence** - Schema-flexible document storage
✅ **API Standards** - RESTful endpoints with consistent response formats

All core features are implemented and production-ready. Subscription/rate limiting and pitch deck generation remain as planned enhancements.
