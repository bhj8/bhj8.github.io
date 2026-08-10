/* =============================================================================
   FRONTLINE — core/fx.js
   特效数据队列。Sim 只往里塞数据，View 负责画。

   联机时客户端不跑 Sim，所以开火、爆炸这些特效不会在本地产生——曳光线、
   枪口火光、爆炸全都不会出现。为此 Sim 侧把特效同时记成一条事件流带进快照，
   客户端收到后照着播。

   事件用数组而不是对象：[类型, ...参数]，坐标取整。这是每 tick 几十条的
   高频数据，字段名会成为快照里最大的一块。
   ============================================================================= */
/* ---------------- 特效数据 ---------------- */
const FX={tracers:[],flash:[],boom:[],smoke:[],decal:[],ping:[],dust:[]};

const E_TRACER=1, E_FLASH=2, E_BOOM=3, E_DECAL=4, E_SFX=5;
const SFX_KINDS=['rifle','mg','car','mortar','boom'];
const FX_EVENT_CAP=72;        // 单 tick 事件上限，超出丢弃（激战时少几条曳光看不出来）

/* 只有权威端记录（host 会把 G.recFX 打开）。
   客户端消费事件时会调用同一批 fx* 函数，不设这个开关就会自己记自己、无限套娃。 */
function fxEvent(e){
  if(!G||!G.recFX||!G.events)return;
  if(G.events.length>=FX_EVENT_CAP)return;
  G.events.push(e);
}
const rr1=v=>Math.round(v);

function fxTracer(x1,y1,x2,y2,team,hit){
  FX.tracers.push({x1,y1,x2,y2,t:0,team,hit});
  if(FX.tracers.length>420)FX.tracers.shift();
  fxEvent([E_TRACER,rr1(x1),rr1(y1),rr1(x2),rr1(y2),team,hit?1:0]);
}
function fxFlash(x,y){
  FX.flash.push({x,y,t:0});if(FX.flash.length>160)FX.flash.shift();
  fxEvent([E_FLASH,rr1(x),rr1(y)]);
}
function fxBoom(x,y,r){
  FX.boom.push({x,y,r,t:0});
  for(let i=0;i<9;i++)FX.smoke.push({x,y,t:0,r:8+rnd()*12,vx:(rnd()-.5)*50,vy:(rnd()-.5)*50,
    vh:22+rnd()*34,h:4,life:1.7+rnd()});
  fxEvent([E_BOOM,rr1(x),rr1(y),rr1(r)]);
}
function fxDecal(x,y,r,dark){
  FX.decal.push({x,y,r,dark});if(FX.decal.length>300)FX.decal.shift();
  fxEvent([E_DECAL,rr1(x),rr1(y),rr1(r),dark?1:0]);
}

/* 客户端回放：直接操作 FX 队列，不走上面那些函数，免得又记一遍事件。 */
function playFxEvents(list){
  if(!list)return;
  for(const e of list){
    switch(e[0]){
      case E_TRACER:
        FX.tracers.push({x1:e[1],y1:e[2],x2:e[3],y2:e[4],t:0,team:e[5],hit:!!e[6]});
        if(FX.tracers.length>420)FX.tracers.shift();
        break;
      case E_FLASH:
        FX.flash.push({x:e[1],y:e[2],t:0});
        if(FX.flash.length>160)FX.flash.shift();
        break;
      case E_BOOM:
        FX.boom.push({x:e[1],y:e[2],r:e[3],t:0});
        for(let i=0;i<9;i++)FX.smoke.push({x:e[1],y:e[2],t:0,r:8+Math.random()*12,
          vx:(Math.random()-.5)*50,vy:(Math.random()-.5)*50,
          vh:22+Math.random()*34,h:4,life:1.7+Math.random()});
        break;
      case E_DECAL:
        FX.decal.push({x:e[1],y:e[2],r:e[3],dark:!!e[4]});
        if(FX.decal.length>300)FX.decal.shift();
        break;
      case E_SFX:
        if(typeof sfx==='function')sfx(SFX_KINDS[e[1]]||'rifle',e[2],e[3]);
        break;
    }
  }
}
