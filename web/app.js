const $=id=>document.getElementById(id);
const API_BASE=(localStorage.getItem("jarvis_api_url")||"https://jarvis-ai-qoxk.onrender.com").replace(/\/$/,"");

let recognition=null;
let speaking=false;
let listening=false;
let currentAudio=null;

function setState(text,active=false){
  $("voiceState").textContent=text;
  $("statusText").textContent=active?"LISTENING":"READY";
  $("micLabel").textContent=active?"JARVIS IS LISTENING…":"TAP TO SPEAK";
  $("mic").classList.toggle("active",active);
  $("core").classList.toggle("active",active);
}

function speak(text){
  if(!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="en-IN";
  u.rate=1.12;
  u.pitch=0.82;
  const voices=speechSynthesis.getVoices();
  const preferred=voices.find(v=>/en-IN/i.test(v.lang)&&/male|natural|neural/i.test(v.name))
    ||voices.find(v=>/en-IN/i.test(v.lang))
    ||voices.find(v=>/en-US/i.test(v.lang));
  if(preferred) u.voice=preferred;
  u.onstart=()=>{speaking=true;setState("SPEAKING",true);};
  u.onend=()=>{speaking=false;setState("READY");};
  u.onerror=()=>{speaking=false;setState("READY");};
  speechSynthesis.speak(u);
}

async function askJarvis(message){
  setState("THINKING…");
  const res=await fetch(API_BASE+"/api/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({message})
  });
  let data={};
  try{data=await res.json();}catch{}
  if(!res.ok) throw new Error(data.detail||data.error||"AI backend unavailable");
  if(!data.reply) throw new Error("JARVIS returned no response");
  speak(data.reply);
}

function getRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR) return null;
  const r=new SR();
  r.lang="en-IN";
  r.continuous=false;
  r.interimResults=false;
  r.maxAlternatives=1;
  r.onstart=()=>{listening=true;setState("LISTENING",true);};
  r.onspeechend=()=>{try{r.stop();}catch{}};
  r.onresult=async e=>{
    const text=e.results?.[0]?.[0]?.transcript?.trim();
    if(!text) return;
    try{
      await askJarvis(text);
    }catch(err){
      console.error(err);
      setState(String(err.message||"VOICE ERROR").slice(0,90));
    }
  };
  r.onerror=e=>{
    listening=false;
    let msg="VOICE ERROR";
    if(e.error==="not-allowed"||e.error==="service-not-allowed") msg="MICROPHONE PERMISSION DENIED";
    else if(e.error==="no-speech") msg="I DIDN'T HEAR YOU";
    else if(e.error==="network") msg="VOICE NETWORK ERROR";
    setState(msg);
  };
  r.onend=()=>{
    listening=false;
    if(!speaking && $("voiceState").textContent==="LISTENING") setState("READY");
  };
  return r;
}

async function startVoice(){
  if(speaking){
    speechSynthesis.cancel();
    speaking=false;
    setState("READY");
    return;
  }
  if(listening) return;

  try{
    if(!window.isSecureContext) throw new Error("HTTPS REQUIRED FOR MICROPHONE");
    if(!navigator.mediaDevices?.getUserMedia) throw new Error("MICROPHONE NOT SUPPORTED");

    // Explicitly request mic permission first so Android Chrome doesn't silently fail.
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    stream.getTracks().forEach(t=>t.stop());

    recognition=getRecognition();
    if(!recognition) throw new Error("VOICE INPUT NOT SUPPORTED IN THIS BROWSER");

    recognition.start();
  }catch(err){
    console.error(err);
    setState(String(err.message||"VOICE UNAVAILABLE").toUpperCase().slice(0,90));
  }
}

$("mic").addEventListener("click",startVoice);
window.addEventListener("pagehide",()=>{
  try{recognition?.stop();}catch{}
  if("speechSynthesis" in window) speechSynthesis.cancel();
});
if("speechSynthesis" in window) speechSynthesis.getVoices();
