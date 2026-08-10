/* =============================================================================
   FRONTLINE — core/stats.js
   赛后统计：谁打死了谁、伤害从哪来、兵力耗在哪。

   为什么要有它：数值是设计者调的，而调数值需要看得见结果。
   "机枪班是不是太强了"这种问题，靠看战斗过程是看不出来的——
   它需要"这局机枪造成了多少伤害、打死了几支什么部队"。

   与录像配合：`node harness.js replay <录像>` 会把这份统计打出来，
   改完数值拿同一份录像重跑，两份统计一对比就知道改动到底做了什么。

   只累加数字，不参与任何演算，所以不会影响确定性。
   ============================================================================= */

function newStats(nTeam){
  const teams=[];
  for(let t=0;t<nTeam;t++)teams.push({
    team:t,
    dmgOut:0, dmgIn:0,          // 造成 / 承受的伤害
    kills:0, deaths:0,          // 打死的人 / 阵亡的人（按单兵算）
    squadsLost:0,               // 被打光的小队数
    built:{},                   // 兵种 → 造了几支
    spentMp:0, spentFu:0,
    dmgByWeapon:{},             // 武器 id → 伤害
    killsByWeapon:{},           // 武器 id → 人头
    deathsByType:{},            // 自己哪种兵死得多
    killsByVictimType:{},       // 打死的都是什么兵
  });
  return {
    teams,
    meleeDeaths:0,              // 死在室内绞肉里的人
    collapseDeaths:0,           // 被房子压死的人
    housesRuined:0,
    meleeLog:[],                // 绞肉开打/结束的流水
  };
}
const statsOn=()=>!!(typeof G!=='undefined'&&G&&G.stats);

/* 伤害归因。real 已经被 hurt 夹过，不含溢出部分——
   房塌那种 1e9 的伤害如果照记，一次就能把整局的伤害统计冲垮。 */
function statDamage(victim,real,src){
  if(!statsOn()||!(real>0))return;
  const S=G.stats;
  const vt=S.teams[victim.team];
  if(vt)vt.dmgIn+=real;
  if(!src)return;
  if(src.cause==='melee')S.meleeDeaths+=0;            // 计数在 statKill 里
  if(src.team===undefined||src.team<0)return;
  const at=S.teams[src.team];
  if(!at)return;
  at.dmgOut+=real;
  if(src.weapon)at.dmgByWeapon[src.weapon]=(at.dmgByWeapon[src.weapon]||0)+real;
}
function statKill(victim,src){
  if(!statsOn())return;
  const S=G.stats;
  const vt=S.teams[victim.team];
  if(vt){
    vt.deaths++;
    vt.deathsByType[victim.type]=(vt.deathsByType[victim.type]||0)+1;
  }
  if(src){
    if(src.cause==='melee')S.meleeDeaths++;
    else if(src.cause==='collapse')S.collapseDeaths++;
  }
  if(!src||src.team===undefined||src.team<0)return;
  const at=S.teams[src.team];
  if(!at)return;
  /* 友伤（强制攻击不分敌我）不算战果——不然往自己人堆里放一炮
     反而能刷出漂亮的击杀数。 */
  if(src.team===victim.team)return;
  at.kills++;
  at.killsByVictimType[victim.type]=(at.killsByVictimType[victim.type]||0)+1;
  if(src.weapon)at.killsByWeapon[src.weapon]=(at.killsByWeapon[src.weapon]||0)+1;
}
function statSquadLost(squad){
  if(!statsOn())return;
  const t=G.stats.teams[squad.team];
  if(t)t.squadsLost++;
}
function statBuilt(team,unit){
  if(!statsOn())return;
  const t=G.stats.teams[team];
  if(!t)return;
  t.built[unit]=(t.built[unit]||0)+1;
  const d=UNITS[unit];
  if(d){t.spentMp+=d.mp;t.spentFu+=d.fu;}
}
function statHouseRuined(){
  if(!statsOn())return;
  G.stats.housesRuined++;
}
/* 绞肉流水：开打与结束各记一条，用来回答"这局绞肉打了几场、打多久" */
function statMelee(house,on,teams){
  if(!statsOn())return;
  G.stats.meleeLog.push({t:Math.round(G.t*10)/10,house:house.id,on:!!on,
                         teams:teams?teams.slice():[]});
}

/* ---------------- 汇总输出 ----------------
   排版成人能读的文本。harness 的 replay 模式直接打印它。 */
function statsReport(S,names){
  if(!S)return '（没有统计数据）';
  const L=[];
  const nm=t=>(names&&names[t])||('队伍 '+(t+1));
  const top=(o,n)=>Object.keys(o).sort((a,b)=>o[b]-o[a]).slice(0,n)
    .map(k=>k+' '+Math.round(o[k])).join('  ')||'—';
  for(const t of S.teams){
    L.push(nm(t.team)+
      '   伤害 '+Math.round(t.dmgOut)+' / 承受 '+Math.round(t.dmgIn)+
      '   人头 '+t.kills+' / 阵亡 '+t.deaths+
      '   全灭小队 '+t.squadsLost);
    L.push('    造兵   '+(Object.keys(t.built).length
      ? Object.keys(t.built).map(k=>k+'×'+t.built[k]).join('  ') : '—')+
      '   花费 '+Math.round(t.spentMp)+'人力 '+Math.round(t.spentFu)+'油');
    L.push('    伤害来源 '+top(t.dmgByWeapon,5));
    L.push('    人头来源 '+top(t.killsByWeapon,5));
    L.push('    打死的兵 '+top(t.killsByVictimType,5));
    L.push('    自己死的 '+top(t.deathsByType,5));
  }
  L.push('室内绞肉致死 '+S.meleeDeaths+'   房塌压死 '+S.collapseDeaths+
         '   打塌建筑 '+S.housesRuined+'   绞肉场次 '+
         S.meleeLog.filter(e=>e.on).length);
  return L.join('\n');
}
