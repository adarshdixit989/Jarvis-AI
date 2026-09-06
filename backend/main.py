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
