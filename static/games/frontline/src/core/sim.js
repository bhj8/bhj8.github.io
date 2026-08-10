/* =============================================================================
   FRONTLINE — core/sim.js
   Sim 主体：生产、移动、战斗、室内绞肉、据点、AI、命令通道。
   这一层不碰任何 DOM/Canvas，harness 与 host.js 靠这条约束才能无头跑。
   ============================================================================= */
/* ---------------- 生产 / 补员 ---------------- */
function spawn(team,type){
  const b=G.bldgs[team];
  const a=rnd()*Math.PI*2, r=30+rnd()*36;
  let x=clamp(b.rx+Math.cos(a)*r,20,WW-20), y=clamp(b.ry+Math.sin(a)*r,20,WH-20);
  if(!passable((x/TS)|0,(y/TS)|0)){x=b.rx;y=b.ry;}
  const s=makeSquad(team,type,x,y);
  const eb=enemyBaseOf(team);                    // 出生就面朝战线，不再按队号写死角度
  s.facing=eb?Math.atan2(eb.y-s.y,eb.x-s.x):0;
  G.squads.push(s);G.teams[team].pop+=s.def.pop;
  return s;
}
function tryQueue(team,type){
  const T=G.teams[team], d=UNITS[type];
  let qp=0;for(const q of T.queue)qp+=UNITS[q].pop;
  if(T.mp<d.mp||T.fu<d.fu)return false;
  if(T.pop+qp+d.pop>POPCAP)return false;
  if(T.queue.length>=5)return false;
  T.mp-=d.mp;T.fu-=d.fu;T.queue.push(type);
  statBuilt(team,type);
  return true;
}
function tickProduction(){
  for(const T of G.teams){
    if(!T.queue.length){T.buildT=0;continue;}
    T.buildT+=DT;
    const d=UNITS[T.queue[0]];
    if(T.buildT>=d.build){T.buildT=0;const ty=T.queue.shift();spawn(T.team,ty);
      log(d.name+' 已就绪',0,T.team);}
  }
}
function tickReinforce(){
  for(const s of G.squads){
    if(!s.alive||s.def.vehicle)continue;
    const b=G.bldgs[s.team];if(b.hp<=0)continue;
    if(d2(s.x,s.y,b.rx,b.ry)>170*170){s.reinfT=0;continue;}
    const dead=s.members.filter(m=>!m.alive);
    if(!dead.length){s.reinfT=0;continue;}
    s.reinfT+=DT;
    if(s.reinfT>=2.4){
      s.reinfT=0;
      const cost=Math.ceil(s.def.mp/s.def.men*.85), T=G.teams[s.team];
      if(T.mp>=cost){T.mp-=cost;const m=dead[0];m.alive=true;m.hp=s.def.hp;m.cd=.5;}
    }
  }
}
// 建筑入口按接近方向动态取，固定南门会让地图上半区的一方永远要绕路
function doorFor(h,fx,fy){
  let best=null,bd=1e12;
  for(let x=h.tx-1;x<=h.tx+h.w;x++)for(let y=h.ty-1;y<=h.ty+h.h;y++){
    if(!(x===h.tx-1||x===h.tx+h.w||y===h.ty-1||y===h.ty+h.h))continue;
    if(!passable(x,y))continue;
    const wx=x*TS+12, wy=y*TS+12, dd=d2(wx,wy,fx,fy);
    if(dd<bd){bd=dd;best=[wx,wy];}
  }
  return best||[h.cx,h.cy];
}
const houseFull=h=>h.gar.length>=h.cap;
/* 能否进驻：楼没塌、没满、是步兵。敌方已在楼里时仍可进——那正是绞肉的入口。 */
function canEnter(s,h){
  return !!(h&&!h.ruin&&s.alive&&s.def.armor===0&&!houseFull(h));
}
function enterHouse(s,h){
  if(!canEnter(s,h))return false;
  if(h.gar.length===0)h.meleeBy=-1;              // 空楼：先入者身份重置
  if(h.meleeBy<0)h.meleeBy=allianceOf(s.team);   // 第一个进来的阵营即守方
  h.gar.push(s);
  s.house=h;s.x=h.cx;s.y=h.cy;s.px=s.x;s.py=s.y;
  s.order=null;s.arrived=true;s.enterT=0;undeploy(s);
  for(const m of s.members){m.ox=m.tox=(rnd()-.5)*h.w*TS*.5;m.oy=m.toy=(rnd()-.5)*h.h*TS*.5;m.pox=m.ox;m.poy=m.oy;}
  log('部队进驻建筑',1,s.team);
  return true;
}
function exitHouse(s){
  if(!s.house)return;
  const h=s.house;
  const i=h.gar.indexOf(s);if(i>=0)h.gar.splice(i,1);
  if(!h.gar.length)h.meleeBy=-1;
  s.house=null;s.leaving=false;s.exitT=0;
  const d=doorFor(h,h.cx,h.cy+TS*2.5);
  s.x=clamp(d[0],20,WW-20);s.y=clamp(d[1],20,WH-20);s.px=s.x;s.py=s.y;
}
/* 请求撤出：走 exitTime 进度，不是瞬间弹出去 */
function requestExit(s){
  if(!s.house||s.leaving)return;
  s.leaving=true;s.exitT=0;
}
function ruinHouse(h){
  if(h.ruin)return;
  h.ruin=true;h.hp=0;
  statHouseRuined();
  fxBoom(h.cx,h.cy,64);fxDecal(h.cx,h.cy,26,true);sfx('boom',h.cx,h.cy);
  // 房塌 = 楼内全灭，没有幸存者
  const COLLAPSE={cause:'collapse'};
  for(const g of h.gar.slice()){
    if(!g.alive){g.house=null;continue;}
    for(const m of g.members)if(m.alive)hurt(g,m,1e9,g.x+m.ox,g.y+m.oy,COLLAPSE);
    g.house=null;
  }
  if(h.melee)statMelee(h,false,[]);
  h.gar.length=0;h.melee=false;h.meleeBy=-1;
  log('建筑被摧毁 — 楼内部队全灭',2);
}

/* ---------------- 室内绞肉 ----------------
   敌我同处一楼：按阵营汇总战力持续对拼，直到一方全灭或退出。
   战力 = Σ(活着的成员 × 他手里武器的 cqb 权重)，所以扛机枪的那个在楼里近乎白给。 */
function tickHouseMelee(){
  for(const h of G.houses){
    if(h.ruin){h.melee=false;continue;}
    const gar=h.gar.filter(s=>s.alive);
    if(gar.length!==h.gar.length)h.gar=gar;
    const byA={},as=[];
    for(const s of gar){
      const a=allianceOf(s.team);
      if(!byA[a]){byA[a]=[];as.push(a);}
      byA[a].push(s);
    }
    if(as.length<2){
      if(h.melee)statMelee(h,false,as);        // 一方撤走或死光，这场绞肉结束
      h.melee=false;continue;
    }
    if(!h.melee)statMelee(h,true,as);          // 新开一场
    h.melee=true;
    const pw={};
    for(const a of as){
      let p=0;
      for(const s of byA[a])for(const m of s.members)
        if(m.alive)p+=(m.weapon?(m.weapon.cqb||0):0.5);
      pw[a]=p*(a===h.meleeBy?MELEE.defenderBonus:1);
    }
    for(const a of as){
      let incoming=0;
      for(const b of as)if(b!==a)incoming+=pw[b];
      if(incoming<=0)continue;
      const dmg=incoming*MELEE.dps*DT*(1-MELEE.jitter+rnd()*MELEE.jitter*2);
      // 归因到"某个阵营的绞肉"：楼里是混战，具体谁开的枪本来就分不清
      spreadMelee(byA[a],dmg,{cause:'melee',team:byA[as.find(b=>b!==a)][0].team});
    }
  }
}
/* 伤害按存活人数加权随机落点，分摊到几个人身上而不是一次砸死一个 */
function spreadMelee(squads,total,src){
  const pool=[];
  for(const s of squads)for(const m of s.members)if(m.alive)pool.push([s,m]);
  if(!pool.length)return;
  const n=Math.min(pool.length,MELEE.spreadHits);
  for(let i=0;i<n;i++){
    const p=pool[(rnd()*pool.length)|0];
    if(!p[1].alive)continue;
    hurt(p[0],p[1],total/n,p[0].x+p[1].ox,p[0].y+p[1].oy,src);
  }
}
// 当前最该躲避的威胁方向
function threatOf(s){
  if(s.target)return [s.target.x,s.target.y];
  let bx=null,bd=1e12;
  for(const o of G.squads){
    if(!o.alive||!isEnemyTeam(o.team,s.team))continue;
    const dd=d2(s.x,s.y,o.x,o.y);
    if(dd<bd&&dd<460*460){bd=dd;bx=o;}
  }
  if(bx)return [bx.x,bx.y];
  const e=enemyBaseOf(s.team);
  return e?[e.x,e.y]:[s.x,s.y];
}
function speedOf(s){
  let sp=s.def.speed;
  if(s.retreat)return sp*1.7;
  if(!s.def.vehicle){if(s.supp>.85)sp*=.14;else if(s.supp>.4)sp*=.5;}
  return sp;
}
function tickMove(){
  const cell=52, grid=new Map();
  for(const s of G.squads){
    if(!s.alive)continue;
    s.px=s.x;s.py=s.y;
    if(s.house){s.moving=false;s.stillT+=DT;continue;}   // 驻守中不参与推挤
    const k=(((s.x/cell)|0))*4096+(((s.y/cell)|0));
    let a=grid.get(k);if(!a){a=[];grid.set(k,a);}a.push(s);
  }
  for(const s of G.squads){
    if(!s.alive)continue;
    if(s.house){
      // 撤出建筑：走 exitTime 进度，不是瞬间弹出去
      if(s.leaving){
        s.exitT+=DT;
        if(s.exitT>=HOUSE.exitTime)exitHouse(s);
      }
      updateMemberSlots(s,false);continue;
    }
    let mx=0,my=0,moving=false;
    if(s.coverT>0)s.coverT-=DT;
    if(s.order||s.retreat){
      const gx=clamp((s.goalX/TS)|0,0,GW-1), gy=clamp((s.goalY/TS)|0,0,GH-1);
      const dg=d2(s.x,s.y,s.goalX,s.goalY);
      if(dg<16*16){
        s.arrived=true;
        if(s.order&&s.order.type==='enter'){
          const ho=s.order.ho;
          if(!canEnter(s,ho)){s.order=null;s.enterT=0;}     // 塌了或满了就放弃
          else{
            // 进驻要花 enterTime，期间不开火、可被新指令打断
            s.enterT=(s.enterT||0)+DT;
            if(s.enterT>=HOUSE.enterTime){enterHouse(s,ho);s.order=null;}
            continue;
          }
        }
        if(s.order&&s.order.type==='move')s.order=null;
        if(s.retreat){s.retreat=false;s.order=null;log('部队已撤回基地',0,s.team);}
        // 到位后自动就近进驻掩体（每次新指令只做一次，不会来回抖）
        if(!s.retreat&&!s.coverUsed&&s.def.armor===0&&s.coverT<=0){
          s.coverUsed=true;s.coverT=1.5;
          const th=threatOf(s);
          const c=findCover(s,s.x,s.y,th[0],th[1]);
          if(c&&d2(s.x,s.y,c[0],c[1])>20*20){
            s.goalX=c[0];s.goalY=c[1];s.arrived=false;
            if(!s.order)s.order={type:'move',auto:true};
          }
        }
      }else{
        const inRange=s.target&&
          d2(s.x,s.y,s.target.x,s.target.y)<=(s.def.maxRange*0.92)*(s.def.maxRange*0.92);
        const ot=s.order&&s.order.type;
        // 攻击移动与强制攻击都是"进了射程就停下打"
        const hold=!!((ot==='amove'||ot==='forceattack')&&inRange)||ot==='deploy';
        if(!hold){
          // 架着的先撤收，撤完才能走——这是架设的机动代价
          if(isDeployed(s)){
            s.teardownT=(s.teardownT||0)+DT;
            const td=teardownOf(s);
            if(s.teardownT>=td){undeploy(s);s.teardownT=0;}
          }else{
          moving=true;
          let dx,dy;
          if(dg<74*74){dx=s.goalX-s.x;dy=s.goalY-s.y;}
          else{
            const f=getField(gx,gy);
            const d=f?f.dir[ti(clamp((s.x/TS)|0,0,GW-1),clamp((s.y/TS)|0,0,GH-1))]:-1;
            if(d>=0){dx=-DIRS[d][0];dy=-DIRS[d][1];}else{dx=s.goalX-s.x;dy=s.goalY-s.y;}
          }
          const L=Math.hypot(dx,dy)||1;mx=dx/L;my=dy/L;
          }
        }
      }
    }
    let sx=0,sy=0;
    const cx=(s.x/cell)|0, cy=(s.y/cell)|0, rr=s.def.vehicle?19:15;
    for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){
      const a=grid.get((cx+j)*4096+(cy+k));if(!a)continue;
      for(const o of a){
        if(o===s||!o.alive)continue;
        const R=rr+(o.def.vehicle?19:15), dd=d2(s.px,s.py,o.px,o.py);
        if(dd<R*R&&dd>1){const d=Math.sqrt(dd),f=(R-d)/R;sx+=(s.px-o.px)/d*f;sy+=(s.py-o.py)/d*f;}
      }
    }
    const sp=speedOf(s);
    let vx=mx*sp+sx*sp*.85, vy=my*sp+sy*sp*.85;
    const vl=Math.hypot(vx,vy);
    if(vl>sp*1.35){vx=vx/vl*sp*1.35;vy=vy/vl*sp*1.35;}
    let nx=s.x+vx*DT, ny=s.y+vy*DT;
    if(!passable((nx/TS)|0,(s.y/TS)|0))nx=s.x;
    if(!passable((s.x/TS)|0,(ny/TS)|0))ny=s.y;
    s.x=clamp(nx,10,WW-10);s.y=clamp(ny,10,WH-10);
    const realSp=Math.hypot(s.x-s.px,s.y-s.py)/DT;
    if(realSp<6){s.stillT+=DT;}else{s.stillT=0;undeploy(s);}
    if(moving&&(mx||my))s.facing=Math.atan2(my,mx);
    s.moving=realSp>6;
    s.bob+=realSp*DT*0.42;
    if(s.def.vehicle&&realSp>20&&rnd()<.34)
      FX.dust.push({x:s.x-Math.cos(s.facing)*14,y:s.y-Math.sin(s.facing)*14,t:0,
        r:5+rnd()*4,vx:(rnd()-.5)*16,vy:(rnd()-.5)*16,vh:9,h:2,life:.75});
    updateMemberSlots(s,realSp>6);
  }
}
function updateMemberSlots(s,moving){
  const n=s.members.length;
  let cands=null;
  if(!moving&&!s.house){
    cands=[];
    const cx=(s.x/TS)|0, cy=(s.y/TS)|0;
    for(let y=cy-2;y<=cy+2;y++)for(let x=cx-2;x<=cx+2;x++){
      if(x<0||y<0||x>=GW||y>=GH)continue;
      const ci=coverAt[ti(x,y)];if(ci<0)continue;
      const c=covers[ci], dd=d2(c.x,c.y,s.x,s.y);
      if(dd>54*54)continue;
      cands.push({c,dd});
    }
    cands.sort((a,b)=>a.dd-b.dd);
    if(!cands.length)cands=null;
  }
  for(let i=0;i<n;i++){
    const m=s.members[i];
    m.pox=m.ox;m.poy=m.oy;
    if(s.house){
      // 建筑内：散布在楼内，靠窗
      m.tox=m.tox||0;m.toy=m.toy||0;
    }else if(cands){
      const e=cands[i%cands.length].c;
      const lane=((i/cands.length)|0)*15-((n/cands.length)|0)*7;
      m.tox=e.x-s.x-e.nx*4-e.ny*lane;
      m.toy=e.y-s.y-e.ny*4+e.nx*lane;
      const L=Math.hypot(m.tox,m.toy);
      if(L>46){m.tox=m.tox/L*46;m.toy=m.toy/L*46;}
    }else{
      m.tox=(i%2)*19-9.5;m.toy=((i/2)|0)*26-13;
    }
    m.ox=lerp(m.ox,m.tox,.14);m.oy=lerp(m.oy,m.toy,.14);
  }
}
function aliveMen(s){let n=0;for(const m of s.members)if(m.alive)n++;return n;}
function hpRatio(s){let h=0,t=0;for(const m of s.members){h+=m.alive?m.hp:0;t+=s.def.hp;}return h/t;}
function acquire(s){
  const w=s.def.w, RB=s.house?1.18:1, R=s.def.maxRange*RB+26;   // 索敌用小队最大射程
  let best=null,bd=1e12,bt=null;
  for(const o of G.squads){
    if(!o.alive||!isEnemyTeam(o.team,s.team))continue;
    if(o.house&&o.house.melee)continue;      // 绞肉中的楼对外中立，只能靠强制攻击介入
    const dd=d2(s.x,s.y,o.x,o.y);
    if(dd>R*R)continue;
    if(w.min&&dd<w.min*w.min)continue;
    if(!s.def.indirect&&!los(s.x,s.y,o.x,o.y,s.house,o.house))continue;
    // 间瞄需要观察。人类队走视野网格（含基地与驻守加成），AI 队放水直接过。
    // 旧代码里 team0 走 seen()、team1 走逐单位检查，是一处真实的左右不对称。
    if(s.def.indirect&&!seenBy(s.team,o.x,o.y))continue;
    let pw=1;
    if(o.def.armor>0&&!s.def.indirect){
      const eff=w.av?w.av[o.def.armor]:1;
      pw=eff<0.4?2.8:0.45;      // 打不穿就绕开；打得穿就优先咬住（反坦克组的本职）
    }
    const pri=dd*pw;
    if(pri<bd){bd=pri;best=o;bt='squad';}
  }
  if(!best){
    for(const b of G.bldgs){
      if(!isEnemyTeam(b.team,s.team)||b.hp<=0)continue;
      const dd=d2(s.x,s.y,b.x,b.y);
      if(dd<R*R&&(s.def.indirect||los(s.x,s.y,b.x,b.y,s.house))){best=b;bt='bld';}
    }
  }
  s.target=best;s.tgtType=bt;
}
function tickCombat(){
  // 逐帧反转遍历方向：否则数组里靠前的一方总是先造成伤害，溅射武器会把这点偏差放大
  const N=G.squads.length, fwd=(G.tick&1)===0;
  for(let idx=0;idx<N;idx++){
    const s=G.squads[fwd?idx:N-1-idx];
    if(!s||!s.alive)continue;
    const RB=s.house?1.18:1;
    s.retarget-=DT;
    if(s.retarget<=0){s.retarget=.35+rnd()*.2;
      const keep=s.def.maxRange*RB+40;
      if(s.tgtType==='ground'){
        // 强制攻击的地面目标由玩家指定，不自动放弃、也不自动改目标
        if(!s.order||s.order.type!=='forceattack'){s.target=null;s.tgtType=null;}
      }else{
        if(s.target&&(s.tgtType==='squad'
          ?(!s.target.alive||d2(s.x,s.y,s.target.x,s.target.y)>keep*keep)
          :s.target.hp<=0))s.target=null;
        if(!s.target||rnd()<.5)acquire(s);
      }
    }
    if(s.retreat){undeploy(s);continue;}
    // 绞肉中：全力近战，放弃对外火力。进楼绞肉 = 主动放弃这支部队的输出
    if(s.house&&s.house.melee){s.target=null;s.tgtType=null;continue;}
    if(s.enterT>0||s.leaving)continue;        // 进出建筑途中不开火
    const t=s.target;
    if(!t){
      // 没有目标但玩家指定了架设方向 → 预架设，等敌人进射界
      if(s.aimDir!==null&&s.aimDir!==undefined&&s.stillT>=0.15){
        for(const m of s.members){
          if(!m.alive||!m.weapon||!m.weapon.needsSetup||m.deployed)continue;
          m.arcCenter=s.aimDir;m.deployT+=DT;
          if(m.deployT>=(m.weapon.setupTime||0))m.deployed=true;
        }
        squadFacing(s,s.aimDir);
      }
      continue;
    }
    const ang=Math.atan2(t.y-s.y,t.x-s.x);
    squadFacing(s,ang);
    const dd=d2(s.x,s.y,t.x,t.y), R=s.def.maxRange*RB;
    if(dd>R*R)continue;
    const accMul=(s.supp>.85?.35:(s.supp>.4?.58:1));
    for(let i=0;i<s.members.length;i++){
      const m=s.members[i];if(!m.alive)continue;
      const ww=m.weapon;
      if(!ww||ww.range<=0)continue;             // 弹药手之类：不开火
      if(!memberCanFire(s,m,ang))continue;      // 需架设的武器各自判自己的架设与射界
      m.cd-=DT;
      if(m.cd>0)continue;
      m.cd=1/ww.rof*(.85+rnd()*.3);
      const ox=s.x+m.ox, oy=s.y+m.oy;
      const md=d2(ox,oy,t.x,t.y), mr=ww.range*RB;
      if(md>mr*mr){m.cd=.3;continue;}           // 逐兵各判自己的射程
      if(ww.min&&md<ww.min*ww.min){m.cd=.3;continue;}
      if(ww.indirect){fireShell(s,t,ww);sfx('mortar',ox,oy);continue;}
      fireBullet(s,t,ox,oy,ww,accMul);
      fxFlash(ox,oy);
      sfx(sfxOf(s,ww),ox,oy);
    }
    // 载具同轴机枪：不占成员位，与主炮各自独立冷却
    const cx2=s.def.coaxW;
    if(cx2){
      s.cd2-=DT;
      if(s.cd2<=0&&dd<cx2.range*cx2.range){
        s.cd2=1/cx2.rof*(.85+rnd()*.3);
        fireBullet(s,t,s.x,s.y,cx2,accMul);
        fxFlash(s.x+Math.cos(s.facing)*12,s.y+Math.sin(s.facing)*12);
        sfx('mg',s.x,s.y);
      }
    }
  }
}
/* 逐成员判定能否开火。班里的步枪手不再因为机枪没架好而被一起卡住。 */
function memberCanFire(s,m,ang){
  const w=m.weapon;
  if(!w||w.range<=0)return false;
  if(!w.needsSetup)return true;
  if(s.stillT<0.15)return false;               // 移动中架不了
  if(m.deployed){
    const da=Math.atan2(Math.sin(ang-m.arcCenter),Math.cos(ang-m.arcCenter));
    if(Math.abs(da)>(w.arc||1.1)){m.deployed=false;m.deployT=0;return false;}  // 转出射界要重架
    return true;
  }
  if(s.aimDir!==null&&s.aimDir!==undefined){   // 玩家主动指定了方向，就照他说的架
    m.arcCenter=s.aimDir;
  }else{
    m.arcCenter=ang;                           // 自动架设：朝当前目标
  }
  m.deployT+=DT;
  if(m.deployT>=(w.setupTime||0)){m.deployed=true;return true;}
  return false;
}
/* 小队朝向：非架设单位跟着目标转；架设单位由架设方向决定（渲染与射界都用它） */
function squadFacing(s,ang){
  if(!s.def.setup){s.facing=ang;return;}
  for(const m of s.members)
    if(m.alive&&m.weapon&&m.weapon.needsSetup&&m.arcCenter!==null){s.facing=m.arcCenter;return;}
  s.facing=ang;
}
/* 撤收：有人架着就先拆，拆完才允许移动 */
function undeploy(s){
  let any=false;
  for(const m of s.members)if(m.deployed||m.deployT>0){m.deployed=false;m.deployT=0;any=true;}
  s.aimDir=null;
  return any;
}
const isDeployed=s=>s.members.some(m=>m.alive&&m.deployed);
/* 撤收耗时取队内需架设武器中最慢的 */
function teardownOf(s){
  let td=0;
  for(const m of s.members)
    if(m.alive&&m.weapon&&m.weapon.needsSetup)td=Math.max(td,m.weapon.teardownTime||0.4);
  return td;
}
function fireBullet(s,t,ox,oy,w,accMul){
  const src={team:s.team,type:s.type,weapon:w.id};   // 统计归因，跟着伤害一路传下去
  if(s.tgtType==='ground'){
    // 强制攻击地面：无差别，team 传 -1 让 explodeAt 不排除任何一方
    fxTracer(ox,oy,t.x+(rnd()-.5)*26,t.y+(rnd()-.5)*20,s.team,true);
    if(w.splash)explodeAt(t.x+(rnd()-.5)*24,t.y+(rnd()-.5)*18,w.splash,w.dmg,w.av,w.supp,-1,src);
    return;
  }
  if(s.tgtType==='bld'){
    fxTracer(ox,oy,t.x+(rnd()-.5)*50,t.y+(rnd()-.5)*40,s.team,true);
    if(w.splash)explodeAt(t.x+(rnd()-.5)*46,t.y+(rnd()-.5)*38,w.splash,w.dmg,w.av,w.supp,s.team,src);
    else t.hp-=w.dmg*.55;
    if(t.hp<=0)buildingDown(t);return;
  }
  const men=t.members.filter(m=>m.alive);
  if(!men.length)return;
  const m=men[(rnd()*men.length)|0];
  const px=t.x+m.ox, py=t.y+m.oy;
  const d=Math.sqrt(d2(ox,oy,px,py));
  let acc=w.acc*accMul*(1-.30*(d/w.range));
  if(t.moving)acc*=.86;
  if(w.accInf&&t.def.armor===0)acc*=w.accInf;  // 反装甲武器打步兵很难命中
  if(t.house)acc*=.86;                     // 建筑内难打中
  else if(inCover(t))acc*=.90;
  const hit=rnd()<acc;
  fxTracer(ox,oy,px+(rnd()-.5)*13,py+(rnd()-.5)*13,s.team,hit||!!w.splash);
  if(!t.def.vehicle)
    t.supp=clamp(t.supp+w.supp*(t.retreat?.4:1)*(t.house?.55:1),0,1);
  if(w.splash){                            // 榴弹/火箭：命中落人身上，脱靶落偏
    const ex=hit?px:px+(rnd()-.5)*54, ey=hit?py:py+(rnd()-.5)*54;
    explodeAt(ex,ey,w.splash,w.dmg,w.av,w.supp,s.team,src);
    return;
  }
  if(!hit)return;
  let dmg=w.dmg*coverFactor(t,m,ox,oy)*(w.av?w.av[t.def.armor]:1);
  if(t.retreat)dmg*=.55;
  hurt(t,m,dmg,px,py,src);
}
/* 统一的爆炸结算：迫击炮弹、坦克主炮、火箭筒共用。
   team<0 = 无差别爆炸（强制攻击），楼内外各方一起吃。 */
function explodeAt(x,y,r,dmg,av,supp,team,src){
  const noIFF=team<0;
  fxBoom(x,y,r);
  if(r>30)fxDecal(x,y,9+rnd()*7,true);
  for(const o of G.squads){
    if(!o.alive||(!noIFF&&!isEnemyTeam(o.team,team)))continue;
    if(d2(o.x,o.y,x,y)>(r+44)*(r+44))continue;
    const mult=av?av[o.def.armor]:1;
    if(!o.def.vehicle)o.supp=clamp(o.supp+supp*(o.house?1.35:1),0,1);
    for(const m of o.members){
      if(!m.alive)continue;
      const dd=Math.sqrt(d2(o.x+m.ox,o.y+m.oy,x,y));
      if(dd>r)continue;
      let dm=dmg*(1-dd/r)*mult;
      if(o.house&&!o.house.ruin)dm*=o.house.drBlast;   // 楼里挨炸更惨，逼迫玩家不能一直龟着
      hurt(o,m,dm,o.x+m.ox,o.y+m.oy,src);
    }
  }
  for(const h of G.houses){
    if(h.ruin)continue;
    if(d2(h.cx,h.cy,x,y)<(r+62)*(r+62)){h.hp-=dmg*.85;if(h.hp<=0)ruinHouse(h);}
  }
  for(const b of G.bldgs){
    if((!noIFF&&!isEnemyTeam(b.team,team))||b.hp<=0)continue;
    if(d2(b.x,b.y,x,y)<(r+72)*(r+72)){b.hp-=dmg*1.25;if(b.hp<=0)buildingDown(b);}
  }
}
/* 开火音效按武器分类，不再按兵种硬判 */
function sfxOf(s,w){
  if(w.splash&&w.dmg>=30)return 'mortar';       // 坦克炮 / 火箭筒
  if(w.rof>=4)return s.def.vehicle?'car':'mg';
  return 'rifle';
}
function fireShell(s,t,wp){
  const w=wp||s.def.w, sc=42;
  G.shells.push({x:s.x,y:s.y,sx:s.x,sy:s.y,tx:t.x+(rnd()-.5)*sc,ty:t.y+(rnd()-.5)*sc,
    t:0,dur:1.25,team:s.team,dmg:w.dmg,splash:w.splash,supp:w.supp,av:w.av,
    src:{team:s.team,type:s.type,weapon:w.id}});   // 炮弹要飞一秒多，落地时得知道是谁打的
}
function tickShells(){
  for(let i=G.shells.length-1;i>=0;i--){
    const p=G.shells[i];p.t+=DT;
    const k=p.t/p.dur;
    p.x=lerp(p.sx,p.tx,k);p.y=lerp(p.sy,p.ty,k);
    if(k<1)continue;
    G.shells.splice(i,1);
    sfx('boom',p.tx,p.ty);
    explodeAt(p.tx,p.ty,p.splash,p.dmg,p.av,p.supp,p.team,p.src);
  }
}
/* src 是伤害来源，用来给赛后统计归因：
     {team, type, weapon}  某支部队用某件武器打的
     {cause:'melee', team} 室内绞肉
     {cause:'collapse'}    房塌，没有攻击方
   传 null 表示来源不明，只记到受害方头上。 */
function hurt(s,m,dmg,px,py,src){
  const real=Math.min(dmg,Math.max(0,m.hp));   // 溢出伤害不算进统计，否则房塌一次就是 1e9
  m.hp-=dmg;
  statDamage(s,real,src);
  if(m.hp>0)return;
  m.alive=false;
  statKill(s,src);
  fxDecal(px,py,5+rnd()*3,false);
  if(aliveMen(s)===0){
    s.alive=false;G.teams[s.team].pop-=s.def.pop;
    if(s.house){const gi=s.house.gar.indexOf(s);if(gi>=0)s.house.gar.splice(gi,1);s.house=null;}
    if(s.def.vehicle){fxBoom(s.x,s.y,40);sfx('boom',s.x,s.y);}
    statSquadLost(s,src);
    log(s.def.name+' 被歼灭',2,s.team);
    // 不再直接改 View 的 selection：syncSel() 每帧过滤掉阵亡单位，由它负责
  }
}
function buildingDown(b){
  b.hp=0;
  for(let t=0;t<G.teams.length;t++)log(t===b.team?'我方基地被摧毁！':'敌方基地被摧毁！',1,t);
}
function tickSupp(){
  for(const s of G.squads){
    if(!s.alive)continue;
    if(s.def.vehicle){s.supp=0;continue;}
    s.supp=clamp(s.supp-(inCover(s)?.24:.14)*DT,0,1);
  }
}
function tickPoints(){
  const nA=G.alliances.length, w=new Array(nA);
  for(const p of G.pts){
    w.fill(0);
    for(const s of G.squads){
      if(!s.alive||s.retreat)continue;
      if(d2(s.x,s.y,p.x,p.y)>95*95)continue;
      w[allianceOf(s.team)]+=s.def.vehicle?.6:1;
    }
    let A=-1,n=0;
    for(let a=0;a<nA;a++)if(w[a]>0){A=a;n++;}
    if(n!==1)continue;                                  // 无人或多方在场 = 僵持
    const rate=.085*Math.min(w[A],2.4)*DT;
    if(p.capBy===A){
      if(p.cap>=1)continue;
      p.cap=Math.min(1,p.cap+rate);
      if(p.cap>=1&&p.owner!==A){
        p.owner=A;
        for(let t=0;t<G.teams.length;t++){
          const mine=allianceOf(t)===A;
          log((mine?'已占领 ':'失去 ')+p.name,mine?1:2,t);
        }
      }
    }else{                                              // 先把对方的进度撬掉，再从 0 开始占
      p.cap=Math.max(0,p.cap-rate);
      if(p.cap<1)p.owner=-1;
      if(p.cap<=0)p.capBy=A;
    }
  }
  const cnt=new Array(nA).fill(0);
  for(const p of G.pts)if(p.owner>=0)cnt[p.owner]++;
  for(const T of G.teams)T.pts=cnt[allianceOf(T.team)];
  // 控制点最多的阵营不掉血，其余按差值流失（1v1 时与旧公式等价）
  let mx=0;for(let a=0;a<nA;a++)if(cnt[a]>mx)mx=cnt[a];
  for(const T of G.teams){
    const d=mx-cnt[allianceOf(T.team)];
    if(d>0)T.vp-=d*1.25*DT;
    T.vp=Math.max(0,T.vp);
  }
}
function tickIncome(){
  const dm=[0.8,1,1.3][G.diff];
  for(const T of G.teams){
    const m=isHuman(T.team)?1:dm;              // 难度加成给 AI 队，不再按队号写死
    T.mp+=(7.5+3.0*T.pts)*m*DT;
    T.fu+=(0.45+0.55*T.pts)*m*DT;
    T.mp=Math.min(T.mp,1600);T.fu=Math.min(T.fu,600);
  }
}
let aiT=0;
function tickAI(){
  aiT-=DT;if(aiT>0)return;
  aiT=1.0;
  for(let t=0;t<G.teams.length;t++)if(!isHuman(t))aiForTeam(t);
}
/* 每个 AI 席位可以有自己的难度（帝国时代那种每台电脑单独设） */
const aiLevelOf=t=>(G.aiLevels&&G.aiLevels[t]!==undefined)?G.aiLevels[t]:G.diff;
/* AI 保持全知（设计决策，见 ROADMAP 5.2）：它的目标选取不查视野。 */
function aiForTeam(team){
  const T=G.teams[team], myA=allianceOf(team);
  const mine=G.squads.filter(s=>s.alive&&s.team===team);
  const cnt={rifle:0,at:0,mg:0,mortar:0,car:0,tank:0};
  mine.forEach(s=>cnt[s.type]++);T.queue.forEach(q=>cnt[q]++);
  let eVeh=0;
  for(const x of G.squads)if(x.alive&&isEnemyTeam(x.team,team)&&x.def.armor>0)eVeh++;
  if(T.queue.length<[1,2,3][aiLevelOf(team)]){
    let pick;
    if(cnt.rifle<2)pick='rifle';
    else if(eVeh>0&&cnt.at<Math.min(3,eVeh+1)&&T.fu>=10)pick='at';
    else if(cnt.tank<2&&T.fu>=65)pick='tank';
    else if(cnt.mg<1&&T.fu>=15)pick='mg';
    else if(cnt.mortar<1&&T.fu>=20)pick='mortar';
    else if(cnt.rifle<4)pick='rifle';
    else if(cnt.car<1&&T.fu>=38)pick='car';
    else if(cnt.at<1&&T.fu>=10)pick='at';
    else if(cnt.mg<2&&T.fu>=15)pick='mg';
    else if(cnt.mortar<2&&T.fu>=20)pick='mortar';
    else pick='rifle';
    tryQueue(team,pick);
  }
  const hqP=enemyBaseOf(team), home=G.bldgs[team];
  for(const s of mine){
    if(hpRatio(s)<(s.def.vehicle?0.25:0.32)&&!s.retreat&&aliveMen(s)>0){
      if(s.house){requestExit(s);continue;}
      s.retreat=true;s.order=null;s.goalX=home.rx;s.goalY=home.ry;continue;
    }
    if(s.retreat)continue;
    if(s.house){                       // 已进驻：守着，除非据点已经拿稳了再出去推进
      if(rnd()<.08){requestExit(s);s.coverUsed=false;}
      continue;
    }
    if(s.order&&s.order.type==='enter'&&!s.arrived)continue;   // 进驻途中不许重评估，否则永远进不去
    if(s.order&&!s.arrived&&rnd()<.85)continue;
    if(s.order&&s.target&&rnd()<.9)continue;
    let best=null,bs=-1e9;
    for(const p of G.pts){
      let base=p.owner===myA?0.4:(p.owner>=0?2.2:3.0);
      let en=false;
      for(const e of G.squads)
        if(e.alive&&isEnemyTeam(e.team,team)&&d2(e.x,e.y,p.x,p.y)<190*190){en=true;break;}
      if(p.owner===myA&&en)base=4.2;
      const sc=base-Math.sqrt(d2(s.x,s.y,p.x,p.y))/1300+rnd()*.35;
      if(sc>bs){bs=sc;best=p;}
    }
    if(hqP&&T.pts>=4&&mine.length>=4&&rnd()<.5)best={x:hqP.rx,y:hqP.ry};
    if(best){
      s.coverUsed=false;
      // 目标点附近有空建筑就进驻，机枪/反坦克优先
      if(s.def.armor===0&&rnd()<(s.def.id==='mg'||s.def.id==='at'?.72:.38)){
        let ho=null,hd=1e12;
        for(const h of G.houses){
          if(h.ruin||houseFull(h))continue;
          const dd=d2(h.cx,h.cy,best.x,best.y);
          if(dd<160*160&&dd<hd){hd=dd;ho=h;}
        }
        if(ho){const dr=doorFor(ho,s.x,s.y);s.order={type:'enter',ho};s.arrived=false;s.goalX=dr[0];s.goalY=dr[1];continue;}
      }
      const a=rnd()*Math.PI*2, r=rnd()*62;
      let gx2=best.x+Math.cos(a)*r, gy2=best.y+Math.sin(a)*r;
      if(s.def.indirect){                    // 间瞄留在后方，靠射程覆盖据点而不是站上去
        const hb=G.bldgs[s.team];
        const dx=hb.x-best.x, dy=hb.y-best.y, L=Math.hypot(dx,dy)||1;
        gx2=best.x+dx/L*185; gy2=best.y+dy/L*185;
      }
      s.order={type:'amove'};s.arrived=false;
      s.goalX=clamp(gx2,20,WW-20);
      s.goalY=clamp(gy2,20,WH-20);
      // 架设兵种到位后朝战线方向预架设，别等敌人进视野才现架
      if(s.def.setup)s.aimDir=Math.atan2(best.y-gy2,best.x-gx2);
    }
  }
}
/* ============ 命令通道 ============
   所有玩家操作都表达成命令对象。单机时本地直接执行，联机时上行给权威 Sim。
   这是联机的关键：输入与状态变更之间只有这一个入口。 */
const byId=id=>{for(const s of G.squads)if(s.id===id&&s.alive)return s;return null;};
function idsOf(list){return list.map(s=>s.id);}
function applyCmd(team,c){
  if(!G||G.over||!c)return;
  recCmd(team,c);               // 录像只记命令；AI 不走这条路，靠确定性重现
  const list=(c.ids||[]).map(byId).filter(s=>s&&s.team===team);
  switch(c.type){
    case 'build': tryQueue(team,c.unit); break;
    case 'move': case 'amove': {
      for(const s of list){
        if(s.house)requestExit(s);
        s.retreat=false;s.arrived=false;s.coverUsed=false;s.aimDir=null;
        if(s.tgtType==='ground'){s.target=null;s.tgtType=null;}
        s.order={type:c.type};
      }
      if(c.tid){
        const t=byId(c.tid);
        if(t)for(const s of list){s.goalX=t.x;s.goalY=t.y;s.target=t;s.tgtType='squad';}
        else formation(list,c.x,c.y);
      }else formation(list,c.x,c.y);
      break;
    }
    case 'enter': {
      const ho=G.houses[c.house];
      if(!ho)break;
      for(const s of list){
        if(s.def.armor>0)continue;
        if(s.house)requestExit(s);
        s.retreat=false;s.arrived=false;s.coverUsed=true;
        const dr=doorFor(ho,s.x,s.y);
        s.order={type:'enter',ho};s.goalX=dr[0];s.goalY=dr[1];
      }
      break;
    }
    case 'stop':
      for(const s of list){s.order=null;s.retreat=false;s.coverUsed=true;
        s.aimDir=null;s.target=null;s.tgtType=null;s.goalX=s.x;s.goalY=s.y;}
      break;
    case 'retreat': {
      const b=G.bldgs[team];
      for(const s of list){if(s.house)requestExit(s);
        s.retreat=true;s.order=null;s.target=null;s.coverUsed=true;
        s.goalX=b.rx;s.goalY=b.ry;}
      break;
    }
    case 'deploy':
      for(const s of list){
        s.aimDir=c.dir;s.retreat=false;s.order={type:'deploy',dir:c.dir};
        s.goalX=s.x;s.goalY=s.y;s.arrived=true;s.coverUsed=true;
        for(const m of s.members)if(m.weapon&&m.weapon.needsSetup){
          m.deployed=false;m.deployT=0;m.arcCenter=c.dir;}
        s.facing=c.dir;
      }
      break;
    case 'forceattack':
      for(const s of list){
        if(s.house)requestExit(s);
        s.retreat=false;s.coverUsed=true;s.arrived=false;
        s.order={type:'forceattack',tx:c.x,ty:c.y};
        s.target={x:c.x,y:c.y};s.tgtType='ground';
        s.goalX=c.x;s.goalY=c.y;
      }
      break;
  }
}
/* 快照：房主 → 客人。地图不传（客人用同一种子本地生成），只传会变的状态。 */
function makeSnapshot(){
  const sq=[];
  for(const s of G.squads){
    if(!s.alive)continue;
    const men=[];
    for(const m of s.members)men.push(m.alive?Math.round(m.hp):-1);
    sq.push([s.id,s.team,s.type,Math.round(s.x*4)/4,Math.round(s.y*4)/4,
             Math.round(s.facing*100)/100,men,Math.round(s.supp*100)/100,
             s.house?s.house.id:-1,s.retreat?1:0,
             s.members.map(m=>m.deployed?1:0).join(''),
             Math.round((s.enterT||0)*10)/10,s.leaving?1:0]);
  }
  /* 建筑几乎从不变，但它比单位数据还大。只在内容变了才带上，
     否则每帧白发几百字节。客户端收不到 houses 就保持原状。 */
  const hsig=G.houses.map(h=>(h.ruin?1:0)+':'+Math.round(h.hp)+':'+h.gar.length+':'+
                             (h.melee?1:0)+':'+h.meleeBy).join('|');
  const hchanged=hsig!==G._hsig;
  if(hchanged)G._hsig=hsig;
  /* 谁在操控哪一队。平时一成不变，只有玩家掉线被 AI 托管（或重连收回）时才动，
     所以跟 houses 一样按变化下发——客户端要靠它显示"托管中"。 */
  const csig=G.ctrl.join(',');
  const cchanged=csig!==G._csig;
  if(cchanged)G._csig=csig;

  return{t:'snap',tick:G.tick,gt:Math.round(G.t*10)/10,
    ctrl:cchanged?G.ctrl.slice():null,
    squads:sq,
    pts:G.pts.map(p=>[p.owner,p.capBy,Math.round(p.cap*100)/100]),
    houses:hchanged
      ? G.houses.map(h=>[h.ruin?1:0,Math.round(h.hp),h.gar.map(g=>g.id),h.melee?1:0,h.meleeBy])
      : null,
    teams:G.teams.map(T=>[Math.round(T.mp),Math.round(T.fu),T.pop,Math.round(T.vp),T.pts,
                          T.queue.slice(),Math.round(T.buildT*10)/10]),
    bldgs:G.bldgs.map(b=>Math.round(b.hp)),
    // 第 4 项是飞行进度：drawShell 靠它算抛物线高度，缺了炮弹就贴地飞
    shells:G.shells.map(p=>[Math.round(p.x),Math.round(p.y),p.team,
                            Math.round(clamp(p.t/p.dur,0,1)*100)/100]),
    logs:G.logs.slice(0,8),
    ev:(G.events&&G.events.length)?G.events:null,   // 本 tick 的特效事件
    over:G.over,winA:G.winAlliance};
}

function simTick(){
  if(G.over)return;
  G.t+=DT;G.tick++;
  fieldBudget=1;                       // 每 tick 的新建流场预算
  if(G.recFX)G.events=[];              // 特效事件按 tick 收集，随快照下发
  tickProduction();tickAI();tickMove();tickCombat();tickShells();tickHouseMelee();
  tickSupp();tickPoints();tickIncome();tickReinforce();
  if(G.tick%4===0)updateVision();
  if(G.tick%20===0)G.squads=G.squads.filter(s=>s.alive);
  // 多阵营淘汰：阵营内所有队都 vp 归零或基地被毁则出局，剩最后一个阵营即胜
  const live=[];
  for(const a of G.alliances){
    for(let t=0;t<G.teams.length;t++){
      if(allianceOf(t)!==a)continue;
      // 两个胜利条件各自可关。都关掉就只能靠超时收场
      const deadVp=RULES.winByVp&&G.teams[t].vp<=0;
      const deadHq=RULES.winByHq&&G.bldgs[t].hp<=0;
      if(!deadVp&&!deadHq){live.push(a);break;}
    }
  }
  if(live.length<=1)endGame(live.length?live[0]:-1);
}
/* Sim 只记录结果，不碰 DOM——结算界面由 View 的 syncEnd() 消费。
   权威 Sim 要能在 Node 里无头跑，这是硬约束。 */
function endGame(winA){
  if(G.over)return;
  G.winAlliance=winA;
  // G.over 保持 1=首个阵营胜 / 2=其它，harness 与旧代码都依赖这个约定
  G.over=(winA===G.alliances[0])?1:2;
}
/* team 省略或 <0 = 全局消息；否则只有该队的客户端会显示它 */
function log(txt,hi,team){
  if(!G)return;
  G.logs.unshift({txt,hi,team:(team===undefined?-1:team),t:G.t});
  if(G.logs.length>24)G.logs.pop();
  G.logDirty=true;
}
