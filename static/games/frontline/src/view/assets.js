/* =============================================================================
   FRONTLINE — view/assets.js
   程序化贴图：士兵、树、颗粒。换成外部素材只需替换这里。
   ============================================================================= */
/* =========================================================================
   ASSETS — 程序化贴图层（启动时把 sprite/噪声烘焙进离屏 canvas）
   若要接入外部贴图：把下面各 make* 换成 loadImage(url) 的结果即可，
   渲染代码只认 ASSETS.xxx 是个可被 drawImage 的对象，不关心它从哪来。
   ========================================================================= */
const ASSETS={soldier:{},tree:[],grain:null,ready:false};
function mkc(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c;}

/* 八队配色。前两个是原来的蓝/红，后面六个挑的是在军绿地表上仍能互相分清的色。
   与 render.js 的 TC 一一对应，改一处要改两处。 */
const TEAMC=[[92,150,206],[206,104,64],[104,190,114],[212,192,72],
             [162,124,206],[78,198,190],[222,140,60],[214,218,198]];
const OLIVE=[74,80,54];

function makeSoldier(team,pose,role){
  const S=3, W=26*S, H=28*S, c=mkc(W,H), x=c.getContext('2d');
  const tc=TEAMC[team];
  const body=mix(OLIVE,tc,.34).map(v=>v*.94), bodyD=body.map(v=>v*.52), helm=mix(OLIVE,tc,.10);
  const cx=W/2, base=H-3*S, crouch=pose!=='stand', scaleY=crouch?0.72:1;
  const rr=(g,X,Y,w,h,r)=>{g.beginPath();
    g.moveTo(X+r,Y);g.lineTo(X+w-r,Y);g.quadraticCurveTo(X+w,Y,X+w,Y+r);
    g.lineTo(X+w,Y+h-r);g.quadraticCurveTo(X+w,Y+h,X+w-r,Y+h);
    g.lineTo(X+r,Y+h);g.quadraticCurveTo(X,Y+h,X,Y+h-r);
    g.lineTo(X,Y+r);g.quadraticCurveTo(X,Y,X+r,Y);g.closePath();g.fill();};
  const el=(g,X,Y,a,b)=>{g.beginPath();g.ellipse(X,Y,a,b,0,0,6.284);g.fill();};
  // 腿
  x.fillStyle=sh(bodyD,.58);
  x.fillRect(cx-3.4*S,base-8*S*scaleY,2.6*S,8*S*scaleY);
  x.fillRect(cx+0.8*S,base-8*S*scaleY,2.6*S,8*S*scaleY);
  // 背包（兵种差异：颜色与形状）
  const packC=role==='mg'?[126,104,52]:(role==='at'?[92,74,54]:(role==='mortar'?[70,74,66]:bodyD));
  x.fillStyle=sh(packC,role==='rifle'?.85:1);
  rr(x,cx-4.2*S,base-16*S*scaleY,8.4*S,6*S,1.6*S);
  // 躯干
  x.fillStyle='rgba(14,16,10,.85)';
  rr(x,cx-5.6*S,base-15.5*S*scaleY,11.2*S,10*S*scaleY,2.4*S);
  x.fillStyle=sh(body,1);
  rr(x,cx-5*S,base-15*S*scaleY,10*S,9*S*scaleY,2.2*S);
  x.fillStyle=sh(body,1.34);
  rr(x,cx-5*S,base-15*S*scaleY,3.6*S,9*S*scaleY,2.2*S);
  x.fillStyle='rgba(10,12,7,.30)';
  rr(x,cx+1.4*S,base-15*S*scaleY,3.6*S,9*S*scaleY,2.2*S);
  x.fillStyle=sh(tc,1.05);
  x.fillRect(cx-5*S,base-14.2*S*scaleY,10*S,1.3*S);
  // 兵种装备：这是队伍之间最主要的辨识特征
  const sy=base-13*S*scaleY;
  if(role==='at'){                       // 肩扛火箭筒：粗管，横过整个身形
    x.fillStyle='#22261a';
    rr(x,cx-8*S,sy-1.6*S,17*S,3.4*S,1.6*S);
    x.fillStyle='#3a4030';rr(x,cx+6*S,sy-2.4*S,3.2*S,5*S,1*S);
    x.fillStyle='rgba(240,230,190,.22)';x.fillRect(cx-8*S,sy-1.6*S,17*S,.9*S);
  }else if(role==='mg'){                 // 机枪 + 弹链
    x.fillStyle='#1e2216';
    rr(x,cx-2*S,sy-1*S,13*S,2.4*S,1*S);
    x.fillStyle='#7a6a34';
    for(let i=0;i<5;i++)x.fillRect(cx-4.6*S+i*1.5*S,sy+1.6*S,1*S,1.8*S);
    x.fillStyle='#2a3020';x.fillRect(cx+8*S,sy+1*S,1.4*S,3.4*S);
  }else if(role==='mortar'){             // 背后斜挎炮管 + 底钣
    x.save();x.translate(cx,sy);x.rotate(-0.72);
    x.fillStyle='#1e2216';rr(x,-2*S,-9*S,3.4*S,17*S,1.4*S);
    x.fillStyle='#3a4030';rr(x,-3.4*S,5*S,6*S,2.6*S,1*S);
    x.restore();
  }else if(role==='infgun'){             // 带轮炮架 + 平直炮管，一眼区别于迫击炮的斜挎
    x.fillStyle='#3a4030';               // 大架
    rr(x,cx-7*S,sy+1.4*S,13*S,2.2*S,.9*S);
    x.fillStyle='#1e2216';               // 平直炮管
    rr(x,cx-3*S,sy-1.4*S,15*S,2.8*S,1.1*S);
    x.fillStyle='#4a5038';               // 防盾
    rr(x,cx-4.6*S,sy-4.6*S,4*S,9*S,1*S);
    x.fillStyle='rgba(240,230,190,.20)';x.fillRect(cx-3*S,sy-1.4*S,15*S,.8*S);
    x.fillStyle='#22261a';               // 轮子
    el(x,cx-5.6*S,sy+3.6*S,2.6*S,2.6*S);
  }else{                                 // 步枪
    x.fillStyle='#22261a';
    rr(x,cx-1*S,sy-.6*S,11*S,1.8*S,.8*S);
    x.fillStyle='#5a4a2e';rr(x,cx-3.4*S,sy-.4*S,3.4*S,2*S,.8*S);
  }
  // 头盔
  const hy=base-(crouch?17.2:20.2)*S;
  x.fillStyle='rgba(0,0,0,.34)';el(x,cx,hy+1.3*S,4.5*S,3.6*S);
  x.fillStyle=sh(helm,.92);el(x,cx,hy,4.5*S,3.7*S);
  x.fillStyle=sh(helm,1.35);
  x.beginPath();x.ellipse(cx-0.9*S,hy-0.9*S,2.7*S,1.9*S,-0.4,0,6.284);x.fill();
  x.fillStyle=sh(helm,.62);
  x.beginPath();x.ellipse(cx,hy+2.2*S,4.5*S,1.4*S,0,0,3.1416);x.fill();
  return c;
}
function makeTree(v){
  const S=3, W=42*S, H=54*S, c=mkc(W,H), x=c.getContext('2d');
  const g1=[[46,62,34],[58,74,40],[40,54,30],[64,80,44]][v%4];
  const cx=W/2, base=H-2*S;
  x.fillStyle='#332a1c';
  x.fillRect(cx-1.8*S,base-13*S,3.6*S,13*S);
  const blobs=[[0,-26,13],[-7,-21,10],[7,-22,10],[-3,-32,9],[5,-31,8]];
  for(const b of blobs){
    x.fillStyle=sh(g1,.68+((b[0]+b[1])%5)/14);
    x.beginPath();x.ellipse(cx+b[0]*S,base+b[1]*S,b[2]*S,b[2]*S*.86,0,0,6.284);x.fill();
  }
  x.fillStyle=sh(g1,1.42);
  x.beginPath();x.ellipse(cx-5*S,base-31*S,8*S,6*S,-.3,0,6.284);x.fill();
  return c;
}
function makeGrain(){
  const N=128, c=mkc(N,N), x=c.getContext('2d');
  const img=x.createImageData(N,N), d=img.data;
  for(let i=0;i<N*N;i++){
    const v=(rnd()*255)|0;
    d[i*4]=d[i*4+1]=d[i*4+2]=v;d[i*4+3]=26;
  }
  x.putImageData(img,0,0);
  return c;
}
function buildAssets(){
  /* 队伍数按 MAX_TEAMS 生成，不能写死 2——八人局里第 3 队的兵取不到贴图，
     而渲染那边的 fallback 只兜得住"这个兵种没图"，兜不住"这个队伍没图"：
     队伍号超出预生成范围时连 fallback 的 key 都不存在，drawImage(undefined) 直接抛。
     兵种列表也从 UNITS 派生，加一个新步兵不用回来改这里。 */
  const roles=ORDER.filter(k=>!UNITS[k].vehicle);
  for(let t=0;t<MAX_TEAMS;t++)for(const p of ['stand','crouch'])for(const r of roles)
    ASSETS.soldier[t+p+r]=makeSoldier(t,p,r);
  for(let v=0;v<4;v++)ASSETS.tree.push(makeTree(v));
  ASSETS.grain=makeGrain();
  ASSETS.ready=true;
}
