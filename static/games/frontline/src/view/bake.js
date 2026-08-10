/* =============================================================================
   FRONTLINE — view/bake.js
   地面烘焙：单张与分块两种模式共用一份绘制逻辑。
   ============================================================================= */
/* ---------------- 地面烘焙 ---------------- */
let groundCv=null;
const GSS=2;   // 地面烘焙超采样倍率（放大时保持锐利）
const TILEG=16;              // 分块模式：每块覆盖多少格
const TILE_BUDGET=48;        // 最多同时驻留多少块（约 48×1.9MB ≈ 91MB）
const TILE_THRESHOLD=20000;  // 超过多少格启用分块（80×56=4480 走单张）
let tiles=null, tileMode=false, tilesX=0, tilesY=0;
const GRASS=[56,58,40], GRASS2=[92,88,58], ROUGHC=[92,86,56], ROADC=[118,104,74], DIRT=[98,86,62], DRYC=[126,116,80];
/* 材质噪声与光照参数：全图共享，保证 tile 之间接缝处连续 */
let MATN=null;
const LIGHT=[-0.50,-0.60,0.62], LX=-0.62, LY=-0.78;
function initMat(){
  const mA=smoothNoise(9), mB=smoothNoise(21), mC=smoothNoise(43);
  MATN=(u,v)=>clamp(mA(u,v)*.56+mB(u,v)*.29+mC(u,v)*.15,0,1);
}
const DETAIL_DENSITY=17000/(80*56);        // 每格细节图元数，随地图面积自动缩放

/* 把 [gx0,gx1)×[gy0,gy1) 这块格区域画到 x 上。
   ox/oy：canvas 内坐标 = 世界坐标 - o。单张与分块两种模式共用这一份绘制逻辑。 */
function bakeRegion(x,gx0,gy0,gx1,gy1,ox,oy,seed){
  const R=mulberry32(seed>>>0);            // 局部 rng：每块独立且可重现
  const mat=MATN, L=LIGHT;
  const py=(wy,h)=>projY(wy,h)-oy;
  const px=wx=>wx-ox;

  // --- 地表 ---
  for(let ty=gy0;ty<gy1;ty++)for(let tx=gx0;tx<gx1;tx++){
    const i=ti(tx,ty);
    const h00=hgt[ty*(GW+1)+tx], h10=hgt[ty*(GW+1)+tx+1];
    const h01=hgt[(ty+1)*(GW+1)+tx], h11=hgt[(ty+1)*(GW+1)+tx+1];
    const dhx=((h10+h11)-(h00+h01))/2/TS, dhy=((h01+h11)-(h00+h10))/2/TS;
    let nx=-dhx, ny=-dhy, nz=1;
    const nl=Math.hypot(nx,ny,nz);nx/=nl;ny/=nl;nz/=nl;
    const m=mat((tx+.5)/GW,(ty+.5)/GH);
    const hh=(h00+h11)/2/34;                       // 高处偏干、低处偏湿
    let col;
    if(terrain[i]===T_BLOCK)col=[46,46,36];
    else{
      col=mix(GRASS,GRASS2,clamp(m*1.35-.12,0,1));
      col=mix(col,DIRT,clamp((m-.62)*2.2,0,.85));  // 裸土斑块
      col=mix(col,DRYC,clamp(hh*.75,0,.5));
    }
    x.fillStyle=sh(col,1.30);
    x.beginPath();
    const skirt=1;
    x.moveTo(px(tx*TS),       py(ty*TS,h00));
    x.lineTo(px((tx+1)*TS+1), py(ty*TS,h10));
    x.lineTo(px((tx+1)*TS+1), py((ty+1)*TS,h11)+skirt);
    x.lineTo(px(tx*TS),       py((ty+1)*TS,h01)+skirt);
    x.closePath();x.fill();
  }

  // --- 土路：沿路径描边，贴合地形高度 ---
  const stroke=(path,w,col,alpha)=>{
    x.globalAlpha=alpha;x.strokeStyle=col;x.lineWidth=w;
    x.lineCap='round';x.lineJoin='round';
    x.beginPath();
    for(let i=0;i<path.length-1;i++){
      const a=path[i],b=path[i+1],seg=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*1.4);
      for(let k=0;k<=seg;k++){
        const t=k/seg, wx=lerp(a[0],b[0],t)*TS+TS/2, wy=lerp(a[1],b[1],t)*TS+TS/2;
        const Y=py(wy,hAt(wx,wy));
        if(i===0&&k===0)x.moveTo(px(wx),Y);else x.lineTo(px(wx),Y);
      }
    }
    x.stroke();x.globalAlpha=1;
  };
  for(const pth of roadPaths){
    stroke(pth,34,sh(mix(ROADC,[0,0,0],.42),1),.5);
    stroke(pth,26,sh(ROADC,.95),.95);
    stroke(pth,9,sh(mix(ROADC,[255,255,255],.14),1),.35);
  }

  // --- 细节层：草簇 / 石子 / 车辙，彻底打散格子边界 ---
  // 数量按区域面积算，大地图密度不会被稀释；边界外扩一格避免接缝处出现空白带
  const dn=Math.round(DETAIL_DENSITY*(gx1-gx0)*(gy1-gy0));
  const dx0=Math.max(0,gx0-1)*TS, dx1=Math.min(GW,gx1+1)*TS;
  const dy0=Math.max(0,gy0-1)*TS, dy1=Math.min(GH,gy1+1)*TS;
  for(let i=0;i<dn;i++){
    const wx=dx0+R()*(dx1-dx0), wy=dy0+R()*(dy1-dy0);
    const tx=clamp((wx/TS)|0,0,GW-1), ty=clamp((wy/TS)|0,0,GH-1), id=ti(tx,ty);
    if(terrain[id]===T_BLOCK)continue;
    const Y=py(wy,hAt(wx,wy)), X=px(wx);
    const m=mat(wx/WW,wy/WH), onRoad=roadM[id]>.3;
    const r=R();
    if(onRoad){
      if(r<.5)continue;
      x.fillStyle=sh(ROADC,.72+R()*.5);
      x.beginPath();x.ellipse(X,Y,.9+R()*1.6,.7+R()*1.1,0,0,6.284);x.fill();
    }else if(r<.42){
      // 草簇：两三根短竖线
      const g=mix(GRASS2,[126,132,74],R()*.55);
      x.strokeStyle=sh(g,.7+R()*.7);x.lineWidth=1;
      x.beginPath();
      for(let k=0;k<2+((R()*2)|0);k++){
        const oxx=(R()-.5)*4;
        x.moveTo(X+oxx,Y);x.lineTo(X+oxx+(R()-.5)*2.2,Y-1.6-R()*2.4);
      }
      x.stroke();
    }else if(r<.72){
      x.fillStyle=sh(mix(GRASS,DIRT,m),.62+R()*.66);
      x.beginPath();x.ellipse(X,Y,1.4+R()*3.2,(1.4+R()*3.2)*.62,0,0,6.284);x.fill();
    }else if(r<.78){
      x.fillStyle=sh([120,118,104],.6+R()*.7);
      x.beginPath();x.ellipse(X,Y,.8+R()*1.2,.6+R()*.9,0,0,6.284);x.fill();
    }
  }

  // --- 平滑光照层（multiply）：明暗连续，不再有逐格拼接边 ---
  const LR=3, lgw=gx1-gx0, lgh=gy1-gy0, lw=lgw*LR, lh=lgh*LR;
  const lc=mkc(lw,lh), lctx=lc.getContext('2d');
  const limg=lctx.createImageData(lw,lh), ld=limg.data;
  for(let j=0;j<lh;j++)for(let i=0;i<lw;i++){
    const wx=(gx0+(i+.5)/LR)*TS, wy=(gy0+(j+.5)/LR)*TS;
    const hHere=hAt(wx,wy);
    const e=TS*0.7;
    const dhx=(hAt(wx+e,wy)-hAt(wx-e,wy))/(2*e), dhy=(hAt(wx,wy+e)-hAt(wx,wy-e))/(2*e);
    let nx2=-dhx, ny2=-dhy, nz2=1;
    const nl2=Math.hypot(nx2,ny2,nz2);nx2/=nl2;ny2/=nl2;nz2/=nl2;
    const lam=clamp(nx2*L[0]+ny2*L[1]+nz2*L[2],0,1);
    const slope=clamp((hHere-hAt(clamp(wx+LX*40,0,WW),clamp(wy+LY*40,0,WH)))/10,-1,1);
    const shade=0.66+0.36*lam+slope*0.34+clamp(hHere/34,0,1)*0.20;
    const v=clamp(shade/1.30,0,1)*255, k=(j*lw+i)*4;
    ld[k]=ld[k+1]=ld[k+2]=v;ld[k+3]=255;
  }
  lctx.putImageData(limg,0,0);
  x.globalCompositeOperation='multiply';
  x.imageSmoothingEnabled=true;
  // 光照层覆盖本区域的投影范围：顶部要多留一截给高度抬升
  const lyTop=projY(gy0*TS,MAPCFG.height.amplitude)-oy;
  const lyBot=projY(gy1*TS,0)-oy+46;
  x.drawImage(lc,0,0,lw,lh,px(gx0*TS),lyTop,lgw*TS,lyBot-lyTop);
  x.globalCompositeOperation='source-over';

  // --- 颗粒 ---
  x.globalCompositeOperation='overlay';
  x.globalAlpha=.42;x.fillStyle=x.createPattern(ASSETS.grain,'repeat');
  x.fillRect(px(gx0*TS),lyTop,lgw*TS,lyBot-lyTop);
  x.globalAlpha=1;x.globalCompositeOperation='source-over';
}

/* 小地图底图：全图一次性，GW×GH 像素，不需要分块 */
function buildMiniTer(){
  miniTer=mkc(GW,GH);
  const mc=miniTer.getContext('2d');
  for(let y=0;y<GH;y++)for(let x2=0;x2<GW;x2++){
    const i=ti(x2,y);let col;
    const m=MATN((x2+.5)/GW,(y+.5)/GH);
    if(terrain[i]===T_BLOCK)col=[46,46,36];
    else col=mix(mix(GRASS,GRASS2,m),DIRT,clamp((m-.62)*2.2,0,.8));
    if(roadM[i]>.1)col=mix(col,ROADC,.75);
    mc.fillStyle=sh(col,.66+hgt[y*(GW+1)+x2]/26*.62);
    mc.fillRect(x2,y,1,1);
  }
}

/* ---------------- 地面烘焙：单张 / 分块两种模式 ----------------
   320×224 时单张要 15360×10752 ≈ 6.6 亿像素 ≈ 2.6GB，必须分块。
   小地图仍走单张路径（已验证），只有超过阈值才切分块。 */
function bakeGround(){
  initMat();
  buildMiniTer();
  tiles=null;groundCv=null;
  tileMode=GW*GH>TILE_THRESHOLD;
  if(!tileMode){
    groundCv=mkc(WW*GSS,(Math.ceil(WHP)+YTOP+40)*GSS);
    const x=groundCv.getContext('2d');
    x.scale(GSS,GSS);
    x.fillStyle='#0d1008';x.fillRect(0,0,groundCv.width/GSS,groundCv.height/GSS);
    bakeRegion(x,0,0,GW,GH,0,-YTOP,(G?G.seed:0)^0x9e37);
    return;
  }
  tilesX=Math.ceil(GW/TILEG);tilesY=Math.ceil(GH/TILEG);
  tiles=new Map();
  console.info('[FRONTLINE] 地图 '+GW+'×'+GH+'，启用分块烘焙 '+tilesX+'×'+tilesY+
               ' 块，驻留上限 '+TILE_BUDGET+' 块');
}
/* 单块的世界原点与尺寸 */
function tileGeom(tx,ty){
  const gx0=tx*TILEG, gy0=ty*TILEG;
  const gx1=Math.min(GW,gx0+TILEG), gy1=Math.min(GH,gy0+TILEG);
  const amp=MAPCFG.height.amplitude;
  const ox=gx0*TS;
  const oy=projY(gy0*TS,amp)-8;                    // 顶部留出高度抬升的余量
  const w=(gx1-gx0)*TS;
  const h=(projY(gy1*TS,0)+56)-oy;
  return{gx0,gy0,gx1,gy1,ox,oy,w,h};
}
function bakeTile(tx,ty){
  const g=tileGeom(tx,ty);
  const cv2=mkc(Math.ceil(g.w*GSS),Math.ceil(g.h*GSS));
  const x=cv2.getContext('2d');
  x.scale(GSS,GSS);
  bakeRegion(x,g.gx0,g.gy0,g.gx1,g.gy1,g.ox,g.oy,((G?G.seed:0)^(ty*8191+tx*131))>>>0);
  return{cv:cv2,ox:g.ox,oy:g.oy,w:g.w,h:g.h,use:0};
}
/* LRU：超出驻留上限就丢最久没用的，下次进视野再烘 */
function getTile(tx,ty){
  const k=ty*tilesX+tx;
  let t=tiles.get(k);
  if(t){tiles.delete(k);tiles.set(k,t);return t;}
  t=bakeTile(tx,ty);
  tiles.set(k,t);
  while(tiles.size>TILE_BUDGET)tiles.delete(tiles.keys().next().value);
  return t;
}
