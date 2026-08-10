/* =============================================================================
   FRONTLINE — view/input.js
   鼠标键盘输入、屏幕空间选择、指令下达。
   ============================================================================= */
/* ---------------- 输入 ---------------- */
let selection=[], amove=false, perf=0;
let myTeam=0;                     // 本机操控的队伍；联机时由大厅指定
let pending=null;                 // 待拾取目标的技能：'deploy' | 'force'
function setPending(p){
  pending=p;
  if(typeof cv.classList!=='undefined'&&cv.classList.toggle)
    cv.classList.toggle('amove',!!p||amove);
}
const keys={}, mouse={x:0,y:0};
const drag={on:false,sx:0,sy:0,cx:0,cy:0,box:false,mid:false};

/* 手感开关：每项独立，觉得别扭单独关掉即可 */
const FEEL={
  clickSelectsSquad : true,   // 点到小队任一成员即选中整队（关闭则只认小队中心）
  doubleClickSameType: true,  // 双击某单位 = 选中屏幕内所有同兵种小队
  tabCycle          : true,   // Tab 在已选中集内循环焦点，镜头跟随
  preferSelected    : true,   // 多个单位重叠时优先命中已选中的，避免误切
};
const DBL_MS=280;
let lastClick={t:-1e9,s:null};
let tabIdx=0;

/* ---------------- 编队组 ----------------
   抽成函数而不是写在 keydown 里，是为了测试能直接调到同一份逻辑。
   兵种快捷键是字母（Q/W/E/R/F/G），数字键专给编队用，不冲突。 */
const GROUP_KEYS='123456789';
let lastGroupKey={k:'',t:-1e9};
const nowMs=()=>(typeof performance!=='undefined'&&performance.now)?performance.now():0;
/* Shift 是追加，不是替换——手上这批打完了想并进老编队，重设一次太亏 */
function setGroup(k,append){
  if(!G)return 0;
  const list=append?(G.groups[k]||[]).filter(s=>s.alive):[];
  for(const s of selection)if(s.alive&&list.indexOf(s)<0)list.push(s);
  G.groups[k]=list;
  log('编队 '+k+(append?' 追加至 ':' 已设定 ')+list.length+' 支',0,myTeam);
  return list.length;
}
/* 返回是否真的选中了东西。连按两下同一个键把镜头也带过去（RTS 通例）。 */
function recallGroup(k){
  if(!G)return false;
  const g=(G.groups[k]||[]).filter(s=>s.alive);
  const t=nowMs(), dbl=lastGroupKey.k===k&&(t-lastGroupKey.t)<DBL_MS*1.6;
  lastGroupKey={k,t};
  if(!g.length)return false;
  clearSel();g.forEach(pick);syncSel();tabIdx=0;
  if(dbl)focusOn(g);
  return true;
}
/* 镜头对准一批单位的重心。-40 是把单位摆在屏幕中心略偏下，视野更顺 */
function focusOn(list){
  if(!list||!list.length)return;
  let x=0,y=0;
  for(const s of list){x+=s.x;y+=s.y;}
  cam.x=x/list.length;cam.y=y/list.length-40;clampCam();
}

function s2w(sx,sy){
  const wx=(sx-cv.width/2)/cam.z+cam.x;
  const pyv=(sy-cv.height/2)/cam.z+cam.y*TILT;
  let wy=pyv/TILT;
  wy=(pyv+hAt(wx,clamp(wy,0,WH))*ZS)/TILT;
  return{x:wx,y:wy};
}
/* 屏幕像素 → 投影空间（ctx.setTransform 的输入坐标系）。
   x 就是世界 x；y 是 projY 后的值，与所有绘制代码同一个空间。 */
function s2p(sx,sy){
  return{x:(sx-cv.width/2)/cam.z+cam.x, y:(sy-cv.height/2)/cam.z+cam.y*TILT};
}
/* 投影空间 → 屏幕像素 */
function w2s(wx,wy,h){
  return{x:(wx-cam.x)*cam.z+cv.width/2, y:(projY(wy,h)-cam.y*TILT)*cam.z+cv.height/2};
}
/* 单位在投影空间的可视高度（脚点往上多少） */
function unitTopH(s){return s.def.vehicle?(s.def.id==='tank'?46:38):46;}
/* 命中测试：px,py 为投影空间坐标。
   单位画在脚点"上方"，旧代码却在世界平面上比距离，所以点身体必然落空。 */
function hitUnit(s,px,py){
  if(s.house&&!s.house.ruin){                 // 驻守中：点建筑本体
    const h=s.house, bh=hAt(h.cx,h.cy), ty=projY(h.ty*TS,bh);
    return px>=h.tx*TS-3&&px<=h.tx*TS+h.w*TS+3&&py>=ty-14&&py<=ty+h.h*TS*TILT+3;
  }
  const fy=projY(s.y,hAt(s.x,s.y));
  if(s.def.vehicle){
    const hw=s.def.id==='tank'?27:21;
    return px>=s.x-hw&&px<=s.x+hw&&py>=fy-unitTopH(s)*ZS&&py<=fy+10;
  }
  if(!FEEL.clickSelectsSquad)
    return px>=s.x-13&&px<=s.x+13&&py>=fy-unitTopH(s)*ZS&&py<=fy+6;
  for(const m of s.members){                  // 逐兵判定：点到班里任何一个人都算
    if(!m.alive)continue;
    const wx=s.x+m.ox, wy=s.y+m.oy, my=projY(wy,hAt(wx,wy));
    if(px>=wx-11&&px<=wx+11&&my-40<=py&&py<=my+6)return true;
  }
  return false;
}
/* 框选用的代表点：取身体中心而非脚点，否则视觉上明明框住了却选不中 */
function unitAnchor(s){
  if(s.house&&!s.house.ruin)return{x:s.house.cx,y:projY(s.house.cy,hAt(s.house.cx,s.house.cy))-20};
  return{x:s.x,y:projY(s.y,hAt(s.x,s.y))-unitTopH(s)*ZS*.45};
}
const myUnits=()=>G.squads.filter(s=>s.alive&&s.team===myTeam);
/* 右键菜单全局锁死：只挂 canvas 的话，HUD 与覆盖层上右键仍会弹出原生菜单，
   微操时点到面板边缘就中断操作。document 捕获阶段拦截，一处覆盖全部。 */
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')
  document.addEventListener('contextmenu',e=>e.preventDefault(),true);

if(typeof cv.addEventListener==='function'){
cv.addEventListener('mousedown',e=>{
  if(!G||G.over)return;
  initAudio();
  if(e.button===1){drag.mid=true;drag.sx=e.clientX;drag.sy=e.clientY;e.preventDefault();return;}
  if(e.button===0){
    const w=s2w(e.clientX,e.clientY);
    if(pending==='deploy'){issueDeploy(w.x,w.y);setPending(null);return;}
    if(pending==='force'){issueForceAttack(w.x,w.y);setPending(null);return;}
    if(amove){issueAmove(w.x,w.y);amove=false;cv.classList.remove('amove');return;}
    drag.on=true;drag.sx=e.clientX;drag.sy=e.clientY;drag.cx=e.clientX;drag.cy=e.clientY;drag.box=false;
  }
  if(e.button===2){
    const w=s2w(e.clientX,e.clientY);
    if(e.ctrlKey)issueForceAttack(w.x,w.y);     // Ctrl+右键 = 强制攻击
    else issueRight(w.x,w.y);
  }
});
addEventListener('mousemove',e=>{
  mouse.x=e.clientX;mouse.y=e.clientY;
  if(drag.mid){cam.x-=(e.clientX-drag.sx)/cam.z;cam.y-=(e.clientY-drag.sy)/cam.z/TILT;
    drag.sx=e.clientX;drag.sy=e.clientY;clampCam();}
  if(drag.on){drag.cx=e.clientX;drag.cy=e.clientY;
    if(Math.abs(drag.cx-drag.sx)>5||Math.abs(drag.cy-drag.sy)>5)drag.box=true;}
});
addEventListener('mouseup',e=>{
  if(e.button===1)drag.mid=false;
  if(e.button!==0||!drag.on)return;
  drag.on=false;
  if(!G)return;
  if(!e.shiftKey)clearSel();
  if(drag.box){
    // 框选在投影空间做：屏幕上框住的就是选中的，与视觉一致
    const a=s2p(Math.min(drag.sx,drag.cx),Math.min(drag.sy,drag.cy));
    const b=s2p(Math.max(drag.sx,drag.cx),Math.max(drag.sy,drag.cy));
    for(const s of myUnits()){
      const c=unitAnchor(s);
      if(c.x>=a.x&&c.x<=b.x&&c.y>=a.y&&c.y<=b.y)pick(s);
    }
  }else{
    const p=s2p(drag.sx,drag.sy);
    const hits=myUnits().filter(s=>hitUnit(s,p.x,p.y));
    let best=null;
    if(hits.length){
      // 优先已选中的，其次取屏幕上最靠前（sy 最大）的那个
      const sel=FEEL.preferSelected?hits.filter(s=>s.sel):[];
      const pool=sel.length?sel:hits;
      best=pool.reduce((a,s)=>(a===null||s.y>a.y)?s:a,null);
    }
    const now=(typeof performance!=='undefined'?performance.now():0);
    const dbl=FEEL.doubleClickSameType&&best&&lastClick.s===best&&(now-lastClick.t)<DBL_MS;
    lastClick={t:now,s:best};
    if(dbl){
      // 双击：选中屏幕内所有同兵种小队
      const t0=s2p(0,0), t1=s2p(cv.width,cv.height);
      for(const s of myUnits()){
        if(s.type!==best.type)continue;
        const c=unitAnchor(s);
        if(c.x>=t0.x&&c.x<=t1.x&&c.y>=t0.y&&c.y<=t1.y)pick(s);
      }
    }else if(best)pick(best);
  }
  drag.box=false;tabIdx=0;syncSel();
});
cv.addEventListener('wheel',e=>{
  e.preventDefault();cam.z=clamp(cam.z*(e.deltaY>0?.88:1.13),1.15,3.4);clampCam();
},{passive:false});
/* 小地图：左键挪视野，右键直接下令。
   右键只下移动令，不做主视图那套"点到谁就打谁"的目标拾取——
   小地图上一个像素抵几十个世界单位，拾取必然点歪。要打就用 A。 */
mcv.addEventListener('mousedown',e=>{
  if(!G||G.over)return;
  const w=miniToWorld(e);
  if(e.button===2){issueMiniOrder(w.x,w.y,false);return;}
  if(e.button!==0)return;
  if(pending==='force'){issueForceAttack(w.x,w.y);setPending(null);return;}
  if(amove){issueMiniOrder(w.x,w.y,true);amove=false;cv.classList.remove('amove');return;}
  miniJump(e);
});
mcv.addEventListener('mousemove',e=>{if((e.buttons&1)&&!amove&&!pending)miniJump(e);});
}
function miniToWorld(e){
  const r=mcv.getBoundingClientRect();
  return{x:(e.clientX-r.left)/r.width*WW, y:(e.clientY-r.top)/r.height*WH};
}
function miniJump(e){
  const w=miniToWorld(e);
  cam.x=w.x;cam.y=w.y;clampCam();
}
function issueMiniOrder(wx,wy,attack){
  const list=selection.filter(s=>s.alive);
  if(!list.length)return;
  if(attack)issueAmove(wx,wy);
  else{
    cmd({type:'move',ids:idsOf(list),x:wx,y:wy});
    FX.ping.push({x:wx,y:wy,t:0,atk:false});
  }
}
function clampCam(){
  const OV=80;                       // 允许镜头越出地图边缘一点，保证四角能完整看到
  const hw=cv.width/2/cam.z, hh=cv.height/2/cam.z/TILT;
  cam.x=clamp(cam.x,Math.min(hw-OV,WW/2),Math.max(WW-hw+OV,WW/2));
  cam.y=clamp(cam.y,Math.min(hh-OV,WH/2),Math.max(WH-hh+OV,WH/2));
}
function clearSel(){for(const s of selection)s.sel=false;selection=[];}
function pick(s){if(!s.sel){s.sel=true;selection.push(s);}}
function formation(list,gx,gy){
  const n=list.length;
  if(n===1){list[0].goalX=gx;list[0].goalY=gy;return;}
  const cols=Math.ceil(Math.sqrt(n)), sp=42;
  list.sort((a,b)=>d2(a.x,a.y,gx,gy)-d2(b.x,b.y,gx,gy));
  list.forEach((s,i)=>{
    const c=i%cols, r=(i/cols)|0;
    s.goalX=clamp(gx+(c-(cols-1)/2)*sp,20,WW-20);
    s.goalY=clamp(gy+(r-(Math.ceil(n/cols)-1)/2)*sp,20,WH-20);
  });
}
function houseAt(wx,wy){
  const tx=(wx/TS)|0, ty=(wy/TS)|0;
  for(const h of G.houses)if(!h.ruin&&tx>=h.tx&&ty>=h.ty&&tx<h.tx+h.w&&ty<h.ty+h.h)return h;
  return null;
}
