import speech_recognition as sr
import pyttsx3

class SpeechEngine:
    def __init__(self, language="en-IN", rate=175):
        self.recognizer = sr.Recognizer()
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.7
        self.language = language
        self.tts = pyttsx3.init()
        self.tts.setProperty("rate", rate)
        self._select_voice()

    def _select_voice(self):
        try:
            voices = self.tts.getProperty("voices")
            for v in voices:
                name = f"{getattr(v, 'name', '')} {getattr(v, 'id', '')}".lower()
                if "english" in name or "zira" in name or "david" in name:
                    self.tts.setProperty("voice", v.id)
                    break
        except Exception:
            pass

    def speak(self, text):
        text = str(text).strip()
        if not text:
            return
        print(f"JARVIS: {text}")
        try:
            self.tts.say(text)
            self.tts.runAndWait()
        except Exception as exc:
            print(f"[TTS warning] {exc}")

    def listen(self, timeout=5, phrase_time_limit=10):
        with sr.Microphone() as source:
            try:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.4)
                print("Listening...")
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)
            except sr.WaitTimeoutError:
                return ""
        try:
            text = self.recognizer.recognize_google(audio, language=self.language)
            print(f"YOU: {text}")
            return text.strip()
        except (sr.UnknownValueError, sr.RequestError):
            return ""
