import platform, subprocess, webbrowser
from pathlib import Path
from datetime import datetime
import urllib.parse
import psutil
import pyautogui

class SystemController:
    SITES = {
        "youtube": "https://www.youtube.com",
        "google": "https://www.google.com",
        "github": "https://github.com",
        "linkedin": "https://www.linkedin.com",
        "gmail": "https://mail.google.com",
        "chatgpt": "https://chatgpt.com",
    }

    def open_url(self, url):
        webbrowser.open(url)

    def search_web(self, query):
        webbrowser.open("https://www.google.com/search?q=" + urllib.parse.quote_plus(query))

    def open_website(self, name):
        url = self.SITES.get(name.lower())
        if url:
            self.open_url(url)
            return True
        return False

    def open_app(self, name):
        name = name.lower().strip()
        system = platform.system()
        candidates = {
            "Windows": {
                "notepad": ["notepad.exe"],
                "calculator": ["calc.exe"],
                "paint": ["mspaint.exe"],
                "explorer": ["explorer.exe"],
            },
            "Linux": {
                "terminal": ["x-terminal-emulator"],
                "calculator": ["gnome-calculator"],
                "files": ["xdg-open", str(Path.home())],
            },
            "Darwin": {
                "calculator": ["open", "-a", "Calculator"],
                "finder": ["open", str(Path.home())],
                "terminal": ["open", "-a", "Terminal"],
            },
        }
        command = candidates.get(system, {}).get(name)
        if not command:
            aliases = {"chrome": ["google-chrome"], "firefox": ["firefox"], "vscode": ["code"]}
            command = aliases.get(name)
        if not command:
            return False
        try:
            subprocess.Popen(command)
            return True
        except Exception as exc:
            print(f"[APP warning] {exc}")
            return False

    def screenshot(self):
        folder = Path("screenshots")
        folder.mkdir(exist_ok=True)
        path = folder / f"jarvis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        image = pyautogui.screenshot()
        image.save(path)
        return str(path)

    def system_status(self):
        battery = psutil.sensors_battery()
        return {
            "OS": platform.platform(),
            "CPU": f"{psutil.cpu_percent(interval=0.3)}%",
            "RAM": f"{psutil.virtual_memory().percent}%",
            "Battery": f"{battery.percent:.0f}%" if battery else "N/A",
        }

    def lock(self):
        system = platform.system()
        try:
            if system == "Windows":
                subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"])
            elif system == "Linux":
                subprocess.run(["loginctl", "lock-session"])
            elif system == "Darwin":
                subprocess.run(["pmset", "displaysleepnow"])
            else:
                return False
            return True
        except Exception:
            return False
