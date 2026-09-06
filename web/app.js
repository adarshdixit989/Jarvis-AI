const $=id=>document.getElementById(id);
const messages=$("messages");
const API_BASE=(localStorage.getItem("jarvis_api_url")||"https://jarvis-ai-qoxk.onrender.com").replace(/\/$/,"");

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function add(role,text){
  const d=document.createElement("div"); d.className="msg "+role;
  d.innerHTML="<b>"+(role==="user"?"YOU":"JARVIS")+"</b><p>"+escapeHtml(text)+"</p>";
  messages.appendChild(d); messages.scrollTop=messages.scrollHeight;
}
function speak(text){
  if(!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="en-IN"; u.rate=.95; u.pitch=1;
  speechSynthesis.speak(u);
}
function localRespond(raw){
  const c=raw.toLowerCase().trim();
  if(c.includes("time")) return "The current time is "+new Date().toLocaleTimeString();
  if(c.includes("date")) return "Today is "+new Date().toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"})+".";
  if(c.includes("open youtube")){window.open("https://youtube.com","_blank");return "Opening YouTube in a new tab.";}
  if(c.startsWith("search ")){const q=raw.slice(7);window.open("https://www.google.com/search?q="+encodeURIComponent(q),"_blank");return "Searching the web for "+q+".";}
  if(c.includes("hello")||c.includes("hi jarvis")) return "Hello. All dashboard systems are operational. How can I help you?";
  if(c.includes("how are you")) return "I am fully operational and ready to help you.";
  if(c.includes("who are you")) return "I am JARVIS, your personal AI assistant.";
  if(c.includes("help")) return "You can ask me questions, search the web, open YouTube, or use the full Python desktop assistant for OS automation.";
  return "I can answer that when the AI backend is connected. The live dashboard is currently running in safe demo mode.";
}
async function aiRespond(raw){
  if(!API_BASE) return localRespond(raw);
  try{
    const r=await fetch(API_BASE+"/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:raw})});
    if(!r.ok) throw new Error("Backend returned "+r.status);
    const data=await r.json();
    return data.reply||"I did not receive a response.";
  }catch(e){
    console.error(e);
    return localRespond(raw)+" (AI backend is currently unavailable.)";
  }
}
async function run(v){
  v=v.trim(); if(!v) return;
  add("user",v);
  const pending="Thinking…"; add("jarvis",pending);
  const last=messages.lastElementChild;
  const reply=await aiRespond(v);
  if(last) last.querySelector("p").textContent=reply;
  speak(reply);
}
$("commandForm").addEventListener("submit",e=>{e.preventDefault();const v=$("command").value;$("command").value="";run(v);});
setInterval(()=>$("clock").textContent=new Date().toLocaleTimeString(),1000);

let rec=null;
if("SpeechRecognition"in window||"webkitSpeechRecognition"in window){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  rec=new R(); rec.lang="en-IN"; rec.interimResults=false; rec.continuous=false;
  rec.onstart=()=>{$("voiceState").textContent="LISTENING";$("mic").querySelector("span").textContent="Listening…";};
  rec.onend=()=>{$("voiceState").textContent="READY";$("mic").querySelector("span").textContent="Speak to JARVIS";};
  rec.onerror=e=>{console.error(e);$("voiceState").textContent="READY";};
  rec.onresult=e=>run(e.results[0][0].transcript);
}else $("voiceState").textContent="NOT SUPPORTED";
$("mic").onclick=()=>{if(rec){try{rec.start();}catch(e){}}else alert("Voice recognition is not supported here. Try Chrome or Edge.");};

// Developer helper: set the backend once in the browser console:
// localStorage.setItem("jarvis_api_url","https://YOUR-BACKEND-URL");
