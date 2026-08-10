/* =============================================================================
   FRONTLINE — core/terrain.js
   地形网格与地图尺寸。applyMapSize 是大地图的落地点。
   ============================================================================= */
/* ---------------- 地形 ---------------- */
let terrain=new Uint8Array(GW*GH);
let coverAt=new Int16Array(GW*GH);
let noiseAt=new Uint8Array(GW*GH);
let hgt=new Float32Array((GW+1)*(GH+1));
let roadM=new Float32Array(GW*GH);
let covers=[], bldRects=[], props=[], propRows=null, roadPaths=[];

/* 地图尺寸变了就得重建所有网格。批次 5 的大地图直接靠这条落地。 */
function applyMapSize(gw,gh,ts){
  GW=gw|0;GH=gh|0;TS=ts|0;WW=GW*TS;WH=GH*TS;WHP=WH*TILT;
  terrain=new Uint8Array(GW*GH);
  coverAt=new Int16Array(GW*GH);
  noiseAt=new Uint8Array(GW*GH);
  hgt=new Float32Array((GW+1)*(GH+1));
  roadM=new Float32Array(GW*GH);
  const cells=GW*GH;
  if(cells>120000)console.warn('[FRONTLINE] 地图 '+GW+'×'+GH+' = '+cells+
    ' 格，已超出当前单张烘焙与全图流场的安全水位（见 ROADMAP 批次 5）');
}
const ti=(x,y)=>y*GW+x;
const passable=(x,y)=>x>=0&&y>=0&&x<GW&&y<GH&&terrain[ti(x,y)]!==T_BLOCK;
const tileMul=(x,y)=>terrain[ti(x,y)]===T_ROUGH?17:10;
function hAt(wx,wy){
  const fx=clamp(wx/TS,0,GW), fy=clamp(wy/TS,0,GH);
  const x0=Math.min(GW-1,fx|0), y0=Math.min(GH-1,fy|0);
  const tx=fx-x0, ty=fy-y0, i=y0*(GW+1)+x0;
  return lerp(lerp(hgt[i],hgt[i+1],tx),lerp(hgt[i+GW+1],hgt[i+GW+2],tx),ty);
}
