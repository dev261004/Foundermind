import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

genai.configure()

model = genai.GenerativeModel(model_name="models/gemini-1.5-flash-latest")


def generate_text(prompt: str) -> str:
    """
    Wrapper for Gemini text generation.
    Keeps single integration point.
    """
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Gemini error: {e}"