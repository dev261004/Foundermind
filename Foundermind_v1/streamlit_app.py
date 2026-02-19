import streamlit as st
import requests
import os
import re
import pandas as pd
from agent import AgentTools, generate_swot_analysis, save_swot_to_pdf
from streamlit_cookies_manager import EncryptedCookieManager

# --- CONFIG ---
st.set_page_config(page_title="FounderMind.AI", layout="wide")
BACKEND_URL = "http://localhost:8000"  # change if hosted

# --- HEADER ---
col1, col2 = st.columns([1, 6])
with col1:
    if os.path.exists("branding/logo.jpg"):
        st.image("branding/logo.jpg", use_container_width=True)
with col2:
    st.title("FounderMind Agent")
    st.subheader("Analyze your startup idea with AI-powered research, insights, and analysis.")
st.markdown("---")

# --- COOKIE SETUP ---
cookies = EncryptedCookieManager(
    prefix="foundermind_ai",
    password=os.getenv("COOKIE_SECRET", "dev-secret")
)


if not cookies.ready():
    st.stop()

# --- AUTH STATE ---
if "user_email" not in st.session_state:
    st.session_state.user_email = cookies.get("user_email")

# --- SIDEBAR: ACCOUNT & IDEAS ---
with st.sidebar:
    st.markdown("## 🔐 Account")

    if st.session_state.user_email:  
        st.success(f"Logged in as **{st.session_state.user_email}**")
        if st.button("🚪 Logout", use_container_width=True):
            st.session_state.user_email = None
            cookies["user_email"] = ""  # clear cookie
            cookies.save()
            st.rerun()
    else:
        choice = st.radio("Action", ["Login", "Register"])
        email = st.text_input("📧 Email")
        password = st.text_input("🔑 Password", type="password")

        if st.button(choice, use_container_width=True):
            endpoint = "/login/" if choice == "Login" else "/register/"
            res = requests.post(BACKEND_URL + endpoint, json={"email": email, "password": password})
            if res.status_code == 200:
                st.session_state.user_email = email
                cookies["user_email"] = email
                cookies.save()
                st.success("✅ Logged in successfully!" if choice == "Login" else "✅ Registered! Please log in.")
                st.rerun()
            else:
                try:
                    error_msg = res.json().get("error", "Something went wrong.")
                except Exception:
                    error_msg = "Something went wrong."
                st.error(error_msg)

    st.markdown("---")
    st.markdown("## 📂 Saved Ideas")

    saved_ideas = []
    if "saved_ideas" not in st.session_state:
        st.session_state.saved_ideas = []
    if st.session_state.user_email and not st.session_state.saved_ideas:
        try:
            res = requests.get(
                BACKEND_URL + "/my-ideas/",
                params={"email": st.session_state.user_email}
            )
            if res.status_code == 200:
                data = res.json()
                st.session_state.saved_ideas = data.get("ideas", [])
        except Exception as e:
            st.warning(f"⚠️ Could not fetch saved ideas: {e}")
    saved_ideas = st.session_state.saved_ideas

    if saved_ideas:
        idea_titles = [idea["idea"] for idea in saved_ideas]
        selected_idea = st.selectbox("Choose Idea", idea_titles)

        col1, col2 = st.columns(2)
        with col1:
            if st.button(" Load", use_container_width=True):
                idea = next((i for i in saved_ideas if i["idea"] == selected_idea), None)
                if idea:
                    st.session_state.cached = idea
                    st.session_state.startup_idea = selected_idea

        with col2:
            if st.button(" Delete", use_container_width=True):
                idea_to_delete = next((i for i in saved_ideas if i["idea"] == selected_idea), None)
                if idea_to_delete:
                    try:
                        r = requests.post(
                            BACKEND_URL + "/delete-idea/",
                            json={"id": idea_to_delete["id"], "email": st.session_state.user_email}
                        )
                        if r.status_code == 200:
                            st.success(f"Idea '{selected_idea}' deleted.")
                            st.session_state.saved_ideas = [
                                i for i in st.session_state.saved_ideas if i["id"] != idea_to_delete["id"]
                            ]
                            if "cached" in st.session_state and st.session_state.startup_idea == selected_idea:
                                del st.session_state["cached"]
                                del st.session_state["startup_idea"]
                    except Exception as e:
                        st.error(f"Error deleting idea: {e}")
    else:
        st.info("No saved ideas yet. Start by Analyzing a new one ✅")


# --- HELPER FUNCTIONS ---
def make_clickable_links(text):
    return re.sub(r'(https?://\S+)', r'[\1](\1)', text)

def clean_response(text):
    if not text:
        return ""
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    return make_clickable_links(text.strip())

def display_section(title, data):
    with st.expander(title, expanded=True):
        if data:
            st.markdown(clean_response(data))
        else:
            st.info("No data available.")



# def extract_market_numbers(market_data_text):
    # Match market size ($, USD, or numbers with billion/million/trillion)
    # market_size_match = re.search(
    #     r'(?:\$|USD\s*)?([\d.,]+)\s*(billion|million|trillion|bn|mn|tn|B|M|T)?',
    #     market_data_text, re.IGNORECASE
    # )

    # # Match CAGR in many forms: "CAGR of 12%", "12% CAGR", "at a CAGR of 7.5%"
    # cagr_match = re.search(
    #     r'(?:CAGR[^0-9]{0,10}|growth[^0-9]{0,10})?([\d.,]+)\s*%', 
    #     market_data_text, re.IGNORECASE
    # )

    # market_size, cagr = None, None

    # if market_size_match:
    #     size_value = market_size_match.group(1).replace(',', '')
    #     unit = (market_size_match.group(2) or '').lower()

    #     multiplier = 1
    #     if unit in ['billion', 'bn', 'b']:
    #         multiplier = 1e9
    #     elif unit in ['million', 'mn', 'm']:
    #         multiplier = 1e6
    #     elif unit in ['trillion', 'tn', 't']:
    #         multiplier = 1e12

    #     try:
    #         market_size = float(size_value) * multiplier
    #     except ValueError:
    #         pass

    # if cagr_match:
    #     try:
    #         cagr = float(cagr_match.group(1))
    #     except ValueError:
    #         pass

    # return market_size, cagr


# def visualize_market_data(market_data_text):
#     market_size, cagr = extract_market_numbers(market_data_text)
#     if not market_size:
#         st.warning("⚠️ Couldn’t parse real numeric data from market research text.")
#         return
#     years = [2022, 2023, 2024]
#     market_sizes = [market_size / (1 + cagr/100)**(2-i) if cagr else market_size for i in range(3)]
#     df = pd.DataFrame({"Year": years, "Market Size ($)": market_sizes})
#     st.line_chart(df.set_index("Year"))

# --- SIDEBAR: SAVED IDEAS ---
# with st.sidebar:
#     st.subheader("📂 Your Saved Ideas")
#     saved_ideas = []

#     if st.session_state.user_email:
#         try:
#             res = requests.get(
#                 BACKEND_URL + "/my-ideas/",
#                 params={"email": st.session_state.user_email}
#             )
#             if res.status_code == 200:
#                 data = res.json()
#                 saved_ideas = data.get("ideas", [])
#         except Exception as e:
#             st.warning(f"⚠️ Could not fetch saved ideas: {e}")

#     selected_idea = None
#     if saved_ideas:
#         idea_titles = [idea["idea"] for idea in saved_ideas]
#         selected_idea = st.selectbox("Choose Idea", idea_titles)

#         if st.button("🔍 Load Analysis"):
#             # Cache the selected idea
#             idea = next((i for i in saved_ideas if i["idea"] == selected_idea), None)
#             if idea:
#                 st.session_state.cached = idea
#                 st.session_state.startup_idea = selected_idea
#         if st.button("🗑️ Delete Idea"):
#             # Delete by id
#             idea_to_delete = next((i for i in saved_ideas if i["idea"] == selected_idea), None)
#             if idea_to_delete:
#                 try:
#                     r = requests.post(
#                         BACKEND_URL + "/delete-idea/",
#                         json={"id": idea_to_delete["id"],
#                                "email": st.session_state.user_email}
#                     )
#                     if r.status_code == 200:
#                         data = r.json()
#                         st.success(f"Idea '{selected_idea}' deleted.")
#                         saved_ideas = data.get("ideas", [])  # update local list
#                 except Exception as e:
#                     st.error(f"Error deleting idea: {e}")
#     else:
#         st.info("No saved ideas yet.")

# --- MAIN INPUT ---
startup_idea = st.text_input("📝 Enter your startup idea:")
suggest_stack = st.checkbox("💻 Suggest Tech Stack (if applicable)")

if st.button("Validate Idea"):
    if not startup_idea.strip():
        st.warning("Please enter a valid startup idea.")
    else:
        with st.spinner("Analyzing idea with AI tools..."):
            tools = AgentTools(startup_idea)
            similar_results = tools.search_similar_startups()
            market_data = tools.search_market_data()
            funding_info = tools.search_funding_info()
            monetization = tools.generate_monetization_strategy()
            customer_profile = tools.generate_customer_profile()
            tech_stack = ""
            if suggest_stack and tools.is_technical_startup():
                tech_stack = tools.suggest_tech_stack()

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
Strengths:
- ...
Weaknesses:
- ...
Opportunities:
- ...
Threats:
- ...
"""
            swot = generate_swot_analysis(swot_prompt)

            st.session_state.cached = {
                "idea": startup_idea,
                "similar_startups": similar_results,
                "market_data": market_data,
                "funding_info": funding_info,
                "monetization": monetization,
                "customer_profile": customer_profile,
                "tech_stack": tech_stack,
                "swot": swot,
            }
            st.session_state.startup_idea = startup_idea

            # ✅ Save to Django backend
            try:
                payload = {
                    "user_email": st.session_state.user_email,
                    **st.session_state.cached
                }
                r = requests.post(BACKEND_URL + "/save-idea/", json=payload)
                if r.status_code == 200:
                    st.success("✅ Idea saved to your history.")
                     # --- UPDATE SIDEBAR LIST INSTANTLY ---
                    new_idea = {
                        "id": r.json().get("id"),  # must return id from backend
                        "idea": startup_idea
                    }
                    if "saved_ideas" not in st.session_state:
                        st.session_state.saved_ideas = []
                    st.session_state.saved_ideas.append(new_idea)
            except Exception as e:
                st.warning(f"❌ Couldn’t save to server: {e}")

# --- DISPLAY OUTPUT ---
if "cached" in st.session_state:
    data = st.session_state.cached
    display_section("🔗 Similar Startups", data.get("similar_startups"))
    st.subheader("📊 Market Data")
    st.markdown(clean_response(data.get("market_data", "")))
    # visualize_market_data(data.get("market_data", ""))
    display_section("💸 Funding Info", data.get("funding_info"))
    display_section("📈 Monetization Strategies", data.get("monetization"))
    display_section("🧍‍♂️ Ideal Customer Profile", data.get("customer_profile"))
    if data.get("tech_stack"):
        display_section("💻 Suggested Tech Stack", data.get("tech_stack"))
    display_section("📋 SWOT Analysis", data.get("swot"))

    filename = st.session_state.startup_idea.strip().replace(" ", "_") + "_SWOT.pdf"
    save_swot_to_pdf(st.session_state.startup_idea, data.get("swot", ""))
    with open(filename, "rb") as f:
        st.download_button("📄 Download SWOT as PDF", f, file_name=filename, mime="application/pdf")

# --- FOOTER ---
st.markdown("""
---
<div style='text-align: center; color: gray;'>
    Built by Dev Agrawal • Powered by Gemini Pro & SerpAPI • <a href='mailto:devagrawal261004@email.com'>Contact</a>
</div>
""", unsafe_allow_html=True)
