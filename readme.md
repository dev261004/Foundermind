# FounderMind.AI 🚀

An AI-powered startup idea analyzer that helps entrepreneurs validate their business ideas through comprehensive research, market analysis, and strategic insights.

![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square)
![Django](https://img.shields.io/badge/Django-5.2-green?style=flat-square)
![Streamlit](https://img.shields.io/badge/Streamlit-1.54-red?style=flat-square)
![AI](https://img.shields.io/badge/AI-Gemini_Pro-purple?style=flat-square)

## ✨ Features

- **AI-Powered Analysis**: Generate comprehensive SWOT analysis using Google Gemini Pro
- **Market Research**: Search similar startups, market data, and funding information
- **Strategic Insights**: Get monetization strategies and ideal customer profiles
- **Tech Stack Suggestions**: For technical/software-based startup ideas
- **User Authentication**: Secure login/registration system
- **Save & Manage Ideas**: Store and manage your analyzed startup ideas
- **PDF Export**: Download SWOT analysis as PDF
- **Modern UI**: Clean, intuitive interface built with Streamlit

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Streamlit |
| Backend | Django 5.2 + Django REST Framework |
| Database | SQLite (default) / MongoDB |
| AI Model | Google Gemini Pro |
| Search API | SerpAPI |
| PDF Generation | ReportLab |

## 📁 Project Structure

```
FounderMind/
├── .streamlit/
│   └── config.toml
├── branding/
│   └── logo.jpg
├── foundermind_backend/
│   ├── foundermind_backend/    # Django project settings
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── ideas/                   # Ideas app
│   │   ├── migrations/
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── tests.py
│   │   └── views.py
│   ├── users/                   # Users app
│   │   ├── migrations/
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── tests.py
│   │   └── views.py
│   ├── .gitignore
│   ├── manage.py
│   └── .env
├── .gitignore
├── agent.py                     # AI agent tools
├── streamlit_app.py             # Streamlit frontend
├── requirements.txt
├── .env
└── gemini_key.json
```

## 📋 Prerequisites

- Python 3.11 or higher
- API Keys:
  - **Google Gemini API Key** (for AI analysis)
  - **SerpAPI Key** (for search functionality)

## 🔧 Installation

### 1. Clone the Repository

```
bash
git clone <repository-url>
cd FounderMind
```

### 2. Create Virtual Environment

```
bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```
bash
pip install -r requirements.txt
```

### 4. Environment Setup

Create a `.env` file in the root directory with the following variables:

```
env
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
SERPAPI_KEY=your_serpapi_key_here

# Django Secret Key
DJANGO_SECRET_KEY=your_django_secret_key

# Cookie Secret (for Streamlit session)
COOKIE_SECRET=your_cookie_secret_here
```

> **Note**: There's also a `.env` file inside `foundermind_backend/` folder. Make sure to configure both.

>**Note**: create gemini_key.json file in root directly and ppoot all credential related to gemini in their.

### 5. Database Setup

```
bash
cd foundermind_backend
python manage.py migrate
python manage.py runserver
```

## ▶️ How to Run

### Option 1: Run Both Frontend and Backend

#### Step 1: Start the Backend Server

```
bash
cd foundermind_backend
python manage.py runserver
```

The backend will run at: **http://127.0.0.1:8000/**

#### Step 2: Start the Frontend (in a new terminal)

```
bash
# From the root folder
streamlit run streamlit_app.py
```

The frontend will run at: **http://localhost:8501**

### Option 2: Run Only the AI Agent (CLI)

```
bash
python agent.py
```

This launches an interactive command-line interface for analyzing startup ideas.

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/login/` | POST | User login |
| `/register/` | POST | User registration |
| `/my-ideas/` | GET | Get user's saved ideas |
| `/save-idea/` | POST | Save a new idea |
| `/delete-idea/` | POST | Delete an idea |

## 💡 Usage Guide

### Using the Web Interface

1. **Register/Login**: Create an account or log in using the sidebar
2. **Enter Your Idea**: Type your startup idea in the text input
3. **Analyze**: Click "Validate Idea" to start the AI analysis
4. **View Results**: Explore similar startups, market data, SWOT analysis, and more
5. **Save**: Your idea is automatically saved to your account
6. **Download**: Export the SWOT analysis as PDF

### Using the CLI Agent

```
bash
python agent.py
```

Follow the interactive prompts to:
- Analyze new startup ideas
- View saved ideas
- Delete ideas
- Export to PDF

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for AI analysis | Yes |
| `SERPAPI_KEY` | SerpAPI key for search functionality | Yes |
| `DJANGO_SECRET_KEY` | Django secret key for production | Yes |
| `COOKIE_SECRET` | Secret for encrypted cookies | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google credentials JSON | Optional |

## 📦 Folder Structure Explanation

| Folder/File | Description |
|-------------|-------------|
| `branding/` | Contains logo and brand assets |
| `foundermind_backend/` | Django REST API backend |
| `foundermind_backend/foundermind_backend/` | Main Django project settings |
| `foundermind_backend/ideas/` | App for managing startup ideas |
| `foundermind_backend/users/` | App for user authentication |
| `agent.py` | Core AI agent with Gemini integration |
| `streamlit_app.py` | Streamlit web interface |
| `.env` | Environment variables (root) |
| `foundermind_backend/.env` | Backend environment variables |

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**: Make sure your `.env` file is properly configured with valid API keys
2. **Connection Issues**: Ensure the backend is running on port 8000 before starting the frontend
3. **Database Errors**: Run `python manage.py migrate` in the backend folder
4. **Import Errors**: Ensure all dependencies are installed with `pip install -r requirements.txt`

## 📄 License

This project is for educational and personal use.

## 👤 Author

Built by **Dev Agrawal**

- 🔗 [LinkedIn](https://linkedin.com/in/devagrawal)
- 📧 Email: devagrawal261004@gmail.com

## 🙏 Acknowledgments

- Powered by [Google Gemini Pro](https://deepmind.google/technologies/gemini)
- Search data from [SerpAPI](https://serpapi.com/)
- UI built with [Streamlit](https://streamlit.io/)
- Backend framework: [Django](https://www.djangoproject.com/)

---

<div align="center">
  Made with ❤️ for aspiring entrepreneurs
</div>
