import json
from pathlib import Path
from datetime import datetime

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
NOTES_FILE = DATA_DIR / "notes.json"
HISTORY_FILE = DATA_DIR / "history.json"

def _load(path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def _save(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")

def add_note(text):
    notes = _load(NOTES_FILE, [])
    notes.append({"text": text, "created_at": datetime.now().isoformat(timespec="seconds")})
    _save(NOTES_FILE, notes)

def get_notes():
    return _load(NOTES_FILE, [])

def add_history(role, content):
    history = _load(HISTORY_FILE, [])
    history.append({"role": role, "content": content, "time": datetime.now().isoformat(timespec="seconds")})
    _save(HISTORY_FILE, history[-100:])

def get_history():
    return _load(HISTORY_FILE, [])
