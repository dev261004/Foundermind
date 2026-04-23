# Foundermind - Project Overview

## 1. Project Summary

**Foundermind** is an AI-powered startup analysis and validation platform that helps entrepreneurs evaluate their business ideas through intelligent research and strategic analysis. The platform uses a multi-agent AI system to gather market intelligence, analyze competitors, evaluate funding potential, and provide comprehensive business insights to help founders make data-driven decisions about their startup ideas.

**Core Purpose:** Transform raw startup ideas into validated, data-backed business concepts with market opportunity assessment, competitive analysis, and strategic recommendations.

---

## 2. Technology Stack

### Backend (foundermind_backend)
- **Framework:** Django 5.2.11 + Django REST Framework 3.16.1
- **Database:** MongoDB (via MongoEngine 0.29.1) - Atlas hosted
- **Task Queue:** Celery 5.6.2 with Redis
- **AI/LLM:** Google Gemini AI (google-generativeai 0.8.6)
- **APIs:** SerpAPI for web search (google-search-results 2.4.2)
- **Authentication:** JWT (PyJWT 2.11.0)
- **Security:** Bcrypt for password hashing
- **Language:** Python 3.10+

**Key Dependencies:**
- `redis` - Cache and Celery broker
- `django-cors-headers` - Cross-origin requests from frontend
- `django-celery-results` - Task result storage
- `protobuf` - Message serialization

### Frontend (foundermind_frontend)
- **Framework:** Next.js 16.2.0 with React 19.2.3
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **HTTP Client:** Axios 1.13.6
- **State Management:** Zustand 5.0.11
- **Animations:** Framer Motion 12.35.0
- **3D Graphics:** Three.js 0.183.2 + React Three Fiber 9.5.0
- **Particle Effects:** react-tsparticles 2.12.2
- **Icons:** Lucide React 0.576.0
- **UI Components:** Radix UI (dropdown menus)

---

## 3. Core Features

### 3.1 User Management
- **Registration & Authentication** - Email-based signup with JWT tokens
- **User Profiles** - Manage startup ideas and analysis history
- **Secure Access** - Role-based permissions and middleware authentication

### 3.2 Idea Management
- **Create Ideas** - Users submit startup concepts with title and description
- **Store Ideas** - MongoDB persistence with timestamps
- **Idea History** - Track all ideas created by a user with metadata

### 3.3 AI-Powered Analysis Engine
Comprehensive multi-stage startup idea analysis with the following components:

1. **Idea Classification** - Categorizes ideas into: tech, marketplace, deeptech, or general
2. **Market Research** - Automated research on market size and trends
3. **Competitor Analysis** - Identifies and analyzes similar startups
4. **Funding Intelligence** - Research on funding trends and investor data
5. **Monetization Strategy** - Generates revenue model recommendations
6. **Customer Profile** - AI-generated ideal customer descriptions
7. **Tech Stack Recommendation** - Suggests appropriate technology stack
8. **SWOT Analysis** - Strengths, Weaknesses, Opportunities, Threats assessment
9. **Risk Assessment** - Evaluates business and market risks
10. **Pitch Deck Generation** - Creates presentation slides automatically

### 3.4 Analytics & Insights
- **TAM/SAM/SOM Calculation** - Total Addressable Market, Serviceable Available Market, Serviceable Obtainable Market
- **Competitor Matrix** - Visual comparison with competitors
- **Market Drift Detection** - Alerts when market conditions change
- **Risk Engine** - Quantifies various business risks
- **Weighted Scoring** - Dynamic scoring based on idea type

### 3.5 Subscription & Limits
- **Usage Limits** - Track API calls and analysis runs per subscription tier
- **Subscription Models** - Free, Pro, and Enterprise tiers (planned)
- **Rate Limiting** - Enforce usage constraints

---

## 4. Agent Architecture & Workflow

### 4.1 Multi-Agent System

The core analysis is powered by 4 AI agents working in orchestration:

#### **1. Planner Agent** (`apps/agent/planner.py`)
- **Role:** Strategic planning
- **Responsibility:** 
  - Receives the startup idea
  - Decides which analysis tools to execute
  - Determines execution order and dependencies
  - Generates execution plan in JSON format
- **Output:** Ordered list of analysis steps with dependencies

**Example Plan:**
```
Step 1: search_similar_startups (no dependencies)
Step 2: search_market_data (no dependencies)
Step 3: search_funding_info (depends on Step 1)
Step 4: generate_swot_analysis (depends on Steps 1-3)
```

#### **2. Executor Agent** (`apps/agent/executor.py`)
- **Role:** Tool execution engine
- **Responsibility:**
  - Executes planned analysis tools in sequence
  - Handles tool dependencies
  - Manages tool failures and retries
  - Collects data from external APIs and LLM
- **Tools Available:**
  - `search_similar_startups` - Find competitive startups via SerpAPI
  - `search_market_data` - Research market trends and size
  - `search_funding_info` - Gather funding landscape data
  - `generate_monetization_strategy` - AI-generated revenue models
  - `generate_customer_profile` - Ideal customer description
  - `suggest_tech_stack` - Technology recommendations
  - `generate_swot_analysis` - Strategic analysis

#### **3. Critic Agent** (`apps/agent/critic.py`)
- **Role:** Quality assurance and validation
- **Responsibility:**
  - Reviews analysis results for quality and consistency
  - Identifies contradictions or gaps
  - Suggests refinements
  - Validates data quality
  - Determines if re-analysis is needed
- **Output:** Critique feedback or approval

#### **4. Reporter Agent** (`apps/agent/reporter.py`)
- **Role:** Results synthesis and presentation
- **Responsibility:**
  - Aggregates all analysis results
  - Calculates overall startup score
  - Generates human-readable insights
  - Prepares data for frontend display
  - Creates pitch deck content

### 4.2 Agent Orchestration Flow

```
User Input (Idea) 
    ↓
[Idea Classification Engine]
    ↓ (Determines idea type: tech, marketplace, deeptech, general)
[Planner Agent] - Creates analysis plan
    ↓
[Executor Agent] - Runs tools sequentially
    ↓ (Collects: similar_startups, market_data, funding_info, etc.)
[Critic Agent] - Validates results
    ↓ (Quality checks and gap analysis)
[Analytics Engine] - Calculates scores & weights
    ↓ (TAM/SAM/SOM, weighted scoring, risk assessment)
[Reporter Agent] - Synthesizes results
    ↓ (Generates final report & insights)
Frontend Display & Pitch Deck Generation
```

### 4.3 Idea Classification System

**Dynamic Classification** based on idea type with different weightings:

| Idea Type | Tool Weights |
|-----------|--------------|
| **Tech** | Similar Startups (15%), Market Data (20%), Funding (15%), Monetization (25%), SWOT (25%) |
| **Marketplace** | Similar Startups (25%), Market Data (25%), Funding (20%), Monetization (15%), SWOT (15%) |
| **DeepTech** | Similar Startups (15%), Market Data (25%), Funding (25%), Monetization (15%), SWOT (20%) |
| **General** | Balanced weights across all tools (20% each) |

---

## 5. Module Structure & Responsibilities

### 5.1 Backend Modules

#### `apps/users/` - User Management
- **models.py** - User data model with authentication
- **views.py** - Registration, login, profile endpoints
- **serializers.py** - Request/response serialization
- **services.py** - Business logic (password hashing, JWT generation)
- **permissions.py** - Role-based access control
- **urls.py** - Route definitions

#### `apps/ideas/` - Idea Storage & Management
- **models.py** - Idea document model (title, description, status)
- **views.py** - CRUD endpoints for ideas
- **serializers.py** - Idea serialization
- **services.py** - Business logic for idea operations
- **scoring.py** - Scoring algorithms and calculations
- **urls.py** - Route definitions

#### `apps/agent/` - AI Analysis Engine
- **orchestrator.py** - Coordinates all agents and classification
- **planner.py** - Planning agent logic
- **executor.py** - Tool execution logic
- **critic.py** - Validation and quality checks
- **reporter.py** - Results aggregation and reporting
- **models.py** - AgentRun and IdeaAnalysis data models
- **tasks.py** - Celery async tasks
- **prompts.py** - LLM prompt templates
- **services.py** - Core analysis service
- **urls.py** - Agent endpoint routes
- `tools/` folder:
  - **search.py** - Web search utilities
  - **market.py** - Market research tools
  - **funding.py** - Funding data collection
  - **monetization.py** - Revenue model generation
  - **techstack.py** - Technology recommendations
  - **swot.py** - SWOT analysis generation

#### `apps/analytics/` - Market Intelligence & Insights
- **tam.py** - TAM/SAM/SOM calculations
- **risk_engine.py** - Risk assessment and scoring
- **competitor_matrix.py** - Competitive landscape visualization
- **market_model.py** - Market trend modeling
- **drift_detector.py** - Detects market changes
- **agent_metrics.py** - Tracks agent performance
- **weight_recalibrator.py** - Dynamic weight adjustment
- **services.py** - Analytics business logic
- **models.py** - Analytics data models
- **urls.py** - Analytics endpoints

#### `apps/pitchdeck/` - Automated Pitch Deck Generation
- **generator.py** - Creates presentation slides
- **services.py** - Deck generation logic
- **templates/** - Slide templates

#### `apps/subscriptions/` - SaaS Layer (Planned)
- **models.py** - Subscription plans and user tiers
- **services.py** - Subscription management
- **limits.py** - Usage limit enforcement
- **views.py** - Subscription endpoints

#### `core/` - Shared Utilities
- **auth_middleware.py** - JWT authentication middleware
- **constants.py** - System constants
- **exceptions.py** - Custom exception classes
- **permissions.py** - Permission definitions
- **utils.py** - Helper functions

#### `integrations/` - External Services
- **gemini_client.py** - Google Gemini AI API wrapper
- **serpapi_client.py** - SerpAPI web search integration
- **mongo.py** - MongoDB connection setup
- **vector_store.py** - Vector database for embeddings (future)

#### `config/` - Configuration
- **celery.py** - Celery task queue setup
- **logging.py** - Logging configuration

#### `foundermind_backend/settings/`
- **base.py** - Base Django settings
- **development.py** - Development environment config
- **production.py** - Production environment config

### 5.2 Frontend Modules

#### `src/app/` - Next.js Pages
- **(public)/** - Unauthenticated pages (landing page)
- **dashboard/** - Authenticated dashboard
- **login/** - Authentication page
- **layout.tsx** - Root layout component
- **page.tsx** - Landing page

#### `src/components/` - React Components
- **landing/** - Hero, Features, Navbar, Footer
- **dashboard/** - Dashboard pages and widgets
- **analytics/** - Data visualization components
- **drift/** - Market drift indicators
- **execution/** - Analysis execution UI
- **idea/** - Idea cards and forms
- **results/** - Analysis results display
- **layout/** - Navigation and structure components

#### `src/lib/` - Utilities
- **axios.ts** - HTTP client configuration
- **formatters.ts** - Data formatting helpers
- **pollingManager.ts** - Long-poll for async operations
- **scoreUtils.ts** - Scoring calculations
- **utils.ts** - General utilities
- **api/** - API service layer
- **stateMachine/** - State management helpers

#### `src/store/` - Zustand State Management
- **useAuthStore.ts** - Authentication state (user, token)
- **useIdeaStore.ts** - Ideas and idea details
- **useRunStore.ts** - Analysis run status
- **useAnalyticsStore.ts** - Analytics data
- **useDriftStore.ts** - Market drift data

#### `src/types/` - TypeScript Definitions
- **agent.ts** - Agent-related types
- **analysis.ts** - Analysis result types
- **analytics.ts** - Analytics data types
- Plus domain-specific type files

#### `src/styles/` - Styling
- **globals.css** - Global Tailwind styles
- **not-found.css** - 404 page styling

---

## 6. Data Flow & API Endpoints

### 6.1 Request Flow (Backend)

```
HTTP Request (Frontend)
    ↓
CORS Middleware
    ↓
JWT Authentication Middleware
    ↓
Route Handler (views.py)
    ↓
Business Logic (services.py)
    ↓
External APIs (Gemini, SerpAPI) OR MongoDB
    ↓
Response Serialization (serializers.py)
    ↓
HTTP Response (JSON)
```

### 6.2 Key API Endpoints

**Users:**
- `POST /api/v1/users/register/` - Create new user
- `POST /api/v1/users/login/` - Authenticate user
- `GET /api/v1/users/profile/` - Get user details

**Ideas:**
- `POST /api/v1/ideas/` - Create new idea
- `GET /api/v1/ideas/` - List user's ideas
- `GET /api/v1/ideas/{id}/` - Get idea details
- `PUT /api/v1/ideas/{id}/` - Update idea
- `DELETE /api/v1/ideas/{id}/` - Delete idea

**Analysis:**
- `POST /api/v1/agent/start-analysis/` - Begin analysis (async)
- `GET /api/v1/agent/status/{run_id}/` - Check analysis status
- `POST /api/v1/agent/run-analysis/` - Run analysis (sync)
- `GET /api/v1/agent/results/{run_id}/` - Get analysis results

**Analytics:**
- `GET /api/v1/analytics/tam/{idea_id}/` - Get TAM/SAM/SOM
- `GET /api/v1/analytics/risks/{idea_id}/` - Get risk assessment
- `GET /api/v1/analytics/competitors/{idea_id}/` - Get competitor matrix

**Pitch Deck:**
- `POST /api/v1/pitchdeck/generate/` - Generate pitch deck
- `GET /api/v1/pitchdeck/{run_id}/` - Retrieve generated deck

---

## 7. Data Models

### MongoDB Collections

#### `users` (via Django ORM)
```
{
  _id: ObjectId,
  email: string,
  password_hash: string,
  created_at: datetime,
  updated_at: datetime
}
```

#### `ideas`
```
{
  _id: ObjectId,
  user_email: string,
  title: string,
  description: string,
  status: string (active/archived),
  created_at: datetime,
  updated_at: datetime
}
```

#### `agent_runs`
```
{
  _id: ObjectId,
  idea_id: string,
  status: string (pending/running/completed/failed),
  idea_type: string (tech/marketplace/deeptech/general),
  classification_confidence: float,
  overall_score: float,
  weighted_score: float,
  execution_log: array<object>,
  critique: object,
  iterations_used: int,
  convergence_reason: string,
  created_at: datetime
}
```

#### `idea_analyses`
```
{
  _id: ObjectId,
  idea_id: string,
  similar_startups: string,
  market_data: string,
  market_quantitative_model: object,
  funding_info: string,
  monetization: string,
  customer_profile: string,
  tech_stack: string,
  swot: string,
  created_at: datetime
}
```

#### `idea_type_weights`
```
{
  _id: ObjectId,
  idea_type: string (unique),
  weights: object,
  updated_at: datetime
}
```

---

## 8. Async Task Processing (Celery)

### Task Queue Architecture

```
Frontend Request
    ↓
Django View
    ↓
Celery Task Enqueue (to Redis)
    ↓
Celery Worker (processes async)
    ↓
Run Agents & External API Calls
    ↓
Store Results in MongoDB
    ↓
Frontend Polls for Status
    ↓
Results Displayed
```

### Key Celery Tasks

- `run_startup_analysis.delay(run_id)` - Main analysis orchestration
- Agent execution tasks
- Pitch deck generation tasks
- Market drift detection tasks

---

## 9. Security Architecture

### Authentication Flow
1. User registers with email/password
2. Password hashed with bcrypt
3. Login generates JWT token
4. Token included in Authorization header
5. Middleware validates JWT on each request
6. Role-based permissions enforced

### API Security
- CORS enabled for frontend domain
- CSRF protection
- JWT expiration
- Rate limiting (subscription-based)

---

## 10. Deployment Architecture

### Environment Variables (.env)
```
MONGO_DB_URI=mongodb+srv://...  # MongoDB Atlas connection
MONGO_DB_NAME=foundermind
GEMINI_API_KEY=...              # Google Gemini API key
SERPAPI_KEY=...                 # SerpAPI key
SECRET_KEY=...                  # Django secret
```

### Docker Services (docker-compose.yml)
- **Redis** - Message broker and cache (port 6379)
- Celery workers (background tasks)

### Deployment Stack
- **Backend:** Django development server (local) → Gunicorn + Nginx (production)
- **Frontend:** Next.js dev server (local) → Vercel or self-hosted (production)
- **Database:** MongoDB Atlas (cloud)
- **Task Queue:** Redis + Celery (Docker)

---

## 11. How It Works: Complete User Journey

### Step 1: User Signup & Login
1. User visits landing page
2. Clicks "Sign Up" → enters email/password
3. Credentials sent to `/api/v1/users/register/`
4. User receives JWT token
5. Token stored in browser localStorage

### Step 2: Create Idea
1. User navigates to dashboard
2. Clicks "Create Idea"
3. Enters idea title and description
4. Submitted to `/api/v1/ideas/`
5. Idea stored in MongoDB
6. Displayed in idea list

### Step 3: Trigger Analysis
1. User clicks "Analyze" on idea
2. Frontend sends POST to `/api/v1/agent/start-analysis/`
3. Backend creates AgentRun document (status: pending)
4. Celery task queued: `run_startup_analysis.delay(run_id)`
5. Frontend returns run_id and starts polling for status

### Step 4: Agent Execution (Async)
1. **Planner Phase:** 
   - LLM classifies idea type
   - Determines weights and required tools
   - Creates execution plan

2. **Executor Phase:**
   - Runs each tool in sequence
   - Tool 1: Search similar startups via SerpAPI
   - Tool 2: Research market data (Google search + LLM)
   - Tool 3: Gather funding info
   - Tool 4: Generate monetization strategy (LLM)
   - Tool 5: Create customer profile (LLM)
   - Tool 6: Suggest tech stack (LLM)
   - Tool 7: Generate SWOT analysis (LLM)

3. **Analytics Phase:**
   - Calculate TAM/SAM/SOM
   - Assess risks
   - Build competitor matrix
   - Apply weighted scoring

4. **Critic Phase:**
   - Review all results
   - Validate consistency
   - Provide feedback

5. **Reporter Phase:**
   - Aggregate all findings
   - Calculate overall score
   - Generate insights
   - Store IdeaAnalysis document

### Step 5: View Results
1. Frontend polls `/api/v1/agent/status/{run_id}/`
2. Status changes from pending → completed
3. Frontend fetches full results
4. Displays:
   - Overall score
   - Market opportunity (TAM/SAM/SOM)
   - Competitor analysis
   - Risk assessment
   - SWOT analysis
   - Monetization strategy
   - Tech recommendations

### Step 6: Generate Pitch Deck
1. User clicks "Generate Pitch Deck"
2. Request sent to `/api/v1/pitchdeck/generate/`
3. Generator creates slides using analysis data
4. Returns downloadable PDF or slides link

---

## 12. Technology Highlights

### Why These Technologies?

| Technology | Reason |
|-----------|--------|
| **Django + DRF** | Mature, secure, REST API best practices |
| **MongoDB** | Flexible schema for varied analysis outputs |
| **Celery + Redis** | Asynchronous task processing for long-running analysis |
| **Google Gemini** | Latest LLM for high-quality text generation |
| **SerpAPI** | Reliable web search without scraping |
| **Next.js** | Modern React framework, server-side rendering, built-in optimization |
| **Zustand** | Lightweight state management (simpler than Redux) |
| **Tailwind CSS** | Utility-first CSS for rapid UI development |
| **Three.js** | 3D graphics for engaging animations |

---

## 13. Key Features & Differentiators

1. **Multi-Agent AI System** - Specialized agents for planning, execution, validation
2. **Dynamic Idea Classification** - Different analysis weights based on idea type
3. **Real-time Market Intelligence** - Live data from SerpAPI and Gemini
4. **Automated Pitch Deck Generation** - Investment-ready presentations from analysis
5. **Risk Assessment Engine** - Quantifies business and market risks
6. **Competitor Matrix** - Visual competitive landscape comparison
7. **TAM/SAM/SOM Calculation** - Data-backed market sizing
8. **Async Processing** - Non-blocking analysis for better UX
9. **Scalable Architecture** - Celery workers can be scaled independently

---

## 14. Future Enhancements (Planned)

- [ ] Vector embeddings for semantic analysis
- [ ] ML-based scoring models
- [ ] Investor matching algorithm
- [ ] Subscription tiers implementation
- [ ] Export to PDF/PowerPoint
- [ ] Collaboration features
- [ ] Real-time notifications
- [ ] Advanced dashboard analytics
- [ ] Mobile app (React Native)

---

## 15. Development Setup

### Backend Setup
```bash
cd foundermind_backend
poetry install
poetry run python manage.py runserver
```

### Frontend Setup
```bash
cd foundermind_frontend
npm install
npm run dev
```

### Requirements
- Python 3.10+
- Node.js 24+
- MongoDB Atlas account
- Google Gemini API key
- SerpAPI key
- Redis (local or Docker)

---

This comprehensive overview provides a complete picture of the Foundermind platform architecture, agent system, data flow, and feature set. Use this as your reference document for all technical discussions and development work.
