/* =============================================================================
   FRONTLINE — core/vision.js
   分档视野（探测/识别/交战）与 per-team 迷雾网格。
   ============================================================================= */
/* ---------------- 视野分档 ----------------
   每队一张位域网格：
     V_SEEN   曾经探索过（战争迷雾的"记忆"层）
     V_DETECT 探测：知道那里有东西，但看不清是什么
     V_IDENT  识别：看得清兵种，完整绘制
     V_ENGAGE 交战：能索敌开火
   ⚠️ engageRatio 必须保持 1.0——交战圈一变就是在改平衡。分档只是在原视野
   之外多加一圈"看得见但认不出"的探测范围，不缩小任何已有能力。 */
const V_SEEN=1, V_DETECT=2, V_IDENT=4, V_ENGAGE=8;
const VISION={
  detectRatio:1.30,      // 探测圈 = sight × 此值（新增的外圈）
  identRatio:1.00,       // 识别圈
  engageRatio:1.00,      // 交战圈：勿动
  houseBonus:1.15,       // 驻守建筑的视野加成
  hqSight:300,
  heightFactor:0,        // 高地视野加成，默认关闭（开启会改变平衡，留给设计者）
  heightRef:34,
};
function sightScale(wx,wy){
  if(!VISION.heightFactor)return 1;
  return 1+(hAt(wx,wy)/VISION.heightRef-0.5)*2*VISION.heightFactor;
}
function updateVision(){
  for(let t=0;t<G.teams.length;t++){
    if(!isHuman(t))continue;                 // AI 全知，不必为它算视野
    const v=G.vis[t];
    for(let i=0;i<v.length;i++)v[i]&=V_SEEN; // 只保留记忆层，其余每次重算
    for(const b of G.bldgs){
      if(!isAllyTeam(b.team,t)||b.hp<=0)continue;
      mark(v,b.x,b.y,VISION.hqSight*VISION.detectRatio,V_SEEN|V_DETECT,null);
      mark(v,b.x,b.y,VISION.hqSight,V_SEEN|V_DETECT|V_IDENT|V_ENGAGE,null);
    }
    for(const s of G.squads){
      if(!s.alive||!isAllyTeam(s.team,t))continue;
      const base=s.def.sight*(s.house?VISION.houseBonus:1)*sightScale(s.x,s.y);
      mark(v,s.x,s.y,base*VISION.detectRatio,V_SEEN|V_DETECT,s.house);
      mark(v,s.x,s.y,base*VISION.identRatio, V_SEEN|V_DETECT|V_IDENT,s.house);
      mark(v,s.x,s.y,base*VISION.engageRatio,V_SEEN|V_DETECT|V_IDENT|V_ENGAGE,s.house);
    }
  }
  function mark(v,wx,wy,r,bits,hz){
    const cx=(wx/TS)|0, cy=(wy/TS)|0, R=Math.ceil(r/TS);
    for(let y=cy-R;y<=cy+R;y++)for(let x=cx-R;x<=cx+R;x++){
      if(x<0||y<0||x>=GW||y>=GH)continue;
      if((x-cx)*(x-cx)+(y-cy)*(y-cy)>R*R)continue;
      const i=ti(x,y);
      if((v[i]&bits)===bits)continue;        // 这一档已经标过
      if(los(wx,wy,x*TS+12,y*TS+12,hz))v[i]|=bits;
    }
  }
}
function visBits(team,wx,wy){
  const x=(wx/TS)|0,y=(wy/TS)|0;
  if(x<0||y<0||x>=GW||y>=GH)return 0;
  return G.vis[team][ti(x,y)];
}
/* 能否索敌开火。AI 队恒为 true——迷雾是玩家的规则，不是 Sim 的全局约束。 */
function seenBy(team,wx,wy){
  if(!isHuman(team))return true;
  return (visBits(team,wx,wy)&V_ENGAGE)!==0;
}
const seen     =(wx,wy)=>seenBy(myTeam,wx,wy);          // 能打
const identOK  =(wx,wy)=>(visBits(myTeam,wx,wy)&V_IDENT)!==0;   // 看得清是什么
const detectOK =(wx,wy)=>(visBits(myTeam,wx,wy)&V_DETECT)!==0;  // 只知道有东西
