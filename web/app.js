const $=id=>document.getElementById(id);
const API_BASE=(localStorage.getItem("jarvis_api_url")||"https://jarvis-ai-qoxk.onrender.com").replace(/\/$/,"");

let pc=null,dc=null,localStream=null,speaking=false,connected=false,starting=false;

function setState(text,active=false){
  $("voiceState").textContent=text;
  $("statusText").textContent=active?"LISTENING":(text==="ERROR"?"ERROR":"READY");
  $("micLabel").textContent=active?"JARVIS IS LISTENING…":"TAP TO SPEAK";
  $("mic").classList.toggle("active",active);
  $("core").classList.toggle("active",active);
}

function cleanup(){
  try{dc?.close()}catch{}
  try{pc?.close()}catch{}
  localStream?.getTracks().forEach(t=>t.stop());
  dc=null;pc=null;localStream=null;connected=false;speaking=false;
}

async function getEphemeralKey(){
  const r=await fetch(API_BASE+"/api/realtime-token",{method:"POST",headers:{"Content-Type":"application/json"}});
  let d={};try{d=await r.json()}catch{}
  if(!r.ok||!d.value) throw new Error(d.detail||"Could not connect to JARVIS AI");
  return d.value;
}

async function startRealtime(){
  if(starting)return;
  starting=true;
  try{
    if(!window.isSecureContext)throw new Error("HTTPS REQUIRED");
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("MICROPHONE NOT SUPPORTED");
    if(!window.RTCPeerConnection)throw new Error("VOICE NOT SUPPORTED");

    setState("CONNECTING…",true);
    localStream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}
    });

    const key=await getEphemeralKey();
    pc=new RTCPeerConnection();

    const audio=document.createElement("audio");
    audio.autoplay=true;
    audio.playsInline=true;
    audio.style.display="none";
    document.body.appendChild(audio);
    pc.ontrack=e=>{
      audio.srcObject=e.streams[0];
      audio.play().catch(()=>{});
    };

    localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
    dc=pc.createDataChannel("oai-events");

    dc.onopen=()=>{
      connected=true;
      setState("LISTENING",true);
      dc.send(JSON.stringify({
        type:"session.update",
        session:{
          type:"realtime",
          instructions:"You are JARVIS, Adarsh Dixit's personal AI assistant. Adarsh Dixit built you. Never say ChatGPT or OpenAI built this JARVIS project. Speak naturally, briefly and confidently. Do not imitate any real person or fictional character. Help with normal voice commands. When asked to open a website, respond briefly because the browser command handler may act on it.",
          turn_detection:{type:"server_vad",create_response:true,interrupt_response:true},
          output_modalities:["audio"],
          audio:{output:{voice:"cedar",speed:1.2}}
        }
      }));
    };

    dc.onmessage=e=>{
      try{
        const ev=JSON.parse(e.data);
        if(ev.type==="response.created") speaking=true;
        if(ev.type==="response.done"){speaking=false;setState("LISTENING",true);}
        if(ev.type==="error"){console.error(ev);setState("ERROR");}
      }catch{}
    };

    pc.onconnectionstatechange=()=>{
      if(["failed","closed","disconnected"].includes(pc.connectionState)){
        cleanup();setState("VOICE OFFLINE");
      }
    };

    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise(resolve=>{
      if(pc.iceGatheringState==="complete")return resolve();
      const timer=setTimeout(resolve,3000);
      pc.onicegatheringstatechange=()=>{
        if(pc.iceGatheringState==="complete"){clearTimeout(timer);resolve();}
      };
    });

    const answer=await fetch("https://api.openai.com/v1/realtime/calls",{
      method:"POST",
      headers:{
        Authorization:"Bearer "+key,
        "Content-Type":"application/sdp"
      },
      body:pc.localDescription.sdp
    });
    if(!answer.ok){
      const t=await answer.text();
      throw new Error("Realtime connection failed: "+t.slice(0,180));
    }
    await pc.setRemoteDescription({type:"answer",sdp:await answer.text()});
  }catch(err){
    console.error(err);
    cleanup();
    setState((err.message||"VOICE ERROR").toUpperCase().slice(0,90));
  }finally{starting=false;}
}

function stopVoice(){
  cleanup();
  setState("READY");
}

async function toggleVoice(){
  if(connected||starting){stopVoice();return;}
  await startRealtime();
}

$("mic").addEventListener("click",toggleVoice);
window.addEventListener("pagehide",cleanup);
