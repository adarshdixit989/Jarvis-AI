import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
    MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
    BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").strip()
    WAKE_WORD = os.getenv("JARVIS_WAKE_WORD", "jarvis").strip().lower()
    LANGUAGE = os.getenv("JARVIS_LANGUAGE", "en-IN").strip()
    TTS_RATE = int(os.getenv("JARVIS_TTS_RATE", "175"))
    CONFIRM_RISKY = os.getenv("JARVIS_CONFIRM_RISKY", "true").lower() == "true"
