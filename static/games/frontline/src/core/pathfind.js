/* =============================================================================
   FRONTLINE — core/pathfind.js
   流场寻路、视线判定、掩体计算。
   ============================================================================= */
/* ---------------- 流场寻路 ---------------- */
const DIRS=[[1,0,10],[-1,0,10],[0,1,10],[0,-1,10],[1,1,14],[1,-1,14],[-1,1,14],[-1,-1,14]];
function Heap(){this.a=[];}
Heap.prototype.push=function(k,v){const a=this.a;a.push({k,v});let i=a.length-1;
  while(i>0){const p=(i-1)>>1;if(a[p].k<=a[i].k)break;const t=a[p];a[p]=a[i];a[i]=t;i=p;}};
Heap.prototype.pop=function(){const a=this.a,top=a[0],last=a.pop();
  if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let s=i;
    if(l<a.length&&a[l].k<a[s].k)s=l;if(r<a.length&&a[r].k<a[s].k)s=r;
    if(s===i)break;const t=a[s];a[s]=a[i];a[i]=t;i=s;}}return top;};
function computeField(gx,gy){
  const dist=new Int32Array(GW*GH).fill(0x3ffffff), dir=new Int8Array(GW*GH).fill(-1);
  if(!passable(gx,gy)){
    let best=null,bd=1e9;
    for(let r=1;r<8&&!best;r++)for(let y=gy-r;y<=gy+r;y++)for(let x=gx-r;x<=gx+r;x++){
      if(!passable(x,y))continue;const dd=d2(x,y,gx,gy);if(dd<bd){bd=dd;best=[x,y];}}
    if(best){gx=best[0];gy=best[1];}else return{gx,gy,dist,dir};
  }
  const h=new Heap(),gi=ti(gx,gy);dist[gi]=0;h.push(0,gi);
  while(h.a.length){
    const n=h.pop(),ci=n.v;if(n.k>dist[ci])continue;
    const cx=ci%GW, cy=(ci/GW)|0;
    for(let d=0;d<8;d++){
      const D=DIRS[d],nx=cx+D[0],ny=cy+D[1];
      if(nx<0||ny<0||nx>=GW||ny>=GH||!passable(nx,ny))continue;
      if(D[2]===14&&(!passable(cx+D[0],cy)||!passable(cx,cy+D[1])))continue;
      const ni=ti(nx,ny),nd=dist[ci]+D[2]*tileMul(nx,ny);
      if(nd<dist[ni]){dist[ni]=nd;dir[ni]=d;h.push(nd,ni);}
    }
  }
  return{gx,gy,dist,dir};
}
/* 每 tick 最多新建一张流场。全图 Dijkstra 在 320×224 上约 12ms，
   若一 tick 内多个单位各要一张新图，尖峰会叠加成明显卡顿。
   预算用完就返回 null，调用方退化为直线趋近，下一 tick 再补算。 */
let fieldBudget=1;
const FIELD_CACHE=48;
function getField(gx,gy){
  const k=gy*GW+gx;let f=G.fields.get(k);
  if(f){G.fields.delete(k);G.fields.set(k,f);return f;}   // 触碰即刷新 LRU 次序
  if(fieldBudget<=0)return null;
  fieldBudget--;
  f=computeField(gx,gy);
  if(G.fields.size>=FIELD_CACHE)G.fields.delete(G.fields.keys().next().value);
  G.fields.set(k,f);
  return f;
}
function inHouse(h,tx,ty){return h&&!h.ruin&&tx>=h.tx&&ty>=h.ty&&tx<h.tx+h.w&&ty<h.ty+h.h;}
function los(x0,y0,x1,y1,hA,hB){
  let ax=(x0/TS)|0, ay=(y0/TS)|0;
  const bx=(x1/TS)|0, by=(y1/TS)|0;
  let dx=Math.abs(bx-ax), dy=Math.abs(by-ay);
  const sx=ax<bx?1:-1, sy=ay<by?1:-1;
  let err=dx-dy, guard=0;
  while(guard++<200){
    if(ax===bx&&ay===by)return true;
    const e2=2*err;
    if(e2>-dy){err-=dy;ax+=sx;}
    if(e2<dx){err+=dx;ay+=sy;}
    if(ax<0||ay<0||ax>=GW||ay>=GH)return false;
    if(terrain[ti(ax,ay)]===T_BLOCK&&!(ax===bx&&ay===by)){
      if(inHouse(hA,ax,ay)||inHouse(hB,ax,ay))continue;  // 驻守方的建筑不挡自己的射线
      return false;
    }
  }
  return true;
}
function coverFactor(s,m,fromX,fromY){
  if(s.house&&!s.house.ruin)return s.house.drDirect;   // 驻守建筑：稳定重掩体（每栋可配）
  if(s.def.armor>0)return 1;
  const wx=s.x+(m?m.ox:0), wy=s.y+(m?m.oy:0);
  const tx=(wx/TS)|0, ty=(wy/TS)|0;
  if(tx<0||ty<0||tx>=GW||ty>=GH)return 1;
  const ci=coverAt[ti(tx,ty)];if(ci<0)return 1;
  const c=covers[ci];
  let ax=fromX-wx, ay=fromY-wy;const L=Math.hypot(ax,ay)||1;ax/=L;ay/=L;
  if(ax*c.nx+ay*c.ny<.30)return 1;               // 被绕到侧后，掩体无效
  return c.heavy?0.46:0.66;
}
function inCover(s){
  if(s.house&&!s.house.ruin)return true;
  for(const m of s.members){
    if(!m.alive)continue;
    const tx=((s.x+m.ox)/TS)|0, ty=((s.y+m.oy)/TS)|0;
    if(tx>=0&&ty>=0&&tx<GW&&ty<GH&&coverAt[ti(tx,ty)]>=0)return true;
  }
  return false;}
// 就近找一处朝向威胁的掩体；返回世界坐标或 null
function findCover(s,ax,ay,threatX,threatY){
  const R=4;
  const cx=(ax/TS)|0, cy=(ay/TS)|0;
  let best=null,bs=-1e9;
  let tdx=threatX-ax, tdy=threatY-ay;
  const L=Math.hypot(tdx,tdy)||1;tdx/=L;tdy/=L;
  for(let y=cy-R;y<=cy+R;y++)for(let x=cx-R;x<=cx+R;x++){
    if(x<0||y<0||x>=GW||y>=GH)continue;
    const ci=coverAt[ti(x,y)];if(ci<0)continue;
    const c=covers[ci];
    const face=-(tdx*c.nx+tdy*c.ny);        // 掩体法线要迎着威胁
    if(face<.25)continue;
    const d=Math.sqrt(d2(x*TS+12,y*TS+12,ax,ay));
    if(d>R*TS)continue;
    let taken=false;
    for(const o of G.squads)if(o.alive&&o!==s&&d2(o.x,o.y,x*TS+12,y*TS+12)<26*26){taken=true;break;}
    if(taken)continue;
    const sc=face*2.4+(c.heavy?1.1:0)-d/70;
    if(sc>bs){bs=sc;best=[x*TS+12,y*TS+12];}
  }
  return best;
}
