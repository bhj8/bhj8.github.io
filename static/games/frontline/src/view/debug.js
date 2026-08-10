/* =============================================================================
   FRONTLINE — view/debug.js
   调参面板：把配置表直接铺成可编辑的表单。

   设计原则：不写死字段清单。面板遍历配置对象本身生成控件，所以以后往
   WEAPONS 里加一件武器、往 UNITS 里加一个兵种、往 HOUSE 里加一个旋钮，
   面板会自动出现对应的输入框，不用回来改这个文件。

   ` 或 F1 呼出。改动即时写回配置对象；标了「需重开」的项影响地图生成或
   派生量，改完点「用新配置重开」才生效。
   ============================================================================= */

/* 面板文案。配置表本身登记在 core/config.js 的 SIM_TUNABLES ——
   录像也要遍历那份清单，两处共用一份，加了新表不会只改到其中一边。
   这里只补 UI 侧的名字与说明；没在这张表里的分组不显示。 */
const DBG_META={
  weapons:{name:'武器',
    hint:'每件武器独立。cqb 是室内近战权重——机枪在楼里几乎无用就是靠它表达的。'},
  units:{name:'单位编成',
    hint:'squad 数组决定人数与每人拿什么武器。改完点重算，maxRange/sight 会跟着派生。'},
  house:{name:'建筑',
    hint:'drDirect 越小越抗直射；drBlast 大于 1 表示楼里挨炸更惨。'},
  mats:{name:'建筑材质',
    hint:'hp 是相对 HOUSE.hp 的倍率。改完要重开——材质在开局建房时就定死了。'},
  matmix:{name:'材质分布',
    hint:'按格数分档，档内按概率抽。同一档三项加起来应为 1。'},
  melee:{name:'室内绞肉',
    hint:'战力 = Σ(活着的人 × 他武器的 cqb)。defenderBonus 是先入者加成。'},
  vision:{name:'视野',
    hint:'engageRatio 是交战圈，动它等于改平衡。heightFactor 默认 0（关闭高地加成）。'},
  map:{name:'地图生成',
    hint:'改完必须重开。gw/gh 可以随便调，超过 12 万格控制台会告警。'},
  // rules 不在面板里——开始界面已经有一份表单，重复摆两处只会改岔
};
/* Sim 侧的表从 SIM_TUNABLES 来，末尾追加纯 View 的手感开关 */
const DBG_GROUPS=SIM_TUNABLES
  .filter(t=>DBG_META[t.id])
  .map(t=>({id:t.id,scope:t.scope,get:t.get,
            name:DBG_META[t.id].name,hint:DBG_META[t.id].hint}))
  .concat([{id:'feel',name:'操作手感',scope:'live',get:()=>FEEL,
            hint:'四项独立开关，不顺手可单独关掉。'}]);

let dbgOpen=false, dbgTab='weapons';

function dbgEl(){return document.getElementById('dbg');}
function toggleDebug(force){
  const el=dbgEl();if(!el)return;
  dbgOpen=(force===undefined)?!dbgOpen:force;
  el.classList.toggle('hide',!dbgOpen);
  if(dbgOpen)renderDebug();
}

/* 把任意嵌套对象铺成控件。数字→number，布尔→checkbox，字符串→text，
   数组→逗号分隔的 text（squad 那种），对象→递归一层缩进。 */
function dbgField(obj,key,path,onChange){
  const v=obj[key];
  const id='dbgf_'+path.replace(/[^\w]/g,'_');
  if(v===null||v===undefined)return '';
  if(Array.isArray(v)){
    return '<label class="dbgrow"><span>'+key+'</span>'+
      '<input id="'+id+'" data-p="'+path+'" data-t="arr" value="'+v.join(', ')+'"></label>';
  }
  if(typeof v==='object'){
    let inner='';
    for(const k in v)inner+=dbgField(v,k,path+'.'+k,onChange);
    return '<div class="dbggrp"><div class="dbggrpname">'+key+'</div>'+inner+'</div>';
  }
  if(typeof v==='boolean'){
    return '<label class="dbgrow"><span>'+key+'</span>'+
      '<input id="'+id+'" data-p="'+path+'" data-t="bool" type="checkbox"'+(v?' checked':'')+'></label>';
  }
  if(typeof v==='number'){
    const step=Number.isInteger(v)?1:(Math.abs(v)<1?0.01:0.1);
    return '<label class="dbgrow"><span>'+key+'</span>'+
      '<input id="'+id+'" data-p="'+path+'" data-t="num" type="number" step="'+step+'" value="'+v+'"></label>';
  }
  return '<label class="dbgrow"><span>'+key+'</span>'+
    '<input id="'+id+'" data-p="'+path+'" data-t="str" value="'+String(v).replace(/"/g,'&quot;')+'"></label>';
}
function dbgResolve(root,path){
  const parts=path.split('.');
  let o=root;
  for(let i=0;i<parts.length-1;i++)o=o[parts[i]];
  return[o,parts[parts.length-1]];
}
function renderDebug(){
  const el=dbgEl();if(!el)return;
  const g=DBG_GROUPS.find(x=>x.id===dbgTab)||DBG_GROUPS[0];
  const root=g.get();
  const tabs=DBG_GROUPS.map(x=>'<button class="dbgtab'+(x.id===dbgTab?' on':'')+
    '" data-tab="'+x.id+'">'+x.name+'</button>').join('');
  let body='';
  for(const k in root)body+=dbgField(root,k,k,g.scope);
  const scopeTag={live:'改完即时生效',derive:'改完需点「重算派生」',restart:'改完需重开一局'}[g.scope];
  el.innerHTML=
    '<div class="dbghead"><b>调参面板</b>'+
      '<span class="dbgclose" id="dbgx">✕</span></div>'+
    '<div class="dbgtabs">'+tabs+'</div>'+
    '<div class="dbghint">'+g.hint+'<br><i>'+scopeTag+'</i></div>'+
    '<div class="dbgbody" id="dbgbody">'+body+'</div>'+
    '<div class="dbgfoot">'+
      '<button class="dbgbtn" id="dbgrederive">重算派生</button>'+
      '<button class="dbgbtn" id="dbgrestart">用新配置重开</button>'+
      '<button class="dbgbtn" id="dbgexport">导出</button>'+
      '<button class="dbgbtn" id="dbgimport">导入</button>'+
      '<button class="dbgbtn" id="dbgreset">恢复默认</button>'+
    '</div>';

  el.querySelectorAll('.dbgtab').forEach(b=>b.onclick=()=>{dbgTab=b.dataset.tab;renderDebug();});
  document.getElementById('dbgx').onclick=()=>toggleDebug(false);
  el.querySelectorAll('#dbgbody input').forEach(inp=>{
    inp.onchange=()=>{
      const[o,k]=dbgResolve(g.get(),inp.dataset.p);
      const t=inp.dataset.t;
      if(t==='num'){const n=parseFloat(inp.value);if(!isNaN(n))o[k]=n;}
      else if(t==='bool')o[k]=inp.checked;
      else if(t==='arr'){
        const parts=inp.value.split(',').map(s=>s.trim()).filter(s=>s!=='');
        o[k]=parts.map(s=>{const n=parseFloat(s);return (s!==''&&!isNaN(n)&&String(n)===s)?n:s;});
      }
      else o[k]=inp.value;
      if(g.scope==='derive')deriveUnits();
      saveTuning();
    };
  });
  document.getElementById('dbgrederive').onclick=()=>{deriveUnits();renderDebug();};
  document.getElementById('dbgrestart').onclick=()=>{
    deriveUnits();
    if(typeof startLocalGame==='function')startLocalGame();
  };
  document.getElementById('dbgexport').onclick=()=>{
    const blob=JSON.stringify(collectTuning(),null,2);
    navigator.clipboard&&navigator.clipboard.writeText(blob);
    const w=window.open('','_blank');
    if(w)w.document.write('<pre style="white-space:pre-wrap;font:12px monospace">'+
      blob.replace(/</g,'&lt;')+'</pre>');
  };
  document.getElementById('dbgimport').onclick=()=>{
    const s=prompt('粘贴之前导出的 JSON：');
    if(!s)return;
    try{applyTuning(JSON.parse(s));deriveUnits();renderDebug();saveTuning();}
    catch(e){alert('解析失败：'+e.message);}
  };
  document.getElementById('dbgreset').onclick=()=>{
    if(!confirm('恢复所有默认数值？当前改动会丢失。'))return;
    localStorage.removeItem('frontline.tuning');
    location.reload();
  };
}

/* ---- 存读：改过的数值存进 localStorage，刷新页面不丢 ----
   Sim 侧的表交给 collectSimTuning：它会剔除派生字段。直接把 UNITS 整份存下来的话，
   UNITS.rifle.w 这个指向 WEAPONS.rifle 的引用会被存成副本，读回来时顺着它把
   WEAPONS 覆盖回旧值——改过的武器伤害一刷新就没了。 */
function collectTuning(){
  const o=collectSimTuning();
  o.feel=JSON.parse(JSON.stringify(FEEL));
  return o;
}
function applyTuning(t){
  applySimTuning(t);                       // Sim 侧的表，套完会自动重算派生量
  if(t.feel)deepAssign(FEEL,t.feel);
}
function deepAssign(dst,src){
  for(const k in src){
    const v=src[k];
    if(v&&typeof v==='object'&&!Array.isArray(v)&&dst[k]&&typeof dst[k]==='object')deepAssign(dst[k],v);
    else dst[k]=v;
  }
}
function saveTuning(){
  try{localStorage.setItem('frontline.tuning',JSON.stringify(collectTuning()));}catch(e){}
}
function loadTuning(){
  try{
    const s=localStorage.getItem('frontline.tuning');
    if(!s)return false;
    applyTuning(JSON.parse(s));
    deriveUnits();
    return true;
  }catch(e){return false;}
}
