import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app=FastAPI(title="JARVIS AI API",version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_credentials=False,allow_methods=["*"],allow_headers=["*"])

class ChatRequest(BaseModel):
    message:str

@app.get("/health")
def health():
    return {"status":"online","service":"jarvis-api"}

@app.post("/api/realtime-token")
def realtime_token():
    """Mint a short-lived Realtime client secret; the real API key never reaches the browser."""
    import json
    import urllib.request
    key=os.getenv("OPENAI_API_KEY")
    if not key:
        return {"error":"OPENAI_API_KEY is not configured on the server."}
    payload=json.dumps({
        "session":{
            "type":"realtime",
            "model":os.getenv("OPENAI_REALTIME_MODEL","gpt-realtime-2.1"),
            "instructions":(
                "You are JARVIS, Adarsh's personal AI assistant. "
                "Speak naturally, concisely and helpfully. "
                "This is a voice conversation. Start speaking as soon as you have a useful response. "
                "Do not read long explanations unless asked."
            )
        }
    }).encode()
    request=urllib.request.Request(
        "https://api.openai.com/v1/realtime/client_secrets",
        data=payload,
        headers={
            "Authorization":"Bearer "+key,
            "Content-Type":"application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data=json.loads(response.read().decode())
        return {"value":data.get("value")}
    except Exception as exc:
        return {"error":"Could not create realtime session: "+str(exc)}

@app.post("/api/chat")
def chat(req:ChatRequest):
    key=os.getenv("OPENAI_API_KEY")
    if not key:
        return {"reply":"AI backend is online, but OPENAI_API_KEY has not been configured yet."}
    client=OpenAI(api_key=key)
    response=client.responses.create(
        model=os.getenv("OPENAI_MODEL","gpt-5.6-luna"),
        instructions=("You are JARVIS, a concise, helpful personal AI assistant. "
                       "Answer naturally, clearly and professionally. "
                       "Do not claim to have performed OS actions unless the desktop client actually did them."),
        input=req.message,
    )
    return {"reply":response.output_text}

if __name__=="__main__":
    import uvicorn
    uvicorn.run(app,host="0.0.0.0",port=int(os.getenv("PORT","8000")))
