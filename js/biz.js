'use strict';
// ===== businesses: production, shops, town demand, population, orders, lots, crafting =====

// ---------- lookup ----------
function bizById(id){return S.biz.find(z=>z.id===id)}
function bldOfBiz(z){if(!z)return null;if(z.type==='peddler')return null;return z.lot!=null?world.buildings.find(b=>b.lot===z.lot):world.buildings.find(b=>b.kind===z.type&&b.lot==null)}
function bizOfBld(b){return b&&b.bizId?bizById(b.bizId):null}
function bizOwned(o='player'){return S.biz.filter(z=>z.owner===o)}
function bizRecipe(z,out){const st=BIZ_TYPES[z.type].station;return st?RECIPES[st].find(r=>r.out===out):null}
function bizOutputs(z){const T=BIZ_TYPES[z.type];if(T.station)return RECIPES[T.station].map(r=>r.out);return Object.keys(z.make)}
function workersAt(z){let c=0;for(const n of S.npcs)if(n.state==='labour'&&n.work===z.id)c++;return c}

// ---------- creation ----------
function defaultMake(type){switch(type){
  case'refinery':case'smelter':return{iron_ingot:1,copper_ingot:1,silver_ingot:1,gold_ingot:1,fuel:1};
  case'smithy':return{pickaxe:4,axe:3,boots:3,lantern:3,backpack:2,cart:1,drill:1,ring:1,knife:2,saber:1,spear:1,vest:1,shovel:2,hoe:2,can:1};
  case'forge':return{pickaxe:3,axe:3,boots:2,lantern:2,backpack:1,cart:0,drill:0,ring:0};
  case'bakery':case'bakehouse':return{bread:40};
  case'store':return{bread:16,fuel:10,lantern:2,boots:2,axe:2,pickaxe:2,backpack:1};
  case'post':return{fuel:12,lantern:3,boots:2,axe:2,backpack:2,ring:1};
  case'outfitter':return{bandage:8,tonic:3,torch:10,dynamite:4,cartridge:40,rope:3,coat:2,revolver:1,rifle:1,knife:2,saber:1,spear:1,jerky:8,shovel:1};
  case'ranch':return{chicken:4,sheep:2,cow:2,pig:2,seed_wheat:12,seed_corn:12,seed_potato:12,seed_cotton:12,hoe:2,can:2};
  default:return{}}}
function makeBiz(type,owner,o={}){const T=BIZ_TYPES[type],P=S.money.P;
  const z={id:'z'+(S.bizSeq++),type,name:o.name||T.n,owner,cash:Math.round(o.cash??400*P),inv:{...(o.inv||{})},job:null,prog:0,labour:0,wage:Math.round(T.wage*P),
    made:0,prices:{},make:defaultMake(type),lot:o.lot??null,today:{rev:0,cost:0,wages:0,units:0},hist:{profit:[],rev:[]},closedUntil:0,founded:day()};
  S.biz.push(z);return z}
function initBiz(){const P=S.money.P,own=cls=>{const n=S.npcs.find(n=>n.cls===cls&&!S.biz.some(z=>z.owner===n.id));if(n)n.cash+=200;return n?n.id:'town'};
  const r=makeBiz('refinery','town',{cash:750*P});const sm=makeBiz('smithy',own('smith'),{cash:650*P,inv:{pickaxe:2,axe:2,boots:1,lantern:1}});
  const bk=makeBiz('bakery',own('baker'),{cash:300*P,inv:{bread:25}});
  for(const z of[r,sm,bk]){const b=world.buildings.find(b=>b.kind===z.type);b.bizId=z.id}
  S.lots=world.lots.map(l=>({i:l.i,owner:'town',biz:null,build:null}));
  const st=makeBiz('store',own('merchant'),{cash:500*P,lot:0,name:pick(['Hale','Webb','Marsh','Penn'])+" General Store",inv:{bread:8,fuel:6,lantern:1}});
  S.lots[0].biz=st.id;S.lots[0].owner=st.owner;addLotBuilding(S.lots[0],st);
  addExpansionShops(own)}
const EXP_SHOPS=[{type:'outfitter',cls:'smith',cash:600,lot:1,name:'Outfitter & Gunsmith',inv:{bandage:6,torch:8,cartridge:30,dynamite:3,knife:1,revolver:1,coat:1,jerky:6,rope:2,tonic:2}},
  {type:'ranch',cls:'rancher',cash:500,lot:3,name:'Ranch Supply',inv:{chicken:4,sheep:2,cow:2,pig:2,seed_wheat:12,seed_corn:12,seed_potato:12,seed_cotton:12,hoe:2,can:2}}];
// adds each expansion shop that does not exist yet, on its own lot or on the first empty town lot
function addExpansionShops(own){const P=S.money.P;own=own||(cls=>{const n=S.npcs.find(n=>n.cls===cls&&!S.biz.some(z=>z.owner===n.id));return n?n.id:'town'});const made=[];
  for(const E of EXP_SHOPS){if(S.biz.some(z=>z.type===E.type))continue;const free=l=>l&&!l.biz&&!l.build&&l.owner==='town';const l=free(S.lots[E.lot])?S.lots[E.lot]:S.lots.find(free);
    if(!l){jlog('econ',`No town lot is free for the ${E.name}.`);continue}
    const z=makeBiz(E.type,own(E.cls),{cash:E.cash*P,lot:l.i,name:E.name,inv:{...E.inv}});l.biz=z.id;l.owner=z.owner;addLotBuilding(l,z);made.push(z)}
  return made}
function addLotBuilding(l,z){const L=world.lots[l.i],BT=BIZ_TYPES[z.type];if(world.buildings.some(b=>b.lot===l.i))return null;
  const b={kind:z.type,name:z.name,x:L.x,y:L.y,w:L.w,h:L.h,door:{...L.door},roof:BT.roof||'#5a3a2a',wall:BT.wall||'#b89a74',lot:l.i,bizId:z.id};
  for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)world.tiles[idx(x,y)]=T.BUILD;world.tiles[idx(b.door.x,b.door.y)]=T.ROAD;
  world.buildings.push(b);buildingSprite(b);return b}

// ---------- prices ----------
function unitCost(k){let best=null;const P=S.money.P;
  for(const st in RECIPES)for(const r of RECIPES[st])if(r.out===k){let c=0;for(const i in r.in)c+=price(i)*r.in[i];c+=BASE_WAGE.smithy*P*r.t/3;c/=(r.n||1);if(best==null||c<best)best=c}
  return best??GOODS[k].p*P}
function refPrice(k){return Math.max(GOODS[k].p*S.money.P*.6,unitCost(k)*1.25)}
function autoPrice(z,k){const tgt=Math.max(1,z.make[k]||3),st=z.inv[k]||0,sh=S.dem[k]?S.dem[k].ema:0;
  let m=1.1+.3*sh-.18*clamp(st/tgt-1,0,1)+(st===0?.06:0);if(z.type==='peddler')m=.82;return Math.max(1,Math.round(refPrice(k)*m))}
function shopPrice(z,k){let p=z.prices[k]!=null?Math.round(z.prices[k]):autoPrice(z,k);if(k==='bread'&&S.town.breadCap)p=Math.min(p,Math.round(S.town.breadCap*S.money.P));return Math.max(1,p)}
function wholesale(z,k){return Math.max(1,Math.round(shopPrice(z,k)*.62))}
function sellsGood(z,k){return z.type==='peddler'?(z.inv[k]||0)>0:(z.make[k]||0)>0&&BIZ_TYPES[z.type].retail}
function sellersOf(k){return S.biz.filter(z=>BIZ_TYPES[z.type].retail&&z.closedUntil<=S.time&&(z.inv[k]||0)>0&&sellsGood(z,k))}
function cheapestSeller(k,from){const s=sellersOf(k);if(!s.length)return null;let best=null,bs=Infinity;
  for(const z of s){const b=bldOfBiz(z),d=from&&b?dist(from.x,from.y,b.door.x,b.door.y):0,sc=shopPrice(z,k)*(1+d*.01);if(sc<bs){bs=sc;best=z}}return best}
function updateRetailRefs(){S.rref={};for(const k of FINISHED){const s=sellersOf(k);S.rref[k]=s.length?Math.round(s.reduce((a,z)=>a+shopPrice(z,k),0)/s.length):Math.round(refPrice(k))}}

// ---------- retail ----------
function retailBuy(buyer,z,k,q=1){let n=0,spent=0;const folk=buyer==='folk';
  for(let i=0;i<q;i++){const p=shopPrice(z,k);if((z.inv[k]||0)<1)break;const cash=folk?S.folk.cash:buyer.cash;if(cash<p)break;
    if(folk)S.folk.cash-=p;else{buyer.cash-=p;buyer.inv[k]=(buyer.inv[k]||0)+1}
    const tax=Math.round(p*S.town.salesTax);S.town.cash+=tax;S.town.today.tax+=tax;z.cash+=p-tax;z.inv[k]--;z.today.rev+=p-tax;n++;spent+=p}
  if(!z.inv[k])delete z.inv[k];
  if(n&&!folk){const d=S.dem[k];if(d){d.want+=n;d.got+=n}}
  S.today.trade+=spent;return{n,spent}}
// a shop buys goods from a supplier (the player) for its shelves
function shopWants(z,k){if(!sellsGood(z,k)||z.type==='peddler')return 0;const tgt=z.make[k]||0;return Math.max(0,tgt*2-(z.inv[k]||0))}
function sellToShop(z,k,q){const p=S.player;let n=0,got=0;q=Math.min(q,p.inv[k]||0,shopWants(z,k));
  for(let i=0;i<q;i++){const w=wholesale(z,k);if(z.cash<w)break;z.cash-=w;z.today.cost+=w;p.cash+=w;got+=w;p.inv[k]--;z.inv[k]=(z.inv[k]||0)+1;n++}
  if(!p.inv[k])delete p.inv[k];return{n,got}}

// ---------- production ----------
function bizTick(z,mins){const T=BIZ_TYPES[z.type];if(z.closedUntil>S.time||z.type==='peddler')return;
  if(T.station){if(!z.job)startJob(z,T);
    if(z.job&&z.labour>0){const r=bizRecipe(z,z.job),u=Math.min(z.labour,r.t-z.prog);z.prog+=u;z.labour-=u;
      if(z.prog>=r.t-1e-6){const n=r.n||1;z.inv[r.out]=(z.inv[r.out]||0)+n;z.job=null;z.made+=n;z.today.units+=n;S.today.gdp+=GOODS[r.out].p*n;weekAdd(z.owner,'made',n);
        const b=bldOfBiz(z);if(b&&T.station==='anvil'&&onScreen(b.x+b.w/2,b.y+b.h))fx.burst('sparks',b)}}
    if(!z.job)z.labour=Math.min(z.labour,3)}
  if(!T.retail)for(const k in z.inv){if(!z.make[k])continue;while(z.inv[k]>0){const p=Math.round(price(k)*.9);if(S.market.cash<p||marketFull(k))break;S.market.cash-=p;z.cash+=p;z.today.rev+=p;z.inv[k]--;S.market.stock[k]++}if(!z.inv[k])delete z.inv[k]}
  if(T.retail&&z.type!=='peddler'){z.rT=(z.rT||0)+mins;if(z.rT>=60){z.rT=0;restock(z)}}}
function startJob(z,T){let best=null,bs=0,bestNeed=null;
  for(const r of RECIPES[T.station]){if(!z.make[r.out]||r.flag)continue;let gap;
    if(T.retail){const tgt=z.make[r.out],st=z.inv[r.out]||0;if(st>=tgt)continue;gap=(tgt-st)/tgt}
    else{const ms=S.market.stock[r.out],t2=target(r.out)*2;if(ms>=t2)continue;gap=clamp(1-ms/t2,.15,1)}
    let cost=0,ok=true;const need={};
    for(const k in r.in){const n=r.in[k]-(z.inv[k]||0);if(n>0){need[k]=n;if(S.market.stock[k]<n){ok=false;if(z.owner!=='player'&&z.cash>price(k)*1.35*n*3)postOrder(z.id,k,n*3,price(k)*1.35,2,'Needed to make '+GOODS[r.out].n.toLowerCase())}cost+=price(k)*n}}
    if(!ok||cost>z.cash)continue;
    const value=(T.retail?shopPrice(z,r.out)*.9:price(r.out)*.9)*(r.n||1),margin=value-cost-z.wage*r.t/2;
    if(margin<=0&&z.owner!=='player')continue;
    const sc=gap*Math.max(1,margin);if(sc>bs){bs=sc;best=r;bestNeed=need}}
  if(!best)return;
  for(const k in bestNeed)for(let i=0;i<bestNeed[k];i++){const p=price(k);z.cash-=p;z.today.cost+=p;S.market.cash+=p;S.market.stock[k]--;z.inv[k]=(z.inv[k]||0)+1}
  for(const k in best.in){z.inv[k]-=best.in[k];if(z.inv[k]<=0)delete z.inv[k]}
  z.job=best.out;z.prog=0}
function restock(z){const T=BIZ_TYPES[z.type],own=T.station?new Set(RECIPES[T.station].map(r=>r.out)):new Set();
  for(const k in z.make){const tgt=z.make[k];if(!tgt||own.has(k))continue;let need=Math.min(tgt-(z.inv[k]||0),4);if(need<=0)continue;
  if(T.imports&&(GOODS[k].cat==='Animal'||GOODS[k].cat==='Seed')){while(need>0){const p=Math.round(GOODS[k].p*S.money.P*.6);if(z.cash<p)break;z.cash-=p;z.today.cost+=p;z.inv[k]=(z.inv[k]||0)+1;need--}continue}
  if(!isFinished(k)){while(need>0&&S.market.stock[k]>0){const p=price(k);if(z.cash<p)break;z.cash-=p;z.today.cost+=p;S.market.cash+=p;S.market.stock[k]--;z.inv[k]=(z.inv[k]||0)+1;need--}}
  else{const src=S.biz.filter(o=>o!==z&&BIZ_TYPES[o.type].station&&BIZ_TYPES[o.type].retail&&(o.inv[k]||0)>Math.max(1,(o.make[k]||0)*.5));
    for(const o of src){while(need>0&&(o.inv[k]||0)>Math.max(1,(o.make[k]||0)*.5)){const p=wholesale(o,k);if(z.cash<p)break;z.cash-=p;z.today.cost+=p;o.cash+=p;o.today.rev+=p;o.inv[k]--;z.inv[k]=(z.inv[k]||0)+1;need--}}
    if(need>0&&(S.dem[k]?.ema||0)>.15&&z.owner!=='player'&&z.cash>wholesale(z,k)*1.1*need)postOrder(z.id,k,need,wholesale(z,k)*1.1,2,'Customers are waiting')}}}

// ---------- labour market ----------
function pickJob(n){let best=null,bs=-1;
  for(const z of S.biz){const T=BIZ_TYPES[z.type];if(!T.station||z.closedUntil>S.time||z.wage<=0||z.cash<z.wage||!(z.job||z.labour<2))continue;
    const skill=T.cls===n.cls?1.6:1,s=z.wage*skill/(1+workersAt(z)*.35)*rnd(.85,1.15);if(s>bs){bs=s;best=z}}
  return best}

// ---------- town demand and population ----------
function demandFill(){S.dem=S.dem||{};for(const k of new Set([...FINISHED,...Object.keys(DEMAND)]))if(!S.dem[k])S.dem[k]={want:0,got:0,priceOut:0,ema:.15,hist:[],last:null}}
function demandInit(){S.dem={};demandFill();S.folk={pop:120,cash:2500,acc:{},hist:[120],short:.15}}
function eventDemand(k){let m=1;for(const e of S.events){const E=EVENTS[e.key];if(E.demand&&E.demand(e,k))m*=E.demand(e,k)}return m}
function folkHour(){const F=S.folk;
  for(const k in DEMAND){const d=S.dem[k]||(demandFill(),S.dem[k]);let rate=F.pop/100*DEMAND[k]/24*eventDemand(k);const ref=refPrice(k),avg=price(k);rate*=clamp(Math.pow(ref/Math.max(1,avg),.6),.35,1.5);
    F.acc[k]=(F.acc[k]||0)+rate;
    while(F.acc[k]>=1){F.acc[k]-=1;d.want++;const z=cheapestSeller(k);if(!z)continue;if(shopPrice(z,k)>ref*2.4){d.priceOut++;continue}if(retailBuy('folk',z,k,1).n)d.got++}}}
function demandDaily(){let w=0,sh=0;
  for(const k in S.dem){const d=S.dem[k],short=d.want?Math.max(0,(d.want-d.got)/d.want):d.ema*.8;d.ema=d.ema*.55+short*.45;d.last={want:d.want,got:d.got,short,priceOut:d.priceOut};
    d.hist.push(Math.round(short*100));if(d.hist.length>30)d.hist.shift();const v=d.want*GOODS[k].p;w+=v;sh+=v*short;d.want=d.got=d.priceOut=0}
  const others=Object.keys(S.dem).filter(k=>k!=='bread'),F=S.folk,avg=.55*S.dem.bread.ema+.45*others.reduce((a,k)=>a+S.dem[k].ema,0)/others.length;F.short=avg;
  let g=avg<.1?.035:avg<.2?.018:avg<.32?.004:-.02;if(projectDone('school'))g+=.006;if(S.town.approval>70)g+=.004;
  F.pop=clamp(Math.round(F.pop*(1+g)),60,900);F.hist.push(F.pop);if(F.hist.length>60)F.hist.shift();
  // goods from outside the valley: a small money sink
  const imp=F.cash*.04;F.cash-=imp;if(S.bank.convertible){const s=Math.min(S.bank.silver-30,Math.floor(imp/S.money.P/silverCoinReal()));if(s>0)S.bank.silver-=s}S.today.imports+=imp/S.money.P;
  if(avg>.3&&Math.random()<.5){const k=Object.keys(S.dem).sort((a,b)=>S.dem[b].ema-S.dem[a].ema)[0];crier(line('shortage',{g:GOODS[k].n.toLowerCase()}))}}
function townShortList(){return Object.keys(S.dem).map(k=>({k,...S.dem[k]})).sort((a,b)=>b.ema-a.ema)}

// ---------- business daily ----------
function bizDaily(){const P=S.money.P;
  for(const z of S.biz){const T=BIZ_TYPES[z.type];if(z.type==='peddler')continue;
    const profit=z.today.rev-z.today.cost-z.today.wages;z.hist.profit.push(Math.round(profit));z.hist.rev.push(Math.round(z.today.rev));if(z.hist.profit.length>30){z.hist.profit.shift();z.hist.rev.shift()}
    if(z.owner==='player')S.player.stats.bizProfit=(S.player.stats.bizProfit||0)+Math.max(0,profit);
    z.today={rev:0,cost:0,wages:0,units:0};
    if(z.owner==='player')continue;
    // owner AI: wages follow prices and shortages, targets follow demand
    const outs=bizOutputs(z).filter(k=>S.dem[k]),sh=T.retail?(outs.length?outs.reduce((a,k)=>a+S.dem[k].ema,0)/outs.length:0):Math.max(...bizOutputs(z).map(k=>clamp(1-S.market.stock[k]/target(k),0,1)));
    if(T.wage)z.wage=Math.max(1,Math.round(T.wage*P*(1+.6*sh)));
    if(T.retail)for(const k of outs){const base=defaultMake(z.type)[k]||0;if(base)z.make[k]=Math.max(1,Math.round(base*(1+S.dem[k].ema)))}
    const keep=1200*P;if(z.cash>keep){const div=(z.cash-keep)*.4;z.cash-=div;if(z.owner==='town')S.town.cash+=div;else{const o=S.npcs.find(n=>n.id===z.owner);if(o)o.cash+=div;else S.town.cash+=div}}
    if(z.cash<Math.max(60*P,z.wage*3)&&z.owner==='town'){const aid=Math.round(220*P);if(S.town.cash<aid){S.town.cash+=aid;S.town.printedTotal+=aid}S.town.cash-=aid;z.cash+=aid;jlog('law',`Council: The ${z.name} has no money. Council pays it ${money(aid)}.`)}
    else if(z.cash<80*P&&z.owner!=='town'){const o=S.npcs.find(n=>n.id===z.owner);if(o&&o.cash>80*P){const t=Math.round(Math.min(o.cash*.4,300*P));o.cash-=t;z.cash+=t}}}
  // shops with empty shelves ask suppliers for help
  let posted=0;for(const z of S.biz){if(posted>=3||!BIZ_TYPES[z.type].retail||z.owner==='player'||z.type==='peddler')continue;
    for(const k of Object.keys(z.make)){if(!isFinished(k)||!z.make[k])continue;if((z.inv[k]||0)===0&&(S.dem[k]?.ema||0)>.2&&z.cash>wholesale(z,k)*1.15*3){postOrder(z.id,k,3,wholesale(z,k)*1.15,2,'Customers are waiting');posted++;break}}}
  entrepreneurs();}

// ---------- orders ----------
function postOrder(from,k,qty,price,days,note){if(!S.orders)return null;let o=S.orders.find(o=>o.from===from&&o.k===k);
  if(o){o.qty=Math.max(o.qty,o.got+qty);o.price=Math.max(o.price,Math.round(price));o.until=Math.max(o.until,S.time+days*1440);return o}
  if(S.orders.length>=12)return null;o={id:S.orderSeq++,from,k,qty:Math.max(1,Math.round(qty)),got:0,price:Math.max(1,Math.round(price)),until:S.time+days*1440,note:note||'',posted:S.time};
  S.orders.push(o);return o}
function orderFrom(o){if(o.from==='town')return'Town Hall';if(o.from.startsWith('proj:'))return'Town project: '+PROJECTS[o.from.slice(5)].n;const z=bizById(o.from);return z?z.name:'?'}
function orderPurse(o){if(o.from==='town'||o.from.startsWith('proj:'))return S.town;return bizById(o.from)}
function ordersHourly(){S.orders=S.orders.filter(o=>o.until>S.time&&o.got<o.qty&&(o.from==='town'||o.from.startsWith('proj:')||bizById(o.from)))}
function deliver(id,q){const o=S.orders.find(o=>o.id===id),p=S.player;if(!o)return;q=Math.min(q,o.qty-o.got,p.inv[o.k]||0);if(q<=0){toast(`You have no ${GOODS[o.k].n.toLowerCase()}.`,'bad');return}
  const purse=orderPurse(o);if(!purse){toast('That buyer is gone.','bad');return}const pay=o.price*q;
  if(purse.cash<pay){toast(`${orderFrom(o)} cannot pay now.`,'bad');return}
  purse.cash-=pay;p.cash+=pay;p.inv[o.k]-=q;if(!p.inv[o.k])delete p.inv[o.k];o.got+=q;
  if(o.from.startsWith('proj:')){const pr=S.town.projects.find(x=>x.key===o.from.slice(5));if(pr)pr.mat[o.k]=(pr.mat[o.k]||0)+q}
  else if(o.from!=='town'){const z=bizById(o.from);z.inv[o.k]=(z.inv[o.k]||0)+q;z.today.cost+=pay}
  p.stats.orders=(p.stats.orders||0)+1;p.wk.orders++;p.rep=Math.min(100,p.rep+1);addXp('trade',3+q);challengeAdd('orders',1);
  sfx('cash_big');fx.coins(p.x,p.y-.5,8);toast(`Delivered ${q} ${GOODS[o.k].n} to ${orderFrom(o)}. +${money(pay)}`,'good');jlog('you',`You delivered ${q} ${GOODS[o.k].n.toLowerCase()} to ${orderFrom(o)} for ${money(pay)}.`);
  if(o.got>=o.qty)S.orders=S.orders.filter(x=>x!==o);checkAch();renderWin()}

// ---------- lots, building, entrepreneurs ----------
function lotPrice(){return Math.round(260*S.money.P)}
function freeLots(){return S.lots.filter(l=>!l.biz&&!l.build&&l.owner!=='player')}
function buildCostCash(){return Math.round(BUILD_COST.cash*S.money.P)}
function startBuild(l,owner,type,cash){const L=world.lots[l.i];l.owner=owner;l.build={type,owner,until:S.time+(owner==='player'?1:2)*1440,cash:Math.round(cash)};
  for(let y=L.y;y<L.y+L.h;y++)for(let x=L.x;x<L.x+L.w;x++)world.tiles[idx(x,y)]=T.BUILD;world.tiles[idx(L.door.x,L.door.y)]=T.ROAD}
function finishBuilds(){for(const l of S.lots){if(!l.build||S.time<l.build.until)continue;const b=l.build,o=b.owner;
  const name=o==='player'?`${S.player.name.split(' ').pop()}'s ${BIZ_TYPES[b.type].n}`:`${(S.npcs.find(n=>n.id===o)?.name||'New').split(' ').pop()}'s ${BIZ_TYPES[b.type].n}`;
  const z=makeBiz(b.type,o,{lot:l.i,cash:b.cash,name});l.biz=z.id;l.build=null;const bl=addLotBuilding(l,z);
  jlog('econ',`${name} opens for business.`,{toast:o==='player'?'good':'info'});if(bl)fx.burst('dust',bl);if(o==='player')checkAch()}}
function entrepreneurs(){const free=freeLots();if(!free.length||Math.random()>.55)return;const P=S.money.P;
  const opps=[];for(const k in DEMAND){const d=S.dem[k];if(d&&d.ema>.2)opps.push({k,score:d.ema*DEMAND[k]*refPrice(k)})}
  for(const k of['iron_ingot','copper_ingot'])if(S.market.stock[k]<target(k)*.4&&realPrice(k)>GOODS[k].p*1.3)opps.push({k,score:realPrice(k)/GOODS[k].p*30,metal:true});
  if(!opps.length)return;opps.sort((a,b)=>b.score-a.score);const o=opps[0];
  const type=o.metal?'smelter':o.k==='bread'?'bakehouse':o.k==='fuel'?'post':'forge';
  const mat=BUILD_COST.wood*price('wood')+BUILD_COST.iron_ingot*price('iron_ingot'),start=250*P,cost=lotPrice()+buildCostCash()+mat+start;
  const cand=S.npcs.filter(n=>n.cash>cost*1.1&&!S.biz.some(z=>z.owner===n.id)&&!['sheriff','mayor','clerk','banker','peddler'].includes(n.cls)).sort((a,b)=>b.cash-a.cash);if(!cand.length)return;
  const n=cand[0],l=free[0];n.cash-=cost;S.town.cash+=lotPrice()+buildCostCash();
  for(const[k,q]of[['wood',BUILD_COST.wood],['iron_ingot',BUILD_COST.iron_ingot]]){const t=Math.min(q,S.market.stock[k]);S.market.stock[k]-=t;S.market.cash+=t*price(k)}
  startBuild(l,n.id,type,start);
  jlog('econ',`${n.name} builds ${an(BIZ_TYPES[type].n.toLowerCase())} on lot ${l.i+1}. The town needs more ${GOODS[o.k].n.toLowerCase()}.`,{toast:'info'});say(n,'The town needs more '+GOODS[o.k].n.toLowerCase()+'. I will make it!',6)}
function playerBuyLot(i){const l=S.lots[i],p=S.player,c=lotPrice();if(l.owner==='player'||l.biz||l.build)return;if(p.cash<c){toast('Not enough notes.','bad');return}
  p.cash-=c;S.town.cash+=c;l.owner='player';sfx('stamp');toast(`You bought lot ${i+1}. Build a business on it.`,'good');jlog('land',`You bought town lot ${i+1} for ${money(c)}.`);renderWin()}
function playerBuild(i,type){const l=S.lots[i],p=S.player,c=buildCostCash();if(l.owner!=='player'||l.biz||l.build)return;
  for(const k of['wood','iron_ingot'])if((p.inv[k]||0)<BUILD_COST[k]){toast(`You need ${BUILD_COST[k]} ${GOODS[k].n.toLowerCase()} to build.`,'bad');return}
  if(p.cash<c+100*S.money.P){toast(`You need ${money(c)} for the builders and ${money(100*S.money.P)} to start the till.`,'bad');return}
  p.inv.wood-=BUILD_COST.wood;p.inv.iron_ingot-=BUILD_COST.iron_ingot;if(!p.inv.wood)delete p.inv.wood;if(!p.inv.iron_ingot)delete p.inv.iron_ingot;
  p.cash-=c+Math.round(100*S.money.P);startBuild(l,'player',type,100*S.money.P);sfx('anvil');toast(`Builders start work on your ${BIZ_TYPES[type].n}. It opens in one day.`,'good');renderWin()}

// ---------- value and sale ----------
function bizValue(z){let inv=0;for(const k in z.inv)inv+=z.inv[k]*price(k)*.6;const pr=z.hist.profit.slice(-7),avg=pr.length?pr.reduce((a,b)=>a+b,0)/pr.length:0;
  return Math.round(BIZ_TYPES[z.type].base*S.money.P+Math.max(0,z.cash)+inv+Math.max(0,avg)*8)}
function bizAsk(z){if(z.owner==='town')return Math.round(bizValue(z)*1.15);const n=S.npcs.find(x=>x.id===z.owner);return Math.round(bizValue(z)*(n?askMult(n):1.3))}
function buyBiz(id){const z=bizById(id),p=S.player;if(!z||z.owner==='player')return;const ask=bizAsk(z);
  if(z.owner!=='town'){const n=S.npcs.find(x=>x.id===z.owner);if(n&&n.opinion+p.rep<-25){toast(`${n.name} will not sell to you.`,'bad');return}}
  if(p.cash<ask){toast(`It costs ${money(ask)}.`,'bad');return}
  p.cash-=ask;if(z.owner==='town')S.town.cash+=ask;else{const n=S.npcs.find(x=>x.id===z.owner);if(n)n.cash+=ask}
  const prev=ownerName(z.owner);z.owner='player';if(z.lot!=null)S.lots[z.lot].owner='player';
  sfx('stamp');fx.ring(p.x,p.y,'#ffd23f');toast(`You own the ${z.name} now. Open its Manage tab.`,'good');jlog('econ',`You bought the ${z.name} from ${prev} for ${money(ask)}.`);UI.winTab.biz='manage';checkAch();renderWin()}
function sellBizToTown(id){const z=bizById(id),p=S.player;if(!z||z.owner!=='player')return;const v=Math.round(bizValue(z)*.8);
  if(!confirm(`Sell the ${z.name} to the Town for ${money(v)}? Its cash goes with it.`))return;
  if(S.town.cash<v){S.town.cash+=v;S.town.printedTotal+=v}S.town.cash-=v;p.cash+=v;z.owner='town';if(z.lot!=null)S.lots[z.lot].owner='town';
  toast(`Sold the ${z.name} for ${money(v)}.`,'good');jlog('econ',`You sold the ${z.name} to the Town for ${money(v)}.`);renderWin()}
// owner controls
function bizSetPrice(id,k,d){const z=bizById(id);if(!z||z.owner!=='player')return;if(d===null){delete z.prices[k]}else{const cur=shopPrice(z,k);z.prices[k]=Math.max(1,Math.round(cur*(1+d)))}renderWin()}
function bizSetMake(id,k,d){const z=bizById(id);if(!z||z.owner!=='player')return;const T=BIZ_TYPES[z.type];
  if(!T.retail)z.make[k]=z.make[k]?0:1;else z.make[k]=clamp((z.make[k]||0)+d,0,80);renderWin()}
function bizSetWage(id,d){const z=bizById(id);if(!z||z.owner!=='player')return;z.wage=Math.max(0,Math.round(z.wage+d*Math.max(1,S.money.P)));renderWin()}
function bizCash(id,d){const z=bizById(id),p=S.player;if(!z||z.owner!=='player')return;if(d>0){d=Math.min(d,p.cash);p.cash-=d;z.cash+=d}else{d=Math.min(-d,z.cash);z.cash-=d;p.cash+=d}sfx('coins');renderWin()}
function bizAddGood(id,k){const z=bizById(id);if(!z||z.owner!=='player')return;z.make[k]=z.make[k]?0:2;renderWin()}

// ---------- crafting ----------
function craftFee(z){return z.owner==='player'?0:Math.round(3*S.money.P)}
function hasInputs(r){for(const k in r.in)if((S.player.inv[k]||0)<r.in[k])return false;return true}
function craft(zid,out){const z=bizById(zid),p=S.player;if(!z)return;const r=bizRecipe(z,out);if(!r)return;
  if(!hasInputs(r)){toast('You do not have the materials.','bad');return}const fee=craftFee(z),cost=Math.max(2,r.t*1.2);
  if(p.energy<cost){toast('You are too tired to craft.','bad');return}if(p.cash<fee){toast('You cannot pay the bench fee.','bad');return}
  const lv=level('craft');for(const k in r.in){let n=r.in[k];if(n>1&&Math.random()<(lv-1)*.05)n--;p.inv[k]-=n;if(!p.inv[k])delete p.inv[k]}
  const n=r.n||1;p.inv[out]=(p.inv[out]||0)+n;p.cash-=fee;z.cash+=fee;p.energy-=cost;
  p.stats.crafted=(p.stats.crafted||0)+n;p.wk.made+=n;challengeAdd('crafted',n);addXp('craft',Math.round(r.t*3));questEvent('craft',out,n);
  fastForward(Math.round(r.t*15*(1-Math.min(.4,(lv-1)*.06))));
  sfx(BIZ_TYPES[z.type].station==='anvil'?'anvil':BIZ_TYPES[z.type].station==='oven'?'door':'oil');fx.sparks(p.x,p.y-.6,10);fx.text(p.x,p.y-1.2,`+${n} ${GOODS[out].n}`,'#ffd86b');
  toast(`You made ${n} ${GOODS[out].n}${fee?' (bench fee '+money(fee)+')':''}.`,'good');jlog('you',`You crafted ${n} ${GOODS[out].n.toLowerCase()} at the ${z.name}.`);checkAch();renderWin()}
function stationsList(st){return S.biz.filter(z=>BIZ_TYPES[z.type].station===st&&z.closedUntil<=S.time).map(z=>z.name+(z.owner==='player'?' (yours, no fee)':''))}
