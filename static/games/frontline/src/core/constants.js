/* =============================================================================
   FRONTLINE — core/constants.js
   常量、投影、随机数与颜色工具。所有模块的地基。
   ============================================================================= */

/* ---------------- 常量 ---------------- */
let GW=80, GH=56, TS=24, WW=GW*TS, WH=GH*TS;   // 尺寸由 MAPCFG 决定，见 applyMapSize()
const DT=0.05;
/* 一局最多几个队伍。大厅席位数、队伍配色、士兵贴图的预生成量都以它为准——
   写死 2 的地方在八人局里会静默取不到东西。 */
const MAX_TEAMS=8;
const T_GROUND=0, T_ROUGH=1, T_BLOCK=2;

/* 伪三维投影：世界 (x, y, h) → 屏幕 (x, y*TILT - h*ZS) */
const TILT=0.58, ZS=0.86, YTOP=120;
let WHP=WH*TILT;
const projY=(wy,h)=>wy*TILT-(h||0)*ZS;

const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const lerp=(a,b,t)=>a+(b-a)*t;
function d2(ax,ay,bx,by){const dx=bx-ax,dy=by-ay;return dx*dx+dy*dy;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=mulberry32(20260806);

/* 颜色工具 */
const sh=(c,k)=>'rgb('+(clamp(c[0]*k,0,255)|0)+','+(clamp(c[1]*k,0,255)|0)+','+(clamp(c[2]*k,0,255)|0)+')';
const mix=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
