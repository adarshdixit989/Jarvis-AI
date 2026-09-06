import os
import json
import urllib.request
import urllib.error
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app=FastAPI(title="JARVIS AI API",version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message:str

@app.get("/health")
def health():
    return {
        "status":"online",
        "service":"jarvis-api",
        "openai_key_configured":bool(os.getenv("OPENAI_API_KEY")),
        "realtime_model":os.getenv("OPENAI_REALTIME_MODEL","gpt-realtime-2.1"),
    }

@app.post("/api/realtime-token")
def realtime_token():
    """Create a short-lived Realtime client secret; the permanent API key stays on Render."""
    key=os.getenv("OPENAI_API_KEY","").strip()
    if not key:
        raise HTTPException(status_code=503,detail="OPENAI_API_KEY is not configured on Render.")

    model=os.getenv("OPENAI_REALTIME_MODEL","gpt-realtime-2.1").strip()
    payload=json.dumps({
        "session":{
            "type":"realtime",
            "model":model,
            "output_modalities":["audio"],
            "instructions":(
                "You are JARVIS, Adarsh's personal AI assistant. "
                "Speak naturally, concisely and helpfully. "
                "Use a calm, confident, polished cinematic AI-assistant style. "
                "Do not imitate or impersonate any real person or fictional character. "
                "Keep spoken answers short unless the user asks for detail."
            ),
            "audio":{"output":{"voice":"cedar","speed":1.2}}
        }
    }).encode()

    request=urllib.request.Request(
        "https://api.openai.com/v1/realtime/client_secrets",
        data=payload,
        headers={
            "Authorization":"Bearer "+key,
            "Content-Type":"application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request,timeout=20) as response:
            data=json.loads(response.read().decode())
        value=data.get("value")
        if not value:
            raise HTTPException(status_code=502,detail="OpenAI did not return a Realtime client secret.")
        return {"value":value}
    except urllib.error.HTTPError as exc:
        body=exc.read().decode(errors="replace")
        try:
            detail=json.loads(body).get("error",{}).get("message",body)
        except Exception:
            detail=body
        raise HTTPException(status_code=502,detail=f"OpenAI Realtime error: {detail[:500]}")
    except Exception as exc:
        raise HTTPException(status_code=502,detail=f"Could not create Realtime session: {str(exc)[:400]}")

@app.post("/api/chat")
def chat(req:ChatRequest):
    key=os.getenv("OPENAI_API_KEY")
    if not key:
        return {"reply":"AI backend is online, but OPENAI_API_KEY has not been configured yet."}
    client=OpenAI(api_key=key)
    response=client.responses.create(
        model=os.getenv("OPENAI_MODEL","gpt-5.6-luna"),
        instructions=(
            "You are JARVIS, Adarsh Dixit's personal AI assistant. "
            "If asked who created, built, or made you, say clearly that Adarsh Dixit built you. "
            "Do not claim ChatGPT or OpenAI created this JARVIS project. "
            "Answer naturally, clearly and professionally."
        ),
        input=req.message,
    )
    return {"reply":response.output_text}

if __name__=="__main__":
    import uvicorn
    uvicorn.run(app,host="0.0.0.0",port=int(os.getenv("PORT","8000")))
