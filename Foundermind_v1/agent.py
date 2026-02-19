import os
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from serpapi import GoogleSearch

# --- Setup ---
load_dotenv()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
genai.configure()

# --- Load Gemini Model ---
model = genai.GenerativeModel(model_name="models/gemini-1.5-flash-latest")

# --- Constants ---
MEMORY_FILE = "agent_memory.json"

# --- MEMORY FUNCTIONS ---
def load_memory():
    if not os.path.exists(MEMORY_FILE):
        return {}
    with open(MEMORY_FILE, "r") as f:
        return json.load(f)

def save_memory(memory):
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=4)

def list_saved_ideas(memory):
    if not memory:
        print("🗃️ No saved ideas yet.")
        return
    print("\n📚 Saved Startup Ideas:")
    for idx, idea in enumerate(memory.keys(), 1):
        print(f"{idx}. {idea}")
        
def get_past_result(memory, idea):
    return memory.get(idea.strip().lower())

def store_result(memory, idea, data):
    memory[idea.strip().lower()] = data
    save_memory(memory)

def delete_idea(memory, idea):
    idea_key = idea.strip().lower()
    if idea_key in memory:
        del memory[idea_key]
        save_memory(memory)
        print(f"🗑️ Deleted: '{idea}' from memory.")
    else:
        print("❌ Idea not found in memory.")

def list_saved_ideas(memory):
    if not memory:
        print("🗃️ No saved ideas yet.")
        return
    print("\n📚 Saved Startup Ideas:")
    for idx, idea in enumerate(memory.keys(), 1):
        print(f"{idx}. {idea}")

# serpapi tool
def search_with_serpapi(query, num_results=5):
    params = {
        "engine": "google",
        "q": query,
        "api_key": os.getenv("SERPAPI_KEY"),
        "num": num_results
    }
    try:
        search = GoogleSearch(params)
        results = search.get_dict()
        return results.get("organic_results", [])
    except Exception as e:
        print(f"SerpAPI error: {e}")
        return []


# --- TOOLBOX ---
class AgentTools:
    def __init__(self, idea):
        self.idea = idea

    def search_similar_startups(self) -> str:
        query = f"{self.idea} startup"
        results = search_with_serpapi(query)
        if not results:
            return "No similar startups found."
        return "\n".join([f"- {r['title']}\n  {r['link']}" for r in results])

    def search_market_data(self) -> str:
        query = f"{self.idea} market size 2024"
        results = search_with_serpapi(query)
        if not results:
            return "No market data found."
        return "\n".join([f"- {r['title']}\n  {r['link']}" for r in results])

    def search_funding_info(self) -> str:
        query = f"{self.idea} startup funding site:crunchbase.com"
        results = search_with_serpapi(query)
        if not results:
            return "No funding info found."
        return "\n".join([f"- {r['title']}\n  {r['link']}" for r in results])

    def generate_monetization_strategy(self) -> str:
        prompt = f"""
You are a startup business advisor.

Suggest 3-5 monetization strategies for the following startup idea and explain why each is relevant.

Startup Idea: "{self.idea}"

Format the output like this:

**Monetization Strategies:**
1. Strategy name — short explanation
2. ...
"""
        try:
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating monetization strategy: {e}"

    def generate_customer_profile(self) -> str:
        prompt = f"""
You are a startup market strategist.

Based on the startup idea below, generate an Ideal Customer Profile (ICP) in this format:

**Ideal Customer Profile:**
- Age:
- Profession:
- Needs:
- Pain Points:
- Buying Behavior:

Startup Idea: "{self.idea}"
"""
        try:
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating customer profile: {e}"

    def is_technical_startup(self) -> bool:
        prompt = f"""Is the following startup idea a technical or software-based product?

Startup Idea: "{self.idea}"

Respond with 'Yes' or 'No' only.
"""
        try:
            response = model.generate_content(prompt)
            return "yes" in response.text.lower()
        except Exception as e:
            print(f"Error determining technical nature: {e}")
            return False

    def suggest_tech_stack(self) -> str:
        prompt = f"""
You are a senior software architect.

Based on the startup idea below, suggest a relevant tech stack with reasoning.

Startup Idea: "{self.idea}"

Respond in this format:
- Frontend:
- Backend:
- Database:
- Hosting / DevOps:
- Optional Tools:
"""
        try:
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating tech stack: {e}"



# --- SWOT Generator ---
def generate_swot_analysis(full_prompt: str) -> str:
    try:
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        return f"Error generating SWOT analysis: {e}"

# --- PDF Exporter ---
def save_swot_to_pdf(startup_idea: str, swot_text: str):
    filename = startup_idea.strip().replace(" ", "_") + "_SWOT.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, f"SWOT Analysis: {startup_idea}")

    c.setFont("Helvetica", 12)
    lines = swot_text.split("\n")
    y = height - 80
    for line in lines:
        if y < 50:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 12)
        c.drawString(50, y, line)
        y -= 18

    c.save()
    print(f"\n✅ SWOT analysis saved as PDF: {filename}")

# --- Main Agent Loop ---
def run_agent():
    print("🚀 Welcome to the Startup Idea Validator Agent!")
    memory = load_memory()

    choice = input("\n📘 What would you like to do? (n)ew idea, (l)ist saved, (d)elete, or (q)uit: ").lower()
    if choice == 'l':
        list_saved_ideas(memory)
        return
    elif choice == 'd':
        idea_to_delete = input("Enter the startup idea to delete: ")
        delete_idea(memory, idea_to_delete)
        return
    elif choice == 'q':
        return

    startup_idea = input("📝 Enter your startup idea: ")
    if not startup_idea.strip():
        print("❌ Please enter a valid startup idea.")
        return

    cached = get_past_result(memory, startup_idea)
    if cached:
        print("\n🧠 Memory found! Showing previously analyzed result.\n")
        print("📋 SWOT:\n", cached["swot"])
        choice = input("\n🔄 Do you want to re-analyze this idea? (y/n): ")
        if choice.lower() != 'y':
            return

    tools = AgentTools(startup_idea)

    print("\n🤔 Step 1: Searching for similar startups...")
    similar_results = tools.search_similar_startups()
    print("\n🔗 Similar Startups:\n", similar_results)

    print("\n💼 Step 2: Searching for market data...")
    market_data = tools.search_market_data()
    print("\n📊 Market Data:\n", market_data)

    print("\n💰 Step 3: Searching for funding history...")
    funding_info = tools.search_funding_info()
    print("\n💸 Funding Info:\n", funding_info)

    print("\n💡 Step 4: Generating monetization strategies...")
    monetization = tools.generate_monetization_strategy()
    print("\n📈 Monetization Strategies:\n", monetization)

    print("\n🧑‍🎯 Step 5: Generating ideal customer profile...")
    customer_profile = tools.generate_customer_profile()
    print("\n🧍‍♂️ Ideal Customer Profile:\n", customer_profile)

    swot_prompt = f"""
You are a startup analyst.

Startup Idea: "{startup_idea}"

Here are similar startups:
{similar_results}

Here is some market research data:
{market_data}

Here is some funding info:
{funding_info}

Here are potential monetization strategies:
{monetization}

Here is the ideal customer profile:
{customer_profile}

Now do a detailed SWOT analysis.

Respond in this format:
**Strengths:**
- ...
**Weaknesses:**
- ...
**Opportunities:**
- ...
**Threats:**
- ...
"""

    swot = generate_swot_analysis(swot_prompt)
    print("\n📋 SWOT Analysis:\n")
    print(swot)

    store_result(memory, startup_idea, {
        "similar_startups": similar_results,
        "market_data": market_data,
        "funding_info": funding_info,
        "monetization": monetization,
        "customer_profile": customer_profile,
        "swot": swot
    })

    choice = input("\n💾 Do you want to save this SWOT analysis as a PDF? (y/n): ")
    if choice.lower() == 'y':
        save_swot_to_pdf(startup_idea, swot)

if __name__ == "__main__":
    run_agent()