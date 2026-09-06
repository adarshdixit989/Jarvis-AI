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
      instructions:"You are JARVIS, a concise, confident, calm personal AI assistant. Speak immediately and naturally. Keep spoken answers short and useful, usually one or two sentences unless the user asks for detail. Use a deep, polished, cinematic AI-assistant style; confident, intelligent and composed, but do not imitate or impersonate any real person or fictional character. Never output text to the user interface. Respond through audio only. When the user finishes speaking, answer without unnecessary filler.",
      audio:{
        output:{voice:"cedar",speed:1.15},
        input:{
          turn_detection:{
            type:"server_vad",
            create_response:true,
            interrupt_response:true,
            prefix_padding_ms:200,
            silence_duration_ms:300,
            threshold:0.5
          }
        }
      }
    }
  }));
}

async function startRealtimeVoice(){
  if(voiceConnected) return;
  try{
    setState("CONNECTING…");
    const tokenRes=await fetch(API_BASE+"/api/realtime-token",{method:"POST"});
    if(!tokenRes.ok) throw new Error("Token request failed: "+tokenRes.status);
    const tokenData=await tokenRes.json();
    if(!tokenData.value) throw new Error(tokenData.error||"No realtime token");

    rtc=new RTCPeerConnection();
    dc=rtc.createDataChannel("oai-events");
    dc.onopen=()=>sendSessionConfig();

    audioEl=document.createElement("audio");
    audioEl.autoplay=true;
    audioEl.setAttribute("playsinline","");
    document.body.appendChild(audioEl);
    rtc.ontrack=e=>{audioEl.srcObject=e.streams[0];audioEl.play().catch(()=>{});};

    rtc.onconnectionstatechange=()=>{
      const s=rtc.connectionState;
      if(s==="connected"){
        voiceConnected=true;
        setState("LISTENING",true);
      }else if(["failed","disconnected","closed"].includes(s)){
        stopRealtimeVoice();
      }
    };

    localStream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}
    });
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
    await rtc.setRemoteDescription({type:"answer",sdp:await sdpRes.text()});
  }catch(e){
    console.error(e);
    setState("VOICE UNAVAILABLE");
    if(localStream) localStream.getTracks().forEach(t=>t.stop());
    if(rtc) rtc.close();
    if(audioEl){audioEl.remove();audioEl=null;}
    localStream=null;rtc=null;dc=null;voiceConnected=false;
  }
}

function stopRealtimeVoice(){
  if(localStream) localStream.getTracks().forEach(t=>t.stop());
  if(rtc) rtc.close();
  if(audioEl){audioEl.remove();audioEl=null;}
  localStream=null;rtc=null;dc=null;voiceConnected=false;
  setState("READY");
}

$("mic").onclick=()=>{
  if(voiceConnected) stopRealtimeVoice();
  else startRealtimeVoice();
};

window.addEventListener("pagehide",stopRealtimeVoice);
