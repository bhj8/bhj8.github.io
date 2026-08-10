/* =============================================================================
   FRONTLINE — core/mapgen.js
   地图生成：地形、建筑、掩体、高度场、道路、静态物件。
   ============================================================================= */
/* ---------------- 地图生成（旋转对称） ----------------
   所有数量与尺寸都来自 MAPCFG。对称的铁律：任何写入都必须"两侧都放得下才放"，
   否则一侧成功另一侧被占，两边密度就不一样了——历史上踩过的坑。 */
/* 据点格坐标（含镜像）。必须排序：生成顺序决定随机数消耗顺序，
   顺序一变整张地图就变了（对称性不受影响，但地图内容会变）。 */
function allPointCells(){
  const out=[];
  for(const p of MAPCFG.points){
    out.push([p.tx,p.ty]);
    const m=mirrorPt(p.tx,p.ty);
    if(m[0]!==p.tx||m[1]!==p.ty)out.push(m);
  }
  out.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  return out;
}
function genMap(){
  const C=MAPCFG;
  terrain.fill(T_GROUND);coverAt.fill(-1);covers=[];bldRects=[];
  for(let i=0;i<GW*GH;i++)noiseAt[i]=(rnd()*255)|0;
  const mir=(x,y)=>[GW-1-x,GH-1-y];
  const ri=(a)=>a[0]+((rnd()*(a[1]-a[0]+1))|0);      // 整数区间 [a,b]
  const rf=(a)=>a[0]+rnd()*(a[1]-a[0]);              // 浮点区间

  // 保护区：基地与据点周围不生成随机建筑。连同镜像一起排除，两侧完全等价
  const keep=[];
  const HS=C.hqSize;
  for(const q of C.hqs){
    keep.push([q.tx,q.ty,C.protect.hq]);
    const m=mirrorRect(q.tx,q.ty,HS.w,HS.h);keep.push([m[0],m[1],C.protect.hq]);
  }
  for(const c of allPointCells())keep.push([c[0],c[1],C.protect.point]);
  const near=(x,y)=>keep.some(k=>Math.abs(x-k[0])<k[2]&&Math.abs(y-k[1])<k[2]);

  for(let i=0;i<C.roughPatches.count;i++){
    const cx=(rnd()*GW)|0, cy=(rnd()*GH)|0, r=ri(C.roughPatches.radius);
    for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){
      if(x<0||y<0||x>=GW||y>=GH)continue;
      if((x-cx)*(x-cx)+(y-cy)*(y-cy)>r*r)continue;
      terrain[ti(x,y)]=T_ROUGH;const m=mir(x,y);terrain[ti(m[0],m[1])]=T_ROUGH;
    }
  }
  const B=C.buildings;
  for(let i=0;i<B.count;i++){
    const w=ri(B.w), h=ri(B.h);
    const x0=2+((rnd()*(GW-6))|0), y0=2+((rnd()*(GH-6))|0);
    let ok=true;
    if(B.keepClearOfPoints)
      for(let y=y0-1;y<=y0+h;y++)for(let x=x0-1;x<=x0+w;x++)if(near(x,y))ok=false;
    if(!ok)continue;
    const m=mir(x0+w-1,y0+h-1);
    if(!fits(x0,y0,w,h)||!fits(m[0],m[1],w,h))continue;   // 两侧都放得下才放
    const sd=rnd();
    stampB(x0,y0,w,h,sd);stampB(m[0],m[1],w,h,sd);
  }
  function fits(x0,y0,w,h){return !(x0<1||y0<1||x0+w>=GW-1||y0+h>=GH-1);}
  /* sd 由调用方传入并在镜像对之间共享。房屋的 seed 决定外观**和材质**，
     而材质决定这栋楼有多抗打——镜像两侧各摇一次的话，同一个位置一边是
     木棚一边是混凝土，那是实打实的地图不公平。 */
  function stampB(x0,y0,w,h,sd){
    if(!fits(x0,y0,w,h))return;
    for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)terrain[ti(x,y)]=T_BLOCK;
    bldRects.push({x:x0,y:y0,w,h,seed:sd===undefined?rnd():sd});
  }
  // 据点旁的可进驻房子：据点本来就该有值得抢的建筑
  const PH=C.pointHouses;
  for(const idx of PH.at){
    const p=C.points[idx];if(!p)continue;
    const bw=ri(PH.w), bh2=PH.h, ang=rnd()*Math.PI*2;
    const x0=Math.round(p.tx+Math.cos(ang)*PH.dist)-1, y0=Math.round(p.ty+Math.sin(ang)*PH.dist)-1;
    const m=mir(x0+bw-1,y0+bh2-1);
    if(fits(x0,y0,bw,bh2)&&fits(m[0],m[1],bw,bh2)){
      const sd=rnd();
      stampB(x0,y0,bw,bh2,sd);stampB(m[0],m[1],bw,bh2,sd);
    }
  }
  // 据点周围的掩体
  const CV=C.covers;
  for(const c of allPointCells()){
    const n=ri(CV.perPoint);
    for(let k=0;k<n;k++){
      const a=rnd()*Math.PI*2, r=rf(CV.radius);
      const tx=Math.round(c[0]+Math.cos(a)*r), ty=Math.round(c[1]+Math.sin(a)*r);
      addCover(tx,ty,Math.cos(a),Math.sin(a),rnd()<CV.heavyChance);
      addCover(Math.round(c[0]+Math.cos(a)*r+Math.cos(a+1.5)),
               Math.round(c[1]+Math.sin(a)*r+Math.sin(a+1.5)),Math.cos(a),Math.sin(a),rnd()<CV.heavyChance);
    }
  }
  // 野外散落的掩体线
  for(let i=0;i<CV.strayLines;i++){
    const x=2+((rnd()*(GW-4))|0), y=2+((rnd()*(GH-4))|0), a=rnd()*Math.PI*2;
    const len=ri(CV.strayLen), tx=Math.cos(a+Math.PI/2), ty=Math.sin(a+Math.PI/2);
    for(let k=0;k<len;k++)addCover(Math.round(x+tx*k),Math.round(y+ty*k),Math.cos(a),Math.sin(a),false);
  }
}
function addCover(x,y,nx,ny,heavy){
  if(x<1||y<1||x>=GW-1||y>=GH-1)return;
  const L=Math.hypot(nx,ny)||1;nx/=L;ny/=L;
  const mx=GW-1-x, my=GH-1-y;
  if(!free(x,y)||!free(mx,my))return;     // 两侧都放得下才放，否则两边掩体密度会不一样
  place(x,y,nx,ny,heavy);place(mx,my,-nx,-ny,heavy);
  function free(px,py){
    if(px<1||py<1||px>=GW-1||py>=GH-1)return false;
    const i=ti(px,py);return terrain[i]!==T_BLOCK&&coverAt[i]<0;
  }
  function place(px,py,ax,ay,hv){
    const i=ti(px,py);
    coverAt[i]=covers.length;
    covers.push({x:px*TS+TS/2,y:py*TS+TS/2,nx:ax,ny:ay,heavy:hv,seed:rnd()});
  }
}

/* ---------------- 高度场 / 道路 / 静态物件 ---------------- */
function smoothNoise(cells){
  const n=cells+1, g=new Float32Array(n*n);
  for(let i=0;i<n*n;i++)g[i]=rnd();
  const sm=t=>t*t*(3-2*t);
  return (u,v)=>{
    const fx=clamp(u,0,.9999)*cells, fy=clamp(v,0,.9999)*cells;
    const x0=fx|0, y0=fy|0, tx=sm(fx-x0), ty=sm(fy-y0);
    const a=g[y0*n+x0],b=g[y0*n+x0+1],c=g[(y0+1)*n+x0],d=g[(y0+1)*n+x0+1];
    return lerp(lerp(a,b,tx),lerp(c,d,tx),ty);
  };
}
function buildHeights(){
  const oc=MAPCFG.height.octaves.map(o=>({f:smoothNoise(o[0]),w:o[1]}));
  let wsum=0;for(const o of oc)wsum+=o.w;
  for(let y=0;y<=GH;y++)for(let x=0;x<=GW;x++){
    const u=x/GW, v=y/GH;
    let h=0;for(const o of oc)h+=o.f(u,v)*o.w;
    hgt[y*(GW+1)+x]=(h/wsum)*MAPCFG.height.amplitude;
  }
  const flat=[];
  for(const r of bldRects)flat.push([r.x-1,r.y-1,r.w+2,r.h+2]);
  for(const b of G.bldgs)flat.push([b.tx-1,b.ty-1,b.w+2,b.h+2]);
  for(const p of G.pts)flat.push([p.tx-4,p.ty-4,9,9]);
  for(const f of flat){
    let sum=0,n=0;
    for(let y=f[1];y<=f[1]+f[3];y++)for(let x=f[0];x<=f[0]+f[2];x++){
      if(x<0||y<0||x>GW||y>GH)continue;sum+=hgt[y*(GW+1)+x];n++;}
    if(!n)continue;const av=sum/n;
    for(let y=f[1];y<=f[1]+f[3];y++)for(let x=f[0];x<=f[0]+f[2];x++){
      if(x<0||y<0||x>GW||y>GH)continue;
      const i=y*(GW+1)+x;
      const ex=Math.max(0,Math.max(f[0]-x,x-(f[0]+f[2])),Math.max(f[1]-y,y-(f[1]+f[3])));
      hgt[i]=lerp(av,hgt[i],clamp(ex/2,0,1));
    }
  }
}
/* 道路只写入 roadM（影响树木放置与渲染），不改 terrain，因此不进 Sim。 */
function buildRoads(){
  const c=mkc(GW,GH), x=c.getContext('2d');
  x.fillStyle='#000';x.fillRect(0,0,GW,GH);
  x.strokeStyle='#fff';x.lineCap='round';x.lineJoin='round';
  const W=MAPCFG.roads.width;
  let main;
  if(MAPCFG.roads.autoConnectPoints){
    // 主路：基地 → 各据点（按 x 排序）→ 对面基地。据点变了路网自动跟上
    const hq=G&&G.bldgs.length?G.bldgs:null;
    const cells=allPointCells().slice().sort((a,b)=>a[0]-b[0]);
    main=[];
    if(hq)main.push([hq[0].tx+3,hq[0].ty+2]);
    for(const c2 of cells)main.push(c2);
    if(hq&&hq.length>1)main.push([hq[1].tx+3,hq[1].ty+2]);
  }else main=MAPCFG.roads.nodes;
  roadPaths=[main];
  x.lineWidth=W[0];
  x.beginPath();x.moveTo(main[0][0],main[0][1]);
  for(let i=1;i<main.length;i++)x.lineTo(main[i][0],main[i][1]);
  x.stroke();
  // 支路：把据点两两斜向串起来，让路网不是一条线
  const cs=allPointCells().slice().sort((a,b)=>a[0]-b[0]);
  if(cs.length>=3){
    x.lineWidth=W[1];
    const mid=cs[(cs.length/2)|0];
    for(let i=0;i<cs.length;i++){
      if(cs[i]===mid)continue;
      x.beginPath();x.moveTo(cs[i][0],cs[i][1]);x.lineTo(mid[0],mid[1]);x.stroke();
      roadPaths.push([cs[i],mid]);
    }
  }
  const d=x.getImageData(0,0,GW,GH).data;
  for(let i=0;i<GW*GH;i++)roadM[i]=terrain[i]===T_BLOCK?0:d[i*4]/255;
}
function buildProps(){
  props=[];
  for(let hi=0;hi<bldRects.length;hi++){
    const r=bldRects[hi], big=r.w*r.h;
    props.push({k:'bld',ho:G.houses[hi],cx:(r.x+r.w/2)*TS,cy:(r.y+r.h/2)*TS,
      w:r.w*TS-4,d:r.h*TS-4,h:40+Math.min(26,big*3.0)+r.seed*15,
      sy:(r.y+r.h)*TS,x0:r.x*TS,x1:(r.x+r.w)*TS,seed:r.seed});
  }
  for(const c of covers)props.push({k:'cov',c,cx:c.x,cy:c.y,sy:c.y+7,x0:c.x-16,x1:c.x+16});
  // 树 / 岩石
  const PR=MAPCFG.props;
  let tries=0;
  for(let n=0;n<PR.trees&&tries<PR.trees*20;tries++){
    const x=(rnd()*GW)|0, y=(rnd()*GH)|0, i=ti(x,y);
    if(terrain[i]===T_BLOCK||coverAt[i]>=0||roadM[i]>.25)continue;
    let ok=true;
    for(const p of G.pts)if(d2(x*TS,y*TS,p.x,p.y)<PR.treeClearPoint*PR.treeClearPoint)ok=false;
    for(const b of G.bldgs)if(d2(x*TS,y*TS,b.x,b.y)<PR.treeClearHQ*PR.treeClearHQ)ok=false;
    if(!ok)continue;
    const wx=x*TS+6+rnd()*12, wy=y*TS+6+rnd()*12;
    props.push({k:'tree',cx:wx,cy:wy,sy:wy,r:9+rnd()*6,h:26+rnd()*20,seed:rnd(),
      x0:wx-16,x1:wx+16});
    n++;
  }
  for(let n=0;n<PR.rocks&&tries<PR.trees*20+PR.rocks*70;tries++){
    const x=(rnd()*GW)|0, y=(rnd()*GH)|0, i=ti(x,y);
    if(terrain[i]===T_BLOCK||coverAt[i]>=0||roadM[i]>.3)continue;
    const wx=x*TS+6+rnd()*12, wy=y*TS+6+rnd()*12;
    props.push({k:'rock',cx:wx,cy:wy,sy:wy,w:7+rnd()*8,d:6+rnd()*6,h:4+rnd()*6,
      a:rnd()*3.14,seed:rnd(),x0:wx-14,x1:wx+14});
    n++;
  }
  props.sort((a,b)=>a.sy-b.sy);
  propRows=[];
  for(const p of props){
    const r=clamp((p.sy/TS)|0,0,GH-1);
    (propRows[r]=propRows[r]||[]).push(p);
  }
}
