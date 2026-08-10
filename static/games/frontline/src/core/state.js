/* =============================================================================
   FRONTLINE — core/state.js
   对局状态 G、阵营查询、小队构造。
   ============================================================================= */
let G=null;
// 起始资源与战力值来自 RULES，开始界面能直接改
function newTeam(t){return{team:t,mp:RULES.startMp,fu:RULES.startFu,pop:0,vp:RULES.vp,
  queue:[],buildT:0,pts:0};}

/* ---------------- 阵营 ----------------
   实现上先跑 1v1，但一切"敌我"判定都走下面这几个查询，
   扩到 2v2 / FFA 时只需改 G.alliance 与 G.ctrl，不必全局搜索 1-team。 */
const allianceOf =t=>G.alliance[t];
const isEnemyTeam=(a,b)=>G.alliance[a]!==G.alliance[b];
const isAllyTeam =(a,b)=>G.alliance[a]===G.alliance[b];
const isHuman=t=>G.ctrl[t]==='human';
function enemyBaseOf(team){          // 最近的存活敌方基地；全灭则返回任一敌基地
  let best=null,bd=1e18,any=null;
  const src=G.bldgs[team];
  for(const b of G.bldgs){
    if(!isEnemyTeam(b.team,team))continue;
    any=any||b;
    if(b.hp<=0)continue;
    const dd=src?d2(src.x,src.y,b.x,b.y):0;
    if(dd<bd){bd=dd;best=b;}
  }
  return best||any;
}

function makeSquad(team,type,x,y){
  const d=UNITS[type];
  const s={id:G.nextId++,team,type,def:d,x,y,px:x,py:y,
    facing:0,
    members:[],order:null,goalX:x,goalY:y,arrived:true,
    target:null,tgtType:null,retarget:rnd()*.4,
    supp:0,deployT:0,deployed:false,stillT:0,retreat:false,reinfT:0,alive:true,sel:false,
    house:null,coverT:0,cd2:0,bob:rnd()*6.28};
  for(let i=0;i<d.men;i++){
    const ox=(i%2)*19-9.5, oy=((i/2)|0)*26-13;
    s.members.push({ox,oy,pox:ox,poy:oy,tox:ox,toy:oy,hp:d.hp,cd:rnd()*.8,alive:true,ph:rnd()*6.28,
      weapon:d.weapons[i],            // 每人一件，武器决定他的射程/精度/近战权重
      deployed:false,deployT:0,arcCenter:null});   // 架设是成员级的：班里只有那挺机枪要架
  }
  return s;
}
