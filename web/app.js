const $=id=>document.getElementById(id);
const API_BASE=(localStorage.getItem("jarvis_api_url")||"https://jarvis-ai-qoxk.onrender.com").replace(/\/$/,"");

let rtc=null;
let dc=null;
let localStream=null;
let audioEl=null;
let voiceConnected=false;

function setState(text,active=false){
  $("voiceState").textContent=text;
  $("statusText").textContent=active?"LISTENING":"READY";
  $("micLabel").textContent=active?"JARVIS IS LISTENING…":"TAP TO SPEAK";
  $("mic").classList.toggle("active",active);
  $("core").classList.toggle("active",active);
}

function sendSessionConfig(){
  if(!dc || dc.readyState!=="open") return;
  dc.send(JSON.stringify({
    type:"session.update",
    session:{
      output_modalities:["audio"],
      instructions:"You are JARVIS, Adarsh's personal AI assistant. Speak immediately, naturally and concisely. Be calm, confident, intelligent and cinematic. Do not imitate or impersonate any real person or fictional character. Never display or provide a text transcript in the UI; communicate through audio only. Keep normal replies to one or two sentences unless Adarsh asks for detail. Talk at a brisk, natural pace.",
      audio:{
        output:{voice:"cedar",speed:1.2},
        input:{
          turn_detection:{
            type:"server_vad",
            create_response:true,
            interrupt_response:true,
            prefix_padding_ms:200,
            silence_duration_ms:250,
            threshold:0.5
          }
        }
      },
      max_output_tokens:500
    }
  }));
}

async function readError(res,fallback){
  try{
    const data=await res.json();
    return data.detail||data.error||fallback;
  }catch{
    return fallback;
  }
}

async function startRealtimeVoice(){
  if(voiceConnected) return;
  try{
    if(!window.isSecureContext) throw new Error("Microphone requires HTTPS.");
    if(!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support microphone access.");

    setState("ALLOW MICROPHONE…");

    localStream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}
    });

    setState("CONNECTING…");

    const tokenRes=await fetch(API_BASE+"/api/realtime-token",{
      method:"POST",
      headers:{"Content-Type":"application/json"}
    });
    if(!tokenRes.ok) throw new Error(await readError(tokenRes,"Realtime token request failed ("+tokenRes.status+")."));

    const tokenData=await tokenRes.json();
    if(!tokenData.value) throw new Error(tokenData.error||"Realtime token was not created. Check OPENAI_API_KEY on Render.");

    rtc=new RTCPeerConnection();
    dc=rtc.createDataChannel("oai-events");

    dc.onopen=()=>sendSessionConfig();
    dc.onerror=()=>console.warn("Realtime data channel error");
    dc.onmessage=e=>{
      try{
        const event=JSON.parse(e.data);
        if(event.type==="error") console.error("Realtime error:",event);
      }catch{}
    };

    audioEl=document.createElement("audio");
    audioEl.autoplay=true;
    audioEl.playsInline=true;
    audioEl.setAttribute("playsinline","");
    audioEl.setAttribute("aria-hidden","true");
    document.body.appendChild(audioEl);

    rtc.ontrack=e=>{
      if(e.streams?.[0]){
        audioEl.srcObject=e.streams[0];
        audioEl.play().catch(()=>{});
      }
    };

    rtc.onconnectionstatechange=()=>{
      const s=rtc.connectionState;
      if(s==="connected"){
        voiceConnected=true;
        setState("LISTENING",true);
      }else if(["failed","disconnected","closed"].includes(s)){
        if(s==="failed") setState("VOICE CONNECTION FAILED");
        stopRealtimeVoice(true);
      }
    };

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

    if(!sdpRes.ok) throw new Error(await sdpRes.text()||("Realtime connection failed ("+sdpRes.status+")."));

    const answer=await sdpRes.text();
    await rtc.setRemoteDescription({type:"answer",sdp:answer});
  }catch(e){
    console.error("JARVIS voice error:",e);
    const msg=String(e?.message||e).replace(/\s+/g," ").slice(0,90);
    setState(msg||"VOICE UNAVAILABLE");
    cleanupVoice();
  }
}

function cleanupVoice(){
  if(localStream) localStream.getTracks().forEach(t=>t.stop());
  if(rtc) rtc.close();
  if(audioEl){audioEl.pause();audioEl.srcObject=null;audioEl.remove();audioEl=null;}
  localStream=null;rtc=null;dc=null;voiceConnected=false;
  $("mic").classList.remove("active");
  $("core").classList.remove("active");
  $("statusText").textContent="READY";
  $("micLabel").textContent="TAP TO SPEAK";
}

function stopRealtimeVoice(keepMessage=false){
  cleanupVoice();
  if(!keepMessage) setState("READY");
}

$("mic").onclick=()=>{
  if(voiceConnected) stopRealtimeVoice();
  else startRealtimeVoice();
};

window.addEventListener("pagehide",()=>cleanupVoice());
