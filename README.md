# JARVIS AI — Advanced Voice Personal Assistant

A modular Python voice assistant with wake-word activation, speech recognition, text-to-speech, optional OpenAI-compatible LLM integration, OS/browser automation, screenshots, notes, weather, calculator, system status and safe confirmation for risky actions.

## Features
- Wake word: "jarvis"
- Speech-to-text and text-to-speech
- Optional LLM conversational mode
- Open websites and supported applications
- Web search
- Screenshots
- Weather via Open-Meteo
- Notes and conversation history
- CPU/RAM/battery status
- Safe arithmetic calculator
- Computer lock with confirmation
- Windows/Linux/macOS-aware structure

## Setup
Python 3.10+ recommended.

```bash
python -m venv .venv
```

Windows:
```bash
.venv\Scripts\activate
```

Linux/macOS:
```bash
source .venv/bin/activate
```

Install:
```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and optionally add an OpenAI-compatible API key.

Run:
```bash
python main.py
```

Example commands:
- "Jarvis, open YouTube"
- "Jarvis, search Python decorators"
- "Jarvis, take a screenshot"
- "Jarvis, weather in Delhi"
- "Jarvis, calculate 25 * 18"
- "Jarvis, remember buy groceries"
- "Jarvis, read my notes"
- "Jarvis, system status"
- "Jarvis, exit"

## Security
The project does not expose arbitrary shell execution. OS actions are allow-listed and risky actions use confirmation.

## Notes
Speech recognition normally requires internet access. LLM mode requires an API key. On Linux, PortAudio and a suitable TTS backend may need to be installed separately.
