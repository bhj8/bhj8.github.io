/* =============================================================================
   FRONTLINE — core/config.js
   设计旋钮总表：武器、单位编成、建筑与室内战斗、技能。
   改数值只用动这个文件。
   ============================================================================= */
/* ---------------- 武器表 ----------------
   每件武器独立配置，小队按 squad[] 给每个成员发一件。改编成只需改 squad 数组。
     av[]        对 [步兵, 轻装甲, 重装甲] 的伤害倍率
     accInf      打步兵的额外精度惩罚
     cqb         室内近战权重（批次 3 用）：笨重武器在楼里近乎无用
     needsSetup  需要架设，setupTime 为架设耗时，arc 为架设后的射界
     range<=0    不参与远程开火（弹药手之类），但仍算人头与近战 */
const WEAPONS={
  rifle:      {id:'rifle',     name:'步枪',   range:152,dmg:8,   rof:1.5,acc:.54,supp:.045,av:[1,.20,.05], cqb:1.0, sight:205},
  at_carbine: {id:'at_carbine',name:'卡宾枪', range:130,dmg:6,   rof:1.2,acc:.46,supp:.02, av:[1,.15,.04], cqb:0.9, sight:225},
  mg_carbine: {id:'mg_carbine',name:'卡宾枪', range:110,dmg:3,   rof:1.1,acc:.4, supp:.015,av:[1,.12,.03], cqb:0.9, sight:225},
  faust:      {id:'faust',     name:'火箭筒', range:236,dmg:95,  rof:.62,acc:.82,accInf:.55,supp:.06,splash:16,
               av:[.26,1.05,1.30], cqb:0.15,sight:225,needsSetup:true,setupTime:0.7,teardownTime:0.35},
  hmg:        {id:'hmg',       name:'重机枪', range:228,dmg:6.4, rof:6.5,acc:.47,supp:.30,av:[1,.12,.03],
               cqb:0.10,sight:225,needsSetup:true,setupTime:0.62,teardownTime:0.40,arc:1.22},
  mortar:     {id:'mortar',    name:'迫击炮', range:345,min:115,dmg:44,rof:.30,splash:54,supp:.55,av:[1,.50,.28],
               cqb:0.05,sight:175,needsSetup:true,setupTime:1.2,teardownTime:0.60,indirect:true},
  /* 直射步兵炮。与迫击炮的分工：迫击炮打不到的地方它打得到（曲射越障 vs 直射需视线），
     反过来它能打移动目标、能拆房、能压着推进，但必须看得见、必须架设、转向要重架。
     没有 indirect，所以走的是普通弹道那条线，不是抛物线炮弹。 */
  infgun:     {id:'infgun',    name:'步兵炮', range:262,dmg:52,  rof:.40,acc:.66,accInf:.22,supp:.34,splash:32,
               av:[1,.78,.42], cqb:0.05,sight:200,needsSetup:true,setupTime:1.45,teardownTime:0.72,arc:0.95},
  ammo:       {id:'ammo',      name:'弹药手', range:0,  dmg:0,   rof:0,  acc:0,  supp:0,   av:[0,0,0],     cqb:0.7, sight:175},
  car_mg:     {id:'car_mg',    name:'车载机枪',range:166,dmg:8,  rof:4.6,acc:.56,supp:.12, av:[1,.16,.05], cqb:0,   sight:215},
  tank_gun:   {id:'tank_gun',  name:'坦克炮', range:205,dmg:40,  rof:.45,acc:.74,supp:.42,splash:30,av:[1,1.0,.80], cqb:0,sight:230},
  tank_coax:  {id:'tank_coax', name:'同轴机枪',range:168,dmg:4,  rof:5,  acc:.5, supp:.09, av:[1,.12,.03], cqb:0,   sight:230},
};

/* ---------------- 单位数据表 ----------------
   armor: 0=步兵 1=轻装甲 2=重装甲
   squad[]: 每个成员拿什么武器，数组长度即小队人数 */
const UNITS={
  rifle:{id:'rifle',name:'步枪班',short:'步',key:'Q',mp:200,fu:0,build:15,hp:62,pop:4,speed:47,armor:0,
    squad:['rifle','rifle','rifle','rifle']},
  at:{id:'at',name:'反坦克组',short:'反',key:'W',mp:260,fu:10,build:18,hp:56,pop:3,speed:41,armor:0,
    squad:['faust','at_carbine','at_carbine']},
  mg:{id:'mg',name:'机枪班',short:'机',key:'E',mp:205,fu:12,build:18,hp:56,pop:3,speed:38,armor:0,
    squad:['hmg','mg_carbine','mg_carbine']},
  mortar:{id:'mortar',name:'迫击炮组',short:'迫',key:'R',mp:235,fu:20,build:21,hp:52,pop:3,speed:38,armor:0,
    squad:['mortar','ammo','ammo']},
  /* 步兵炮组。编成上一门炮 + 两个弹药手 + 一个护卫：
     人多但只有一件真武器，所以室内绞肉很弱（cqb 0.05 的炮 + 两个 0.7 的弹药手）。
     速度是全场最慢的，架设又要 1.45 秒——摆错位置的代价很大。 */
  infgun:{id:'infgun',name:'步兵炮组',short:'炮',key:'C',mp:300,fu:25,build:26,hp:54,pop:4,speed:32,armor:0,
    squad:['infgun','ammo','ammo','at_carbine']},
  car:{id:'car',name:'装甲车',short:'车',key:'F',mp:265,fu:30,build:21,hp:305,pop:6,speed:86,armor:1,vehicle:true,
    squad:['car_mg']},
  tank:{id:'tank',name:'坦克',short:'坦',key:'G',mp:420,fu:65,build:32,hp:520,pop:10,speed:44,armor:2,vehicle:true,
    squad:['tank_gun'],coax:'tank_coax'},
};
/* 从编成派生：人数、主武器、小队最大射程与视野、架设参数。
   s.def.w 仍指向主武器，既有代码的大量引用因此保持有效。
   独立成函数是为了调参面板改完编成后能重算——改 squad 数组不重算的话，
   maxRange/men 还是旧值，表现会和面板上显示的对不上。 */
/* deriveUnits 产生的字段。它们不是数据，是从 squad + WEAPONS 算出来的缓存，
   存进配置快照不但冗余，还会反过来把源数据改坏——

   u.w / u.weapons[] 是**指向 WEAPONS 里那件武器的引用**。序列化会把引用
   展开成一份副本；再反序列化赋值回去时，UNITS.rifle.w 这条路径就直接写到了
   WEAPONS.rifle 身上，把刚套用好的武器数值又覆盖回旧值。而 units 恰好排在
   weapons 后面，于是"改了武器伤害"这件事每次都会被自己抹掉。 */
const UNIT_DERIVED=['weapons','men','w','coaxW','maxRange','sight','indirect','setup','arc','gunner'];
function deriveUnits(){
  for(const k in UNITS){
    const u=UNITS[k];
    u.weapons=u.squad.map(w=>WEAPONS[w]).filter(Boolean);
    if(!u.weapons.length)u.weapons=[WEAPONS.rifle];      // 编成写错时兜底，不让整局崩掉
    u.men=u.weapons.length;
    u.w=u.weapons[0];
    u.coaxW=u.coax?WEAPONS[u.coax]:null;
    u.maxRange=Math.max(u.coaxW?u.coaxW.range:0,...u.weapons.map(w=>w.range));
    u.sight=Math.max(...u.weapons.map(w=>w.sight||0));
    u.indirect=!!u.w.indirect;
    u.setup=u.w.needsSetup?u.w.setupTime:0;
    u.arc=u.w.arc;
    u.gunner=u.weapons.length>1&&u.weapons[0].id!==u.weapons[1].id;  // 队里有专职射手（渲染用）
  }
}
deriveUnits();
const ORDER=['rifle','at','mg','mortar','infgun','car','tank'];

/* 对局规则：开始界面直接暴露这几项，其余旋钮在调参面板里 */
const RULES={
  startMp:340, startFu:20,
  popCap:38,
  vp:1250,
  winByVp:true,      // 战力耗尽即败
  winByHq:true,      // 基地被毁即败
};

/* ---------------- 建筑与室内战斗 ----------------
   全部是旋钮。驻守容量按建筑格数派生；直射与爆炸减伤分开配，
   为后续建筑材质分型（木/砖/水泥）留口子。 */
const HOUSE={
  hp:560,
  cellsPerSquad:4, maxCap:3,        // 容量 = clamp(floor(w*h/cellsPerSquad), 1, maxCap)
  enterTime:1.6, exitTime:1.0,      // 进出耗时，期间不可开火、可被打断
  drDirect:0.50,                    // 直射伤害乘数（越小越抗打）
  drBlast:1.90,                     // 爆炸伤害乘数（>1 = 楼里挨炸更惨）
};
/* ---------------- 建筑材质 ----------------
   口子在批次 3 就留好了（drDirect/drBlast 本来就是每栋独立的字段），
   这里只是把它填成三档并按体量分配。

   ⚠ 下面这组数是能跑通的占位值，不是调过的。木造该有多脆、混凝土该有多硬，
     以及这个差距会怎么改变"该不该进楼"的判断——那是设计者的活。
     hp 是相对 HOUSE.hp 的倍率。 */
const HOUSE_MATS={
  wood:    {id:'wood',    name:'木造',  hp:0.62, drDirect:0.74, drBlast:2.35, tint:[128,96,60]},
  brick:   {id:'brick',   name:'砖石',  hp:1.00, drDirect:0.50, drBlast:1.90, tint:[150,112,86]},
  concrete:{id:'concrete',name:'混凝土',hp:1.60, drDirect:0.33, drBlast:1.30, tint:[140,140,130]},
};
/* 按格数分档，档内按概率抽。小屋多是木造，大楼多是混凝土。 */
const MAT_MIX=[
  {maxCells:4,   wood:0.72, brick:0.28, concrete:0.00},
  {maxCells:9,   wood:0.28, brick:0.57, concrete:0.15},
  {maxCells:1e9, wood:0.05, brick:0.45, concrete:0.50},
];
/* 只依赖格数与那栋楼的 seed，不碰全局 rnd()。
   镜像的两栋楼共享同一个 seed（见 mapgen 的 stampB），所以两侧材质必然一致——
   材质影响抗打程度，一旦左右不同就是实打实的地图不公平。 */
function materialOf(cells,seed){
  const row=MAT_MIX.find(r=>cells<=r.maxCells)||MAT_MIX[MAT_MIX.length-1];
  let acc=0;
  const t=seed-Math.floor(seed);          // seed 是 0..1 的浮点
  for(const k of ['wood','brick','concrete']){
    acc+=row[k]||0;
    if(t<acc)return k;
  }
  return 'brick';
}

/* 室内绞肉：敌我同处一楼时的持续 DPS 对拼 */
const MELEE={
  dps:5.2,                          // 单位战力每秒造成的伤害
  jitter:0.30,                      // 伤害抖动 ±
  defenderBonus:1.35,               // 先入者（守方）战力加成
  spreadHits:4,                     // 每次结算把伤害分摊到几个人身上
};

/* ---------------- 技能表 ----------------
   加新技能 = 填一条表，不动战斗代码。
     target       none=即时 | dir=拾取一个方向 | point=拾取地面点 | unit=拾取单位
     scope        squad=整队一次 | member=逐成员各自执行
     castTime(s,m) 施法耗时；返回 0 表示瞬发
     requires(s,m) 该单位/成员是否具备此技能
     ignoreIFF    施放时无视敌我（伤害也不分敌我） */
const ABILITIES={
  deploy:{
    id:'deploy', name:'架设', key:'d', target:'dir', scope:'member',
    whileMoving:false, cooldown:0,
    requires:(s,m)=>!!(m&&m.weapon&&m.weapon.needsSetup),
    castTime:(s,m)=>m.weapon.setupTime||0,
    hint:'选方向架设，获得射界；转出射界要重新架设',
  },
  forceAttack:{
    id:'forceAttack', name:'强制攻击', key:'ctrl', target:'point', scope:'squad',
    whileMoving:true, cooldown:0, ignoreIFF:true,
    requires:(s)=>s.def.maxRange>0,
    hint:'打指定位置，无视敌我；可打进绞肉中的建筑',
  },
};
const abilitiesOf=s=>{
  const out=[];
  for(const k in ABILITIES){
    const A=ABILITIES[k];
    if(A.scope==='member'){if(s.members.some(m=>m.alive&&A.requires(s,m)))out.push(A);}
    else if(A.requires(s))out.push(A);
  }
  return out;
};
// 人口上限走 RULES，POPCAP 保留为兼容别名
Object.defineProperty(globalThis,'POPCAP',{get:()=>RULES.popCap,configurable:true});

/* ---------------- 可调配置表的登记处 ----------------
   Sim 侧全部旋钮集中登记在这里，两个地方消费它：
     · 录像：把整份配置存进录像文件，回放才谈得上忠实重现
     · 调参面板：遍历这份清单生成控件
   一份清单两处用，加了新表不会只改到其中一边（有断言守着）。

   getter 是惰性的——VISION 和 MAPCFG 在后面的模块才定义，
   config.js 加载时它们还不存在。

   scope 说明改完要不要重开：
     live    立即生效      derive  要重算派生量      restart 影响地图生成 */
const SIM_TUNABLES=[
  {id:'weapons', scope:'live',    get:()=>WEAPONS},
  {id:'units',   scope:'derive',  get:()=>UNITS, derived:UNIT_DERIVED},
  {id:'rules',   scope:'live',    get:()=>RULES},
  {id:'house',   scope:'live',    get:()=>HOUSE},
  {id:'mats',    scope:'restart', get:()=>HOUSE_MATS},
  {id:'matmix',  scope:'restart', get:()=>MAT_MIX},
  {id:'melee',   scope:'live',    get:()=>MELEE},
  {id:'vision',  scope:'live',    get:()=>VISION},
  {id:'map',     scope:'restart', get:()=>MAPCFG},
];
const simTunable=id=>SIM_TUNABLES.find(t=>t.id===id);
