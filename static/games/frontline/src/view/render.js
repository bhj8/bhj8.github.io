/* =============================================================================
   FRONTLINE — view/render.js
   渲染主体：投影、深度排序、单位与建筑绘制、迷雾。
   ============================================================================= */
/* ---------------- 渲染 ---------------- */
const cv=document.getElementById('game'), ctx=cv.getContext('2d');
const mcv=document.getElementById('minic'), mctx=mcv.getContext('2d');
let cam={x:WW/2,y:WH/2,z:1.75}, fogCv=null,fogCtx=null,fogImg=null,miniTer=null;
const TC=['#5aa6e0','#d9603c','#68be72','#d4c048','#a27cce','#4ec6be','#de8c3c','#d6dac6'];
const TEAM_NAMES=['蓝','红','绿','黄','紫','青','橙','白'];

/* 只画镜头覆盖到的块，其余的连烘都不烘 */
function drawGroundTiles(){
  const z=cam.z, halfW=cv.width/2/z, halfH=cv.height/2/z;
  const wx0=cam.x-halfW, wx1=cam.x+halfW;
  const pyTop=cam.y*TILT-halfH, pyBot=cam.y*TILT+halfH;
  const tx0=clamp(Math.floor(wx0/(TILEG*TS)),0,tilesX-1);
  const tx1=clamp(Math.floor(wx1/(TILEG*TS)),0,tilesX-1);
  // 投影后 y 与格 y 不是线性一一对应，多取两行覆盖高度抬升带来的偏移
  const ty0=clamp(Math.floor(pyTop/TILT/(TILEG*TS))-1,0,tilesY-1);
  const ty1=clamp(Math.floor(pyBot/TILT/(TILEG*TS))+1,0,tilesY-1);
  for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
    const t=getTile(tx,ty);
    ctx.drawImage(t.cv,0,0,t.cv.width,t.cv.height,t.ox,t.oy,t.w,t.h);
  }
}
/* 迷雾透明度：抽成纯函数，好让测试能直接断言，不必依赖真实 canvas。
   V_IDENT 看得清 → 全透明；V_DETECT 只探测到 → 薄雾；V_SEEN 记忆 → 半雾；未探索 → 近黑。 */
function fogAlpha(v){
  if(v&V_IDENT)return 0;
  if(v&V_DETECT)return 60;
  if(v&V_SEEN)return 112;
  return 238;
}
function prepFog(){fogCv=mkc(GW,GH);fogCtx=fogCv.getContext('2d');fogImg=fogCtx.createImageData(GW,GH);}
function resize(){
  cv.width=innerWidth;cv.height=innerHeight;
  const r=mcv.getBoundingClientRect();
  mcv.width=Math.max(1,r.width|0);mcv.height=Math.max(1,r.height|0);
}
if(typeof addEventListener!=='undefined')addEventListener('resize',resize);

/* 盒体：返回顶面多边形 */
function box3d(g,cx,cy,w,d,h,ang,cTop,cSide,baseH){
  const ca=Math.cos(ang), sa=Math.sin(ang), bh=baseH||0;
  const pts=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(p=>{
    const X=cx+p[0]*ca-p[1]*sa, Y=cy+p[0]*sa+p[1]*ca;
    return [X, projY(Y,bh)];
  });
  let gx=0,gy=0;for(const p of pts){gx+=p[0];gy+=p[1];}gx/=4;gy/=4;
  const up=h*ZS;
  for(let i=0;i<4;i++){
    const a=pts[i], b=pts[(i+1)%4];
    const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
    if(my-gy<=0)continue;
    let nx=mx-gx, ny=my-gy;const L=Math.hypot(nx,ny)||1;nx/=L;ny/=L;
    const lam=clamp(.30+.60*(-nx*.55+ny*.42+.42),0,1.3);
    g.fillStyle=sh(cSide,lam);
    g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);
    g.lineTo(b[0],b[1]-up);g.lineTo(a[0],a[1]-up);g.closePath();g.fill();
  }
  g.fillStyle=sh(cTop,1);
  g.beginPath();g.moveTo(pts[0][0],pts[0][1]-up);
  for(let i=1;i<4;i++)g.lineTo(pts[i][0],pts[i][1]-up);
  g.closePath();g.fill();
  return pts.map(p=>[p[0],p[1]-up]);
}
/* 盒体投影阴影（凸包） */
function boxShadow(g,cx,cy,w,d,h,ang,baseH){
  const ca=Math.cos(ang), sa=Math.sin(ang), bh=baseH||0;
  const base=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(p=>{
    const X=cx+p[0]*ca-p[1]*sa, Y=cy+p[0]*sa+p[1]*ca;
    return [X, projY(Y,bh)];
  });
  const sx=h*.44, sy=h*.21;
  const all=base.concat(base.map(p=>[p[0]+sx,p[1]+sy]));
  const hull=convex(all);
  g.fillStyle='rgba(14,18,9,.22)';
  g.beginPath();g.moveTo(hull[0][0],hull[0][1]);
  for(let i=1;i<hull.length;i++)g.lineTo(hull[i][0],hull[i][1]);
  g.closePath();g.fill();
}
function convex(P){
  const p=P.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];
  for(const q of p){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q);}
  for(let i=p.length-1;i>=0;i--){const q=p[i];
    while(up.length>=2&&cr(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q);}
  lo.pop();up.pop();return lo.concat(up);
}
function ellShadow(g,wx,wy,r,h,alpha){
  const bh=hAt(wx,wy);
  g.fillStyle='rgba(14,18,9,'+(alpha||.28)+')';
  g.beginPath();
  g.ellipse(wx+h*.34, projY(wy,bh)+h*.16, r, r*TILT, 0,0,6.284);
  g.fill();
}

function render(alpha,dt){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#12150a';ctx.fillRect(0,0,cv.width,cv.height);
  if(!G||(!groundCv&&!tiles))return;
  const z=cam.z, cw=cv.width, chh=cv.height;
  ctx.save();
  ctx.setTransform(z,0,0,z, cw/2-cam.x*z, chh/2-cam.y*TILT*z);

  if(tileMode)drawGroundTiles();
  else ctx.drawImage(groundCv,0,0,groundCv.width,groundCv.height,0,-YTOP,
                     groundCv.width/GSS,groundCv.height/GSS);

  // 据点标记（贴地）
  for(const p of G.pts){
    const col=p.owner<0?'#8f9480':TC[p.owner%TC.length];
    const bh=hAt(p.x,p.y);
    ctx.save();ctx.translate(p.x,projY(p.y,bh));ctx.scale(1,TILT);
    ctx.strokeStyle=col;ctx.globalAlpha=.45;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(0,0,95,0,6.284);ctx.stroke();
    ctx.globalAlpha=.10;ctx.fillStyle=col;ctx.fill();
    ctx.globalAlpha=.3;ctx.setLineDash([6,10]);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,0,72,0,6.284);ctx.stroke();ctx.setLineDash([]);
    ctx.restore();ctx.globalAlpha=1;
  }
  // 弹坑 / 血迹（贴地）
  for(const d of FX.decal){
    const bh=hAt(d.x,d.y);
    ctx.globalAlpha=d.dark?.45:.38;
    ctx.fillStyle=d.dark?'#1a1a10':'#57231a';
    ctx.beginPath();ctx.ellipse(d.x,projY(d.y,bh),d.r,d.r*TILT,0,0,6.284);ctx.fill();
  }
  ctx.globalAlpha=1;

  // ---- 深度排序渲染列表 ----
  const marginY=260/z, marginX=140/z;
  const y0=((chh/-2)/z+cam.y*TILT-marginY)/TILT, y1=((chh/2)/z+cam.y*TILT+marginY)/TILT;
  const vx0=cam.x-cw/2/z-marginX, vx1=cam.x+cw/2/z+marginX;
  const r0=clamp((y0/TS)|0,0,GH-1), r1=clamp((y1/TS)|0,0,GH-1);
  const list=[];
  for(let r=r0;r<=r1;r++){
    const arr=propRows[r];if(!arr)continue;
    for(const p of arr)if(p.x1>vx0&&p.x0<vx1)list.push(p);
  }
  for(const b of G.bldgs)list.push({k:'hq',b,sy:(b.ty+b.h)*TS});
  for(const p of G.pts)list.push({k:'flag',p,sy:p.y+2});
  for(const s of G.squads){
    if(!s.alive)continue;
    if(s.x<vx0-60||s.x>vx1+60||s.y<y0-120||s.y>y1+120)continue;
    if(s.team===myTeam){list.push({k:'unit',s,sy:s.y});continue;}
    // 敌军：识别档才完整绘制，只探测到的画成未识别标记
    if(identOK(s.x,s.y))list.push({k:'unit',s,sy:s.y});
    else if(detectOK(s.x,s.y))list.push({k:'blip',s,sy:s.y});
  }
  for(const p of G.shells){if(p.team!==myTeam&&!seen(p.x,p.y))continue;list.push({k:'shell',p,sy:p.y});}
  list.sort((a,b)=>a.sy-b.sy);

  for(const it of list){
    if(it.k==='bld')drawBld(it);
    else if(it.k==='cov')drawCov(it);
    else if(it.k==='tree')drawTree(it);
    else if(it.k==='rock')drawRock(it);
    else if(it.k==='hq')drawHQ(it.b);
    else if(it.k==='blip')drawBlip(it.s);
    else if(it.k==='flag')drawFlag(it.p);
    else if(it.k==='unit')drawUnit(it.s,alpha);
    else if(it.k==='shell')drawShell(it.p);
  }

  // 特效
  drawFX(alpha);

  // 迷雾：四档透明度，与小地图保持一致
  const vis=G.vis[myTeam];
  const d=fogImg.data;
  for(let i=0;i<GW*GH;i++){
    const j=i*4;
    d[j]=5;d[j+1]=7;d[j+2]=3;
    d[j+3]=fogAlpha(vis?vis[i]:0);
  }
  fogCtx.putImageData(fogImg,0,0);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(fogCv,0,0,GW,GH,0,-14,WW,WHP+22);
  // 地图边界：外侧渐隐 + 暗色描边，越界区域看起来是设计而非缺失
  {
    const F=64;
    let g1=ctx.createLinearGradient(0,0,0,-F);
    g1.addColorStop(0,'rgba(9,11,6,0)');g1.addColorStop(1,'rgba(9,11,6,.95)');
    ctx.fillStyle=g1;ctx.fillRect(-F,-F,WW+F*2,F);
    let g2=ctx.createLinearGradient(0,WHP-30,0,WHP+F*0.5);
    g2.addColorStop(0,'rgba(9,11,6,0)');g2.addColorStop(1,'rgba(9,11,6,.97)');
    ctx.fillStyle=g2;ctx.fillRect(-F,WHP-14,WW+F*2,F+60);
    let g3=ctx.createLinearGradient(0,0,-F,0);
    g3.addColorStop(0,'rgba(9,11,6,0)');g3.addColorStop(1,'rgba(9,11,6,.95)');
    ctx.fillStyle=g3;ctx.fillRect(-F,-F,F,WHP+F*2);
    let g4=ctx.createLinearGradient(WW,0,WW+F,0);
    g4.addColorStop(0,'rgba(9,11,6,0)');g4.addColorStop(1,'rgba(9,11,6,.95)');
    ctx.fillStyle=g4;ctx.fillRect(WW,-F,F,WHP+F*2);
    ctx.strokeStyle='rgba(228,230,214,.10)';ctx.lineWidth=1.5/cam.z;
    ctx.strokeRect(0,0,WW,WHP);
  }


  ctx.restore();

  // 屏幕空间 UI
  if(drag.on&&drag.box){
    ctx.strokeStyle='#8fd2ff';ctx.lineWidth=1;ctx.fillStyle='rgba(143,210,255,.09)';
    const x=Math.min(drag.sx,drag.cx),y=Math.min(drag.sy,drag.cy);
    const w=Math.abs(drag.cx-drag.sx),h=Math.abs(drag.cy-drag.sy);
    ctx.fillRect(x,y,w,h);ctx.strokeRect(x+.5,y+.5,w,h);
  }
  if(amove){
    ctx.fillStyle='#d9603c';ctx.font='11px ui-monospace,monospace';ctx.textAlign='left';
    ctx.fillText('攻击移动 — 点击目标位置（Esc 取消）',mouse.x+18,mouse.y+4);
  }
  stepFX(dt);
}

const BLDTOP=[118,108,86], BLDSIDE=[104,94,74], BLDTOP2=[132,78,54];
function drawBld(p){
  const bh=hAt(p.cx,p.cy);
  const ho=p.ho;
  if(ho&&ho.ruin){                       // 废墟：塌下去一半，不能再进驻
    boxShadow(ctx,p.cx,p.cy,p.w,p.d,p.h*.34,0,bh);
    box3d(ctx,p.cx,p.cy,p.w*.96,p.d*.96,p.h*.34,0,[58,54,44],[48,44,36],bh);
    ctx.fillStyle='rgba(20,18,12,.5)';
    for(let i=0;i<5;i++){
      const a=(i*2.1)%6.28, r=p.w*.3;
      ctx.beginPath();ctx.ellipse(p.cx+Math.cos(a)*r,projY(p.cy+Math.sin(a)*r*.6,bh),
        6+i,4+i*.6,0,0,6.284);ctx.fill();
    }
    return;
  }
  boxShadow(ctx,p.cx,p.cy,p.w,p.d,p.h,0,bh);
  const tile=p.seed>.5;
  /* 墙色偏向材质色。材质决定这栋楼多抗打，玩家得能一眼分出来才可能据此决策——
     看不出区别的分型等于没做。混得不满（0.55）是为了保留原来的做旧质感。 */
  const M=(ho&&HOUSE_MATS[ho.mat])||null;
  const roof=M&&M.id==='concrete'?[112,112,104]:(tile?BLDTOP2:BLDTOP);
  let wall=mix(BLDSIDE,[78,74,62],.18+p.seed*.42);
  if(M)wall=mix(wall,M.tint,.55);
  const top=box3d(ctx,p.cx,p.cy,p.w,p.d,p.h,0,roof,wall,bh);
  const by=projY(p.cy+p.d/2,bh), up=p.h*ZS;
  // 正面窗与门
  const rows=Math.max(1,Math.floor(p.h/30)), cols=Math.max(2,Math.round(p.w/34));
  ctx.fillStyle='rgba(26,26,20,.62)';
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const wx=p.cx-p.w/2+(c+.5)*(p.w/cols)-4.5;
    const wy=by-up+10+r*((up-16)/rows);
    ctx.fillRect(wx,wy,8,9);
  }
  ctx.fillStyle='rgba(20,20,15,.72)';
  ctx.fillRect(p.cx-6,by-15,12,15);
  // 屋顶瓦楞 + 屋脊
  ctx.strokeStyle=tile?'rgba(60,26,16,.34)':'rgba(40,36,26,.30)';ctx.lineWidth=1;
  ctx.beginPath();
  const n=Math.max(3,Math.round(p.w/13));
  for(let i=1;i<n;i++){
    const t=i/n;
    ctx.moveTo(lerp(top[0][0],top[1][0],t),lerp(top[0][1],top[1][1],t));
    ctx.lineTo(lerp(top[3][0],top[2][0],t),lerp(top[3][1],top[2][1],t));
  }
  ctx.stroke();
  ctx.strokeStyle='rgba(255,244,214,.20)';ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(top[0][0],(top[0][1]+top[3][1])/2);
  ctx.lineTo(top[1][0],(top[1][1]+top[2][1])/2);ctx.stroke();
  // 屋檐高光
  ctx.fillStyle='rgba(255,246,214,.16)';
  ctx.beginPath();ctx.moveTo(top[3][0],top[3][1]);ctx.lineTo(top[2][0],top[2][1]);
  ctx.lineTo(top[2][0],top[2][1]+3.5);ctx.lineTo(top[3][0],top[3][1]+3.5);ctx.closePath();ctx.fill();
  drawHouseState(p,ho,by,up);
}
function drawHouseState(p,ho,by,up){
  if(!ho)return;
  const iz=1/cam.z;
  if(ho.gar.length){                     // 有人驻守：窗口透出队伍色
    const g=ho.gar[0];
    ctx.fillStyle=sh(TEAMC[g.team],1.25);
    const cols=Math.max(2,Math.round(p.w/34));
    for(let c=0;c<cols;c++){
      const wx=p.cx-p.w/2+(c+.5)*(p.w/cols)-4;
      ctx.fillRect(wx,by-up+10,8,9);
    }
    ctx.strokeStyle=sh(TEAMC[g.team],1);ctx.lineWidth=1.6*iz;
    ctx.strokeRect(p.cx-p.w/2,by-up,p.w,up);
  }
  if(ho.hp<ho.max){                      // 建筑耐久
    const bw=Math.min(p.w,86*iz), yb=by-up-9*iz;
    ctx.fillStyle='rgba(6,8,4,.8)';ctx.fillRect(p.cx-bw/2,yb,bw,3.5*iz);
    ctx.fillStyle='#b8a06a';ctx.fillRect(p.cx-bw/2,yb,bw*(ho.hp/ho.max),3.5*iz);
  }
}
const SANDC=[116,104,76], WALLC=[94,92,80];
function drawCov(p){
  const c=p.c, ang=Math.atan2(c.ny,c.nx), bh=hAt(c.x,c.y);
  const h=c.heavy?13:9.5, w=c.heavy?8:6.5, d=22;
  const cx=c.x+c.nx*5, cy=c.y+c.ny*5;
  boxShadow(ctx,cx,cy,w,d,h,ang,bh);
  const col=c.heavy?WALLC:SANDC;
  box3d(ctx,cx,cy,w,d,h,ang,mix(col,[255,255,255],.10),col,bh);
  if(!c.heavy){
    // 沙袋分节
    const ca=Math.cos(ang),sa=Math.sin(ang);
    ctx.strokeStyle='rgba(60,52,32,.4)';ctx.lineWidth=1;
    for(let i=-1;i<=1;i++){
      const ox=-sa*i*8, oy=ca*i*8;
      const X=cx+ox, Y=projY(cy+oy,bh)-h*ZS;
      ctx.beginPath();ctx.moveTo(X-ca*w/2,Y-sa*w/2*TILT);ctx.lineTo(X+ca*w/2,Y+sa*w/2*TILT);ctx.stroke();
    }
  }
}
function drawTree(p){
  const bh=hAt(p.cx,p.cy);
  ellShadow(ctx,p.cx,p.cy,p.r*.95,p.h,.32);
  const img=ASSETS.tree[(p.seed*4)|0];
  const s=(p.h/46)*0.92;
  const w=img.width/3*s, h=img.height/3*s;
  ctx.drawImage(img, p.cx-w/2, projY(p.cy,bh)-h+3, w, h);
}
const ROCKC=[76,72,58];
function drawRock(p){
  const bh=hAt(p.cx,p.cy);
  boxShadow(ctx,p.cx,p.cy,p.w,p.d,p.h,p.a,bh);
  box3d(ctx,p.cx,p.cy,p.w,p.d,p.h,p.a,mix(ROCKC,[255,255,255],.16),ROCKC,bh);
}
function drawFlag(p){
  const col=p.owner<0?[150,156,132]:TEAMC[p.owner%TEAMC.length];
  const bh=hAt(p.x,p.y), by=projY(p.y,bh);
  ellShadow(ctx,p.x,p.y,7,42,.3);
  box3d(ctx,p.x,p.y,7,7,8,0,[92,86,68],[70,64,48],bh);
  ctx.strokeStyle='#2a2c1e';ctx.lineWidth=2.4;
  ctx.beginPath();ctx.moveTo(p.x,by-8*ZS);ctx.lineTo(p.x,by-52*ZS);ctx.stroke();
  const wob=Math.sin(perf*2.2+p.i)*2;
  ctx.fillStyle=sh(col,1);
  ctx.beginPath();
  ctx.moveTo(p.x+1,by-52*ZS);
  ctx.lineTo(p.x+21,by-49*ZS+wob);
  ctx.lineTo(p.x+21,by-38*ZS+wob);
  ctx.lineTo(p.x+1,by-36*ZS);
  ctx.closePath();ctx.fill();
  ctx.fillStyle=sh(col,.62);
  ctx.fillRect(p.x+1,by-52*ZS,3,16*ZS);
  // 占领进度
  const iz=1/cam.z;
  if(Math.abs(p.cap)<1){
    const w=46*iz, hb=4.5*iz, prog=(p.cap+1)/2;
    ctx.fillStyle='rgba(6,8,4,.7)';ctx.fillRect(p.x-w/2,by-64*ZS,w,hb);
    ctx.fillStyle=TC[0];ctx.fillRect(p.x-w/2,by-64*ZS,w*(1-prog),hb);
    ctx.fillStyle=TC[1];ctx.fillRect(p.x-w/2+w*(1-prog),by-64*ZS,w*prog,hb);
  }
  ctx.fillStyle='rgba(232,234,216,.7)';
  ctx.font=(10*iz).toFixed(2)+'px ui-monospace,monospace';ctx.textAlign='center';
  ctx.fillText(p.name,p.x,by+14*iz);
}
function drawHQ(b){
  const bh=hAt(b.x,b.y), w=b.w*TS-8, d=b.h*TS-8, H=54, iz=1/cam.z;
  // iz 供贴图分支复用
  boxShadow(ctx,b.x,b.y,w,d,H,0,bh);
  const dead=b.hp<=0;
  const base=dead?[52,50,42]:[70,72,54];
  const side=mix(base,TEAMC[b.team],dead?0:.10);
  const top=box3d(ctx,b.x,b.y,w,d,H,0,mix(side,[255,255,255],.20),side,bh);
  const by=projY(b.y+d/2,bh), up=H*ZS;
  // 队伍色条带 + 门
  if(!dead){
    ctx.fillStyle=sh(TEAMC[b.team],.9);
    ctx.fillRect(b.x-w/2,by-up+7,w,5);
    ctx.fillStyle='rgba(255,246,214,.13)';
    ctx.fillRect(b.x-w/2,by-up,w,3);
  }
  ctx.fillStyle='rgba(16,18,12,.8)';
  ctx.fillRect(b.x-14,by-24,28,24);
  ctx.fillStyle='rgba(210,196,150,.16)';
  ctx.fillRect(b.x-14,by-26,28,2.5);
  // 侧墙气窗
  ctx.fillStyle='rgba(24,26,18,.55)';
  for(let i=-2;i<=2;i++)ctx.fillRect(b.x+i*24-5,by-up+22,10,8);
  // 屋顶：机库棚顶纹 + 上层塔楼
  ctx.strokeStyle='rgba(30,32,22,.32)';ctx.lineWidth=1;ctx.beginPath();
  for(let i=1;i<7;i++){const t=i/7;
    ctx.moveTo(lerp(top[0][0],top[1][0],t),lerp(top[0][1],top[1][1],t));
    ctx.lineTo(lerp(top[3][0],top[2][0],t),lerp(top[3][1],top[2][1],t));}
  ctx.stroke();
  box3d(ctx,b.x,b.y-5,w*.40,d*.42,26,0,mix(side,[255,255,255],.30),mix(side,[0,0,0],.10),bh+H);
  if(!dead){
    // 沙袋垛
    for(const o of [[-w/2+10,d/2-4],[w/2-10,d/2-4],[-w/2+10,-d/2+6],[w/2-10,-d/2+6]])
      box3d(ctx,b.x+o[0],b.y+o[1],20,9,10,0,[132,120,90],[112,100,74],bh);
    // 旗杆 + 天线
    const fy=projY(b.y-d/2+8,bh);
    ctx.strokeStyle='#23261a';ctx.lineWidth=2.4;
    ctx.beginPath();ctx.moveTo(b.x+w*.34,fy-H*ZS);ctx.lineTo(b.x+w*.34,fy-(H+44)*ZS);ctx.stroke();
    ctx.fillStyle=sh(TEAMC[b.team],1);
    ctx.fillRect(b.x+w*.34,fy-(H+44)*ZS,24,14);
    ctx.strokeStyle='rgba(40,44,30,.85)';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(b.x-w*.34,fy-H*ZS);ctx.lineTo(b.x-w*.34+4,fy-(H+56)*ZS);ctx.stroke();
    // 集结点
    const rh=hAt(b.rx,b.ry);
    ctx.strokeStyle='rgba(232,234,216,.30)';ctx.setLineDash([4,5]);ctx.lineWidth=1/cam.z;
    ctx.beginPath();ctx.ellipse(b.rx,projY(b.ry,rh),10,10*TILT,0,0,6.284);ctx.stroke();ctx.setLineDash([]);
  }
  if(b.hp<b.max){
    const yb=projY(b.y-d/2,bh)-H*ZS-16*iz, bw=96*iz;
    ctx.fillStyle='rgba(6,8,4,.82)';ctx.fillRect(b.x-bw/2,yb,bw,5*iz);
    ctx.fillStyle=TC[b.team];ctx.fillRect(b.x-bw/2,yb,bw*Math.max(0,b.hp/b.max),5*iz);
  }
  ctx.fillStyle='rgba(232,234,216,.85)';
  ctx.font=(11*iz).toFixed(2)+'px ui-monospace,monospace';ctx.textAlign='center';
  ctx.fillText(b.team===myTeam?'我方基地':'敌方基地',b.x,by+16*iz);
}
function drawHQOverlay(b,bh,d,H,iz){
  const rh=hAt(b.rx,b.ry);
  ctx.strokeStyle='rgba(232,234,216,.30)';ctx.setLineDash([4,5]);ctx.lineWidth=1/cam.z;
  ctx.beginPath();ctx.ellipse(b.rx,projY(b.ry,rh),10,10*TILT,0,0,6.284);ctx.stroke();ctx.setLineDash([]);
  if(b.hp<b.max){
    const yb=projY(b.y-d/2,bh)-H*ZS-16*iz, bw=96*iz;
    ctx.fillStyle='rgba(6,8,4,.82)';ctx.fillRect(b.x-bw/2,yb,bw,5*iz);
    ctx.fillStyle=TC[b.team];ctx.fillRect(b.x-bw/2,yb,bw*Math.max(0,b.hp/b.max),5*iz);
  }
  ctx.fillStyle='rgba(232,234,216,.85)';
  ctx.font=(11*iz).toFixed(2)+'px ui-monospace,monospace';ctx.textAlign='center';
  ctx.fillText(b.team===myTeam?'我方基地':'敌方基地',b.x,projY(b.y+d/2,bh)+16*iz);
}
function drawShell(p){
  const k=p.t/p.dur, arc=Math.sin(k*Math.PI)*70;
  const bh=hAt(p.x,p.y);
  ctx.fillStyle='rgba(12,16,8,.3)';
  ctx.beginPath();ctx.ellipse(p.x,projY(p.y,bh),3.4,3.4*TILT,0,0,6.284);ctx.fill();
  ctx.fillStyle='#e8c06a';
  ctx.beginPath();ctx.ellipse(p.x,projY(p.y,bh+arc),3.4,3.4,0,0,6.284);ctx.fill();
}

/* 探测到但没识别：只知道那里有东西，不知道是什么 */
function drawBlip(s){
  const bh=hAt(s.x,s.y), py=projY(s.y,bh), iz=1/cam.z;
  ctx.save();
  ctx.globalAlpha=.55;
  ctx.strokeStyle=TC[s.team%TC.length];ctx.lineWidth=1.4*iz;
  ctx.setLineDash([3*iz,3*iz]);
  ctx.beginPath();ctx.ellipse(s.x,py,11,11*TILT,0,0,6.284);ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha=.8;
  ctx.fillStyle=TC[s.team%TC.length];
  ctx.font='700 '+(11*iz).toFixed(2)+'px ui-monospace,monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('?',s.x,py-13*ZS);
  ctx.textBaseline='alphabetic';
  ctx.restore();ctx.globalAlpha=1;
}
function drawUnit(s,alpha){
  const iz=1/cam.z;
  // 驻守建筑中：不画人，只在楼上叠状态
  if(s.house&&!s.house.ruin){
    const h=s.house, bh0=hAt(h.cx,h.cy), by=projY(h.cy-h.h*TS/2,bh0)-58*ZS;
    if(s.sel){
      ctx.strokeStyle='#9fdcff';ctx.lineWidth=2/cam.z;ctx.globalAlpha=.95;
      ctx.strokeRect(h.tx*TS-2,projY(h.ty*TS,bh0)-2,h.w*TS+4,h.h*TS*TILT+4);
      ctx.globalAlpha=1;
    }
    drawStatus(s,h.cx,by,iz,true);
    return;
  }
  const rx=lerp(s.px,s.x,alpha), ry=lerp(s.py,s.y,alpha);
  const bh=hAt(rx,ry);
  // 射界扇形：逐成员画，因为架设是成员级的（班里可能只有一挺机枪架着）
  if(s.team===myTeam){
    for(const m of s.members){
      if(!m.alive||!m.weapon||!m.weapon.arc||m.arcCenter===null)continue;
      const armed=m.deployed, prog=armed?1:clamp(m.deployT/(m.weapon.setupTime||1),0,1);
      if(!armed&&prog<=0)continue;
      ctx.save();ctx.translate(rx,projY(ry,bh));ctx.scale(1,TILT);
      ctx.fillStyle=armed?'rgba(90,166,224,.055)':'rgba(217,164,65,.05)';
      ctx.beginPath();ctx.moveTo(0,0);
      ctx.arc(0,0,m.weapon.range*(armed?1:prog),m.arcCenter-m.weapon.arc,m.arcCenter+m.weapon.arc);
      ctx.closePath();ctx.fill();ctx.restore();
    }
  }
  if(s.def.vehicle)drawVehicle(s,rx,ry,bh);
  else drawInfantry(s,rx,ry,bh,alpha);
  const top=projY(ry,bh)-(s.def.vehicle?(s.def.id==='tank'?46:38):52)*ZS;
  drawStatus(s,rx,top,iz,false);
}
/* 血条 / 压制条 / 兵种徽标 / 状态字 —— 全部屏幕空间固定尺寸 */
function drawStatus(s,cx,topY,iz,gar){
  const hr=hpRatio(s);
  if(hr<1||s.sel||s.supp>.05||gar){
    const w=26*iz, hb=3.5*iz;
    ctx.fillStyle='rgba(6,8,4,.8)';ctx.fillRect(cx-w/2,topY,w,hb);
    ctx.fillStyle=hr>.6?TC[s.team]:(hr>.3?'#d9a441':'#d9603c');
    ctx.fillRect(cx-w/2,topY,w*hr,hb);
    if(s.supp>.05){
      ctx.fillStyle='rgba(6,8,4,.7)';ctx.fillRect(cx-w/2,topY+hb+1*iz,w,2.5*iz);
      ctx.fillStyle=s.supp>.85?'#d9603c':'#d9a441';
      ctx.fillRect(cx-w/2,topY+hb+1*iz,w*s.supp,2.5*iz);
    }
  }
  // 兵种徽标：一个字就能分清是哪种小队
  if(cam.z>=1.25||s.sel){
    const bw=13*iz, bh2=13*iz, byy=topY-bh2-3*iz;
    ctx.fillStyle='rgba(10,13,7,.85)';
    ctx.fillRect(cx-bw/2,byy,bw,bh2);
    ctx.strokeStyle=s.sel?'#9fdcff':TC[s.team];ctx.lineWidth=1*iz;
    ctx.strokeRect(cx-bw/2,byy,bw,bh2);
    ctx.fillStyle=TC[s.team];
    ctx.font='700 '+(9.5*iz).toFixed(2)+'px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(s.def.short,cx,byy+bh2*.55);
    ctx.textBaseline='alphabetic';
  }
  let tag=null;
  if(gar)tag='驻守';
  else if(s.retreat)tag='撤退';
  else if(s.def.setup&&!isDeployed(s)&&s.target)tag='架设…';
  else if(s.supp>.85)tag='钉扎';
  else if(inCover(s)&&s.target)tag='掩体';
  if(tag){
    ctx.fillStyle=tag==='钉扎'?'#d9603c':(tag==='掩体'||tag==='驻守'?'#7fc98a':'#d9a441');
    ctx.font=(9.5*iz).toFixed(2)+'px ui-monospace,monospace';ctx.textAlign='center';
    ctx.fillText(tag,cx,topY-18*iz);
  }
}
function drawInfantry(s,rx,ry,bh,alpha){
  const pose=(s.supp>.4||(!s.moving&&inCover(s)))?'crouch':'stand';
  const img=ASSETS.soldier[s.team+pose+s.def.id]||ASSETS.soldier[s.team+pose+'rifle'];
  const sc=0.46;
  const w=img.width*sc, h=img.height*sc;
  // 按屏幕 y 排序队内成员
  const ms=[];
  for(const m of s.members){if(!m.alive)continue;
    const ox=lerp(m.pox,m.ox,alpha), oy=lerp(m.poy,m.oy,alpha);
    ms.push({m,ox,oy});}
  ms.sort((a,b)=>a.oy-b.oy);
  for(const e of ms){
    const wx=rx+e.ox, wy=ry+e.oy;
    const gh=hAt(wx,wy);
    const bob=s.moving?Math.abs(Math.sin(s.bob*3+e.m.ph))*1.6:0;
    const py=projY(wy,gh)+2;
    ellShadow(ctx,wx,wy,6.2,pose==='crouch'?9:15,.34);
    if(s.sel){
      ctx.strokeStyle='#9fdcff';ctx.lineWidth=1.3/cam.z;ctx.globalAlpha=.9;
      ctx.beginPath();ctx.ellipse(wx,projY(wy,gh)+1,8.5,8.5*TILT,0,0,6.284);ctx.stroke();
      ctx.globalAlpha=1;
    }
    ctx.drawImage(img, wx-w/2, py-h-bob, w, h);

  }
  if(s.def.gunner&&isDeployed(s)&&ms.length){
    const e=ms[0], wx=rx+e.ox, wy=ry+e.oy, gh=hAt(wx,wy);
    const gy=projY(wy,gh)-9;
    ctx.strokeStyle='#191d12';ctx.lineWidth=3.2;
    ctx.beginPath();ctx.moveTo(wx,gy);
    ctx.lineTo(wx+Math.cos(s.facing)*17,gy+Math.sin(s.facing)*17*TILT);ctx.stroke();
    ctx.fillStyle='#2a2f1e';
    ctx.beginPath();ctx.ellipse(wx,gy+2,6,3,0,0,6.284);ctx.fill();
  }
  if(s.def.indirect&&isDeployed(s)&&ms.length){
    const e=ms[0], wx=rx+e.ox, wy=ry+e.oy, gh=hAt(wx,wy);
    const gy=projY(wy,gh)-6;
    ctx.strokeStyle='#191d12';ctx.lineWidth=3.6;
    ctx.beginPath();ctx.moveTo(wx,gy);
    ctx.lineTo(wx+Math.cos(s.facing)*9,gy-15);ctx.stroke();
  }
}
function drawVehicle(s,rx,ry,bh){
  const tc=TEAMC[s.team];
  const body=mix([64,70,50],tc,.16);          // 车体保持军绿，只微微带队伍色
  const mark=sh(tc,1.05);
  if(s.def.id==='tank'){
    boxShadow(ctx,rx,ry,50,30,17,s.facing,bh);
    box3d(ctx,rx,ry,50,32,8,s.facing,[40,42,32],[30,32,25],bh);      // 履带
    const hull=box3d(ctx,rx,ry,45,25,13,s.facing,mix(body,[255,255,255],.16),body,bh+7);
    box3d(ctx,rx-Math.cos(s.facing)*3,ry-Math.sin(s.facing)*3,22,19,11,s.facing,
      mix(body,[255,255,255],.30),mix(body,[0,0,0],.12),bh+20);      // 炮塔
    // 队伍识别条：车体侧面一道色带，远看就能分敌我
    ctx.fillStyle=mark;
    const mw=26, my=projY(ry+9,bh+9);
    ctx.fillRect(rx-mw/2,my,mw,4);
    const gy=projY(ry,bh+26);
    ctx.strokeStyle='#1c2016';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(rx+Math.cos(s.facing)*8,gy+Math.sin(s.facing)*8*TILT);
    ctx.lineTo(rx+Math.cos(s.facing)*40,gy+Math.sin(s.facing)*40*TILT);ctx.stroke();
    ctx.strokeStyle='#2c3222';ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(rx+Math.cos(s.facing)*36,gy+Math.sin(s.facing)*36*TILT);
    ctx.lineTo(rx+Math.cos(s.facing)*41,gy+Math.sin(s.facing)*41*TILT);ctx.stroke();
    return;
  }
  boxShadow(ctx,rx,ry,34,20,13,s.facing,bh);
  // 履带
  box3d(ctx,rx,ry,34,22,6,s.facing,[42,44,34],[34,36,28],bh);
  // 车体
  box3d(ctx,rx,ry,30,17,11,s.facing,mix(body,[255,255,255],.18),body,bh+5);
  ctx.fillStyle=mark;ctx.fillRect(rx-9,projY(ry+7,bh+7),18,3.5);
  // 炮塔
  box3d(ctx,rx-Math.cos(s.facing)*2,ry-Math.sin(s.facing)*2,13,12,8,s.facing,
    mix(body,[255,255,255],.3),mix(body,[0,0,0],.1),bh+16);
  // 炮管
  const gy=projY(ry,bh+20);
  ctx.strokeStyle='#20241a';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(rx+Math.cos(s.facing)*4,gy+Math.sin(s.facing)*4*TILT);
  ctx.lineTo(rx+Math.cos(s.facing)*23,gy+Math.sin(s.facing)*23*TILT);ctx.stroke();
}

function drawFX(alpha){
  // 尘土
  for(const d of FX.dust){
    const a=(1-d.t/d.life)*.3;if(a<=0)continue;
    ctx.globalAlpha=a;ctx.fillStyle='#8a7f5e';
    ctx.beginPath();ctx.ellipse(d.x,projY(d.y,d.h),d.r*(1+d.t*1.6),d.r*(1+d.t*1.6)*.7,0,0,6.284);ctx.fill();
  }
  // 曳光
  for(const t of FX.tracers){
    const a=1-t.t/.09;if(a<=0)continue;
    const h1=13, h2=11;
    ctx.globalAlpha=a*.92;
    ctx.strokeStyle=t.team===myTeam?'#cfeaff':'#ffd3a6';ctx.lineWidth=t.hit?1.5:1;
    ctx.beginPath();
    ctx.moveTo(t.x1,projY(t.y1,hAt(t.x1,t.y1)+h1));
    ctx.lineTo(t.x2,projY(t.y2,hAt(t.x2,t.y2)+h2));ctx.stroke();
    if(t.hit){ctx.globalAlpha=a;ctx.fillStyle='#ffeec0';
      ctx.beginPath();ctx.arc(t.x2,projY(t.y2,hAt(t.x2,t.y2)+h2),2,0,6.284);ctx.fill();}
  }
  for(const f of FX.flash){
    const a=1-f.t/.07;if(a<=0)continue;
    ctx.globalAlpha=a*.85;ctx.fillStyle='#ffe2a8';
    ctx.beginPath();ctx.arc(f.x,projY(f.y,hAt(f.x,f.y)+13),4.5,0,6.284);ctx.fill();
  }
  for(const s of FX.smoke){
    const a=(1-s.t/s.life)*.3;if(a<=0)continue;
    ctx.globalAlpha=a;ctx.fillStyle='#7a7d68';
    const r=s.r*(1+s.t*1.05);
    ctx.beginPath();ctx.ellipse(s.x,projY(s.y,s.h),r,r*.82,0,0,6.284);ctx.fill();
  }
  for(const b of FX.boom){
    const k=b.t/.34;if(k>=1)continue;
    const by=projY(b.y,hAt(b.x,b.y)+14);
    ctx.globalAlpha=(1-k)*.92;ctx.fillStyle='#ffce6a';
    ctx.beginPath();ctx.ellipse(b.x,by,b.r*(.3+k*.85),b.r*(.3+k*.85)*.8,0,0,6.284);ctx.fill();
    ctx.globalAlpha=(1-k)*.5;ctx.strokeStyle='#fff0c4';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(b.x,projY(b.y,hAt(b.x,b.y)),b.r*(.5+k*1.4),b.r*(.5+k*1.4)*TILT,0,0,6.284);ctx.stroke();
  }
  for(const p of FX.ping){
    const k=p.t/.5;if(k>=1)continue;
    const py=projY(p.y,hAt(p.x,p.y));
    ctx.globalAlpha=1-k;ctx.strokeStyle=p.atk?'#d9603c':'#9fdcff';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(p.x,py,6+k*18,(6+k*18)*TILT,0,0,6.284);ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function stepFX(dt){
  for(let i=FX.tracers.length-1;i>=0;i--){FX.tracers[i].t+=dt;if(FX.tracers[i].t>.09)FX.tracers.splice(i,1);}
  for(let i=FX.flash.length-1;i>=0;i--){FX.flash[i].t+=dt;if(FX.flash[i].t>.07)FX.flash.splice(i,1);}
  for(let i=FX.boom.length-1;i>=0;i--){FX.boom[i].t+=dt;if(FX.boom[i].t>.34)FX.boom.splice(i,1);}
  for(let i=FX.ping.length-1;i>=0;i--){FX.ping[i].t+=dt;if(FX.ping[i].t>.5)FX.ping.splice(i,1);}
  for(const arr of [FX.smoke,FX.dust])
    for(let i=arr.length-1;i>=0;i--){const s=arr[i];s.t+=dt;
      s.x+=s.vx*dt;s.y+=s.vy*dt;s.h+=(s.vh||0)*dt;s.vx*=.96;s.vy*=.96;
      if(s.vh)s.vh*=.95;
      if(s.t>s.life)arr.splice(i,1);}
  if(FX.decal.length>280)FX.decal.splice(0,FX.decal.length-280);
}

function renderMini(){
  if(!G||!miniTer)return;
  const w=mcv.width,h=mcv.height;
  mctx.clearRect(0,0,w,h);
  mctx.imageSmoothingEnabled=false;
  mctx.drawImage(miniTer,0,0,GW,GH,0,0,w,h);
  const sx=w/WW, sy=h/WH;
  const vis=G.vis[myTeam];
  if(vis)for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    const v=vis[ti(x,y)];
    if(v&V_IDENT)continue;                       // 完全看得清：不盖迷雾
    mctx.globalAlpha=(v&V_DETECT)?.22:((v&V_SEEN)?.42:.88);
    mctx.fillStyle='#080a05';
    mctx.fillRect(x*TS*sx,y*TS*sy,TS*sx+1,TS*sy+1);
  }
  mctx.globalAlpha=1;
  for(const p of G.pts){
    mctx.fillStyle=p.owner<0?'#8f9480':TC[p.owner%TC.length];
    mctx.fillRect(p.x*sx-3,p.y*sy-3,6,6);
  }
  for(const b of G.bldgs){
    if(b.hp<=0)continue;
    mctx.strokeStyle=TC[b.team];mctx.lineWidth=1;
    mctx.strokeRect(b.tx*TS*sx,b.ty*TS*sy,b.w*TS*sx,b.h*TS*sy);
  }
  for(const s of G.squads){
    if(!s.alive)continue;
    if(s.team!==myTeam&&!detectOK(s.x,s.y))continue;   // 小地图上探测到就显示
    mctx.fillStyle=s.sel?'#ffffff':TC[s.team];
    const r=s.def.vehicle?2.4:1.8;
    mctx.fillRect(s.x*sx-r,s.y*sy-r,r*2,r*2);
  }
  const vw=cv.width/cam.z*sx, vh=cv.height/cam.z*sy/TILT;
  mctx.strokeStyle='rgba(228,230,214,.6)';mctx.lineWidth=1;
  mctx.strokeRect(cam.x*sx-vw/2,cam.y*sy-vh/2,vw,vh);
}
