/* =============================================================================
   FRONTLINE — main.js
   主循环与启动：大厅接线、开局、联机连接、调参面板挂载。
   ============================================================================= */
/* ---------------- 主循环 ---------------- */
let last=0, acc=0, sfxT=0;
function frame(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;perf=now/1000;
  sfxT+=dt;if(sfxT>.1){sfxT=0;sfxBudget=4;}
  // 联机时本地不跑 Sim，只按快照渲染并插值；单机才本地推进
  let alpha=0;
  if(NET.on){
    if(NET.ready&&G){
      NET.acc+=dt;
      alpha=netAlpha();     // 分母是实测快照间隔，不是 DT——见 net.js 里的说明
      stepFX(dt);
    }
  }else if(G&&!G.over&&$('starto').classList.contains('hide')){
    acc+=dt;let n=0;
    while(acc>=DT&&n<5){simTick();acc-=DT;n++;}
    alpha=clamp(acc/DT,0,1);
  }else acc=0;
  edgeScroll(dt);
  render(alpha,dt);
  if(G){hudT+=dt;if(hudT>.1){hudT=0;syncHUD();renderMini();}}
  requestAnimationFrame(frame);
}

/* ---------------- 开局 ---------------- */
function enterBattle(seed,opt){
  $('loading').classList.remove('hide');
  setTimeout(()=>{
    initAudio();
    if(!ASSETS.ready)buildAssets();
    endShown=false;
    myTeam=opt.myTeamIndex||0;
    initGame(1,seed,opt);
    // 单机也录。打完一局想拿它去试数值时，录像已经在手上了
    recStart({note:'单人对局',when:new Date().toISOString()});
    bakeGround();prepFog();resize();buildButtons();
    $('loading').classList.add('hide');
    $('starto').classList.add('hide');$('endo').classList.add('hide');
  },30);
}
/* 单人：本地直接开。调参面板点「用新配置重开」也走这里。 */
function startLocalGame(){
  NET.on=false;
  readRulesForm();
  const opt=lobbyToGameOpt();
  const seed=readSeedInput();
  enterBattle(seed,opt);
  setTimeout(()=>{const e=$('mseed');if(e&&G)e.value=G.seed;},80);
}

/* ---------------- 规则表单 ---------------- */
function readRulesForm(){
  const num=(id,min)=>{const v=fieldNum(id);return v===null?null:Math.max(min,v);};
  const a=num('rmp',0); if(a!==null)RULES.startMp=a;
  const b=num('rfu',0); if(b!==null)RULES.startFu=b;
  const c=num('rpop',6);if(c!==null)RULES.popCap=c;
  const d=num('rvp',100);if(d!==null)RULES.vp=d;
  if($('wvp'))RULES.winByVp=$('wvp').checked;
  if($('whq'))RULES.winByHq=$('whq').checked;
  if(!RULES.winByVp&&!RULES.winByHq){        // 两个都关就没法分胜负了
    RULES.winByHq=true;
    if($('whq'))$('whq').checked=true;
  }
}
function writeRulesForm(){
  const set=(id,v)=>{const e=$(id);if(e)e.value=v;};
  set('rmp',RULES.startMp);set('rfu',RULES.startFu);
  set('rpop',RULES.popCap);set('rvp',RULES.vp);
  if($('wvp'))$('wvp').checked=RULES.winByVp;
  if($('whq'))$('whq').checked=RULES.winByHq;
}

/* ---------------- 模式切换 ---------------- */
function setMode(m){
  LOBBY.mode=m;
  document.querySelectorAll('.modebtn').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  const ln=$('lnet');if(ln)ln.classList.toggle('on',m==='net');
  if(m==='solo'){
    // 单人：断开联机，自己坐 0 号席（就是房主）。
    // 单人局里没有"开放"的意义——没人会连进来，所以空开放席一律转成关闭。
    if(NET.on&&NET.ws)try{NET.ws.close();}catch(e){}
    NET.on=false;LOBBY.locked=false;LOBBY.hostSlot=0;LOBBY.mySlot=0;
    LOBBY.slots.forEach(s=>{
      s.player=null;
      if(s.type===SEAT_OPEN)s.type=SEAT_CLOSED;
    });
    const me=LOBBY.slots[0];
    me.type=SEAT_OPEN;
    me.player={name:fieldStr('netname')||'指挥官'};
    me.ready=true;
    // 至少给一个对手，否则开不了局
    if(!LOBBY.slots.some(s=>s.type===SEAT_AI)){
      LOBBY.slots[1].type=SEAT_AI;LOBBY.slots[1].ready=true;
    }
  }else{
    // 联机：本地席位表交给服务端接管，连上前先摆成"全部开放"
    LOBBY.slots.forEach(s=>{s.player=null;s.type=SEAT_OPEN;s.ready=false;});
  }
  onLobbyChange(true);
}
function netMsg(t){const e=$('netmsg');if(e)e.innerHTML=t;}
/* 联机：把本地席位表上报给房主（服务端会按权限过滤） */
function netSendLobby(){
  if(!NET.on||!NET.ws||NET.ws.readyState!==1)return;
  NET.ws.send(JSON.stringify({t:'seats',slots:LOBBY.slots,
    map:{preset:MAPCFG.preset,gw:MAPCFG.gw,gh:MAPCFG.gh},rules:RULES}));
}
function updateBadge(){
  const el=$('netbadge');if(!el)return;
  if(!NET.on){el.classList.add('hide');return;}
  el.classList.remove('hide');
  const live=NET.ws&&NET.ws.readyState===1;
  // 带上实测延迟：卡不卡有了数字就不用靠感觉吵
  el.textContent='联机 · 席位 '+(LOBBY.mySlot+1)+
    (live?(' · '+Math.round(NET.rtt)+'ms · 操作延迟 '+netLagMs()+'ms'):' · 断开');
}

/* ---------------- 启动 ---------------- */
function boot(){
  loadTuning();                       // 先套用上次改过的数值
  initLobby();
  applyPreset(MAPCFG.preset||'small');
  writeRulesForm();
  syncMapForm();

  document.querySelectorAll('.modebtn').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

  // 地图表单
  const mp=$('mpreset');
  if(mp)mp.onchange=()=>{applyPreset(fieldStr('mpreset')||'small');syncMapForm();onLobbyChange();};
  ['mgw','mgh'].forEach(id=>{const e=$(id);if(e)e.onchange=()=>{
    const gw=fieldNum('mgw')|0, gh=fieldNum('mgh')|0;
    if(gw>=40&&gw<=400)MAPCFG.gw=gw;
    if(gh>=30&&gh<=300)MAPCFG.gh=gh;
    syncMapForm();onLobbyChange();
  };});
  if($('mseed'))$('mseed').onchange=()=>onLobbyChange();
  if($('mrand'))$('mrand').onclick=()=>{
    $('mseed').value=(Math.random()*0xffffffff)>>>0;onLobbyChange();
  };

  // 规则表单：改完立即写回 RULES，联机时上报
  ['rmp','rfu','rpop','rvp','wvp','whq'].forEach(id=>{
    const e=$(id);if(e)e.onchange=()=>{readRulesForm();if(LOBBY.mode==='net')netSendLobby();};
  });

  $('gobtn').onclick=()=>{
    if(LOBBY.mode==='solo'){startLocalGame();return;}
    if(!isHost())return;
    readRulesForm();
    if(NET.ws&&NET.ws.readyState===1)
      NET.ws.send(JSON.stringify({t:'start',seed:readSeedInput()}));
  };
  $('readybtn').onclick=()=>{
    const me=LOBBY.slots[LOBBY.mySlot];if(!me)return;
    me.ready=!me.ready;
    syncLobbyFoot();renderSlots();netSendLobby();
  };
  $('again').onclick=()=>{
    $('endo').classList.add('hide');$('starto').classList.remove('hide');
    LOBBY.locked=false;onLobbyChange();
  };
  /* 下载录像。联机时 host 那边已经自动存了，这里存的是本机这份——
     单机对局只有这一个出口。 */
  $('savetape').onclick=()=>downloadReplay();

  // 联机连接
  $('netbtn').onclick=()=>{
    let a=fieldStr('netaddr');
    if(!a){netMsg('先填地址，例如 <b>192.168.1.10:8080</b>');return;}
    if(!/^wss?:\/\//.test(a))a='ws://'+a;
    if(!/:\d+/.test(a))a=a.replace(/\/?$/,'')+':8080';
    netMsg('连接中 …');
    if(!fieldStr('netname'))$('netname').value=randomCallsign();
    netConnect(a.replace(/\/$/,''),onNetState);
  };
  $('netleave').onclick=()=>{
    // 主动退出：走 netDisconnect 才会关掉自动重连并丢弃重连凭据，
    // 直接 ws.close() 的话 onclose 会立刻把人又拨回去
    netDisconnect();
    LOBBY.locked=false;updateBadge();
    $('netbtn').disabled=false;$('netleave').disabled=true;
    netMsg('已断开。');onLobbyChange();
  };
  $('netaddr').onkeydown=e=>{if(e.key==='Enter')$('netbtn').onclick();};
  $('netname').onchange=()=>{
    const me=LOBBY.slots[LOBBY.mySlot];
    if(me){me.name=(fieldStr('netname')||'指挥官').slice(0,16);renderSlots();netSendLobby();}
  };
  $('netbtn').disabled=false;$('netleave').disabled=true;

  // 调参面板
  $('dbgopen').onclick=()=>toggleDebug(true);
  addEventListener('keydown',e=>{
    if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;
    if(e.key==='`'||e.key==='F1'){e.preventDefault();toggleDebug();}
  });

  $('closehelp').onclick=()=>toggleHelp();
  $('sndbtn').onclick=()=>{sndOn=!sndOn;$('sndbtn').textContent='音效 '+(sndOn?'开':'关');initAudio();};

  // 昵称：没填就随机给一个，别让席位上出现空白
  if($('netname')&&!fieldStr('netname'))$('netname').value=randomCallsign();

  /* 页面若是从 http(s) 打开的，说明你已经在房主的服务器上了——
     再让你手填一遍刚才那个地址是荒谬的。自动切到联机并连本站。
     file:// 双击打开则是纯单机。 */
  const fromHost=false;  /* 博客静态托管，没有 host.js，自动联机只会一直重连失败 */
  if(fromHost){
    $('netaddr').value=location.host;
    setMode('net');
    netMsg('正在加入本机房间 …');
    setTimeout(()=>$('netbtn').onclick(),120);
  }else{
    setMode('solo');
  }
  resize();
  last=performance.now();
  requestAnimationFrame(frame);
}
/* 联机状态回调：服务端是席位表的唯一真相，本地只负责显示 */
function onNetState(msg,payload){
  if(msg)netMsg(msg);
  if(payload&&payload.slots){
    LOBBY.slots=payload.slots;
    LOBBY.hostSlot=payload.hostSlot;
    LOBBY.mySlot=payload.mySlot;
    if(payload.map){
      if(payload.map.preset&&payload.map.preset!==MAPCFG.preset)applyPreset(payload.map.preset);
      if(payload.map.gw)MAPCFG.gw=payload.map.gw;
      if(payload.map.gh)MAPCFG.gh=payload.map.gh;
      syncMapForm();
    }
    if(payload.rules)deepAssign(RULES,payload.rules),writeRulesForm();
    renderSlots();refreshPreview();syncLobbyFoot();
  }
  $('netbtn').disabled=NET.on;
  $('netleave').disabled=!NET.on;
  updateBadge();
}
function toggleHelp(){$('helpo').classList.toggle('hide');}

if(typeof requestAnimationFrame!=='undefined')boot();
