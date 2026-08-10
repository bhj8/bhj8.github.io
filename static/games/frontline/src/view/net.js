/* =============================================================================
   FRONTLINE — view/net.js
   联机客户端：命令上行、快照下行与插值。
   ============================================================================= */
/* ---------------- 网络客户端 ----------------
   单机与联机只差一件事：命令是本地执行还是上行给权威 Sim。 */
/* snapDt 是实测的快照间隔，acc 是自上个快照以来经过的时间。
   插值分母必须用它，不能用 Sim 的 DT——快照 10Hz 而 DT 是 50ms，
   用 DT 当分母会让 alpha 在半个周期内就冲到 1，剩下半个周期画面完全静止，
   看起来就是 10fps 的卡顿（局域网也卡，跟带宽无关）。 */
const NET={on:false,ws:null,slot:-1,team:0,ready:false,
           lastSnap:0,snapDt:0.1,acc:0,jitter:0,
           /* 重连用：url/onState 留着才能自己重拨；bye 表示这是"故意断的"
              （被踢或主动退出），不该再往回连。 */
           url:'',onState:null,token:null,bye:false,retry:0,retryTimer:null,
           rtt:0,pingTimer:null};

/* ---- 往返延迟 ----
   下令到看见反应，中间隔着：上行 + 权威等到下一 tick + 快照回程 + 插值滞后一帧。
   前两项跟 RTT 走，后两项跟快照间隔走。量出来才知道该不该上本地预测——
   局域网 RTT 常常只有个位数毫秒，那大头就在快照间隔上，预测位置纯属白费劲。 */
function netPing(){
  if(!NET.on||!NET.ws||NET.ws.readyState!==1)return;
  try{NET.ws.send(JSON.stringify({t:'ping',c:nowMs()}));}catch(e){}
}
/* 估算的操作延迟：RTT + 半个 tick 的排队 + 一个快照周期的插值滞后 */
function netLagMs(){
  if(!NET.on)return 0;
  return Math.round(NET.rtt+25+NET.snapDt*1000);
}

/* 重连凭据按房间地址分开存——同时开两个房间时不能互相顶掉 */
function tokKey(url){return 'frontline.tok.'+url;}
function loadToken(url){
  try{return localStorage.getItem(tokKey(url))||null;}catch(e){return null;}
}
function saveToken(url,tok){
  try{if(tok)localStorage.setItem(tokKey(url),tok);else localStorage.removeItem(tokKey(url));}catch(e){}
}
/* 退避：1s、2s、4s、8s，之后固定 8s 一直试。
   局域网多半是拔了网线或睡眠唤醒，一直重试比让玩家手动重开页面强。 */
const NET_RETRY_MS=[1000,2000,4000,8000];
function netRetryDelay(n){return NET_RETRY_MS[Math.min(n,NET_RETRY_MS.length-1)];}
/* 房主把某席位的玩家移出房间。服务端还会按来源地址短暂拦一下，
   否则他立刻重连占回一个开放席，等于没踢。 */
function netKick(i){
  if(!NET.on||!NET.ws||NET.ws.readyState!==1)return;
  NET.ws.send(JSON.stringify({t:'kick',slot:i}));
}
function cmd(c){
  if(NET.on){ if(NET.ws&&NET.ws.readyState===1)NET.ws.send(JSON.stringify({t:'cmd',cmd:c})); }
  else applyCmd(myTeam,c);
}
/* 插值系数：自上个快照以来的时间 / 实测快照间隔。
   main.js 与测试都调这一个，不各自算一遍。
   上限给到 1.25 是允许轻微外推——掉一帧快照时画面不会顿住。 */
function netAlpha(){
  if(!NET.ready)return 0;
  return clamp(NET.acc/Math.max(0.016,NET.snapDt),0,1.25);
}
function netConnect(url,onState){
  NET.url=url;NET.onState=onState;NET.bye=false;NET.retry=0;
  NET.token=loadToken(url);
  netDial();
}
/* 主动断开：不再自动重连，并且丢掉凭据——下次是全新的入座 */
function netDisconnect(){
  NET.bye=true;
  if(NET.retryTimer){clearTimeout(NET.retryTimer);NET.retryTimer=null;}
  saveToken(NET.url,null);
  try{if(NET.ws)NET.ws.close();}catch(e){}
  NET.on=false;NET.ready=false;
}
function netDial(){
  const url=NET.url, onState=NET.onState||function(){};
  try{ NET.ws=new WebSocket(url); }catch(e){ onState('地址无效：'+e.message); return; }
  NET.on=true;
  NET.ws.onopen=()=>{
    NET.retry=0;
    if(NET.pingTimer)clearInterval(NET.pingTimer);
    NET.pingTimer=setInterval(netPing,1000);
    netPing();
    /* 报昵称与上次的 token。服务端要靠 token 才知道该给新席位还是让我坐回原位，
       所以入座被推迟到这条消息之后——握手阶段是带不上它的。 */
    const nm=(typeof fieldStr==='function'&&fieldStr('netname'))||randomCallsign();
    try{NET.ws.send(JSON.stringify({t:'join',name:nm,token:NET.token}));}catch(e){}
    onState('已连接，正在入座 …');
  };
  NET.ws.onclose=()=>{
    NET.on=false;NET.ready=false;
    if(NET.pingTimer){clearInterval(NET.pingTimer);NET.pingTimer=null;}
    if(NET.bye){onState('连接已断开。');return;}
    const d=netRetryDelay(NET.retry++);
    onState('连接断开，'+(d/1000)+' 秒后重连 …（第 '+NET.retry+' 次）');
    if(NET.retryTimer)clearTimeout(NET.retryTimer);
    NET.retryTimer=setTimeout(netDial,d);
  };
  NET.ws.onerror=()=>{
    if(NET.retry===0)
      onState('连接失败。检查地址与端口是否正确、房主的 <b>host.js</b> 是否在跑、防火墙有没有放行。');
  };
  NET.ws.onmessage=e=>{
    let m;try{m=JSON.parse(e.data);}catch(err){return;}
    if(m.t==='hello'){
      NET.slot=m.slot;
      if(m.token){NET.token=m.token;saveToken(NET.url,m.token);}
      onState(m.slot<0?'席位已满，你进入观战模式。'
                      :(m.resumed?'已重连回 <b>席位 '+(m.slot+1)+'</b>，队伍与准备状态都还在。'
                                 :'已入座 — <b>席位 '+(m.slot+1)+'</b>'+
                                  (m.slot===m.hostSlot?'（房主）':'')+'。'));
    }else if(m.t==='pong'){
      const r=nowMs()-m.c;
      if(r>=0&&r<5000)NET.rtt=NET.rtt?NET.rtt*0.8+r*0.2:r;
    }else if(m.t==='note'){
      if(typeof log==='function'&&G)log(m.msg,1,myTeam);
    }else if(m.t==='lobby'){
      // 席位表以服务端为准，本地只负责显示
      onState(m.running?'对局进行中 …':null,m);
    }else if(m.t==='kicked'){
      // 被踢就别再往回连了，凭据也一起丢掉
      NET.bye=true;NET.on=false;
      saveToken(NET.url,null);
      if(NET.retryTimer){clearTimeout(NET.retryTimer);NET.retryTimer=null;}
      onState('你已被房主移出房间。');
    }else if(m.t==='start'){
      if(!ASSETS.ready)buildAssets();
      endShown=false;
      LOBBY.locked=true;
      NET.team=m.myTeam;
      myTeam=Math.max(0,m.myTeam);
      /* 重连时服务端会把 start 再发一遍。局面本来就还在客户端手里，
         同一局就别重建了——否则短暂断线也要重新烘焙整张地图、丢掉选中和镜头。 */
      const resuming=!!(G&&G.seed===m.seed&&!G.over&&
                        G.alliance&&G.alliance.length===(m.alliance||G.alliance).length);
      if(!resuming){
        if(m.map){
          if(m.map.preset)applyPreset(m.map.preset);
          if(m.map.gw)MAPCFG.gw=m.map.gw;
          if(m.map.gh)MAPCFG.gh=m.map.gh;
        }
        if(m.rules)for(const k in m.rules)if(k in RULES)RULES[k]=m.rules[k];
        initGame(1,m.seed,{alliance:m.alliance,ctrl:m.ctrl,aiLevels:m.aiLevels});
        bakeGround();prepFog();resize();buildButtons();
      }
      NET.ready=true;
      $('loading').classList.add('hide');
      $('starto').classList.add('hide');$('endo').classList.add('hide');
    }else if(m.t==='snap'){
      applySnapshot(m);
    }else if(m.t==='over'){
      if(G){G.over=m.over;G.winAlliance=m.winAlliance;}
    }
  };
}
/* 应用快照：只更新会变的状态，位置写进 px/py 让 render 的 alpha 插值接手 */
function applySnapshot(m){
  if(!G)return;
  // 量出真实的快照间隔并指数平滑，网络抖动时插值也不会忽快忽慢
  const now=(typeof performance!=='undefined'?performance.now():0);
  if(NET.lastSnap){
    const gap=(now-NET.lastSnap)/1000;
    if(gap>0.005&&gap<1){
      NET.jitter=NET.jitter*0.9+Math.abs(gap-NET.snapDt)*0.1;
      NET.snapDt=NET.snapDt*0.85+gap*0.15;
    }
  }
  NET.lastSnap=now;
  NET.acc=0;                       // 新快照到达，插值从头开始
  const seen2=new Set();
  // 按 id 建索引：逐个线性查找是 O(n²)，40 队时每秒上万次无谓比较
  const byIdMap=new Map();
  for(const q of G.squads)byIdMap.set(q.id,q);
  for(const a of m.squads){
    const id=a[0];seen2.add(id);
    let s=byIdMap.get(id);
    if(!s){                                   // 房主那边新造的单位
      s=makeSquad(a[1],a[2],a[3],a[4]);s.id=id;G.squads.push(s);byIdMap.set(id,s);
    }
    s.px=s.x;s.py=s.y;                        // 上一帧位置留给插值
    s.x=a[3];s.y=a[4];s.facing=a[5];
    const men=a[6];
    for(let i=0;i<s.members.length;i++){
      const hp=men[i];
      s.members[i].alive=hp>=0;
      s.members[i].hp=hp>=0?hp:0;
    }
    s.supp=a[7];
    const hid=a[8];
    s.house=hid>=0?G.houses[hid]:null;
    s.retreat=!!a[9];
    const dep=a[10]||'';
    for(let i=0;i<s.members.length;i++)s.members[i].deployed=dep[i]==='1';
    s.enterT=a[11];s.leaving=!!a[12];
    s.alive=true;s.moving=Math.abs(s.x-s.px)+Math.abs(s.y-s.py)>0.5;
  }
  for(const s of G.squads)if(!seen2.has(s.id))s.alive=false;
  G.squads=G.squads.filter(s=>s.alive);
  m.pts.forEach((p,i)=>{if(G.pts[i]){G.pts[i].owner=p[0];G.pts[i].capBy=p[1];G.pts[i].cap=p[2];}});
  // houses 为 null 表示这一帧没变化，保持原状
  if(m.houses)m.houses.forEach((h,i)=>{
    const H=G.houses[i];if(!H)return;
    H.ruin=!!h[0];H.hp=h[1];H.melee=!!h[3];H.meleeBy=h[4];
    H.gar=h[2].map(id=>byIdMap.get(id)).filter(Boolean);
  });
  m.teams.forEach((T,i)=>{
    const t=G.teams[i];if(!t)return;
    t.mp=T[0];t.fu=T[1];t.pop=T[2];t.vp=T[3];t.pts=T[4];t.queue=T[5];t.buildT=T[6];
  });
  m.bldgs.forEach((hp,i)=>{if(G.bldgs[i])G.bldgs[i].hp=hp;});
  if(m.ctrl)G.ctrl=m.ctrl;         // 有人掉线被托管 / 重连收回时才带这一项
  G.shells=m.shells.map(p=>({x:p[0],y:p[1],team:p[2],
    sx:p[0],sy:p[1],tx:p[0],ty:p[1],t:p[3]||0,dur:1}));   // t/dur = 进度，决定抛物线高度
  playFxEvents(m.ev);            // 曳光、火光、爆炸、音效——客户端不跑 Sim，全靠这条
  G.t=m.gt;G.tick=m.tick;
  if(m.logs&&m.logs.length){G.logs=m.logs;G.logDirty=true;}
  if(m.over){G.over=m.over;G.winAlliance=m.winA;}
  // 视野按帧号降频：快照 10Hz，单机也只有 5Hz，没必要每帧全量重算
  if((m.tick&3)===0)updateVision();
}

function issueRight(wx,wy){
  const list=selection.filter(s=>s.alive);
  if(!list.length)return;
  let tgt=null;
  for(const s of G.squads){
    if(!s.alive||s.team===myTeam||!seen(s.x,s.y))continue;
    if(d2(wx,wy,s.x,s.y)<30*30){tgt=s;break;}
  }
  const ho=houseAt(wx,wy);
  // 点有敌人驻守的楼 = 打他；但绞肉中的楼是中立的，普通右键不介入（要用强制攻击）
  if(ho&&!ho.melee&&seen(ho.cx,ho.cy)){
    const foe=ho.gar.find(g=>g.alive&&g.team!==myTeam);
    if(foe)tgt=foe;
  }
  // 点没满的建筑 = 进驻（步兵）。敌方在里面也能进——那正是绞肉的入口
  if(!tgt&&ho&&!houseFull(ho)&&!ho.ruin){
    const inf=list.filter(s=>s.def.armor===0);
    if(inf.length){
      cmd({type:'enter',ids:idsOf([inf[0]]),house:ho.id});
      const rest=list.filter(s=>s!==inf[0]);
      if(rest.length)cmd({type:'move',ids:idsOf(rest),x:ho.cx,y:ho.cy+ho.h*TS*0.8});
      FX.ping.push({x:ho.cx,y:ho.cy,t:0,atk:false});
      return;
    }
  }
  cmd({type:tgt?'amove':'move',ids:idsOf(list),x:wx,y:wy,tid:tgt?tgt.id:0});
  FX.ping.push({x:wx,y:wy,t:0,atk:!!tgt});
}
function issueAmove(wx,wy){
  const list=selection.filter(s=>s.alive);
  if(!list.length)return;
  cmd({type:'amove',ids:idsOf(list),x:wx,y:wy});
  FX.ping.push({x:wx,y:wy,t:0,atk:true});
}
/* ---- 技能施放：一律走命令通道，联机时直接序列化上行 ---- */
function issueDeploy(wx,wy){
  const list=selection.filter(s=>s.alive&&abilitiesOf(s).some(a=>a.id==='deploy'));
  if(!list.length){log('选中的部队没有需要架设的武器',2,myTeam);return;}
  // 每支小队各自朝目标点的方向架设，所以逐队发命令
  for(const s of list)cmd({type:'deploy',ids:[s.id],dir:Math.atan2(wy-s.y,wx-s.x)});
  FX.ping.push({x:wx,y:wy,t:0,atk:true});
}
function issueForceAttack(wx,wy){
  const list=selection.filter(s=>s.alive&&s.def.maxRange>0);
  if(!list.length)return;
  cmd({type:'forceattack',ids:idsOf(list),x:wx,y:wy});
  FX.ping.push({x:wx,y:wy,t:0,atk:true});
}
if(typeof addEventListener!=='undefined'){
addEventListener('keydown',e=>{
  const helpOpen=!$('helpo').classList.contains('hide');
  if(!$('starto').classList.contains('hide'))return;
  const k=e.key.toLowerCase();
  if(k==='h'){toggleHelp();return;}
  if(helpOpen){if(k==='escape')toggleHelp();return;}
  if(!G||G.over)return;
  keys[k]=true;
  if(k==='tab'){
    e.preventDefault();
    if(!FEEL.tabCycle)return;
    const list=selection.filter(s=>s.alive);
    if(!list.length)return;
    tabIdx=(tabIdx+1)%list.length;
    focusOn([list[tabIdx]]);
    return;
  }
  if(GROUP_KEYS.includes(k)){
    // Ctrl 设定、Ctrl+Shift 追加、单按调出（连按两下镜头跟过去）
    if(e.ctrlKey)setGroup(k,e.shiftKey);
    else recallGroup(k);
    e.preventDefault();
    return;
  }
  if(k==='a'){amove=true;cv.classList.add('amove');return;}
  if(k==='d'){                                  // 技能：架设（拾取方向）
    if(selection.some(s=>s.alive&&abilitiesOf(s).some(a=>a.id==='deploy')))setPending('deploy');
    else log('选中的部队没有需要架设的武器',2,myTeam);
    return;
  }
  if(k==='escape'){amove=false;setPending(null);cv.classList.remove('amove');return;}
  if(k==='s'){cmd({type:'stop',ids:idsOf(selection.filter(q=>q.alive))});return;}
  if(k==='t'){
    const rl=selection.filter(q=>q.alive);
    if(rl.length)cmd({type:'retreat',ids:idsOf(rl)});
    return;
  }
  if(k===' '){cam.x=G.bldgs[myTeam].x;cam.y=G.bldgs[myTeam].y-190;clampCam();e.preventDefault();return;}
  const idx=ORDER.findIndex(t=>UNITS[t].key.toLowerCase()===k);
  if(idx>=0){initAudio();cmd({type:'build',unit:ORDER[idx]});syncBuild();}
});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
}
function edgeScroll(dt){
  if(!G||G.over)return;
  const sp=780/cam.z*dt;
  let dx=0,dy=0;
  if(keys['arrowup'])dy-=1;
  if(keys['arrowdown'])dy+=1;
  if(keys['arrowleft'])dx-=1;
  if(keys['arrowright'])dx+=1;
  const M=26;
  if(mouse.x<M)dx-=1;else if(mouse.x>innerWidth-M)dx+=1;
  if(mouse.y<M)dy-=1;else if(mouse.y>innerHeight-M-4)dy+=1;
  if(dx||dy){const L=Math.hypot(dx,dy);cam.x+=dx/L*sp;cam.y+=dy/L*sp/TILT;clampCam();}
}
