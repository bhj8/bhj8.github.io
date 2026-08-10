/* =============================================================================
   FRONTLINE — view/hud.js
   HUD 同步：资源、选中面板、技能栏、生产队列、日志。
   ============================================================================= */
/* ---------------- HUD ---------------- */
function $(id){return document.getElementById(id);}
function buildButtons(){
  $('btns').innerHTML=ORDER.map(t=>{
    const d=UNITS[t];
    return '<button class="bt" data-t="'+t+'"><span class="k">'+d.key+'</span>'+
      '<div class="n">'+d.name+'</div><div class="c">'+d.mp+'人力'+(d.fu?' '+d.fu+'油':'')+
      ' · '+d.pop+'口 · '+d.build+'s</div></button>';
  }).join('');
  const bs=$('btns').querySelectorAll('.bt');
  for(const b of bs)b.onclick=()=>{initAudio();cmd({type:'build',unit:b.dataset.t});syncBuild();};
  $('dots').innerHTML=G.pts.map(()=>'<i class="dot"></i>').join('');
}
function syncBuild(){
  const T=G.teams[myTeam];
  let qp=0;T.queue.forEach(q=>qp+=UNITS[q].pop);
  const bs=$('btns').querySelectorAll('.bt');
  for(const b of bs){
    const d=UNITS[b.dataset.t];
    b.disabled=(T.mp<d.mp||T.fu<d.fu||T.pop+qp+d.pop>POPCAP||T.queue.length>=5);
  }
  const q=$('queue');
  if(!T.queue.length){q.innerHTML='<span id="qempty">生产队列 空</span>';return;}
  q.innerHTML=T.queue.map((t,i)=>{
    const d=UNITS[t], p=i===0?clamp(T.buildT/d.build,0,1):0;
    return '<div class="q"><i style="width:'+(p*100).toFixed(1)+'%"></i><span>'+d.name.slice(0,3)+'</span></div>';
  }).join('');
}
/* ---- 消费 Sim 产出的日志与结算结果（Sim 侧只写数据，不碰 DOM） ---- */
function syncLog(){
  if(!G||!G.logDirty)return;
  G.logDirty=false;
  $('log').innerHTML=G.logs.filter(l=>l.team<0||l.team===myTeam).slice(0,6)
    .map(l=>'<div class="'+(l.hi?'hi':'')+'">'+l.txt+'</div>').join('');
}
let endShown=false;
function syncEnd(){
  if(!G||!G.over||endShown)return;
  endShown=true;
  const win=G.winAlliance===allianceOf(myTeam), foe=1-myTeam;
  $('endt').textContent=win?'胜利':'失败';
  $('endt').className=win?'win':'lose';
  $('ende').textContent=win?'战 线 稳 固':'战 线 崩 溃';
  const m=Math.floor(G.t/60),s2=Math.floor(G.t%60);
  $('endd').textContent=(win?'敌军战力值耗尽。':'我军战力值耗尽。')+
    ' 用时 '+m+'分'+String(s2).padStart(2,'0')+'秒 · 剩余战力 '+
    Math.ceil(G.teams[myTeam].vp)+' : '+Math.ceil(G.teams[foe].vp);
  renderEndStats();
  $('endo').classList.remove('hide');
}
function renderEndStats(){
  const box=$('endstats');
  if(!box||!G||!G.stats)return;
  box.innerHTML=endStatsHTML(G.stats,myTeam);
}
/* 赛后统计。数值是设计者调的，而调数值得看得见结果——
   "机枪班是不是太强了"这种问题，靠回想战斗过程是答不出来的。

   抽成纯函数是为了能直接断言渲染结果：只调 renderEndStats 的话，
   innerHTML 落进 stub 里，"伤害有没有显示出来"根本测不到。 */
function endStatsHTML(S,myTeam){
  if(!S)return '';
  const top=(o,n)=>{
    const ks=Object.keys(o).sort((a,b)=>o[b]-o[a]).slice(0,n);
    if(!ks.length)return '<em>—</em>';
    return ks.map(k=>esc(nameOfKey(k))+' <em>'+Math.round(o[k])+'</em>').join('　');
  };
  const rows=[];
  for(const t of S.teams){
    const me=t.team===myTeam;
    rows.push('<div class="stblk"><div class="sthead">'+
      '<span class="sdot" style="background:'+TC[t.team%TC.length]+'"></span>'+
      (me?'我方':('队伍 '+(t.team+1)))+
      '<b>伤害 '+Math.round(t.dmgOut)+' · 承受 '+Math.round(t.dmgIn)+
      ' · 人头 '+t.kills+' · 阵亡 '+t.deaths+'</b></div>'+
      '<div class="strow"><span>造兵</span><span>'+
        (Object.keys(t.built).length
          ? Object.keys(t.built).map(k=>esc(nameOfKey(k))+' <em>×'+t.built[k]+'</em>').join('　')
          : '<em>—</em>')+
        '　<em>'+Math.round(t.spentMp)+'人力 '+Math.round(t.spentFu)+'油</em></span></div>'+
      '<div class="strow"><span>伤害来源</span><span>'+top(t.dmgByWeapon,4)+'</span></div>'+
      '<div class="strow"><span>人头来源</span><span>'+top(t.killsByWeapon,4)+'</span></div>'+
      '<div class="strow"><span>打死的兵</span><span>'+top(t.killsByVictimType,4)+'</span></div>'+
      '<div class="strow"><span>自己死的</span><span>'+top(t.deathsByType,4)+'</span></div>'+
      '</div>');
  }
  rows.push('<div class="stfoot">室内绞肉致死 '+S.meleeDeaths+
    '　房塌压死 '+S.collapseDeaths+
    '　打塌建筑 '+S.housesRuined+
    '　绞肉场次 '+S.meleeLog.filter(e=>e.on).length+'</div>');
  return rows.join('');
}
/* 统计表的键有的是兵种 id、有的是武器 id，都翻成中文名 */
function nameOfKey(k){
  return (UNITS[k]&&UNITS[k].name)||(WEAPONS[k]&&WEAPONS[k].name)||k;
}
/* 把这局的录像存成文件。用 recSnapshot 而不是 recStop——
   点了下载不代表这局就不能再录了（比如结算界面开着又回去看回放）。 */
function downloadReplay(){
  const tape=(typeof recSnapshot==='function')?recSnapshot():null;
  if(!tape){log('这局没有录像可存',2,myTeam);return;}
  try{
    const blob=new Blob([replayToJSON(tape)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='frontline-seed'+tape.seed+'-'+(tape.ticks||0)+'t.json';
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
  }catch(e){
    log('录像保存失败：'+e.message,2,myTeam);
  }
}
let hudT=0;
function syncHUD(){
  const T=G.teams[myTeam];
  $('mp').textContent=Math.floor(T.mp);
  $('fu').textContent=Math.floor(T.fu);
  $('pop').textContent=T.pop+'/'+POPCAP;
  $('mpr').textContent='+'+(7.5+3*T.pts).toFixed(1);
  $('fur').textContent='+'+(0.45+0.55*T.pts).toFixed(2);
  const a=G.teams[myTeam].vp, b=G.teams[1-myTeam].vp, tot=2500;
  $('vp0').style.width=(a/tot*100)+'%';
  $('vp1').style.width=(b/tot*100)+'%';
  $('vp0t').textContent=Math.ceil(a);
  $('vp1t').textContent=Math.ceil(b);
  const dots=$('dots').children;
  const myA=allianceOf(myTeam);
  G.pts.forEach((p,i)=>{if(dots[i])dots[i].className='dot'+
    (p.owner<0?'':(p.owner===myA?' b':' r'));});
  const m=Math.floor(G.t/60),s=Math.floor(G.t%60);
  $('clock').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  syncBuild();syncSel();syncLog();syncEnd();
}
/* 技能栏：把选中集里所有可用技能并集列出来，数据驱动，加技能不用改这里 */
function syncAbils(list){
  const bar=$('abils');if(!bar)return;
  const seen2={}, av=[];
  for(const s of list)for(const a of abilitiesOf(s))if(!seen2[a.id]){seen2[a.id]=1;av.push(a);}
  if(!av.length){bar.innerHTML='';return;}
  bar.innerHTML=av.map(a=>{
    const on=(a.id==='deploy'&&pending==='deploy')||(a.id==='forceAttack'&&pending==='force');
    return '<button class="abil'+(on?' on':'')+'" data-a="'+a.id+'" title="'+a.hint+'">'+
           a.name+'<b>'+(a.id==='deploy'?'D':'Ctrl+右键')+'</b></button>';
  }).join('');
  const bs=bar.querySelectorAll('.abil');
  for(const b of bs)b.onclick=()=>{
    setPending(b.dataset.a==='deploy'?'deploy':'force');syncSel();
  };
}
function syncSel(){
  const list=selection.filter(s=>s.alive);
  if(list.length!==selection.length)selection=list;
  const head=$('selhead'), body=$('selbody');
  syncAbils(list);
  if(!list.length){head.textContent='未选择单位 · 框选你的部队';body.innerHTML='';return;}
  head.textContent='已选择 '+list.length+' 支部队';
  if(list.length<=4){
    body.innerHTML=list.map(s=>{
      const hr=hpRatio(s);
      const st=[];
      if(s.retreat)st.push('撤退中');
      else if(s.supp>.85)st.push('钉扎');
      else if(s.supp>.4)st.push('被压制');
      // 驻守时把楼的材质说出来：木造挨一发炮就塌，混凝土能扛，这直接影响去留
      if(s.house&&!s.house.ruin){
        const M=HOUSE_MATS[s.house.mat];
        st.push(s.house.melee?'绞肉中':('驻守 · '+(M?M.name:'建筑')));
      }
      else if(inCover(s))st.push('掩体');
      if(s.def.setup){
        const need=s.members.filter(m=>m.alive&&m.weapon&&m.weapon.needsSetup);
        const on=need.filter(m=>m.deployed).length;
        st.push(on?('已架设 '+on+'/'+need.length):'未架设');
      }
      if(s.order&&s.order.type==='forceattack')st.push('强攻中');
      if(!st.length)st.push(s.order?'行进中':'待命');
      const cl=hr<.35?'crit':(hr<.65?'warn':'');
      return '<div class="card '+cl+'"><div class="nm">'+s.def.name+
        ' <span style="color:var(--dim);font-family:var(--mono);font-size:10px">'+
        aliveMen(s)+'/'+s.def.men+'</span></div><div class="st">'+st.join(' · ')+
        '</div><div class="hp"><i style="width:'+(hr*100).toFixed(0)+'%"></i></div></div>';
    }).join('');
  }else{
    const cnt={};list.forEach(s=>cnt[s.type]=(cnt[s.type]||0)+1);
    const avg=list.reduce((a,s)=>a+hpRatio(s),0)/list.length;
    body.innerHTML=Object.keys(cnt).map(t=>'<div class="chip">'+UNITS[t].name+' <b>×'+cnt[t]+'</b></div>').join('')
      +'<div class="chip">平均战力 <b>'+(avg*100).toFixed(0)+'%</b></div>';
  }
}
