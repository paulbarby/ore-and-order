'use strict';
// ===== building sites: plan a business, bring materials over time, wagon deliveries, build, stop, tear down =====
const SITE_TYPES=['forge','bakehouse','smelter','post'];
const SITE_DESC={forge:'An anvil. Makes tools and sells them to the town.',bakehouse:'An oven. Bakes bread from wheat.',smelter:'A furnace. Makes ingots and fuel for the Market Hall.',post:'A shop. Buys goods from makers and sells them on.'};
const BUILD_MATS=['wood','iron_ingot'];
const STOP_BACK=.75,TEAR_BACK=.5,CART_FEE=.1,CART_MINS=120;
function siteNeed(){return{wood:BUILD_COST.wood,iron_ingot:BUILD_COST.iron_ingot}}
function lotStore(l){return l.store=l.store||{}}
function storeCount(l){return Object.values(l.store||{}).reduce((a,b)=>a+b,0)}
function onWagon(l,k){return(l.deliveries||[]).filter(d=>d.k===k).reduce((a,d)=>a+d.n,0)}
function siteMissing(l){const st=lotStore(l),need=siteNeed(),out={};for(const k in need){const m=need[k]-(st[k]||0);if(m>0)out[k]=m}return out}
function siteReady(l){return!Object.keys(siteMissing(l)).length}
function siteText(l){const st=lotStore(l),need=siteNeed();return BUILD_MATS.map(k=>`${Math.min(st[k]||0,need[k])}/${need[k]} ${k==='wood'?'timber':'iron'}`).join(', ')}
function lotLabel(l){if(l.build)return`Building site: ${BIZ_TYPES[l.build.type].n}`;if(l.plan)return`Site: ${BIZ_TYPES[l.plan.type].n} · ${siteText(l)}`;
  if(l.owner==='player')return storeCount(l)?'Your lot · materials pile':'Your lot: plan a building';return'Lot '+(l.i+1)+' for sale'}

// ---------- tiles ----------
// the ground of each lot as the world made it, so a torn-down lot looks like new land again
function captureLotGround(){world.lotOrig=world.lots.map(L=>{const a=[];for(let y=L.y;y<L.y+L.h;y++)for(let x=L.x;x<L.x+L.w;x++)a.push(world.tiles[idx(x,y)]);return a})}
function restoreLotGround(l){const L=world.lots[l.i],o=world.lotOrig&&world.lotOrig[l.i];if(!o)return;let k=0;
  for(let y=L.y;y<L.y+L.h;y++)for(let x=L.x;x<L.x+L.w;x++)world.tiles[idx(x,y)]=o[k++];world.tiles[idx(L.door.x,L.door.y)]=T.ROAD;paintTerrain()}
// nobody stays inside a lot when it becomes solid
function ejectFromLot(l){const L=world.lots[l.i],inside=(x,y)=>x>=L.x-.3&&x<L.x+L.w+.3&&y>=L.y-.2&&y<L.y+L.h+.2,out={x:L.door.x+.5,y:L.door.y+.7};
  const p=S&&S.player;if(p&&!S.where&&inside(p.x,p.y)){p.x=out.x;p.y=out.y;p.path=null;p.onArrive=null;fx.dust(p.x,p.y)}
  for(const n of S.npcs||[])if(inside(n.x,n.y)){n.x=out.x+rnd(-.4,.4);n.y=out.y;if(typeof stopAt==='function')stopAt(n)}
  for(const e of S.ents||[])if(e.kind!=='drop'&&inside(e.x,e.y)){e.x=out.x;e.y=out.y+.5}}
// last guard: a player inside solid ground moves to the nearest open spot
function unstickPlayer(){const p=S.player;if(p.dead||canStandAt(p.x,p.y))return;
  for(let r=1;r<10;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=(p.x|0)+dx+.5,y=(p.y|0)+dy+.5;
    if(canStandAt(x,y)){p.x=x;p.y=y;p.path=null;return}}}

// ---------- plan and materials ----------
function myLot(i){const l=S.lots[i];return l&&l.owner==='player'&&!l.biz?l:null}
function planBuild(i,type){const l=myLot(i);if(!l||l.build||l.plan)return;l.plan={type,day:day()};lotStore(l);sfx('stamp');
  toast(`Site marked for your ${BIZ_TYPES[type].n}. Bring ${BUILD_COST.wood} timber and ${BUILD_COST.iron_ingot} iron ingots, all at once or bit by bit.`,'good');
  jlog('econ',`You marked lot ${i+1} for a ${BIZ_TYPES[type].n.toLowerCase()}.`);autoDrop(l,true);renderWin()}
function cancelPlan(i){const l=myLot(i);if(!l||!l.plan)return;l.plan=null;toast('Plan cancelled. The materials stay in the pile on your lot. Take them when you want.','info');renderWin()}
function dropOff(i,k,n){const l=myLot(i),p=S.player;if(!l)return;n=Math.min(n,p.inv[k]||0);if(n<=0)return;
  p.inv[k]-=n;if(!p.inv[k])delete p.inv[k];const st=lotStore(l);st[k]=(st[k]||0)+n;sfx('footstep');fx.debris(world.lots[i].door.x+.5,world.lots[i].door.y,GOODS[k].col,5);
  toast(`You put ${n} ${GOODS[k].n.toLowerCase()} on the site.${l.plan&&siteReady(l)?' All materials are here.':''}`,'good');renderWin()}
// drop exactly what the plan still needs
function autoDrop(l,quiet){const p=S.player,miss=siteMissing(l);let n=0;for(const k in miss){const q=Math.min(miss[k],p.inv[k]||0);if(q>0){p.inv[k]-=q;if(!p.inv[k])delete p.inv[k];lotStore(l)[k]=(lotStore(l)[k]||0)+q;n+=q}}
  if(n&&!quiet)toast(`You put ${n} loads of materials on the site.`,'good');if(n)sfx('footstep');return n}
function takeBack(i,k,n){const l=myLot(i),p=S.player;if(!l)return;const st=lotStore(l);n=Math.min(n,st[k]||0);if(n<=0)return;
  const w=GOODS[k].wt??1,room=w>0?Math.floor((p.cap-load(p))/w+1e-9):n;if(!GOODS[k].item)n=Math.min(n,room);if(n<=0){toast('Your pack is full.','bad');return}
  st[k]-=n;if(!st[k])delete st[k];p.inv[k]=(p.inv[k]||0)+n;sfx('ui_click');toast(`You took ${n} ${GOODS[k].n.toLowerCase()} from the pile.`,'info');renderWin()}
// the Market Hall carts materials to the site
function wagonQuote(l){const miss=siteMissing(l),p=S.player;let cost=0,n=0,short=[];
  for(const k in miss){const want=Math.max(0,miss[k]-onWagon(l,k)),have=Math.min(want,S.market.stock[k]||0);if(have<want)short.push(`${want-have} ${GOODS[k].n.toLowerCase()}`);for(let j=0;j<have;j++)cost+=buyPrice(p,k)*(1+j*.02);n+=have}
  const fee=n?Math.max(Math.round(5*S.money.P),Math.round(cost*CART_FEE)):0;return{cost:Math.round(cost),fee,n,short}}
function orderWagon(i){const l=myLot(i),p=S.player;if(!l||!l.plan)return;const q=wagonQuote(l);if(!q.n){toast(q.short.length?'The Market Hall has none of that in stock.':'Nothing is missing.','bad');return}
  if(p.cash<q.cost+q.fee){toast(`The wagon costs ${money(q.cost+q.fee)}. You have ${money(p.cash)}.`,'bad');return}
  const miss=siteMissing(l);l.deliveries=l.deliveries||[];
  for(const k in miss){const want=Math.max(0,miss[k]-onWagon(l,k)),n=Math.min(want,S.market.stock[k]||0);if(!n)continue;
    S.market.stock[k]-=n;l.deliveries.push({k,n,at:S.time+CART_MINS})}
  // the price shown on the button is the price paid
  p.cash-=q.cost+q.fee;S.market.cash+=q.cost;S.town.cash+=q.fee;sfx('coins');toast(`A wagon brings ${q.n} loads to lot ${i+1} in about 2 hours.${q.short.length?' The market is short of '+q.short.join(' and ')+'.':''}`,'good');
  jlog('econ',`You ordered ${q.n} loads of building materials by wagon for ${money(q.cost+q.fee)}.`);renderWin()}
function deliveriesTick(){for(const l of S.lots){if(!l.deliveries||!l.deliveries.length)continue;const now=l.deliveries.filter(d=>S.time>=d.at);if(!now.length)continue;
  const st=lotStore(l);for(const d of now)st[d.k]=(st[d.k]||0)+d.n;l.deliveries=l.deliveries.filter(d=>S.time<d.at);
  const L=world.lots[l.i];fx.debris(L.door.x+.5,L.door.y,'#c8a070',8);
  jlog('econ',`The wagon unloaded ${now.map(d=>d.n+' '+GOODS[d.k].n.toLowerCase()).join(' and ')} at lot ${l.i+1}.${l.plan&&siteReady(l)?' All materials are on the site.':''}`,{toast:'good'})}}

// ---------- build, stop, tear down ----------
function beginBuild(i){const l=myLot(i),p=S.player,c=buildCostCash(),till=Math.round(100*S.money.P);if(!l||!l.plan||l.build)return;
  autoDrop(l);if(!siteReady(l)){toast('Materials are missing: '+Object.entries(siteMissing(l)).map(([k,n])=>n+' '+GOODS[k].n.toLowerCase()).join(', ')+'.','bad');return}
  if(p.cash<c+till){toast(`You need ${money(c)} for the builders and ${money(till)} for the till.`,'bad');return}
  const st=lotStore(l),need=siteNeed();for(const k in need){st[k]-=need[k];if(!st[k])delete st[k]}
  p.cash-=c+till;S.town.cash+=c;const type=l.plan.type;l.plan=null;startBuild(l,'player',type,till);sfx('anvil');
  toast(`Builders start work on your ${BIZ_TYPES[type].n}. It opens in one day.`,'good');renderWin()}
function stopBuild(i){const l=S.lots[i],p=S.player;if(!l||!l.build||l.build.owner!=='player')return;
  if(!confirm('Stop the builders? You get back 75% of the materials and the till money. The builders keep their fee.'))return;
  const st=lotStore(l),need=siteNeed();for(const k in need){const n=Math.floor(need[k]*STOP_BACK);st[k]=(st[k]||0)+n}
  p.cash+=l.build.cash||0;const type=l.build.type;l.build=null;restoreLotGround(l);sfx('rock_break');
  toast('The builders stop. 75% of the materials are back in the pile on your lot.','info');jlog('econ',`You stopped the building of your ${BIZ_TYPES[type].n.toLowerCase()} on lot ${i+1}.`);renderWin()}
function tearDown(id){const z=bizById(id),p=S.player;if(!z||z.owner!=='player'||z.lot==null)return;const l=S.lots[z.lot];
  if(!confirm(`Tear down the ${z.name}? You get its till money, its stock goes to a pile on the lot, and half of the timber and iron comes back.`))return;
  closeWin();const st=lotStore(l);for(const k in z.inv)if(z.inv[k]>0)st[k]=(st[k]||0)+z.inv[k];
  const need=siteNeed();for(const k in need)st[k]=(st[k]||0)+Math.floor(need[k]*TEAR_BACK);
  p.cash+=Math.max(0,Math.round(z.cash));S.biz=S.biz.filter(x=>x!==z);S.orders=(S.orders||[]).filter(o=>o.from!==z.id);
  for(const n of S.npcs)if(n.work===z.id){n.work=null;n.state='idle';n.spot=null}
  world.buildings=world.buildings.filter(b=>b.lot!==l.i);l.biz=null;restoreLotGround(l);
  const L=world.lots[l.i];fx.burst('dust',{x:L.x,y:L.y,w:L.w,h:L.h});cam.shake=6;sfx('rock_break');
  jlog('econ',`You tore down the ${z.name}. The pile on lot ${l.i+1} holds ${Object.entries(st).map(([k,n])=>n+' '+GOODS[k].n.toLowerCase()).join(', ')}.`,{toast:'info'})}

// ---------- the lot window ----------
function lotPanel(b){const l=S.lots[b.lotI],L=world.lots[l.i],P=S.money.P,p=S.player;$('#winPortrait').src=portrait('clerk');
  $('#winGreet').textContent='Town land for new businesses. Mark a site, bring timber and iron in your own time, and the builders do the rest.';
  if(l.biz){const z=bizById(l.biz);return`<p>The ${z.name} stands here.</p>`+(z.owner==='player'?`<button onclick="tearDown('${z.id}')">Tear it down</button>`:'')}
  if(l.build){const own=l.build.owner==='player';return`<p>Builders are at work on ${an(BIZ_TYPES[l.build.type].n)} for ${ownerName(l.build.owner)}. It opens in ${hrsLeft(l.build.until)}.</p>`+
    (own?`<button onclick="stopBuild(${l.i})">Stop the builders (75% of the materials come back)</button>`:'')}
  if(l.owner!=='player')return`<div class="bigval">${money(lotPrice())}<small>Lot ${l.i+1}: ${L.w}×${L.h} tiles on ${L.y<world.cy?'Main Street':'Second Street'}. The money goes to the Town.</small></div><button class="gold big" onclick="playerBuyLot(${l.i})" ${p.cash<lotPrice()?'disabled':''}>Buy this lot</button>`;
  let h='';
  if(l.plan){const need=siteNeed(),st=lotStore(l),c=buildCostCash(),till=Math.round(100*P),ready=siteReady(l),q=wagonQuote(l);
    h+=`<h4>Site: ${BIZ_TYPES[l.plan.type].n}</h4><p class="dim">Bring the materials in one trip or many. They wait safely on the site.</p><table class="prices">`;
    for(const k of BUILD_MATS){const on=Math.min(st[k]||0,need[k]),carry=p.inv[k]||0,miss=need[k]-on,w=onWagon(l,k);
      h+=`<tr><td>${ico(k)}</td><td>${GOODS[k].n}</td><td><div class="sitebar"><i style="width:${on/need[k]*100}%"></i><span>${on} / ${need[k]}</span></div>${w?`<small class="dim">${w} on the wagon</small>`:''}</td><td>you carry ${carry}</td>
        <td class="btns"><button ${carry&&miss>0?'':'disabled'} onclick="dropOff(${l.i},'${k}',${Math.min(carry,Math.max(0,miss))})">Drop off ${Math.min(carry,Math.max(0,miss))||''}</button><button ${(st[k]||0)>0?'':'disabled'} onclick="takeBack(${l.i},'${k}',1)">Take 1</button><button ${(st[k]||0)>0?'':'disabled'} onclick="takeBack(${l.i},'${k}',${st[k]||0})">Take all</button></td></tr>`}
    h+='</table>';
    if(!ready)h+=`<div class="row"><button ${q.n&&p.cash>=q.cost+q.fee?'':'disabled'} onclick="orderWagon(${l.i})" data-tip="The Market Hall sells the missing materials and carts them here in about 2 hours.">Order the rest by wagon · ${money(q.cost+q.fee)}</button><small class="dim">${q.n?`${q.n} loads, cart fee ${money(q.fee)}`:'Nothing to order'}${q.short.length?` · market short of ${q.short.join(', ')}`:''}</small></div>`;
    h+=`<div class="row"><button class="gold big" ${ready&&p.cash>=c+till?'':'disabled'} onclick="beginBuild(${l.i})">Start building · ${money(c)} builders + ${money(till)} till</button><button onclick="cancelPlan(${l.i})">Cancel the plan</button></div>`;
    if(ready)h+=`<p class="good">All materials are on the site.</p>`}
  else{const mats=BUILD_MATS.map(k=>`${p.inv[k]||0} ${k==='wood'?'timber':'iron ingots'}`).join(' and ');
    h+=`<p>Your lot. Choose a business and mark the site. Every building needs <b>${BUILD_COST.wood} timber</b> and <b>${BUILD_COST.iron_ingot} iron ingots</b> on the site, ${money(buildCostCash())} for the builders and ${money(100*P)} for the till. You carry ${mats}.</p>
    <div class="cards">${SITE_TYPES.map(t=>`<div class="card"><h4>${BIZ_TYPES[t].n}</h4><p>${SITE_DESC[t]}</p><button class="gold" onclick="planBuild(${l.i},'${t}')">Mark the site</button></div>`).join('')}</div>`}
  const extra=Object.keys(lotStore(l)).filter(k=>l.plan?!BUILD_MATS.includes(k)||(l.store[k]||0)>siteNeed()[k]:true);
  if(extra.length){h+=`<h4>${l.plan?'Other goods in the pile':'The pile on your lot'}</h4><table class="prices">`;
    for(const k of extra){const n=l.store[k],spare=l.plan&&BUILD_MATS.includes(k)?n-siteNeed()[k]:n;h+=`<tr><td>${ico(k)}</td><td>${GOODS[k].n}</td><td>${n}</td><td class="btns"><button onclick="takeBack(${l.i},'${k}',1)">Take 1</button>${spare>1?`<button onclick="takeBack(${l.i},'${k}',${spare})">Take ${spare}</button>`:''}</td></tr>`}
    h+='</table>'}
  return h}

// ---------- drawing the site ----------
function drawSitePiles(g,l,L){const st=l.store||{},x=L.x*TS,y=L.y*TS,w=L.w*TS,h=L.h*TS;if(!l.plan&&!storeCount(l))return;
  if(l.plan){g.strokeStyle='rgba(240,200,120,.75)';g.lineWidth=.8;g.beginPath();g.moveTo(x+3,y+5);g.lineTo(x+w-4,y+5);g.lineTo(x+w-4,y+h-1);g.lineTo(x+3,y+h-1);g.closePath();g.stroke()}
  // timber stack
  const wood=Math.min(st.wood||0,24),bx=x+6,by=y+h-6;for(let i=0;i<wood;i++){const r=Math.floor(i/6),c=i%6;const px=bx+c*3+(r%2),py=by-r*3;g.fillStyle=OUTLINE;g.fillRect(px-1,py-1,4,4);g.fillStyle='#9a6a3a';g.fillRect(px,py,2,2);g.fillStyle='#d8b078';g.fillRect(px,py,1,1)}
  // iron ingots
  const iron=Math.min(st.iron_ingot||0,12),ix=x+w-22,iy=y+h-5;for(let i=0;i<iron;i++){const r=Math.floor(i/4),c=i%4;const px=ix+c*4+r*2,py=iy-r*3;g.fillStyle=OUTLINE;g.fillRect(px-1,py-1,5,3);g.fillStyle='#8a8e98';g.fillRect(px,py,3,1);g.fillStyle='#c8ccd4';g.fillRect(px,py,3,.5)}
  // any other goods: one crate
  const other=Object.keys(st).filter(k=>!BUILD_MATS.includes(k)&&st[k]>0);if(other.length){const cx=x+w/2-4,cy=y+h-10;g.fillStyle=OUTLINE;g.fillRect(cx-1,cy-1,10,9);g.fillStyle='#8a5a30';g.fillRect(cx,cy,8,7);g.fillStyle='#a8784a';g.fillRect(cx,cy,8,1);g.fillRect(cx+3,cy,1,7)}}
