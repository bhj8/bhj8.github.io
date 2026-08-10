/* =============================================================================
   FRONTLINE — core/replay.js
   录像：把一局记下来，之后能一模一样地重跑。

   为什么只存命令而不存快照：Sim 是确定性的（`node harness.js determinism`
   逐位验证过），同一个种子 + 同一串命令必然长出同一局。所以一局十分钟的
   录像也就几十 KB，而快照流要几十 MB。

   AI 的行为不进录像。它不走命令通道，是 simTick 的一部分，靠确定性重现。

   录像同时存下录制当时的整份配置，于是有两种回放：
     忠实重现  —— 套用录像里的配置，看到的和当时一模一样
     对比重跑  —— 保留当前配置，看同样的操作在新数值下会打成什么样

   后者才是这东西的正经用途：改完一个数，拿几份真实对局重跑一遍，
   看它到底改变了什么。
   ============================================================================= */

const REPLAY_VERSION=1;
const REPLAY={
  rec:null,          // 正在录制的数据；null = 没在录
  play:null,         // 正在回放的数据
  idx:0,             // 回放进度：下一条待施加的命令
  playing:false,     // 回放中不再录制，否则自己录自己
};

/* ---------------- 录制 ---------------- */
/* 在 initGame 之后调用：那时 G.seed 和阵营才定下来 */
function recStart(meta){
  if(!G)return null;
  REPLAY.rec={
    v:REPLAY_VERSION,
    seed:G.seed,
    alliance:G.alliance.slice(),
    ctrl:G.ctrl.slice(),
    aiLevels:G.aiLevels?G.aiLevels.slice():null,
    diff:G.diff,
    tuning:collectSimTuning(),      // 录制当时的整份配置
    cmds:[],
    meta:meta||{},
  };
  return REPLAY.rec;
}
/* 由 applyCmd 调用。回放时不录——否则命令会被记第二遍。 */
function recCmd(team,cmd){
  const R=REPLAY.rec;
  if(!R||REPLAY.playing||!G)return;
  R.cmds.push([G.tick,team,cmd]);
}
function recStop(){
  const R=REPLAY.rec;
  if(R&&G){R.ticks=G.tick;R.over=G.over;R.winAlliance=G.winAlliance;}
  REPLAY.rec=null;
  return R;
}
/* 取一份可落盘的副本，但不停止录制。
   host 每隔一会儿就落一次盘——进程被强杀（Ctrl+C、机器崩了）时，
   录到哪算哪，总比整局全丢强。半截录像照样能回放。 */
function recSnapshot(){
  const R=REPLAY.rec;
  if(!R||!G)return null;
  return Object.assign({},R,{ticks:G.tick,over:G.over,winAlliance:G.winAlliance,
                             cmds:R.cmds.slice(),partial:!G.over});
}
const recActive=()=>!!REPLAY.rec;

/* ---------------- 配置快照 ----------------
   深拷贝，不能直接存引用——录完之后玩家还会接着改这些表。

   派生字段必须剔除（见 config.js 的 UNIT_DERIVED）：UNITS.rifle.w 是指向
   WEAPONS.rifle 的引用，存进快照会变成副本，再套用回去时就顺着这条路径
   把 WEAPONS 覆盖回旧值——刚改好的武器数值当场作废。 */
function collectSimTuning(){
  const o={};
  for(const t of SIM_TUNABLES){
    try{
      const snap=JSON.parse(JSON.stringify(t.get()));
      if(t.derived)for(const k in snap)
        if(snap[k]&&typeof snap[k]==='object')
          for(const d of t.derived)delete snap[k][d];
      o[t.id]=snap;
    }catch(e){}
  }
  return o;
}
function applySimTuning(tun){
  if(!tun)return;
  for(const t of SIM_TUNABLES){
    const src=tun[t.id];
    if(src)replayAssign(t.get(),src);
  }
  if(typeof deriveUnits==='function')deriveUnits();
}
function replayAssign(dst,src){
  for(const k in src){
    const v=src[k];
    if(v&&typeof v==='object'&&!Array.isArray(v)&&dst[k]&&typeof dst[k]==='object')
      replayAssign(dst[k],v);
    else dst[k]=v;
  }
}

/* ---------------- 回放 ----------------
   useRecordedTuning:
     true   忠实重现——套用录像里的配置
     false  对比重跑——保留当前配置，看同样的操作在新数值下打成什么样 */
function replayStart(data,useRecordedTuning){
  if(!data||!data.cmds)throw new Error('录像数据不完整');
  if(data.v!==REPLAY_VERSION)
    console.warn('[FRONTLINE] 录像版本 '+data.v+' 与当前 '+REPLAY_VERSION+' 不符，可能对不上');
  if(useRecordedTuning)applySimTuning(data.tuning);
  REPLAY.play=data;
  REPLAY.idx=0;
  REPLAY.playing=true;
  initGame(data.diff===undefined?1:data.diff,data.seed,
           {alliance:data.alliance,ctrl:data.ctrl,aiLevels:data.aiLevels});
  return G;
}
/* 推进一 tick。命令必须在 simTick 之前施加——录制时它们就是这个次序
   （host.js 的 step() 也是先 applyCmd 再 simTick），差一拍就会分叉。 */
function replayTick(){
  const R=REPLAY.play;
  if(!R||!G)return false;
  while(REPLAY.idx<R.cmds.length&&R.cmds[REPLAY.idx][0]===G.tick){
    const c=R.cmds[REPLAY.idx++];
    try{applyCmd(c[1],c[2]);}catch(e){}
  }
  simTick();
  return !G.over&&(REPLAY.idx<R.cmds.length||G.tick<(R.ticks||0));
}
function replayStop(){
  REPLAY.play=null;REPLAY.idx=0;REPLAY.playing=false;
}
const replayActive=()=>!!REPLAY.play;
/* 回放进度 0..1，两个来源取大的：命令可能早就放完了但局还没打完 */
function replayProgress(){
  const R=REPLAY.play;
  if(!R||!G)return 0;
  const byTick=R.ticks?G.tick/R.ticks:0;
  const byCmd=R.cmds.length?REPLAY.idx/R.cmds.length:0;
  return clamp(Math.max(byTick,byCmd),0,1);
}

/* ---------------- 序列化 ----------------
   命令里的 ids 是数组，cmd 是纯数据，直接 JSON 即可。 */
function replayToJSON(R){return JSON.stringify(R);}
function replayFromJSON(s){return JSON.parse(s);}
