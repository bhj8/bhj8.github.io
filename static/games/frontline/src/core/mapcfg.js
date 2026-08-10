/* =============================================================================
   FRONTLINE — core/mapcfg.js
   地图配置与镜像工具。据点/基地只写一半，另一半由镜像生成。
   ============================================================================= */
const DEFAULT_SEED=20260806;
/* ---------------- 地图配置 ----------------
   全部数值都是旋钮。据点与基地只写一半，另一半由 mirrorPt/mirrorRect 生成——
   手写两侧坐标正是历史上四个对称性 bug 的来源，这里从结构上根除。
   存读 JSON：mapToJSON() / mapFromJSON(str)。 */
/* ---- 地图预设 ----
   席位数决定地图该多大：八个基地塞进 80×56 会挤成一团。
   预设只是起点，选完仍可在开始界面或调参面板里改。
   出生点与据点都只写一半，另一半由 rot180 镜像生成——写两侧正是历史上
   四个对称性 bug 的来源。 */
const MAP_PRESETS={
  small:{
    name:'交战线', maxSeats:2, gw:80, gh:56,
    hqs:[{tx:7,ty:46,rally:[14.5,52.2]}],
    points:[
      {tx:16,ty:36,name:'西哨站',   mirror:'东哨站', owner:'first'},
      {tx:30,ty:46,name:'农场',     mirror:'铁桥'},
      {tx:40,ty:28,name:'十字路口'},                    // 自镜像，不生成副本
    ],
    pointHouses:[0,1,2],
  },
  medium:{
    name:'河谷', maxSeats:4, gw:120, gh:84,
    hqs:[{tx:8,ty:70,rally:[16,76]},{tx:8,ty:9,rally:[16,15]}],
    points:[
      {tx:24,ty:56,name:'西南哨站', mirror:'东北哨站'},
      {tx:22,ty:26,name:'西北哨站', mirror:'东南哨站'},
      {tx:44,ty:66,name:'南农场',   mirror:'北农场'},
      {tx:60,ty:42,name:'中央枢纽'},                    // 自镜像
    ],
    pointHouses:[0,1,2,3],
  },
  large:{
    name:'战区', maxSeats:8, gw:160, gh:112,
    // 四个出生点写在左半与上半，镜像后沿边缘一圈共八个
    hqs:[{tx:9,ty:90,rally:[17,96]},{tx:9,ty:48,rally:[17,54]},
         {tx:34,ty:10,rally:[42,17]},{tx:74,ty:10,rally:[82,17]}],
    points:[
      {tx:30,ty:72,name:'西南哨站', mirror:'东北哨站'},
      {tx:26,ty:38,name:'西岭',     mirror:'东岭'},
      {tx:56,ty:92,name:'南渡口',   mirror:'北渡口'},
      {tx:62,ty:42,name:'旧磨坊',   mirror:'新磨坊'},
      {tx:80,ty:56,name:'中央枢纽'},                    // 自镜像
    ],
    pointHouses:[0,1,2,3,4],
  },
};
/* 按席位数挑最小的够用预设 */
function presetForSeats(n){
  const ks=Object.keys(MAP_PRESETS).sort((a,b)=>MAP_PRESETS[a].maxSeats-MAP_PRESETS[b].maxSeats);
  for(const k of ks)if(MAP_PRESETS[k].maxSeats>=n)return k;
  return ks[ks.length-1];
}
function applyPreset(key){
  const p=MAP_PRESETS[key];if(!p)return;
  MAPCFG.preset=key;
  MAPCFG.gw=p.gw;MAPCFG.gh=p.gh;
  MAPCFG.hqs=JSON.parse(JSON.stringify(p.hqs));
  MAPCFG.points=JSON.parse(JSON.stringify(p.points));
  MAPCFG.pointHouses.at=p.pointHouses.slice();
}
/* 展开出生点：配置只写一半，镜像补齐。initGame 与开始界面的预览共用这一份，
   免得两边各算一次、算出不同的结果。 */
function hqSlots(){
  const HS=MAPCFG.hqSize, out=[];
  for(const q of MAPCFG.hqs){
    out.push({tx:q.tx,ty:q.ty,rx:q.rally[0]*TS,ry:q.rally[1]*TS});
    const m=mirrorRect(q.tx,q.ty,HS.w,HS.h);
    if(m[0]!==q.tx||m[1]!==q.ty)
      out.push({tx:m[0],ty:m[1],rx:WW-q.rally[0]*TS,ry:WH-q.rally[1]*TS});
  }
  return out;
}
/* 地图能容纳的最大玩家数 */
const mapSeatCapacity=()=>hqSlots().length;

const MAPCFG={
  preset:'small',
  gw:80, gh:56, tileSize:24,
  symmetry:'rot180',              // rot180 | rot90(需 gw===gh) | mirrorXY | none
  hqSize:{w:6,h:5}, hqHp:3200,
  // 只写第一侧；rally 是集结点，单位为格
  hqs:[{tx:7,ty:46,rally:[7+7.5,46+6.2]}],
  // owner: 'first'=归第一阵营（镜像点归最后阵营）；省略=中立
  points:[
    {tx:16,ty:36,name:'西哨站',   mirror:'东哨站', owner:'first'},
    {tx:30,ty:46,name:'农场',     mirror:'铁桥'},
    {tx:40,ty:28,name:'十字路口'},                       // 自镜像，不生成副本
  ],
  roughPatches:{count:44, radius:[2,4]},
  buildings:{count:15, w:[2,4], h:[2,3], keepClearOfPoints:true},
  pointHouses:{at:[0,1,2], w:[2,3], h:2, dist:3.4},      // 据点旁的可进驻房子（索引指 points[]）
  covers:{perPoint:[4,5], radius:[3,5.2], heavyChance:.42, strayLines:22, strayLen:[2,4]},
  props:{trees:150, rocks:40, treeClearPoint:110, treeClearHQ:190},
  height:{octaves:[[6,1],[13,.42],[27,.17],[34,.20]], amplitude:34},
  roads:{width:[2.2,1.5], autoConnectPoints:true},
  protect:{hq:9, point:3},                                // 生成物件时的保护半径（格）
};
function mapToJSON(){return JSON.stringify(MAPCFG,null,2);}
function mapFromJSON(str){
  const o=JSON.parse(str);
  for(const k in o)MAPCFG[k]=o[k];
  return MAPCFG;
}
/* 据点用格角点坐标，镜像是 GW-tx；掩体/建筑用格索引，镜像是 GW-1-x。
   两者在世界坐标下都关于 (WW/2, WH/2) 对称——不是笔误，别"顺手统一"。 */
const mirrorPt  =(tx,ty)=>[GW-tx,GH-ty];
const mirrorRect=(x,y,w,h)=>[GW-w-x,GH-h-y];

/* opt: { seed, alliance:[每队所属阵营], ctrl:['human'|'ai', …] } */
