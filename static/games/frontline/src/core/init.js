/* =============================================================================
   FRONTLINE — core/init.js
   开局：建基地、放据点、生成房屋、出兵。
   ============================================================================= */
function initGame(diff,seed,opt){
  const o=opt||{};
  const sd=(seed===undefined||seed===null)?DEFAULT_SEED:(seed>>>0);
  rnd=mulberry32(sd);
  if(GW!==MAPCFG.gw||GH!==MAPCFG.gh||TS!==MAPCFG.tileSize)
    applyMapSize(MAPCFG.gw,MAPCFG.gh,MAPCFG.tileSize);
  genMap();
  const alliance=o.alliance||[0,1];
  const nTeam=alliance.length;
  const teams=[];for(let t=0;t<nTeam;t++)teams.push(newTeam(t));
  G={t:0,tick:0,over:0,diff,seed:sd,nextId:1,squads:[],bldgs:[],pts:[],teams,
     alliance,ctrl:o.ctrl||['human','ai'],aiLevels:o.aiLevels||null,
     shells:[],fields:new Map(),vis:null,groups:{},logs:[],
     stats:newStats(nTeam)};       // 赛后统计：只累加数字，不参与演算
  G.alliances=[];for(const a of alliance)if(G.alliances.indexOf(a)<0)G.alliances.push(a);
  G.vis=[];for(let t=0;t<nTeam;t++)G.vis.push(new Uint8Array(GW*GH));

  // 基地：配置只写一侧，另一侧镜像生成
  const slots=hqSlots();
  if(nTeam>slots.length)
    console.warn('[FRONTLINE] 参战 '+nTeam+' 席但地图只有 '+slots.length+
                 ' 个出生点，多出来的会与人共用出生点。请加 MAPCFG.hqs 或换大地图。');
  const HS=MAPCFG.hqSize;
  for(let t=0;t<nTeam;t++){const q=slots[t%slots.length];
    G.bldgs.push({team:t,tx:q.tx,ty:q.ty,w:HS.w,h:HS.h,
      hp:MAPCFG.hqHp,max:MAPCFG.hqHp,rx:q.rx,ry:q.ry});}
  for(const b of G.bldgs){b.x=(b.tx+b.w/2)*TS;b.y=(b.ty+b.h/2)*TS;
    for(let y=b.ty;y<b.ty+b.h;y++)for(let x=b.tx;x<b.tx+b.w;x++)terrain[ti(x,y)]=T_BLOCK;}

  // 据点：同样只写一半。cap/capBy/owner 按阵营 id，cap 是 0..1 进度
  const a0=alliance[0], aL=alliance[nTeam-1], raw=[];
  for(const p of MAPCFG.points){
    const m=mirrorPt(p.tx,p.ty), self=(m[0]===p.tx&&m[1]===p.ty);
    raw.push({tx:p.tx,ty:p.ty,name:p.name,own:p.owner==='first'?a0:-1});
    if(!self)raw.push({tx:m[0],ty:m[1],name:p.mirror||p.name+'·对',
                       own:p.owner==='first'?aL:-1});
  }
  raw.sort((a,b)=>a.tx-b.tx||a.ty-b.ty);
  raw.forEach((p,i)=>G.pts.push({i,tx:p.tx,ty:p.ty,x:p.tx*TS,y:p.ty*TS,name:p.name,
    owner:p.own,capBy:p.own,cap:p.own>=0?1:0}));

  G.houses=[];
  bldRects.forEach((r,i)=>{
    // 材质只依赖格数与本栋的 seed，而 seed 在镜像对之间共享 → 两侧材质必然一致
    const mk=materialOf(r.w*r.h,r.seed);
    const M=HOUSE_MATS[mk]||HOUSE_MATS.brick;
    const hp=Math.round(HOUSE.hp*M.hp);
    G.houses.push({id:i,tx:r.x,ty:r.y,w:r.w,h:r.h,
      cx:(r.x+r.w/2)*TS,cy:(r.y+r.h/2)*TS,
      fx:(r.x+r.w/2)*TS,fy:(r.y+r.h+0.9)*TS,        // 门口（南侧）
      hp,max:hp,ruin:false,seed:r.seed,
      mat:mk,                                        // 木造 / 砖石 / 混凝土
      gar:[],                                        // 驻守小队（可多支）
      cap:clamp(Math.floor(r.w*r.h/HOUSE.cellsPerSquad),1,HOUSE.maxCap),
      drDirect:M.drDirect, drBlast:M.drBlast,        // 每栋独立，材质在这里落地
      melee:false, meleeBy:-1});                     // meleeBy = 先入者阵营（守方）
  });
  buildHeights();
  buildRoads();
  buildProps();

  for(let t=0;t<nTeam;t++){spawn(t,'rifle');spawn(t,'rifle');}
  for(let t=0;t<nTeam;t++)if(!isHuman(t))G.teams[t].mp+=[-60,0,90][aiLevelOf(t)];

  cam.x=G.bldgs[myTeam].x;cam.y=G.bldgs[myTeam].y-190;cam.z=1.75;
  selection=[];
  updateVision();
  log('战斗开始 — 占领据点以削减敌军战力值',1);
  return G;
}
