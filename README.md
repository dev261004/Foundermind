<div align="center">
  <img src="https://via.placeholder.com/150?text=Foundermind+Logo" alt="Foundermind Logo" width="150" height="150">
  <h1 align="center">Foundermind</h1>
  <p align="center">
    <strong>AI-Powered Startup Analysis & Validation Platform</strong>
    <br />
    Transform raw startup ideas into validated, data-backed business concepts.
    <br />
    <br />
    <a href="#features">Features</a>
    ·
    <a href="#tech-stack">Tech Stack</a>
    ·
    <a href="#getting-started">Getting Started</a>
    ·
    <a href="#architecture">Architecture</a>
  </p>
</div>

---

## 📖 About The Project

**Foundermind** is an intelligent, multi-agent AI system designed to help entrepreneurs evaluate their business ideas through strategic analysis and market intelligence. By automating market research, competitive analysis, funding intelligence, and strategic recommendations, Foundermind empowers founders to make data-driven decisions before writing a single line of code.

### 🎯 Key Highlights
* **Multi-Agent AI:** Specialized agents for planning, execution, and validation.
* **Dynamic Analysis:** Adapts analysis weights based on idea type (Tech, Marketplace, DeepTech, etc.).
* **Comprehensive Reports:** Produces detailed market sizing (TAM/SAM/SOM), SWOT analysis, competitor matrices, and pitch decks.
* **Modern Stack:** Built with Django, Next.js, Gemini AI, MongoDB, and Tailwind CSS.

---

## 📸 Screenshots

> **Note:** Screenshots of the platform will be added here shortly. You can replace the placeholder images below with actual application screenshots.

| Dashboard Overview | Idea Analysis Report |
| :---: | :---: |
| <img src="https://via.placeholder.com/600x400?text=Dashboard+Screenshot" alt="Dashboard" width="100%"> | <img src="https://via.placeholder.com/600x400?text=Analysis+Report+Screenshot" alt="Analysis Report" width="100%"> |
| *High-level overview of your ideas and agent runs.* | *Detailed breakdown including SWOT, Tech Stack, and Market Data.* |

| Competitor Matrix | Tech Stack Recommendations |
| :---: | :---: |
| <img src="https://via.placeholder.com/600x400?text=Competitor+Matrix+Screenshot" alt="Competitor Matrix" width="100%"> | <img src="https://via.placeholder.com/600x400?text=Tech+Stack+Screenshot" alt="Tech Stack" width="100%"> |
| *Visual comparison against top competitors.* | *AI-suggested optimal technology choices.* |

---

## ✨ Core Features

* 🧠 **Idea Classification Engine** - Automatically categorizes ideas into tech, marketplace, deeptech, or general to tailor the analysis.
* 🔍 **Market & Competitor Intelligence** - Gathers live market size data, current trends, and identifies similar startups.
* 💰 **Funding & Monetization Strategy** - Researches the funding landscape and provides data-backed revenue model recommendations.
* 🛠️ **Tech Stack Recommendation** - Suggests the optimal technology stack with confidence levels, categories, and alternatives.
* 📊 **Analytics & Insights** - Calculates TAM/SAM/SOM, assesses business risks, and visualizes competitor data.
* 📑 **Pitch Deck Generation** - Automatically synthesizes the analysis into presentation slides.

---

## 💻 Tech Stack

**Frontend**
* [Next.js 16](https://nextjs.org/) & [React 19](https://react.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Tailwind CSS 4](https://tailwindcss.com/)
* [Zustand](https://github.com/pmndrs/zustand) (State Management)
* [Three.js](https://threejs.org/) & [Framer Motion](https://www.framer.com/motion/) (Animations/3D)

**Backend**
* [Django 5.2](https://www.djangoproject.com/) & [Django REST Framework](https://www.django-rest-framework.org/)
* [Python 3.10+](https://www.python.org/)
* [Celery](https://docs.celeryq.dev/) & [Redis](https://redis.io/) (Asynchronous Tasks)
* [PyJWT](https://pyjwt.readthedocs.io/) (Authentication)

**Database & AI Services**
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (via MongoEngine)
* [Google Gemini AI](https://deepmind.google/technologies/gemini/) (Core Analysis Engine)
* [SerpAPI](https://serpapi.com/) (Web Search Integration)

---

## ⚙️ Architecture: How It Works

Foundermind relies on a sophisticated 4-agent orchestration workflow:

1. **Planner Agent:** Analyzes the startup idea, determines the execution order, and generates a structured analysis plan.
2. **Executor Agent:** Runs analysis tools sequentially (e.g., `search_similar_startups`, `generate_swot_analysis`), handling tool dependencies and APIs.
3. **Critic Agent:** Reviews findings for quality, consistency, and identifies potential contradictions or gaps.
4. **Reporter Agent:** Aggregates findings, calculates the overall startup score, and prepares the final report and pitch deck content.

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

* Python 3.10+
* Node.js 24+
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
* [Redis](https://redis.io/) server (local or via Docker)
* API Keys: Google Gemini API & SerpAPI

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/foundermind.git
   cd foundermind
   ```

2. **Backend Setup:**
   ```bash
   cd foundermind_backend
   poetry install
   # Create a .env file and add your credentials (MONGO_URI, GEMINI_API_KEY, SERPAPI_KEY, etc.)
   poetry run python manage.py runserver
   ```
   *Note: Ensure your Redis server is running, and start a Celery worker in a separate terminal for background task processing.*

3. **Frontend Setup:**
   ```bash
   cd ../foundermind_frontend
   npm install
   # Create a .env.local file for frontend environment variables
   npm run dev
   ```

4. **Open the app:**
   Navigate to `http://localhost:3000` in your browser.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
