/* =============================================================================
   FRONTLINE — view/audio.js
   WebAudio 合成音效。
   ============================================================================= */
/* ---------------- 音效 ---------------- */
let AC=null,noiseBuf=null,sndOn=true,sfxBudget=0;
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  if(AC.state==='suspended')AC.resume();
  const n=AC.sampleRate*0.6;noiseBuf=AC.createBuffer(1,n,AC.sampleRate);
  const d=noiseBuf.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
}
function sfx(kind,x,y){
  // 先记事件：联机时客户端要靠它才有枪声，而权威端多半根本没开音频
  const ki=SFX_KINDS.indexOf(kind);
  if(ki>=0)fxEvent([E_SFX,ki,Math.round(x),Math.round(y)]);
  if(!sndOn||!AC||sfxBudget<=0)return;
  const dx=(x-cam.x)/(innerWidth/cam.z), dy=(y-cam.y)/(innerHeight/cam.z);
  const dd=Math.hypot(dx,dy);
  if(dd>1.15)return;
  sfxBudget--;
  const vol=(1-dd/1.2)*0.5;
  const src=AC.createBufferSource();src.buffer=noiseBuf;
  const f=AC.createBiquadFilter(),g=AC.createGain(),pan=AC.createStereoPanner?AC.createStereoPanner():null;
  f.type='lowpass';
  let dur=.055,freq=2400,v=vol*.13;
  if(kind==='mg'){dur=.035;freq=3000;v=vol*.09;}
  else if(kind==='car'){dur=.05;freq=1600;v=vol*.12;}
  else if(kind==='mortar'){dur=.14;freq=700;v=vol*.2;}
  else if(kind==='boom'){dur=.5;freq=380;v=vol*.55;}
  f.frequency.value=freq;
  src.connect(f);
  if(pan){pan.pan.value=clamp(dx*1.6,-1,1);f.connect(pan);pan.connect(g);}else f.connect(g);
  g.connect(AC.destination);
  const t=AC.currentTime;
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.start(t);src.stop(t+dur+.02);
}
