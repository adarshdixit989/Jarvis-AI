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
  // Handle simple commands instantly in the browser (no network round-trip).
  const c=raw.toLowerCase().trim();
  const instant = c.includes("time") || c.includes("date") || c.includes("open youtube") || c.startsWith("search ") || c.includes("hello") || c.includes("hi jarvis") || c.includes("how are you") || c.includes("who are you") || c.includes("help");
  if(instant) return localRespond(raw);
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
async function run(v, voiceMode=false){
  v=v.trim(); if(!v) return;
  // Voice mode is speech-first: do not render the transcript/answer in the console.
  if(!voiceMode) add("user",v);
  let last=null;
  if(!voiceMode){
    add("jarvis","Thinking…");
    last=messages.lastElementChild;
  }
  const reply=await aiRespond(v);
  if(last) last.querySelector("p").textContent=reply;
  speak(reply);
}
$("commandForm").addEventListener("submit",e=>{e.preventDefault();const v=$("command").value;$("command").value="";run(v);});
setInterval(()=>$("clock").textContent=new Date().toLocaleTimeString(),1000);

let rtc=null;
let localStream=null;
let audioEl=null;
let voiceConnected=false;

async function startRealtimeVoice(){
  if(voiceConnected) return;
  try{
    $("voiceState").textContent="CONNECTING";
    const tokenRes=await fetch(API_BASE+"/api/realtime-token",{method:"POST"});
    const tokenData=await tokenRes.json();
    if(!tokenData.value) throw new Error(tokenData.error||"No realtime token");

    rtc=new RTCPeerConnection();
    audioEl=document.createElement("audio");
    audioEl.autoplay=true;
    document.body.appendChild(audioEl);
    rtc.ontrack=e=>{ audioEl.srcObject=e.streams[0]; };
    rtc.onconnectionstatechange=()=>{
      if(rtc.connectionState==="connected"){
        voiceConnected=true;
        $("voiceState").textContent="LISTENING";
        $("mic").querySelector("span").textContent="JARVIS is listening…";
      }else if(["failed","disconnected","closed"].includes(rtc.connectionState)){
        voiceConnected=false;
        $("voiceState").textContent="READY";
        $("mic").querySelector("span").textContent="Speak to JARVIS";
      }
    };

    localStream=await navigator.mediaDevices.getUserMedia({audio:true});
    localStream.getTracks().forEach(t=>rtc.addTrack(t,localStream));

    const offer=await rtc.createOffer();
    await rtc.setLocalDescription(offer);

    const sdpRes=await fetch("https://api.openai.com/v1/realtime/calls",{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+tokenData.value,
        "Content-Type":"application/sdp"
      },
      body:offer.sdp
    });
    if(!sdpRes.ok) throw new Error("Realtime connection failed: "+sdpRes.status);
    const answer=await sdpRes.text();
    await rtc.setRemoteDescription({type:"answer",sdp:answer});
  }catch(e){
    console.error(e);
    $("voiceState").textContent="ERROR";
    $("mic").querySelector("span").textContent="Voice unavailable — tap to retry";
    if(localStream) localStream.getTracks().forEach(t=>t.stop());
    if(rtc) rtc.close();
    voiceConnected=false;
  }
}

function stopRealtimeVoice(){
  if(localStream) localStream.getTracks().forEach(t=>t.stop());
  if(rtc) rtc.close();
  if(audioEl){audioEl.remove();audioEl=null;}
  localStream=null; rtc=null; voiceConnected=false;
  $("voiceState").textContent="READY";
  $("mic").querySelector("span").textContent="Speak to JARVIS";
}

$("mic").onclick=()=>{
  if(voiceConnected) stopRealtimeVoice();
  else startRealtimeVoice();
};
// Backend is configured for the deployed Render API.
