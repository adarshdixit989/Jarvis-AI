import ast, operator, re
from datetime import datetime
import requests
from .storage import add_note, get_notes
from .system import SystemController

class CommandRouter:
    def __init__(self, speech, llm, confirm_risky=True):
        self.speech = speech
        self.llm = llm
        self.system = SystemController()
        self.confirm_risky = confirm_risky

    def _confirm(self, prompt):
        if not self.confirm_risky:
            return True
        self.speech.speak(prompt + " Say yes to continue.")
        answer = self.speech.listen(timeout=4, phrase_time_limit=4).lower()
        return answer in {"yes", "yeah", "yep", "confirm", "do it"}

    def calculate(self, expr):
        expr = expr.replace("×", "*").replace("÷", "/")
        if not re.fullmatch(r"[0-9+\-*/().% \t]+", expr):
            return "I can only calculate basic arithmetic expressions."
        try:
            return str(self._eval(ast.parse(expr, mode="eval").body))
        except Exception:
            return "I could not calculate that."

    def _eval(self, node):
        ops = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
               ast.Div: operator.truediv, ast.Mod: operator.mod}
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in ops:
            return ops[type(node.op)](self._eval(node.left), self._eval(node.right))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = self._eval(node.operand)
            return value if isinstance(node.op, ast.UAdd) else -value
        raise ValueError()

    def weather(self, city):
        try:
            geo = requests.get("https://geocoding-api.open-meteo.com/v1/search",
                               params={"name": city, "count": 1}, timeout=8).json()
            result = (geo.get("results") or [None])[0]
            if not result:
                return f"I could not find {city}."
            data = requests.get("https://api.open-meteo.com/v1/forecast",
                params={"latitude": result["latitude"], "longitude": result["longitude"],
                        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m"},
                timeout=8).json()["current"]
            return f"In {result['name']}, it is {data['temperature_2m']} degrees Celsius, humidity {data['relative_humidity_2m']} percent, wind {data['wind_speed_10m']} kilometers per hour."
        except Exception:
            return "Weather service is unavailable right now."

    def handle(self, command):
        c = command.lower().strip()
        if not c:
            return "I didn't catch that."
        if c in {"exit", "quit", "goodbye", "shutdown jarvis"}:
            return "__EXIT__"
        if c.startswith("open "):
            target = c[5:].strip()
            if self.system.open_website(target):
                return f"Opening {target}."
            if self.system.open_app(target):
                return f"Opening {target}."
            self.system.open_url("https://www.google.com/search?q=" + target.replace(" ", "+"))
            return f"I searched for {target}."
        if c.startswith(("search ", "google ")):
            q = c.split(" ", 1)[1]
            self.system.search_web(q)
            return f"Searching for {q}."
        if "take a screenshot" in c or "capture screen" in c:
            return f"Screenshot saved to {self.system.screenshot()}."
        if c in {"what time is it", "time", "current time"}:
            return datetime.now().strftime("It is %I:%M %p.")
        if c in {"what is today's date", "date", "today's date", "todays date"}:
            return datetime.now().strftime("Today is %A, %d %B %Y.")
        if c.startswith("weather in "):
            return self.weather(command[11:].strip())
        if c.startswith("calculate "):
            return "The answer is " + self.calculate(command[10:].strip()) + "."
        if c.startswith("remember "):
            add_note(command[9:].strip())
            return "Done. I saved that note."
        if "read my notes" in c or c == "my notes":
            notes = get_notes()
            if not notes:
                return "You do not have any saved notes."
            return "Your latest notes are: " + " | ".join(n["text"] for n in notes[-5:])
        if c in {"system status", "computer status", "system information"}:
            s = self.system.system_status()
            return f"CPU {s['CPU']}, RAM {s['RAM']}, battery {s['Battery']}."
        if c == "lock computer":
            if not self._confirm("Locking the computer can interrupt your work."):
                return "Cancelled."
            return "Locking the computer." if self.system.lock() else "I could not lock the computer."
        return None
