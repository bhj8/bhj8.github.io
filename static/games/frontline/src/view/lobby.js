/* =============================================================================
   FRONTLINE — view/lobby.js
   对局大厅：席位表、队伍分组、准备状态、地图预览。

   按经典 RTS 的做法，单人与联机共用同一个界面——模式只决定席位能不能被
   真人占据，而不是两套 UI。

   没有势力概念：所有人用同一套科技与单位，席位上的「队伍」只决定谁跟谁
   是友军。队伍号相同即同盟，不同即敌对，八席可以任意分组（4v4、2v2v2v2、
   八人混战都只是队伍号的不同排列）。
   ============================================================================= */

const MAX_SEATS=MAX_TEAMS;
const AI_LEVELS=['巡逻队','正规军','精锐师'];

/* 没填昵称就随机给一个，别让席位上出现空白 */
const CALLSIGNS=['铁锤','游隼','北风','长弓','夜枭','灰狼','断崖','铁砧',
                 '哨兵','雷霆','霜刃','孤星','黑鸦','磐石','疾风','狼群'];
function randomCallsign(){
  return CALLSIGNS[(Math.random()*CALLSIGNS.length)|0]+'-'+(10+((Math.random()*89)|0));
}

/* 席位类型。「人类」不是可选项——它是玩家连入后被赋予的身份，
   留给玩家的位置叫「开放」，默认全部开放，谁连进来谁占一个。
     open    等待玩家加入；开局时仍没人就不参战
     ai      电脑接管
     closed  这一席不存在
   slot.player 非空表示已被真人占据，此时类型固定，要清人得踢。 */
const SEAT_OPEN='open', SEAT_AI='ai', SEAT_CLOSED='closed';
const seatTaken=s=>!!s.player;
const seatPlays=s=>s.type===SEAT_AI||(s.type===SEAT_OPEN&&seatTaken(s));
/* 掉线保留中：席位还留着他的队伍与准备状态，等他带 token 回来 */
const seatGone=s=>!!(s.player&&s.player.gone);
/* 踢人按钮该不该出现。抽成函数是为了让测试调到同一份判定——
   把条件复制进测试里，等于这条永远测不出问题（准备按钮就这么消失过一次）。 */
function kickBtnVisible(s){
  return LOBBY.mode==='net'&&isHost()&&!LOBBY.locked&&
         seatTaken(s)&&s.i!==LOBBY.mySlot;
}

const LOBBY={
  mode:'solo',        // solo | net
  slots:[],
  hostSlot:0,         // 房主席位；联机时由服务端指定
  mySlot:0,           // 本机占用的席位
  locked:false,       // 联机中对局已开始
};

function initLobby(){
  LOBBY.slots=[];
  for(let i=0;i<MAX_SEATS;i++){
    LOBBY.slots.push({
      i, name:'席位 '+(i+1),
      type:SEAT_OPEN,   // 默认全部开放
      player:null,
      team:i,           // 默认各自一队；想 4v4 就把队伍号改成一样的
      ai:1, ready:false,
    });
  }
  LOBBY.hostSlot=0;LOBBY.mySlot=0;
}
/* 参战席位：电脑，或已被真人占据的开放席。空着的开放席不参战。 */
const activeSlots=()=>LOBBY.slots.filter(seatPlays);
const isHost=()=>LOBBY.mode==='solo'||LOBBY.mySlot===LOBBY.hostSlot;
/* 房主能改所有人，其他人只能改自己那行 */
const canEdit=i=>LOBBY.mode==='solo'||isHost()||i===LOBBY.mySlot;
/* AI 永远算已准备；房主不用给自己点准备 */
const slotReady=s=>s.type===SEAT_AI||(s.i===LOBBY.hostSlot)||s.ready;
const allReady=()=>activeSlots().every(slotReady);

/* 参战席位映射到 initGame 的参数。队伍号不必连续——
   isEnemyTeam 比的是队伍号是否相等，不是索引。 */
function lobbyToGameOpt(){
  const act=activeSlots();
  return{
    alliance:act.map(s=>s.team),
    ctrl:act.map(s=>seatTaken(s)?'human':'ai'),
    myTeamIndex:Math.max(0,act.findIndex(s=>s.i===LOBBY.mySlot)),
    aiLevels:act.map(s=>s.ai),
  };
}
/* 席位数变了就换合适的地图预设；已手动改过尺寸的话不强行覆盖 */
function autoPreset(){
  const n=activeSlots().length;
  const want=presetForSeats(n);
  if(MAPCFG.preset!==want&&mapSeatCapacity()<n){applyPreset(want);return true;}
  return false;
}

/* ---------------- 地图预览 ----------------
   直接复用 genMap + buildMiniTer：改完参数就能看到这张图长什么样，
   不用进游戏才发现据点挤在一起。 */
let pvBusy=false;
function refreshPreview(){
  const cvp=document.getElementById('mappv');
  if(!cvp||!cvp.getContext||pvBusy)return;
  pvBusy=true;
  try{
    const seed=readSeedInput();
    const savedG=G;
    // genMap 依赖 G.pts/G.bldgs 的只有 buildRoads/buildProps，这里只要地形与小地图
    applyMapSize(MAPCFG.gw,MAPCFG.gh,MAPCFG.tileSize);
    rnd=mulberry32(seed===null?DEFAULT_SEED:seed);
    genMap();
    initMat();
    buildMiniTer();
    G=savedG;
    drawPreview(cvp);
  }catch(e){
    console.warn('[FRONTLINE] 预览生成失败：',e);
  }
  pvBusy=false;
}
function drawPreview(cvp){
  // 元素还没布局时 clientWidth 是 0；无头环境下它甚至不是数字，两种都要兜住
  const cw=cvp.clientWidth;
  const W=(typeof cw==='number'&&cw>20)?cw:260;
  const H=Math.round(W*GH/GW);
  cvp.width=W;cvp.height=H;
  const x=cvp.getContext('2d');
  x.imageSmoothingEnabled=false;
  if(miniTer)x.drawImage(miniTer,0,0,GW,GH,0,0,W,H);
  else{x.fillStyle='#12150a';x.fillRect(0,0,W,H);}
  const sx=W/GW, sy=H/GH;
  // 据点
  for(const p of MAPCFG.points){
    const pts=[[p.tx,p.ty]];
    const m=mirrorPt(p.tx,p.ty);
    if(m[0]!==p.tx||m[1]!==p.ty)pts.push(m);
    for(const c of pts){
      x.fillStyle='rgba(10,13,7,.8)';
      x.beginPath();x.arc(c[0]*sx,c[1]*sy,4,0,6.284);x.fill();
      x.fillStyle='#d9c9a0';
      x.beginPath();x.arc(c[0]*sx,c[1]*sy,2.4,0,6.284);x.fill();
    }
  }
  // 出生点：按将要坐这一席的玩家上色
  const slots=hqSlots(), act=activeSlots();
  slots.forEach((q,i)=>{
    const s=act[i];
    const cx=(q.tx+MAPCFG.hqSize.w/2)*sx, cy=(q.ty+MAPCFG.hqSize.h/2)*sy;
    x.fillStyle=s?TC[s.team%TC.length]:'#5a6050';
    x.strokeStyle='rgba(8,11,5,.9)';x.lineWidth=2;
    x.beginPath();
    x.moveTo(cx,cy-6);x.lineTo(cx+5.5,cy+4);x.lineTo(cx-5.5,cy+4);x.closePath();
    x.stroke();x.fill();
    if(!s){x.globalAlpha=.5;x.fillStyle='#0b0d07';
      x.beginPath();x.arc(cx,cy,7,0,6.284);x.fill();x.globalAlpha=1;}
  });
}
/* 读表单值：无头环境下 stub 返回的不是字符串，所有入口统一从这里取，
   不要各处直接摸 .value —— host.js 载入时会把整个 boot() 跑一遍。 */
function fieldStr(id){
  const e=document.getElementById(id);
  const v=e&&e.value;
  return (typeof v==='string')?v.trim():'';
}
function fieldNum(id){
  const n=parseFloat(fieldStr(id));
  return isNaN(n)?null:n;
}
function readSeedInput(){
  const s=fieldStr('mseed');
  if(!s)return null;
  const n=parseInt(s,10);
  if(!isNaN(n)&&String(n)===s)return n>>>0;
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}

/* 一行席位的 HTML。抽成纯函数是为了能直接断言渲染结果——
   "名字有没有显示出来"这种问题，只调 renderSlots 是测不到的（innerHTML 落进了 stub）。 */
function slotRowHTML(s,cap,actList){
  const taken=seatTaken(s), plays=seatPlays(s);
  const ed=canEdit(s.i)&&!LOBBY.locked;
  const edType=ed&&!taken;                 // 有人坐着就不许改类型，要清人得踢
  const off=s.type===SEAT_CLOSED;
  const overCap=plays&&actList.indexOf(s)>=cap;
  const types=LOBBY.mode==='solo'
    ? [[SEAT_AI,'电脑'],[SEAT_CLOSED,'关闭']]
    : [[SEAT_OPEN,'开放'],[SEAT_AI,'电脑'],[SEAT_CLOSED,'关闭']];
  const typeOpts=types.map(o=>
    '<option value="'+o[0]+'"'+(s.type===o[0]?' selected':'')+'>'+o[1]+'</option>').join('');
  const teamOpts=TEAM_NAMES.map((n,t)=>
    '<option value="'+t+'"'+(s.team===t?' selected':'')+'>队伍 '+(t+1)+' · '+n+'</option>').join('');
  const aiOpts=AI_LEVELS.map((n,l)=>
    '<option value="'+l+'"'+(s.ai===l?' selected':'')+'>'+n+'</option>').join('');
  // 名字列：占据者的昵称 / 电脑 / 空位提示
  let nameCell;
  if(taken){
    nameCell='<span class="splayer'+(seatGone(s)?' dimmed':'')+'">'+
      esc(s.player.name||('玩家 '+(s.i+1)))+
      (s.i===LOBBY.hostSlot?'<b>房主</b>':'')+(s.i===LOBBY.mySlot?'<i>你</i>':'')+'</span>';
  }else if(s.type===SEAT_AI){
    nameCell='<span class="splayer dimmed">'+esc(AI_LEVELS[s.ai]||'电脑')+'</span>';
  }else{
    nameCell='<span class="splayer waiting">'+(off?'—':'等待玩家加入 …')+'</span>';
  }
  let status, gone=seatGone(s);
  if(off)status='';
  else if(gone)status='掉线中';
  else if(s.type===SEAT_AI)status='就绪';
  else if(!taken)status='空';
  else if(s.i===LOBBY.hostSlot)status='房主';
  else status=s.ready?'已准备':'未准备';
  const kick=kickBtnVisible(s)
    ? '<button class="skick" data-i="'+s.i+'" title="移出房间">×</button>'
    : '<span></span>';
  return '<div class="slotrow'+(off?' off':'')+(s.i===LOBBY.mySlot?' me':'')+
    (overCap?' over':'')+'" data-i="'+s.i+'">'+
    '<span class="sdot" style="background:'+(plays?TC[s.team%TC.length]:'#3a4030')+'"></span>'+
    nameCell+
    '<select class="stype" data-i="'+s.i+'"'+(edType?'':' disabled')+'>'+typeOpts+'</select>'+
    '<select class="sai" data-i="'+s.i+'"'+(ed?'':' disabled')+
      (s.type===SEAT_AI?'':' style="visibility:hidden"')+'>'+aiOpts+'</select>'+
    '<select class="steam" data-i="'+s.i+'"'+(ed?'':' disabled')+
      (off?' style="visibility:hidden"':'')+'>'+teamOpts+'</select>'+
    '<span class="sready'+(gone?' gone':(slotReady(s)&&plays?' on':''))+'">'+status+'</span>'+
    kick+
    '</div>';
}

/* ---------------- 席位表渲染 ---------------- */
function renderSlots(){
  const box=document.getElementById('slots');
  if(!box)return;
  const cap=mapSeatCapacity();
  const actList=activeSlots();
  box.innerHTML=LOBBY.slots.map(s=>slotRowHTML(s,cap,actList)).join('');

  box.querySelectorAll('.stype').forEach(e=>e.onchange=()=>{
    const s=LOBBY.slots[+e.dataset.i];
    if(seatTaken(s))return;                 // 有人坐着不让改类型
    s.type=e.value;
    if(s.type!==SEAT_OPEN)s.ready=true;     // 只有等待中的真人才需要"准备"
    onLobbyChange(true);
  });
  box.querySelectorAll('.steam').forEach(e=>e.onchange=()=>{
    LOBBY.slots[+e.dataset.i].team=+e.value;onLobbyChange();
  });
  box.querySelectorAll('.sai').forEach(e=>e.onchange=()=>{
    LOBBY.slots[+e.dataset.i].ai=+e.value;onLobbyChange();
  });
  box.querySelectorAll('.skick').forEach(e=>e.onclick=()=>{
    const s=LOBBY.slots[+e.dataset.i];
    if(s&&kickBtnVisible(s))netKick(s.i);
  });

  const capLine=document.getElementById('capline');
  if(capLine){
    const n=activeSlots().length;
    capLine.innerHTML='参战 <b>'+n+'</b> 席 · 地图出生点 <b>'+cap+'</b>'+
      (n>cap?' <span style="color:var(--red)">— 出生点不够，请换更大的地图</span>':'');
  }
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);}

/* 该不该显示准备按钮：联机、自己坐着人、且不是房主。
   独立成函数是为了让测试调到同一份逻辑——测试里复制一份判定条件，
   等于这条永远测不出问题（这个按钮就因此消失过一次）。 */
function readyBtnVisible(){
  const me=LOBBY.slots[LOBBY.mySlot];
  return LOBBY.mode==='net'&&!!me&&seatTaken(me)&&!isHost();
}
/* 能不能开局：房主、至少两席、出生点够、全员就绪 */
function canStartMatch(){
  const n=activeSlots().length;
  return isHost()&&n>=2&&n<=mapSeatCapacity()&&allReady();
}

/* 席位或地图变化后的统一收口 */
function onLobbyChange(seatsChanged){
  if(seatsChanged&&autoPreset())syncMapForm();
  renderSlots();
  refreshPreview();
  syncLobbyFoot();
  if(LOBBY.mode==='net')netSendLobby();
}
function syncMapForm(){
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  set('mgw',MAPCFG.gw);set('mgh',MAPCFG.gh);
  const sel=document.getElementById('mpreset');
  if(sel)sel.value=MAPCFG.preset;
  const info=document.getElementById('mapinfo');
  if(info)info.innerHTML=
    '尺寸 <b>'+MAPCFG.gw+'×'+MAPCFG.gh+'</b> · 据点 <b>'+
    MAPCFG.points.reduce((n,p)=>{const m=mirrorPt(p.tx,p.ty);
      return n+((m[0]!==p.tx||m[1]!==p.ty)?2:1);},0)+'</b> · 出生点 <b>'+mapSeatCapacity()+'</b>';
}
/* 底部：准备按钮与开始按钮的可用状态 */
function syncLobbyFoot(){
  const rb=document.getElementById('readybtn'), gb=document.getElementById('gobtn');
  const st=document.getElementById('lobbystatus');
  const me=LOBBY.slots[LOBBY.mySlot];
  if(rb){
    const show=readyBtnVisible();
    rb.style.display=show?'':'none';
    rb.textContent=(me&&me.ready)?'取 消 准 备':'准 备';
    rb.classList.toggle('on',!!(me&&me.ready));
  }
  if(gb){
    gb.disabled=!canStartMatch();
    gb.textContent=isHost()?'开 始 对 局':'等 待 房 主 开 局';
  }
  if(st){
    const n=activeSlots().length;
    if(n<2)st.textContent='至少要两席参战。';
    else if(n>mapSeatCapacity())st.textContent='出生点不足，换更大的地图或关闭几席。';
    else if(!allReady())st.textContent='等待其他玩家准备 …';
    else st.textContent=isHost()?'全员就绪，可以开始。':'全员就绪，等房主开局。';
  }
}
