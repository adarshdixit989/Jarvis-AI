from .config import Config
from .speech import SpeechEngine
from .llm import LLM
from .commands import CommandRouter
from .storage import add_history, get_history

SYSTEM_PROMPT = """You are JARVIS, a concise personal desktop AI assistant.
Be helpful, accurate and practical. Never claim to have executed an OS action unless the command router confirms it.
For dangerous or destructive actions, ask for confirmation.
Prefer short spoken responses."""

class JarvisApp:
    def __init__(self):
        self.speech = SpeechEngine(Config.LANGUAGE, Config.TTS_RATE)
        self.llm = LLM(Config.API_KEY, Config.MODEL, Config.BASE_URL)
        self.router = CommandRouter(self.speech, self.llm, Config.CONFIRM_RISKY)
        self.running = True

    def _strip_wake_word(self, text):
        t = text.strip()
        low = t.lower()
        if low.startswith(Config.WAKE_WORD):
            return t[len(Config.WAKE_WORD):].strip(" ,.!?")
        return None

    def process(self, command):
        result = self.router.handle(command)
        if result == "__EXIT__":
            self.speech.speak("Goodbye. Shutting down JARVIS.")
            self.running = False
            return
        if result:
            self.speech.speak(result)
            return

        history = get_history()[-12:]
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend({"role": x["role"], "content": x["content"]} for x in history if x["role"] in {"user", "assistant"})
        messages.append({"role": "user", "content": command})
        answer = self.llm.ask(messages)
        if answer:
            add_history("user", command)
            add_history("assistant", answer)
            self.speech.speak(answer)
        else:
            self.speech.speak("I can handle commands like open, search, weather, calculate, notes, screenshot, and system status. Add an API key for conversational AI.")

    def run(self):
        print("=== JARVIS AI ===")
        print(f"Wake word: {Config.WAKE_WORD}")
        print(f"LLM: {'enabled' if self.llm.enabled else 'disabled'}")
        self.speech.speak("JARVIS online. Say my name followed by a command.")
        while self.running:
            text = self.speech.listen(timeout=8, phrase_time_limit=8)
            if not text:
                continue
            command = self._strip_wake_word(text)
            if command is not None:
                if not command:
                    self.speech.speak("Yes?")
                    command = self.speech.listen(timeout=5, phrase_time_limit=10)
                if command:
                    self.process(command)
