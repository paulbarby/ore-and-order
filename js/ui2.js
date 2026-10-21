'use strict';
// ===== UI part 2: businesses, notice board, lots, mayor, elections, goals, leaderboard, crafting =====
const pctCls=v=>v>.3?'bad':v>.12?'warn':'good';
const hrsLeft=t=>{const h=Math.max(0,Math.round((t-S.time)/60));return h>=24?Math.round(h/24)+' d':h+' h'};

// ---------- HUD extras ----------
// write only when the content changes, so animations do not replay and tooltips stay open
function setHTML(el,html){if(el&&el._h!==html){el._h=html;el.innerHTML=html}}
function hud2Update(){const g=goalNow(),gb=$('#goalBox');
  if(g){const[a,b]=g.prog(),pc=Math.floor(clamp(a/b*100,0,100));setHTML(gb,`<small>GOAL ${(S.player.goal||0)+1} OF ${GOALS.length}</small><b>${g.n}</b><span>${g.d}</span><div class="gbar"><i style="width:${pc}%"></i></div>`)}
  else setHTML(gb,'<small>ALL GOALS DONE</small><b>Tycoon of the Valley</b><span>Weekly challenges are on the notice board.</span>');
  // event chips: build once for each event, then change only the tooltip text
  const bar=$('#eventBar'),ids=S.events.map(e=>e.key+e.until).join('|');
  if(bar._ids!==ids){bar._ids=ids;bar.innerHTML=S.events.map(e=>{const E=EVENTS[e.key];return`<div class="ev">${E.icon}<span>${E.n}</span></div>`}).join('')}
  [...bar.children].forEach((el,i)=>{const e=S.events[i];if(!e)return;const E=EVENTS[e.key],tip=`<b>${E.n}</b><br>${eventDesc(e)}<br><small>${hrsLeft(e.until)} left</small>`;if(el.dataset.tip!==tip)el.dataset.tip=tip});
  const mb=$('#mayorBadge'),t=S.town;mb.classList.toggle('hidden',t.mayor!=='player');if(t.mayor==='player')setHTML(mb,`🎖 Mayor · approval <b class="${t.approval<35?'bad':t.approval<55?'warn':'good'}">${Math.round(t.approval)}%</b>`)}

// ---------- business window ----------
function bizPortrait(z){if(!z)return portrait('merchant');if(z.owner==='player')return portrait('player');const n=S.npcs.find(n=>n.id===z.owner);if(n)return portrait(n.cls,n);
  return portrait({refinery:'refiner',smelter:'refiner',smithy:'smith',forge:'smith',bakery:'baker',bakehouse:'baker'}[z.type]||'merchant')}
function winBiz(b){const z=b.bizId?bizById(b.bizId):null;if(!z)return'<p>This business has closed.</p>';const T=BIZ_TYPES[z.type],own=z.owner==='player';
  $('#winPortrait').src=bizPortrait(z);$('#winGreet').textContent=own?'This is your business.':z.type==='peddler'?'Rare goods from far away. Today only!':`Owner: ${ownerName(z.owner)}. ${T.station?'Made here with a '+STATION_NAME[T.station].toLowerCase()+'.':'A shop that buys from makers and sells to the town.'}`;
  const list=[];if(T.retail)list.push(['shop','Shop']);else list.push(['shop','Output']);if(T.station)list.push(['craft','Craft']);if(T.station||T.retail&&z.type!=='peddler')list.push(['work','Work']);if(z.type!=='peddler'){list.push(['info','Info']);list.push(own?['manage','Manage']:['buy','Buy it'])}
  let t=UI.winTab.biz||'shop';if(!list.some(x=>x[0]===t))t='shop';
  let h=tabs('w:biz',list,t);if(z.closedUntil>S.time)h+=`<div class="banner bad">Closed after a fire. It opens again in ${hrsLeft(z.closedUntil)}.</div>`;
  if(t==='shop')h+=T.retail?bizShop(z):bizOutput(z);else if(t==='craft')h+=bizCraft(z);else if(t==='work')h+=bizWork(z);else if(t==='info')h+=bizInfo(z);else if(t==='manage')h+=bizManage(z);else h+=bizBuy(z);
  return h}
function bizShop(z){const p=S.player,goods=Object.keys(z.type==='peddler'?z.inv:z.make).filter(k=>sellsGood(z,k)||(z.inv[k]||0)>0);
  let h=`<table class="prices"><tr><th></th><th>Good</th><th>Price</th><th>Stock</th><th>Town demand</th><th></th></tr>`;
  for(const k of goods){const d=S.dem[k],st=z.inv[k]||0,pr=shopPrice(z,k);h+=`<tr data-tip="${GOODS[k].n}${GOODS[k].item?': '+GOODS[k].item.d:GOODS[k].food?': restores '+GOODS[k].food+' hunger':''}"><td>${ico(k)}</td><td>${GOODS[k].n}</td><td><b>${money(pr)}</b>${z.prices[k]!=null?' <small class="dim">fixed</small>':''}</td><td>${st}</td>
    <td>${d?`<span class="${pctCls(d.ema)}">${Math.round(d.ema*100)}% short</span>`:''}</td><td class="btns"><button ${st&&p.cash>=pr?'':'disabled'} onclick="pRetail('${z.id}','${k}',1)">Buy</button>${st>1&&!GOODS[k].item?`<button onclick="pRetail('${z.id}','${k}',5)">×5</button>`:''}</td></tr>`}
  h+='</table>';if(!goods.length)h+='<p class="dim">The shelves are empty.</p>';
  const sellable=Object.keys(p.inv).filter(k=>shopWants(z,k)>0);
  if(sellable.length&&z.type!=='peddler'){h+=`<h4>Sell to this shop</h4><p class="dim">The shop pays the wholesale price (62% of its shelf price) while it has room and cash (${money(z.cash)}).</p><table class="prices">`;
    for(const k of sellable)h+=`<tr><td>${ico(k)}</td><td>${GOODS[k].n}</td><td>${money(wholesale(z,k))} each</td><td>wants ${shopWants(z,k)}</td><td class="btns"><button onclick="pSellShop('${z.id}','${k}',1)">Sell</button><button onclick="pSellShop('${z.id}','${k}',99)">All</button></td></tr>`;h+='</table>'}
  return h}
function bizOutput(z){const outs=bizOutputs(z);let h=`<p>The ${z.name} sells its metal and fuel to the Market Hall. Buy those goods there.</p><table class="prices"><tr><th></th><th>Product</th><th>Market price</th><th>Making it</th></tr>`;
  for(const k of outs)h+=`<tr><td>${ico(k)}</td><td>${GOODS[k].n}</td><td>${money(price(k))}</td><td>${z.make[k]?'<span class="good">Yes</span>':'<span class="dim">No</span>'}</td></tr>`;return h+'</table>'}
function bizCraft(z){const T=BIZ_TYPES[z.type],fee=craftFee(z),lv=level('craft');let h=`<p>Use the ${STATION_NAME[T.station].toLowerCase()} yourself. ${fee?'Bench fee '+money(fee)+' for each item.':'No fee: you own it.'} Craft level ${lv}: ${Math.round(Math.min(.4,(lv-1)*.06)*100)}% faster.</p>`;
  h+=`<div class="recipes">${RECIPES[T.station].map(r=>recipeCard(r,`mgCraft('${z.id}','${r.out}')`,`craft('${z.id}','${r.out}')`)).join('')}</div>`;return h}
function recipeCard(r,action,quick){const p=S.player,miss=missingFor(r),ok=!miss.length,buy=buyMissingCost(r);
  return`<div class="rcard ${ok?'ok':''}"><div class="rout">${ico(r.out,'ico big')}<b>${r.n>1?r.n+'× ':''}${GOODS[r.out].n}</b></div>
  <div class="rin">${Object.entries(r.in).map(([k,n])=>`<span class="${(p.inv[k]||0)>=n?'good':'bad'}">${ico(k)} ${p.inv[k]||0}/${n} ${GOODS[k].n}</span>`).join('')}</div>
  ${miss.length?`<small class="bad">Missing: ${miss.map(([k,n])=>n+' '+GOODS[k].n.toLowerCase()).join(', ')}</small>`:''}
  <small class="dim">${Math.round(r.t*15)} min · ${Math.max(2,r.t*1.2).toFixed(0)} energy · sells near ${money(price(r.out))}</small>
  <div class="row" style="margin:0">${action?`<button class="gold" ${ok?'':'disabled'} onclick="${action}">Craft</button>${quick?`<button ${ok?'':'disabled'} onclick="${quick}" data-tip="No game. A plain result.">Quick</button>`:''}`:''}
  ${miss.length?`<button ${buy.ok?'':'disabled'} onclick="buyMissing('${r.out}')" data-tip="${buy.ok?'Buy the missing materials at the Market Hall price.':buy.why}">Buy missing · ${money(buy.cost)}</button>`:''}</div></div>`}
function missingFor(r){const p=S.player;return Object.entries(r.in).map(([k,n])=>[k,n-(p.inv[k]||0)]).filter(e=>e[1]>0)}
function buyMissingCost(r){const p=S.player,miss=missingFor(r);let cost=0;for(const[k,n]of miss)for(let i=0;i<n;i++)cost+=buyPrice(p,k);
  const noStock=miss.find(([k,n])=>S.market.stock[k]<n),room=p.cap-load(p),need=miss.reduce((a,e)=>a+e[1],0);
  return{cost,ok:!noStock&&p.cash>=cost&&need<=room,why:noStock?`The Market Hall has no ${GOODS[noStock[0]].n.toLowerCase()}.`:p.cash<cost?'You do not have enough notes.':'Your pack is full.'}}
function recipeOf(out){for(const st in RECIPES){const r=RECIPES[st].find(r=>r.out===out);if(r)return r}return null}
function buyMissing(out){const r=recipeOf(out),p=S.player,b=buyMissingCost(r);if(!b.ok){toast(b.why,'bad');return}const got=[];
  for(const[k,n]of missingFor(r)){const res=buyGoods(p,k,n);got.push(res.n+' '+GOODS[k].n.toLowerCase())}
  sfx('coins');toast(`Bought ${got.join(' and ')} at the Market Hall.`,'good');if(UI.win)renderWin();if(UI.panel)renderPanel()}
function bizWork(z){const T=BIZ_TYPES[z.type],own=z.owner==='player';let h='';
  if(T.station){const wo=workOrders(z);h+=`<p>${own?'Your business. Work here to fill your own shelves and orders. No wage.':'These are the work orders. Pick one and play the work. Better work gives more goods and more pay.'}</p>`;
    h+=wo.length?`<table class="prices worders"><tr><th></th><th>Work order</th><th>Need</th><th>Materials</th><th>Pay for each</th><th></th></tr>`+wo.map(w=>{const mats=Object.entries(w.r.in).map(([k,n])=>`<span class="${(z.inv[k]||0)>=n?'good':w.mat.missing.includes(k)?'bad':'warn'}">${n}×${ico(k)}</span>`).join(' ');
      return`<tr><td>${ico(w.k)}</td><td><b>${w.r.n>1?w.r.n+'× ':''}${GOODS[w.k].n}</b><br><small class="dim">${w.why}</small></td><td>${w.need}</td><td>${mats}${w.mat.cost?`<br><small class="dim">shop buys at market: ${money(w.mat.cost)}</small>`:''}${w.mat.missing.length?`<br><small class="bad">no ${w.mat.missing.map(k=>GOODS[k].n.toLowerCase()).join(', ')}</small>`:''}</td>
      <td>${own?'—':money(piecePay(z,w.r,.25))+' to '+money(piecePay(z,w.r,1))}</td><td><button class="gold" ${w.mat.ok?'':'disabled'} onclick="mgWork('${z.id}','${w.k}')">Work</button></td></tr>`}).join('')+'</table>':'<p class="dim">No work orders now. The shelves are full and nobody has ordered these goods.</p>'}
  if(T.retail)h+=`<h4>Shop counter</h4><p>Serve 8 customers from the shelves. You get tips and a share of the sales. The goods go to real townsfolk.</p><button class="gold" onclick="mgServe('${z.id}')">Serve customers</button>`;
  if(T.station){const w=shiftPay(z.id);h+=`<h4>Plain shift</h4><p class="dim">No game: 2 hours of labour on the job in progress for ${money(w)}.</p><button onclick="workShift('${z.id}')" ${z.cash<w||!w?'disabled':''}>Work a plain shift</button>`}
  return h}
function bizInfo(z){const T=BIZ_TYPES[z.type],r=z.job?bizRecipe(z,z.job):null;
  let h=`<div class="stats4"><div><small>Owner</small><b style="font-size:12px">${ownerName(z.owner)}</b></div><div><small>Made</small><b>${z.made}</b></div><div><small>Profit yesterday</small><b class="${(z.hist.profit.at(-1)||0)<0?'bad':'good'}">${money(z.hist.profit.at(-1)||0)}</b></div><div><small>Value</small><b>${money(bizValue(z))}</b></div></div>`;
  if(T.station)h+=`<div class="job">${r?`${ico(r.out,'ico big')}<div><b>Making ${GOODS[r.out].n}</b><div class="prog"><i style="width:${z.prog/r.t*100}%"></i></div><small class="dim">${z.prog.toFixed(1)} of ${r.t} labour hours</small></div>`:'<div class="dim">Idle. It waits for materials, cash or a reason to make more.</div>'}</div>`;
  h+=`<h4>Profit each day</h4><canvas class="chart" data-bizprofit="${z.id}" height="70"></canvas>`;
  if(T.station){h+=`<h4>What it can make</h4><table class="prices"><tr><th></th><th>Makes</th><th>Uses</th><th>Labour</th><th>Margin now</th></tr>`;
    for(const r of RECIPES[T.station]){let cost=0;for(const k in r.in)cost+=price(k)*r.in[k];const val=(T.retail?shopPrice(z,r.out)*.9:price(r.out)*.9)*(r.n||1),pr=Math.round(val-cost-z.wage*r.t/2);
      h+=`<tr><td>${ico(r.out)}</td><td>${r.n>1?r.n+'× ':''}${GOODS[r.out].n}</td><td>${Object.entries(r.in).map(([k,n])=>`${n}×${ico(k)}`).join(' ')}</td><td>${r.t}</td><td class="${pr>0?'good':'bad'}">${money(pr)}</td></tr>`}h+='</table>'}
  return h}
function bizBuy(z){const ask=bizAsk(z),v=bizValue(z),o=ownerName(z.owner);
  return`<div class="bigval">${money(ask)}<small>${o} asks this much. Value: ${money(v)} (building, till ${money(z.cash)}, stock and recent profit).</small></div>
  <p>When you own it, you set the prices, what it makes or stocks, and the wage. The till cash comes with it.</p>
  <button class="gold big" onclick="buyBiz('${z.id}')" ${S.player.cash<ask?'disabled':''}>Buy the ${z.name} · ${money(ask)}</button>${S.player.cash<ask?`<p class="dim">You need ${money(ask-S.player.cash)} more. The Bank lends against land.</p>`:''}`}
function bizManage(z){const T=BIZ_TYPES[z.type],P=S.money.P,a=n=>Math.round(n*P);
  let h=`<div class="stats4"><div><small>Till</small><b>${money(z.cash)}</b></div><div><small>Wage / hour</small><b>${money(z.wage)}</b></div><div><small>Workers now</small><b>${workersAt(z)}</b></div><div><small>Profit yesterday</small><b class="${(z.hist.profit.at(-1)||0)<0?'bad':'good'}">${money(z.hist.profit.at(-1)||0)}</b></div></div>
  <div class="row"><span>Till</span><button onclick="bizCash('${z.id}',${a(100)})">Put in ${money(a(100))}</button><button onclick="bizCash('${z.id}',-${a(100)})">Take ${money(a(100))}</button><button onclick="bizCash('${z.id}',-${Math.max(0,Math.round(z.cash))})">Take all</button></div>`;
  if(T.wage)h+=`<div class="row"><span>Wage</span><button onclick="bizSetWage('${z.id}',-1)">−</button><b>${money(z.wage)} an hour</b><button onclick="bizSetWage('${z.id}',1)">+</button><small class="dim">A higher wage brings more workers. Other businesses pay ${money(avgWage(z))}.</small></div>`;
  if(T.station&&T.retail){h+=`<h4>Production: stock to keep on the shelf</h4><table class="prices">`;for(const r of RECIPES[T.station]){const k=r.out;h+=`<tr><td>${ico(k)}</td><td>${GOODS[k].n}</td><td>stock ${z.inv[k]||0}</td><td class="btns"><button onclick="bizSetMake('${z.id}','${k}',-1)">−</button><b> ${z.make[k]||0} </b><button onclick="bizSetMake('${z.id}','${k}',1)">+</button><button onclick="bizSetMake('${z.id}','${k}',5)">+5</button></td></tr>`}h+='</table>'}
  else if(T.station){h+=`<h4>Production: what to make and sell to the Market Hall</h4><table class="prices">`;for(const r of RECIPES[T.station]){const k=r.out;h+=`<tr><td>${ico(k)}</td><td>${GOODS[k].n}</td><td>${money(price(k))}</td><td><button class="${z.make[k]?'gold':''}" onclick="bizSetMake('${z.id}','${k}',0)">${z.make[k]?'Making':'Off'}</button></td></tr>`}h+='</table>'}
  else{h+=`<h4>Goods to stock (bought from makers or the market)</h4><table class="prices">`;for(const k of[...FINISHED,'fuel']){h+=`<tr><td>${ico(k)}</td><td>${GOODS[k].n}</td><td>stock ${z.inv[k]||0}</td><td class="btns"><button onclick="bizSetMake('${z.id}','${k}',-1)">−</button><b> ${z.make[k]||0} </b><button onclick="bizSetMake('${z.id}','${k}',1)">+</button></td></tr>`}h+='</table>'}
  if(T.retail){h+=`<h4>Prices</h4><table class="prices"><tr><th></th><th>Good</th><th>Your price</th><th>Fair price</th><th>Town demand</th><th></th></tr>`;
    for(const k of Object.keys(z.make).filter(k=>z.make[k]>0)){const d=S.dem[k];h+=`<tr><td>${ico(k)}</td><td>${GOODS[k].n}</td><td><b>${money(shopPrice(z,k))}</b> <small class="dim">${z.prices[k]!=null?'fixed':'auto'}</small></td><td>${money(refPrice(k))}</td><td>${d?`<span class="${pctCls(d.ema)}">${Math.round(d.ema*100)}% short</span>`:''}</td>
      <td class="btns"><button onclick="bizSetPrice('${z.id}','${k}',-.1)">−10%</button><button onclick="bizSetPrice('${z.id}','${k}',.1)">+10%</button><button onclick="bizSetPrice('${z.id}','${k}',null)">Auto</button></td></tr>`}
    h+=`</table><p class="dim">Customers buy from the cheapest shop. Above 2.4 times the fair price, nobody buys. Auto prices go up when goods are short.</p>`}
  h+=`<h4>Profit each day</h4><canvas class="chart" data-bizprofit="${z.id}" height="70"></canvas><button onclick="sellBizToTown('${z.id}')">Sell to the Town · ${money(bizValue(z)*.8)}</button>${z.lot!=null?` <button onclick="tearDown('${z.id}')" data-tip="You keep the lot. The till money comes to you, the stock goes to a pile on the lot, and half of the timber and iron comes back.">Tear it down</button>`:''}`;return h}
function avgWage(z){const o=S.biz.filter(x=>x!==z&&BIZ_TYPES[x.type].wage);return o.length?Math.round(o.reduce((a,x)=>a+x.wage,0)/o.length):0}
function pRetail(id,k,q){const z=bizById(id),p=S.player;if(!GOODS[k].item&&load(p)+q>p.cap){toast('Your pack is full.','bad');return}const r=retailBuy(p,z,k,q);
  if(!r.n){toast('You cannot buy that now.','bad');return}sfx('coins');addXp('trade',1);toast(`Bought ${r.n} ${GOODS[k].n} for ${money(r.spent)}.`,'good');checkAch();renderWin()}
function pSellShop(id,k,q){const z=bizById(id),r=sellToShop(z,k,q);if(!r.n){toast('The shop cannot buy that now.','bad');return}afterSale(r.got,`${r.n} ${GOODS[k].n} to the ${z.name}`);renderWin()}

// ---------- notice board ----------
function winBoard(){$('#winPortrait').src=portrait('mayor');$('#winGreet').textContent='Orders, news and the weekly challenges. Deliver goods here and get paid at once.';
  const t=UI.winTab.board||'orders',p=S.player;let h=tabs('w:board',[['orders',`Orders (${S.orders.length})`],['week','Weekly challenges'],['news','News'],['needs','Town needs']],t);
  if(t==='orders'){if(!S.orders.length)h+='<p class="dim">No orders at the moment. Shops post orders when they run short of goods.</p>';
    h+=`<div class="orders">${[...S.orders].sort((a,b)=>b.price/GOODS[b.k].p-a.price/GOODS[a.k].p).map(o=>{const have=p.inv[o.k]||0,left=o.qty-o.got,mk=price(o.k);
      return`<div class="order"><div>${ico(o.k,'ico big')}</div><div><b>${left} × ${GOODS[o.k].n}</b> at <b class="good">${money(o.price)}</b> each <small class="dim">(market ${money(mk)})</small><br><small>${orderFrom(o)} · ${o.note} · ${hrsLeft(o.until)} left</small></div>
      <div class="btns"><small>You have ${have}</small><button class="gold" ${have?'':'disabled'} onclick="deliver(${o.id},${Math.min(have,left)})">Deliver ${Math.min(have,left)||''}</button></div></div>`}).join('')}</div>`}
  else if(t==='week'){h+=`<p>Week ${S.week}. The week ends on day ${S.week*7+1} at 06:00.</p>`+S.challenges.map(c=>`<div class="deed ${c.done?'offer':''}"><b>${c.done?'✔ ':''}${challengeText(c)}</b> · reward ${money(c.reward)}<div class="xpbar"><i style="width:${clamp(c.got/c.x*100,0,100)}%"></i></div><small class="dim">${Math.min(c.got,c.x)} of ${c.x}</small></div>`).join('')}
  else if(t==='news'){h+=S.events.length?S.events.map(e=>`<div class="law"><b>${EVENTS[e.key].icon} ${EVENTS[e.key].n}</b><p>${eventDesc(e)} ${hrsLeft(e.until)} left.</p></div>`).join(''):'<p class="dim">No news today.</p>';
    h+='<h4>Recent</h4>'+S.journal.filter(j=>j.cat==='event'||j.cat==='law').slice(0,10).map(j=>`<div class="je"><span class="jt">Day ${j.d}</span>${j.txt}</div>`).join('')}
  else h+=demandTable();
  return h}
function demandTable(){const F=S.folk;let h=`<div class="stats4"><div><small>Townsfolk</small><b>${F.pop}</b></div><div><small>Goods short</small><b class="${pctCls(F.short)}">${Math.round(F.short*100)}%</b></div><div><small>Shops</small><b>${S.biz.filter(z=>BIZ_TYPES[z.type].retail).length}</b></div><div><small>Free lots</small><b>${S.lots.filter(l=>!l.biz&&!l.build).length}</b></div></div>
  <p class="dim">When the town has enough, more settlers come. More people want more goods. The town is never quite supplied: that gap is your chance.</p><table class="prices"><tr><th></th><th>Good</th><th>Wanted yesterday</th><th>Bought</th><th>Short</th><th>Price</th></tr>`;
  for(const d of townShortList()){const L=d.last||{want:0,got:0};h+=`<tr><td>${ico(d.k)}</td><td>${GOODS[d.k].n}</td><td>${L.want}</td><td>${L.got}</td><td><span class="${pctCls(d.ema)}">${Math.round(d.ema*100)}%</span></td><td>${money(price(d.k))}</td></tr>`}
  return h+'</table><h4>Townsfolk</h4><canvas class="chart" data-folk="1" height="70"></canvas>'}

// ---------- town lots ----------
function winLot(b){return lotPanel(b)}
function winLotOld(b){const l=S.lots[b.lotI],L=world.lots[l.i],P=S.money.P,p=S.player;$('#winPortrait').src=portrait('clerk');$('#winGreet').textContent='Town land for new businesses. Buy the lot, bring timber and iron, and the builders do the rest.';
  if(l.biz){const z=bizById(l.biz);return`<p>The ${z.name} stands here.</p>`}
  if(l.build)return`<p>Builders are at work on ${an(BIZ_TYPES[l.build.type].n)} for ${ownerName(l.build.owner)}. It opens in ${hrsLeft(l.build.until)}.</p>`;
  if(l.owner!=='player')return`<div class="bigval">${money(lotPrice())}<small>Lot ${l.i+1}: ${L.w}×${L.h} tiles on ${L.y<world.cy?'Main Street':'Second Street'}. The money goes to the Town.</small></div><button class="gold big" onclick="playerBuyLot(${l.i})" ${p.cash<lotPrice()?'disabled':''}>Buy this lot</button>`;
  const types=['forge','bakehouse','smelter','post'],c=buildCostCash();
  return`<p>Your lot. Choose a business to build. Every building needs <b>${BUILD_COST.wood} timber</b> (you have ${p.inv.wood||0}), <b>${BUILD_COST.iron_ingot} iron ingots</b> (you have ${p.inv.iron_ingot||0}), ${money(c)} for the builders and ${money(100*P)} for the till.</p>
  <div class="cards">${types.map(t=>`<div class="card"><h4>${BIZ_TYPES[t].n}</h4><p>${{forge:'An anvil. Makes tools and sells them to the town.',bakehouse:'An oven. Bakes bread from wheat.',smelter:'A furnace. Makes ingots and fuel for the Market Hall.',post:'A shop. Buys goods from makers and sells them on.'}[t]}</p><button class="gold" onclick="playerBuild(${l.i},'${t}')">Build · 1 day</button></div>`).join('')}</div>`}

// ---------- town hall: mayor, election, projects ----------
function winMayor(){const t=S.town,P=S.money.P;let h=`<div class="stats4"><div><small>Treasury</small><b>${money(t.cash)}</b></div><div><small>Approval</small><b class="${t.approval<35?'bad':t.approval<55?'warn':'good'}">${Math.round(t.approval)}%</b></div><div><small>Note value</small><b>${Math.round(S.money.v*100)}¢</b></div><div><small>Next election</small><b>Day ${t.nextElection}</b></div></div>`;
  if(t.mayor!=='player'){const m=S.npcs.find(n=>n.id===t.mayor);return h+`<p>${m?m.name:'The mayor'} runs the town. Win an election to set the rules yourself.</p>`}
  h+=`<p>You set the rules of the valley. Each change shows in approval over the next days. Below 22% for two days, the people call a recall election.</p><table class="prices policies">`;
  for(const P of POLICIES)h+=`<tr data-tip="${P.d}"><td><b>${P.n}</b><br><small class="dim">${P.d}</small></td><td class="btns"><button onclick="setPolicy('${P.k}',-1)">−</button><b class="pv">${P.fmt(t[P.k])}</b><button onclick="setPolicy('${P.k}',1)">+</button></td></tr>`;
  h+=`</table><div class="row"><span>Bank</span>${S.bank.convertible?`<button onclick="setConvertible(false)">Stop silver payments</button>`:`<button class="gold" onclick="setConvertible(true)">Pay silver again</button>`}<small class="dim">Stopping payments ends a bank run, but people trust notes less.</small></div>`;
  if((t.promises||[]).length)h+=`<h4>Your promises</h4>`+t.promises.map(k=>`<div class="deed">${promiseKept(k)?'<span class="good">✔ Kept</span>':'<span class="bad">✘ Not kept yet</span>'} · ${PROMISES[k].n}</div>`).join('');
  return h}
function winElection(){const t=S.town,p=S.player;let h=`<p>Elections are every 7 days at noon. Next: <b>day ${t.nextElection}</b>. Named townspeople vote by what they think of each candidate. Townsfolk vote by the mayor's approval.</p>`;
  if(t.mayor==='player')h+='<p class="good">You are the mayor. You stand again at the next election.</p>';
  else if(!t.cand)h+=`<button class="gold big" onclick="registerCandidate()">Stand for mayor · ${money(50*S.money.P)}</button><p class="dim">You need a reputation of −10 or more.</p>`;
  if(t.cand||t.mayor==='player'){h+=`<h4>Campaign</h4><div class="row"><button class="gold" onclick="campaignSpeech()" ${t.speechDay===day()?'disabled':''}>Give a speech in the plaza</button><small class="dim">Once a day. Stand in the plaza. People near you like you more.</small></div>
    <p>Support from speeches: <b>${t.campaign||0}</b>. Buying a round at the Inn also helps.</p><h4>Promises (up to 2)</h4><div class="chips">${Object.entries(PROMISES).map(([k,v])=>`<button class="chip ${(t.promises||[]).includes(k)?'on':''}" onclick="togglePromise('${k}')">${v.n}</button>`).join('')}</div>
    <p class="dim">A promise wins votes from the people it helps. If you win and do not keep it, approval falls each week.</p>`}
  const poll=tally(false),tot=poll.reduce((a,c)=>a+c.total,0)||1;
  h+=`<h4>Poll today</h4>`+poll.map(c=>`<div class="pollrow"><span>${c.name}${c.inc?' (mayor)':''}</span><div class="pbar"><i style="width:${c.total/tot*100}%;background:${c.id==='player'?'#f3cc6e':'#8a7a62'}"></i></div><b>${Math.round(c.total/tot*100)}%</b></div>`).join('');
  if(t.lastResult)h+=`<h4>Last election · day ${t.lastResult.day}</h4>`+t.lastResult.res.map(c=>`<div class="je">${c.name}: ${c.total} votes (${c.named} townspeople ×3, ${c.folk} townsfolk)</div>`).join('');
  return h}
function winProjects(){const t=S.town,mine=t.mayor==='player';let h=`<p>${mine?'As mayor you start projects. The treasury pays the builders. Materials come from the market and from orders on the notice board.':'The mayor starts projects when the treasury allows.'}</p><div class="cards">`;
  for(const k in PROJECTS){const Pj=PROJECTS[k],pr=projectOf(k),c=Math.round(Pj.cost*S.money.P);
    h+=`<div class="card ${pr&&pr.done?'done':''}"><h4>${Pj.n}</h4><p>${Pj.d}</p><small class="dim">${money(c)} · ${Object.entries(Pj.mat).map(([m,n])=>`${n} ${GOODS[m].n.toLowerCase()}`).join(', ')} · ${Pj.days} days to build</small><br>`;
    if(pr&&pr.done)h+='<b class="good">✔ Finished</b>';else if(pr&&pr.stage==='build')h+=`<b>Building · ${hrsLeft(pr.until)} left</b>`;
    else if(pr)h+='<b>Gathering materials</b><br>'+Object.entries(Pj.mat).map(([m,n])=>`${ico(m)}${pr.mat[m]||0}/${n}`).join(' ');
    else if(mine)h+=`<button class="gold" onclick="startProject('${k}',true)" ${t.cash<c?'disabled':''}>Start</button>`;h+='</div>'}
  return h+'</div>'}
function showElection(){const r=UI.election;if(!r||S.demo)return;const tot=r.res.reduce((a,c)=>a+c.total,0)||1,win=r.res[0];
  $('#electBody').innerHTML=`<h1>Election Day</h1><p>Day ${r.day}. The votes are counted.</p>`+r.res.map((c,i)=>`<div class="pollrow big"><span>${c.name}${c.inc?' (mayor)':''}</span><div class="pbar"><i data-w="${c.total/tot*100}" style="width:0;background:${c.id==='player'?'#f3cc6e':i===0?'#9ad672':'#8a7a62'}"></i></div><b>${c.total}</b></div>`).join('')+
  `<h2 class="${win.id==='player'?'good':''}">${win.id==='player'?'You are the Mayor!':win.name+' is the Mayor.'}</h2><button class="gold big" onclick="$('#elect').classList.remove('show')">Continue</button>`;
  $('#elect').classList.add('show');setTimeout(()=>$$('#electBody .pbar i').forEach(i=>i.style.width=i.dataset.w+'%'),100)}

// ---------- panels ----------
function panelCraft(){let h=`<p class="dim">Craft at a furnace (Refinery, Smelters), an anvil (Smithy, Forges) or an oven (Bakery, Bakehouses). Go in and open the Craft tab. Owners pay no fee.</p>
  <h4>Gather</h4><div class="deed">${ico('wood')} <b>Timber</b>: equip an axe and stand by a tree. Press E three times.</div><div class="deed">${ico('wheat')} <b>Wheat</b>: walk into a golden field south of town and press E.</div>`;
  for(const st in RECIPES){h+=`<h4>${STATION_NAME[st]} · ${stationsList(st).join(', ')||'none open'}</h4><div class="recipes">${RECIPES[st].map(r=>recipeCard(r,null)).join('')}</div>`}
  h+=`<h4>Where to sell what you make</h4><div class="deed"><b>Ingots and lamp fuel</b>: the Market Hall.</div><div class="deed"><b>Tools and bread</b>: shops that stock them (Shop tab, "Sell to this shop"), orders on the notice board, or people who need them. Look for the icon over a person's head, then talk to them.</div><div class="deed"><b>Anything else</b>: the Market Hall buys finished goods for export at 55% of the fair price.</div>`;return h}
function panelGoals(){const p=S.player,cur=p.goal||0;let h='<h4>Goals</h4>';
  GOALS.forEach((g,i)=>{const[a,b]=g.prog();h+=`<div class="goal ${i<cur?'done':i===cur?'now':'locked'}"><b>${i<cur?'✔':i===cur?'▶':'·'} ${g.n}</b><small>${g.d}</small>${i===cur?`<div class="gbar"><i style="width:${clamp(a/b*100,0,100)}%"></i></div><small class="dim">${Math.floor(Math.min(a,b))} of ${b} · reward ${g.reward.cash?money(g.reward.cash*S.money.P):''}${g.reward.rep?' +'+g.reward.rep+' rep':''}</small>`:''}</div>`});
  h+=`<h4>Week ${S.week} challenges</h4>`+S.challenges.map(c=>`<div class="goal ${c.done?'done':'now'}"><b>${c.done?'✔ ':''}${challengeText(c)}</b><div class="gbar"><i style="width:${clamp(c.got/c.x*100,0,100)}%"></i></div><small class="dim">${Math.min(c.got,c.x)} of ${c.x} · ${money(c.reward)}</small></div>`).join('');
  return h}
function panelLeaders(){const t=UI.tab.leaders||'week';let h=tabs('leaders',[['week',`Week ${S.week}`],['past','Past weeks'],['records','Hall of Records']],t);
  if(t==='week'){h+=`<p class="dim">The week ends on day ${S.week*7+1} at 06:00. The top three in each list win prize money.</p>`;
    for(const[cat,label,isM]of LB_CATS){const rows=lbRows(cat),pi=rows.findIndex(r=>r.id==='player');h+=`<h4>${label}</h4><table class="lb">`+rows.slice(0,5).map((r,i)=>`<tr class="${r.id==='player'?'you':''}"><td>${['🥇','🥈','🥉'][i]||i+1}</td><td>${r.name}<br><small class="dim">${r.cls}</small></td><td>${isM?money(r.v):r.v}</td></tr>`).join('')+
      (pi>=5?`<tr class="you"><td>${pi+1}</td><td>${rows[pi].name}</td><td>${isM?money(rows[pi].v):rows[pi].v}</td></tr>`:'')+'</table>'}}
  else if(t==='past'){const p=S.player;h+=`<div class="stats4"><div><small>🥇 Gold</small><b>${p.trophies[0]}</b></div><div><small>🥈 Silver</small><b>${p.trophies[1]}</b></div><div><small>🥉 Bronze</small><b>${p.trophies[2]}</b></div><div><small>Weeks</small><b>${S.week-1}</b></div></div>`;
    h+=S.leader.history.length?S.leader.history.map(w=>`<div class="deed"><b>Week ${w.week}</b>${LB_CATS.map(([c,l])=>`<div><small class="dim">${l}:</small> ${w.res[c].map((r,i)=>`${['🥇','🥈','🥉'][i]} <span class="${r.you?'good':''}">${r.name}</span>`).join(' ')}</div>`).join('')}</div>`).join(''):'<p class="dim">No week has ended yet.</p>'}
  else{const R=records();h+='<p class="dim">Best results from every game in this browser.</p>';const cats=Object.keys(R);if(!cats.length)h+='<p class="dim">No records yet. Finish a week.</p>';
    for(const c of cats)h+=`<h4>${R[c].label}</h4><table class="lb">`+R[c].rows.map((r,i)=>`<tr class="${r.name===S.player.name&&r.seed===S.seed?'you':''}"><td>${i+1}</td><td>${r.name}<br><small class="dim">seed ${r.seed} · ${r.date}</small></td><td>${c==='mayorDay'?'day '+r.value:c==='oreWeek'||c==='madeWeek'?r.value:money(r.value)}</td></tr>`).join('')+'</table>'}
  return h}
function panelProps(){const mine=bizOwned();let h=`<h4>Your businesses (${mine.length})</h4>`;
  if(!mine.length)h+='<p class="dim">You own no business. Buy one from its owner (open its Buy tab), or buy a town lot and build.</p>';
  for(const z of mine){const r=z.job?bizRecipe(z,z.job):null,stock=Object.entries(z.inv).filter(e=>e[1]>0).map(([k,n])=>`${ico(k)}${n}`).join(' ');
    h+=`<div class="deed"><b>${z.name}</b> · till ${money(z.cash)} · profit yesterday <span class="${(z.hist.profit.at(-1)||0)<0?'bad':'good'}">${money(z.hist.profit.at(-1)||0)}</span><div>${r?'Making '+GOODS[r.out].n.toLowerCase():'Idle'} · ${workersAt(z)} workers · wage ${money(z.wage)}</div><div>${stock||'<span class="dim">No stock</span>'}</div><div><button onclick="locateBld('${z.id}')">Show on map</button></div></div>`}
  const lots=S.lots.filter(l=>l.owner==='player'&&!l.biz);if(lots.length)h+='<h4>Your lots</h4>'+lots.map(l=>`<div class="deed">Lot ${l.i+1} · ${l.build?'building '+BIZ_TYPES[l.build.type].n:'empty: walk there and press E to build'}</div>`).join('');
  h+=`<h4>Town lots</h4><p class="dim">${S.lots.filter(l=>!l.biz&&!l.build&&l.owner!=='player').length} lots are for sale at ${money(lotPrice())}. Look for the stakes and signs on Main Street, Second Street and Third Street.</p>`;
  return h}
function locateBld(id){const b=bldOfBiz(bizById(id));if(!b)return;UI.follow={n:{x:b.door.x,y:b.door.y},until:performance.now()+3000};fx.ring(b.door.x+.5,b.door.y,'#ffd86b')}
