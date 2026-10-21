'use strict';
// ===== UI: HUD, panels, building windows, dialogue, menus, toasts, charts =====
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const UI={overlay:false,target:null,hoverNpc:null,panel:null,tab:{},win:null,winTab:{},dialog:null,journalDirty:true,jfilter:'all',selPlot:null,hudT:0,refreshT:0,modal:false,
  get blocking(){return !!(this.win||this.dialog||this.screen||this.mg)},screen:null};

// ---------- screens ----------
function showScreen(id){$$('.screen').forEach(s=>s.classList.toggle('show',s.id===id));UI.screen=id||null;$('#hud').classList.toggle('dim',!!id&&id!=='loading')}
function hideScreens(){showScreen(null)}

// ---------- toasts ----------
function toast(txt,type='info'){const box=$('#toasts');if(!box)return;const d=document.createElement('div');d.className='toast '+type;
  const icon={good:'✔',bad:'!',law:'⚖',level:'★',ach:'🏆',info:'•'}[type]||'•';d.innerHTML=`<span class="ti">${icon}</span><span>${txt}</span>`;box.prepend(d);
  setTimeout(()=>d.classList.add('out'),type==='ach'?5200:4200);setTimeout(()=>d.remove(),type==='ach'?5800:4800);while(box.children.length>5)box.lastChild.remove()}

// ---------- HUD ----------
function hudUpdate(){const p=S.player,P=S.money.P,L=$('#hud');if(!L)return;
  $('#hName').textContent=p.name;$('#hRank').textContent=rankOf(netWorth());
  const bar=(id,v)=>{const e=$(id);e.style.width=clamp(v,0,100)+'%';e.parentElement.classList.toggle('low',v<25)};
  bar('#hEnergy',p.energy);bar('#hHunger',p.hunger);
  $('#hEnergyN').textContent=Math.round(p.energy);$('#hBread').textContent=p.inv.bread||0;$('#eatBtn').classList.toggle('pulse',p.hunger<30&&(p.inv.bread||0)>0);$('#hHungerN').textContent=Math.round(p.hunger);
  $('#hDay').textContent='Day '+day();$('#hTime').textContent=pad2(hour())+':'+pad2(Math.floor(minute()/10)*10);
  $('#hWeather').textContent={clear:isNight()?'☾ Clear':'☀ Clear',cloudy:'☁ Cloudy',rain:'☂ Rain',storm:'⚡ Storm'}[S.weather];
  const h=S.time/60%24;$('#sunDot').style.left=clamp((h-5)/16*100,0,100)+'%';$('#sunDot').classList.toggle('moon',h<5||h>21);
  $('#wNotes').textContent=money(p.cash);$('#wSilver').textContent=p.silver;$('#wGold').textContent=p.gold;
  const v=S.money.v;$('#wValue').innerHTML=`${(v*100).toFixed(0)}¢ <small>${S.bank.convertible?'':'NO SILVER'}</small>`;$('#wValue').className=v<.85?'bad':v<.97?'warn':'good';
  $('#wLoad').textContent=load(p)+'/'+p.cap;
  if(S.where&&CAVE)$('#hPlot').innerHTML=`<b>${CAVE.c.name}</b> · level ${CAVE.depth} of ${CAVE.c.depths}`;else{const pl=plotAt(p.x,p.y);$('#hPlot').innerHTML=`Plot ${pl.px},${pl.py} · <b style="color:${ownerColor(pl.owner)}">${ownerName(pl.owner)}</b>${mayMine('player',pl)&&pl.owner!=='player'?' · leased':''}`}
  // equipment strip
  let eq='';for(const s of['weapon','armor','tool','axe','hand','feet','back','ring']){const e=p.equip[s];eq+=e?`<div class="eq" data-tip="${GOODS[e.k].n}: ${GOODS[e.k].item.d}">${ico(e.k)}${GOODS[e.k].item.dur<9999?`<i style="width:${e.dur/GOODS[e.k].item.dur*100}%"></i>`:''}</div>`:`<div class="eq empty" data-tip="Empty ${s} slot"></div>`}
  setHTML($('#equipBar'),eq);hud2Update();hud3Update();
  // feed
  if(UI.journalDirty){const f=S.journal.slice(0,4).map((j,i)=>`<div class="fl c-${j.cat}" style="opacity:${1-i*.2}">${j.txt}</div>`).join('');$('#feed').innerHTML=f;UI.journalDirty=false;if(UI.panel==='journal')renderPanel()}
}

// ---------- slide-over panels ----------
const PANELS={pack:'Pack',char:'Character',land:'Land & Deeds',journal:'Journal',town:'Town',craft:'Craft',goals:'Goals',leaders:'Leaderboard',props:'Your Businesses'};
function togglePanel(name){if(UI.panel===name){closePanel();return}UI.panel=name;$('#panel').classList.add('open');sfx('ui_open');renderPanel();$$('#hotbar button').forEach(b=>b.classList.toggle('on',b.dataset.p===name))}
function closePanel(){if(!UI.panel)return;UI.panel=null;$('#panel').classList.remove('open');sfx('ui_close');$$('#hotbar button').forEach(b=>b.classList.remove('on'))}
function renderPanel(){const n=UI.panel;if(!n)return;$('#panelTitle').textContent=PANELS[n];const body=$('#panelBody'),st=body.scrollTop;
  body.innerHTML=({pack:panelPack,char:panelChar,land:panelLand,journal:panelJournal,town:panelTown,craft:panelCraft,goals:panelGoals,leaders:panelLeaders,props:panelProps,quests:panelQuests})[n]();body.scrollTop=st;afterRender(body)}
function tabs(group,list,cur){return`<div class="tabs">${list.map(([k,t])=>`<button class="tab ${cur===k?'on':''}" onclick="setTab('${group}','${k}')">${t}</button>`).join('')}</div>`}
function setTab(g,k){if(g.startsWith('w:')){UI.winTab[g.slice(2)]=k;renderWin()}else{UI.tab[g]=k;renderPanel()}sfx('ui_click')}

function panelPack(){const p=S.player;let h=`<div class="wallet">
  <div>${ico('notes')}<b>${money(p.cash)}</b><small>Bank notes</small></div><div>${ico('silver')}<b>${p.silver}</b><small>Silver coins · ${money(coinNotes('silver'))}</small></div>
  <div>${ico('gold')}<b>${p.gold}</b><small>Gold coins · ${money(coinNotes('gold'))}</small></div><div><span class="ico bankico">🏦</span><b>${money(p.bankBal)}</b><small>In the bank</small></div></div>
  <div class="loadbar"><span>Load ${load(p)} / ${p.cap}</span><i style="width:${load(p)/p.cap*100}%"></i></div><h4>Goods</h4><div class="grid">`;
  const keys=Object.keys(p.inv).filter(k=>p.inv[k]>0);if(!keys.length)h+='<p class="dim">Your pack is empty.</p>';
  for(const k of keys){const G=GOODS[k];h+=`<div class="slot" data-tip="${G.n}${G.item?': '+G.item.d:G.food?': restores '+G.food+' hunger':''}. Worth ${money(sellPrice(p,k))} each.">${ico(k,'ico big')}<span class="cnt">${p.inv[k]}</span><span class="nm">${G.n}</span>
    ${G.item?`<button onclick="equip('${k}')">Equip</button>`:G.food?`<button onclick="eatFood('${k}')">Eat</button>`:G.use?`<button onclick="useItem('${k}')">Use</button>`:''}</div>`}
  h+='</div><h4>Equipped</h4>';
  for(const s of['weapon','armor','tool','axe','hand','feet','back','ring']){const e=p.equip[s];h+=`<div class="eqrow"><span class="slotname">${s}</span>${e?`${ico(e.k)}<b>${GOODS[e.k].n}</b><span class="dim">${GOODS[e.k].item.d}</span>${GOODS[e.k].item.dur<9999?`<span class="dur"><i style="width:${e.dur/GOODS[e.k].item.dur*100}%"></i></span>`:''}<button onclick="unequip('${s}')">Remove</button>`:'<span class="dim">Empty</span>'}</div>`}
  return h}
function panelChar(){const p=S.player,nw=netWorth();
  let h=`<div class="charhead"><img class="portrait" src="${portrait('player')}"><div><h3>${p.name}</h3><div class="rank">${rankOf(nw)}</div><div class="dim">${BACKGROUNDS[p.bg].n} · Day ${day()}</div>
   <div class="nw">Net worth <b>${money(nw)}</b></div></div></div><canvas class="chart" data-series="net" height="90"></canvas><h4>Skills</h4>`;
  const eff={craft:l=>`${Math.round(Math.min(.4,(l-1)*.06)*100)}% faster crafting, ${(l-1)*5}% chance to save a material`,mining:l=>`+${(l-1)*8}% chance of extra ore, faster strikes`,labour:l=>`+${(l-1)*10}% wage, less energy for each shift`,trade:l=>`+${Math.min(10,(l-1)*1.2).toFixed(1)}% on every trade`,combat:l=>`+${(l-1)*4}% damage with every weapon`};
  for(const sk of['mining','labour','trade','craft','combat']){const l=level(sk),xp=p.xp[sk]||0,lo=25*(l-1)**2,hi=25*l**2;
    h+=`<div class="skill"><div><b>${sk[0].toUpperCase()+sk.slice(1)}</b> <span class="lvl">Level ${l}</span></div><div class="xpbar"><i style="width:${(xp-lo)/(hi-lo)*100}%"></i></div><small class="dim">${eff[sk](l)}</small></div>`}
  h+=`<h4>Reputation</h4><div class="rep"><i style="left:${(p.rep+100)/2}%"></i></div><small class="dim">${p.rep>30?'People trust you. They share rumours and sell land to you.':p.rep<-20?'People call you a claim jumper. Some will not talk to you.':'People do not know you well yet.'}</small>
  <h4>Record</h4><table class="kv"><tr><td>Ore mined</td><td>${p.stats.ore}</td></tr><tr><td>Goods sold</td><td>${money(p.stats.sold)}</td></tr><tr><td>Shifts worked</td><td>${p.stats.shifts}</td></tr>
  <tr><td>Items crafted</td><td>${p.stats.crafted||0}</td></tr><tr><td>Orders filled</td><td>${p.stats.orders||0}</td></tr><tr><td>Timber cut</td><td>${p.stats.wood||0}</td></tr><tr><td>Wheat harvested</td><td>${p.stats.wheat||0}</td></tr><tr><td>Businesses owned</td><td>${bizOwned().length}</td></tr><tr><td>Weekly trophies</td><td>🥇${p.trophies[0]} 🥈${p.trophies[1]} 🥉${p.trophies[2]}</td></tr><tr><td>Fines</td><td>${p.stats.fined}</td></tr><tr><td>Rumours heard</td><td>${p.stats.rumours}</td></tr><tr><td>Plots owned</td><td>${ownedPlots().length}</td></tr></table>
  <h4>Achievements · ${Object.keys(p.ach).length}/${ACH.length}</h4><div class="achs">${ACH.map(a=>`<div class="ach ${p.ach[a.id]?'got':''}" data-tip="${a.d}"><span>🏆</span><b>${a.n}</b><small>${a.d}</small></div>`).join('')}</div>`;
  return h}
function panelLand(){const p=S.player,here=plotAt(p.x,p.y);
  let h=`<h4>This plot</h4>${plotCard(here)}<h4>Your deeds (${ownedPlots().length})</h4>`;
  const mine=ownedPlots();if(!mine.length)h+='<p class="dim">You own no land. Claim Crown land at the Land Office, or buy a plot from its owner.</p>';
  for(const q of mine)h+=`<div class="deed"><b>Plot ${q.px},${q.py}</b> · ${money(plotValue(q))} · tax ${money(Math.max(1,Math.round(plotValue(q)*S.town.tax)))}/day${q.arrears?` · <span class="bad">${q.arrears} days unpaid</span>`:''}${q.lease&&q.lease.until>S.time?` · leased to ${ownerName(q.lease.who)}`:''}<div>${depList(q)}</div></div>`;
  const leases=S.plots.filter(q=>q.lease&&q.lease.who==='player'&&q.lease.until>S.time);
  if(leases.length)h+=`<h4>Your leases</h4>`+leases.map(q=>`<div class="deed">Plot ${q.px},${q.py} from ${ownerName(q.owner)} until day ${Math.floor(q.lease.until/1440)+1}<div>${depList(q)}</div></div>`).join('');
  if(p.offers.length){h+='<h4>Offers for your land</h4>';p.offers.forEach((o,i)=>{const n=S.npcs.find(x=>x.id===o.npc),q=S.plots[o.plot];h+=`<div class="deed offer"><b>${n?n.name:'?'}</b> offers <b>${money(o.amt)}</b> for plot ${q.px},${q.py} (value ${money(plotValue(q))}).<div><button class="gold" onclick="offerAccept(${i})">Accept</button><button onclick="offerDecline(${i})">Decline</button></div></div>`})}
  h+=`<h4>Leasing</h4><label class="chk"><input type="checkbox" ${p.leaseOut?'checked':''} onchange="S.player.leaseOut=this.checked;jlog('land',this.checked?'You now let miners lease your plots.':'You stopped new leases on your plots.')"> Let miners lease my plots (3 days, 25% of value, paid to me)</label>`;
  return h}
function depList(q){const ds=plotDeposits(q);return ds.length?ds.map(d=>`<span class="dep">${ico(d.type)}${GOODS[d.type].n}${d.vein?' <b class="vein">VEIN</b>':''} ${Math.floor(d.amount)}</span>`).join(' '):'<span class="dim">No deposits</span>'}
function plotCard(q){return`<div class="deed"><b>Plot ${q.px},${q.py}</b> · <span style="color:${ownerColor(q.owner)}">${ownerName(q.owner)}</span> · value ${money(plotValue(q))}${q.lease&&q.lease.until>S.time?` · leased to ${ownerName(q.lease.who)}`:''}<div>${depList(q)}</div></div>`}
function panelJournal(){const cats=[['all','All'],['you','You'],['econ','Economy'],['land','Land'],['law','Law'],['bank','Bank'],['people','People']];
  return`<div class="chips">${cats.map(([k,t])=>`<button class="chip ${UI.jfilter===k?'on':''}" onclick="UI.jfilter='${k}';renderPanel()">${t}</button>`).join('')}</div><div class="journal">`+
  S.journal.filter(j=>UI.jfilter==='all'||j.cat===UI.jfilter).slice(0,150).map(j=>`<div class="je c-${j.cat}"><span class="jt">D${j.d} ${pad2(j.h)}:${pad2(j.m)}</span>${j.txt}</div>`).join('')+'</div>'}
function panelTown(){const t=UI.tab.town||'overview';let h=tabs('town',[['overview','Overview'],['demand','Demand'],['biz','Businesses'],['people','People'],['prices','Prices'],['laws','Laws']],t);
  if(t==='overview'){const m=S.money,counts={};for(const n of S.npcs)counts[n.cls]=(counts[n.cls]||0)+1;
    h+=`<div class="stats4"><div><small>Population</small><b>${S.folk.pop+S.npcs.length+1}</b></div><div><small>Money supply</small><b>${money(m.M)}</b></div><div><small>Note value</small><b class="${m.v<.85?'bad':''}">${(m.v*100).toFixed(0)}¢</b></div><div><small>Price index</small><b>${(S.hist.cpi?.at(-1)||1).toFixed(2)}</b></div></div>
    <h4>Price index (cost of living)</h4><canvas class="chart" data-series="cpi" height="80"></canvas>
    <h4>Production per day</h4><canvas class="chart" data-series="gdp" data-bars="1" height="70"></canvas>
    <h4>Trades</h4><table class="kv">${Object.entries(counts).map(([c,n])=>`<tr><td><span class="dot" style="background:${CLASSES[c].col}"></span>${CLASSES[c].n}</td><td>${n}</td></tr>`).join('')}</table>
    <h4>Treasury and market</h4><table class="kv"><tr><td>Mayor</td><td>${ownerName(S.town.mayor)} · approval ${Math.round(S.town.approval)}%</td></tr><tr><td>Market cash</td><td>${money(S.market.cash)}</td></tr><tr><td>Town treasury</td><td>${money(S.town.cash)}</td></tr></table>`}
  else if(t==='people'){h+=`<table class="census"><tr><th></th><th>Name</th><th>Doing</th><th>Notes</th><th>Land</th></tr>`+[...S.npcs].sort((a,b)=>b.cash-a.cash).map(n=>`<tr onclick="locate('${n.id}')" title="Show on map"><td><span class="dot" style="background:${CLASSES[n.cls].col}"></span></td><td><b>${n.name}</b><br><small class="dim">${CLASSES[n.cls].n}</small></td><td><small>${n.sleeping?'Asleep':stateName(n)}</small></td><td>${money(n.cash)}${n.silver?`<br><small class="dim">${n.silver} silver</small>`:''}</td><td>${ownedPlots(n.id).length||''}</td></tr>`).join('')+'</table>'}
  else if(t==='prices'){h+=priceTable(false)}
  else if(t==='demand'){h+=demandTable()}
  else if(t==='biz'){h+=`<table class="census"><tr><th>Business</th><th>Owner</th><th>Till</th><th>Profit</th></tr>`+S.biz.filter(z=>z.type!=='peddler').map(z=>`<tr onclick="locateBld('${z.id}')"><td><b>${z.name}</b><br><small class="dim">${z.job?'making '+GOODS[z.job].n.toLowerCase():BIZ_TYPES[z.type].station?'idle':'shop'}</small></td><td>${ownerName(z.owner)}</td><td>${money(z.cash)}</td><td class="${(z.hist.profit.at(-1)||0)<0?'bad':'good'}">${money(z.hist.profit.at(-1)||0)}</td></tr>`).join('')+'</table>'}
  else h+=lawList();
  return h}
function stateName(n){return{chop:'Cutting timber',farm:'Harvesting',peddle:'Selling goods',mine:n.cls==='hauler'?'Pumping oil':'Mining',labour:'Working',sell:'Going to market',eat:'Eating',toBed:'Going to bed',patrol:'On patrol',callout:'Chasing a claim jumper',post:'At work',wander:'Resting',bank:'At the bank',shop:'Shopping',idle:'Thinking'}[n.state]||n.state}
function lawList(){return`<div class="laws">${laws().map(([a,b])=>`<div class="law"><b>⚖ ${a}</b><p>${b}</p></div>`).join('')}</div>`}
function locate(id){const n=S.npcs.find(x=>x.id===id);if(!n)return;if(n.sleeping){toast(n.name+' is asleep at the inn.');return}UI.follow={n,until:performance.now()+3500};fx.ring(n.x,n.y,'#ffd86b')}
function priceTable(trade){const p=S.player,cats=trade?['Ore','Farm','Metal','Gem','Part']:['Ore','Farm','Metal','Gem','Part','Food','Tool','Weapon','Supply'];let h='';const f=UI.winTab.market||'All';
  if(trade)h+=`<div class="chips">${['All',...cats].map(c=>`<button class="chip ${f===c?'on':''}" onclick="UI.winTab.market='${c}';renderWin()">${c}</button>`).join('')}</div>`;
  h+=`<table class="prices"><tr><th></th><th>Good</th><th>Stock</th><th>Price</th><th>24h</th>${trade?'<th>You</th><th></th>':''}</tr>`;
  for(const k in GOODS){const G=GOODS[k];if(GOODS[k].cat==='Quest'||GOODS[k].cat==='Animal'||GOODS[k].cat==='Seed')continue;if(trade&&(!isMarketGood(k)||f!=='All'&&G.cat!==f))continue;const hs=S.hist.price[k]||[],old=hs.length>24?hs[hs.length-25]:hs[0]||price(k),now=price(k),ch=old?(now-old)/old:0;
    h+=`<tr data-tip="${G.n}${G.item?': '+G.item.d:G.food?': restores '+G.food+' hunger':''}"><td>${ico(k)}</td><td>${G.n}</td><td>${S.market.stock[k]}${marketFull(k)?' <span class="vein" style="background:#a83a2a">FULL</span>':''}</td><td><b>${money(trade?buyPrice(p,k):now)}</b>${trade?`<br><small class="dim">sell ${money(sellPrice(p,k))}</small>`:''}</td>
    <td><canvas class="spark" data-k="${k}" width="60" height="20"></canvas><small class="${ch>.02?'bad':ch<-.02?'good':'dim'}">${ch>0?'▲':ch<0?'▼':''}${Math.abs(ch*100).toFixed(0)}%</small></td>`;
    if(trade){const have=p.inv[k]||0;h+=`<td>${have||''}</td><td class="btns"><button onclick="pbuy('${k}',1)">Buy</button>${G.item?'':`<button onclick="pbuy('${k}',10)">×10</button>`}<button ${have?'':'disabled'} onclick="psell('${k}',1)">Sell</button>${have>1?`<button onclick="psell('${k}',${have})">All</button>`:''}</td>`}
    h+='</tr>'}
  return h+'</table>'}

// ---------- charts ----------
function afterRender(root){root.querySelectorAll('canvas.chart').forEach(c=>{const s=c.dataset.series;
    if(c.dataset.bizprofit){const z=bizById(c.dataset.bizprofit);chart(c,z?z.hist.profit:[],{bars:true,col:'#9ad672',fmt:money});return}
    if(c.dataset.folk){chart(c,S.folk.hist,{col:'#86b8e6',fmt:v=>Math.round(v)});return}
    const data=s==='net'?S.hist.net:s==='gdp'?S.hist.gdp:S.hist[s]||[];
    chart(c,data,{bars:!!c.dataset.bars,col:c.dataset.col||'#d4a54a',fmt:s==='cpi'||s==='v'?(v=>v.toFixed(2)):money,ref:c.dataset.ref?+c.dataset.ref:null,second:c.dataset.second?S.hist[c.dataset.second]:null})});
  root.querySelectorAll('canvas.spark').forEach(c=>spark(c,S.hist.price[c.dataset.k]||[]))}
function chart(c,data,o){const w=c.width=c.clientWidth*2||600,h=c.height=(+c.getAttribute('height')||80)*2,g=c.getContext('2d');g.clearRect(0,0,w,h);
  if(data.length<2){g.fillStyle='#8a7a62';g.font='22px Inter';g.fillText('Not enough data yet',16,h/2);return}
  const all=o.second?data.concat(o.second):data;let lo=Math.min(...all,o.ref??Infinity),hi=Math.max(...all,o.ref??-Infinity);if(hi-lo<1e-6){hi+=1;lo-=1}const pad=(hi-lo)*.1;lo-=pad;hi+=pad;
  const X=i=>i/(data.length-1)*(w-80)+70,Y=v=>h-14-(v-lo)/(hi-lo)*(h-28);
  g.strokeStyle='rgba(212,165,74,.15)';g.lineWidth=1;g.fillStyle='#a8957a';g.font='20px Inter';for(let i=0;i<3;i++){const v=lo+(hi-lo)*(i+.5)/3,y=Y(v);g.beginPath();g.moveTo(70,y);g.lineTo(w,y);g.stroke();g.fillText(o.fmt(v),4,y+6)}
  if(o.ref!=null){g.setLineDash([8,6]);g.strokeStyle='#e0604f';g.beginPath();g.moveTo(70,Y(o.ref));g.lineTo(w,Y(o.ref));g.stroke();g.setLineDash([])}
  if(o.bars){const bw=(w-80)/data.length*.7;data.forEach((v,i)=>{g.fillStyle=o.col;g.fillRect(X(i)-bw/2,Y(v),bw,h-14-Y(v))});return}
  const line=(d,col,fill)=>{g.beginPath();d.forEach((v,i)=>{const x=i/(d.length-1)*(w-80)+70;i?g.lineTo(x,Y(v)):g.moveTo(x,Y(v))});g.strokeStyle=col;g.lineWidth=3;g.stroke();
    if(fill){g.lineTo(w-10,h-14);g.lineTo(70,h-14);g.closePath();const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,hexA(col,.35));gr.addColorStop(1,hexA(col,0));g.fillStyle=gr;g.fill()}};
  if(o.second)line(o.second,'#7ab0e0',false);line(data,o.col,true)}
function spark(c,d){const g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);if(d.length<2)return;const s=d.slice(-48),lo=Math.min(...s),hi=Math.max(...s)||1;
  g.beginPath();s.forEach((v,i)=>{const x=i/(s.length-1)*w,y=h-2-(v-lo)/((hi-lo)||1)*(h-4);i?g.lineTo(x,y):g.moveTo(x,y)});g.strokeStyle=s.at(-1)>s[0]?'#e0806a':'#8fcf6a';g.lineWidth=1.5;g.stroke()}

// ---------- building windows ----------
const PROPRIETOR={board:'mayor',lot:'clerk',peddler:'peddler',store:'merchant',post:'merchant',forge:'smith',bakehouse:'baker',smelter:'refiner',market:'merchant',bank:'banker',townhall:'mayor',office:'clerk',sheriff:'sheriff',inn:'innkeeper',bakery:'baker',refinery:'refiner',smithy:'smith'};
const GREET={market:'Buy low, sell high. Prices move with the stock on my shelves.',bank:'Notes, silver or gold. The Valley Bank keeps your money safe.',
  townhall:'The Council makes the laws and prints the notes.',office:'Every plot in the valley is in this book.',sheriff:'Law is law. Mine your own ground.',
  inn:'A bed, a hot meal and the talk of the valley.',store:'Goods for every home in the valley.',bakery:'Fresh bread every morning.',refinery:'Ore in, metal out. We pay for each shift.',smithy:'Bring me metal and I make tools.'};
function openWin(b){UI.win=b;$('#win').classList.add('show');sfx('door');renderWin()}
function closeWin(){if(!UI.win)return;UI.win=null;$('#win').classList.remove('show');sfx('ui_close')}
function renderWin(){const b=UI.win;if(!b)return;const body=$('#winBody'),st=body.scrollTop;
  $('#winPortrait').src=portrait(PROPRIETOR[b.kind]||'merchant');$('#winName').textContent=b.name;$('#winGreet').textContent=GREET[b.kind]||'';
  body.innerHTML=b.kind==='board'?winBoard():b.kind==='lot'?winLot(b):b.bizId?winBiz(b):({market:winMarket,bank:winBank,townhall:winTownhall,office:winOffice,sheriff:winSheriff2,inn:winInn})[b.kind]?.()??'';
  body.scrollTop=st;afterRender(body);if(b.kind==='office')drawPlotMap();
  $('#winSide').innerHTML=`<div class="wallet small"><div>${ico('notes')}<b>${money(S.player.cash)}</b></div><div>${ico('silver')}<b>${S.player.silver}</b></div><div>${ico('gold')}<b>${S.player.gold}</b></div></div><div class="dim small">Load ${load(S.player)}/${S.player.cap}<br>Energy ${Math.round(S.player.energy)}</div>`}
function winMarket(){return`<p class="dim">The Market Hall trades ore, farm goods and metal. Shops sell bread and tools. Market cash: ${money(S.market.cash)}. The market buys at 90% of its price. ${S.player.equip.ring||level('trade')>1?'Your trade bonus: '+(tradeBonus(S.player)*100).toFixed(1)+'%.':''}</p>
  <div class="row"><button class="gold" onclick="psellRaw()">Sell all ore and oil</button><button onclick="psellAllGoods()">Sell all goods</button></div>`+priceTable(true)+exportTable()}
function exportTable(){const p=S.player,ks=Object.keys(p.inv).filter(k=>isFinished(k)&&p.inv[k]>0);
  return`<h4>Export buyer: tools and bread</h4><p class="dim">A trader buys finished goods for export at 55% of the fair price. Shops, orders and people pay more.</p>`+(ks.length?`<table class="prices">${ks.map(k=>`<tr><td>${ico(k)}</td><td>${GOODS[k].n}</td><td>${p.inv[k]}</td><td>${money(exportPrice(k))} each</td><td class="btns"><button onclick="exportSell('${k}',1)">Sell</button>${p.inv[k]>1?`<button onclick="exportSell('${k}',${p.inv[k]})">All</button>`:''}</td></tr>`).join('')}</table>`:'<p class="dim">You carry no tools or bread to sell.</p>')}
function winBank(){const t=UI.winTab.bank||'account',p=S.player,P=S.money.P,b=S.bank;let h=tabs('w:bank',[['account','Account'],['exchange','Exchange'],['loans','Loans'],['mint','Mint'],['vault','Vault']],t);
  if(!b.convertible)h+='<div class="banner bad">The Bank does not change notes for coin. The vault is too low. Coin can still be sold to the Bank.</div>';
  const A=(n)=>Math.max(1,Math.round(n*P));
  if(t==='account'){h+=`<div class="bigval">${money(p.bankBal)}<small>Your balance. Interest ${(b.depRate*100).toFixed(1)}% a day.</small></div>
    <div class="row"><span>Deposit</span>${[10,100].map(n=>`<button onclick="bankDep(${A(n)})">${money(A(n))}</button>`).join('')}<button onclick="bankDep(S.player.cash)">All</button></div>
    <div class="row"><span>Withdraw</span>${[10,100].map(n=>`<button onclick="bankWd(${A(n)})">${money(A(n))}</button>`).join('')}<button onclick="bankWd(S.player.bankBal)">All</button></div>
    <p class="dim">Money in the bank is safe from loss when you collapse. The bank pays land tax from it if your pockets are empty.</p>`}
  else if(t==='exchange'){h+=`<p>A bank note is paper money. Its value depends on the silver and gold in the vault. Coins are metal. They keep their value when notes lose theirs.</p><table class="prices"><tr><th></th><th>Coin</th><th>Bank sells</th><th>Bank buys</th><th>You</th><th></th></tr>`;
    for(const c of['silver','gold'])h+=`<tr><td>${ico(c)}</td><td>${c==='gold'?'Gold coin':'Silver coin'}</td><td>${money(coinQuote(c,'buy'))}</td><td>${money(coinQuote(c,'sell'))}</td><td>${p[c]}</td><td class="btns"><button ${b.convertible?'':'disabled'} onclick="pex('${c}','buy',1)">Buy</button><button ${b.convertible?'':'disabled'} onclick="pex('${c}','buy',10)">×10</button><button ${p[c]?'':'disabled'} onclick="pex('${c}','sell',1)">Sell</button><button ${p[c]?'':'disabled'} onclick="pex('${c}','sell',${p[c]})">All</button></td></tr>`;
    h+=`</table><p class="dim">Gold to silver ratio today: 1 : ${(goldCoinReal()/silverCoinReal()).toFixed(1)}. The ratio moves with the price of the two metals.</p>`}
  else if(t==='loans'){const lim=creditLimit();h+=`<div class="bigval">${money(lim)}<small>You can borrow this much. Your plots are the security.</small></div>
    <div class="row"><span>Borrow</span>${[100,300,1000].map(n=>A(n)).filter(n=>n<=lim).map(n=>`<button onclick="takeLoan(${n})">${money(n)}</button>`).join('')||'<span class="dim">No credit. Own land to borrow more.</span>'}</div>
    <p class="dim">Interest ${(b.loanRate*100).toFixed(1)}% a day. Repay in 10 days. If you do not repay, the bank takes your plots.</p>`;
    for(const[i,L]of p.loans.entries())h+=`<div class="deed">Loan ${i+1}: owe <b>${money(L.owed)}</b> · due day ${L.due}${day()>=L.due-2?' <span class="bad">SOON</span>':''}<div><button class="gold" onclick="repay(${i})">Repay ${money(Math.min(L.owed,p.cash))}</button></div></div>`}
  else if(t==='mint'){h+=`<p>The Mint makes coins from metal. Bring silver or gold ingots. One silver ingot makes ${SILVER_PER_INGOT} silver coins. One gold ingot makes ${GOLD_PER_INGOT} gold coins.</p>`;
    for(const[k,c,n]of[['silver_ingot','silver',SILVER_PER_INGOT],['gold_ingot','gold',GOLD_PER_INGOT]])h+=`<div class="row">${ico(k)}<span>${GOODS[k].n}: you have ${p.inv[k]||0}</span><button ${p.inv[k]?'':'disabled'} onclick="mint('${k}')">Strike ${n} ${c} coins</button></div>`;
    h+=`<p class="dim">The Mint has struck ${b.minted} coins. Each coin it strikes adds to the vault and makes notes safer.</p>`}
  else{const m=S.money;h+=`<div class="stats4"><div><small>Silver in vault</small><b>${b.silver}</b></div><div><small>Gold in vault</small><b>${b.gold}</b></div><div><small>Reserve ratio</small><b class="${m.backing<resReq()?'bad':'good'}">${(m.backing*100).toFixed(0)}%</b></div><div><small>Note value</small><b>${(m.v*100).toFixed(0)}¢</b></div></div>
    <table class="kv"><tr><td>Credit lent to the Market (notes with no metal)</td><td>${money(b.marketDebt||0)}</td></tr><tr><td>Notes printed by Town Hall</td><td>${money(S.town.printedTotal)}</td></tr><tr><td>Coins struck by the Mint</td><td>${b.minted}</td></tr></table>
    <p>The vault holds ${money(m.R)} of metal (at par). There are ${money(m.M)} of notes in the valley. The bank needs ${Math.round(resReq()*100)}% backing to keep a note worth one silver dollar. Below that, each note buys less.</p>
    <h4>Note value (red line = full value)</h4><canvas class="chart" data-series="v" data-ref="1" data-col="#8fcf6a" height="80"></canvas>
    <h4>Money supply (gold) and vault value (blue)</h4><canvas class="chart" data-series="M" data-second="R" height="90"></canvas>
    <h4>Silver coins in the vault</h4><canvas class="chart" data-series="silver" data-col="#c9d4e0" height="70"></canvas>`}
  return h}
function winTownhall(){if(S.town.mayor==='player'){$('#winPortrait').src=portrait('player');$('#winGreet').textContent='Your office, Mayor.'}const t=UI.winTab.townhall||(S.town.mayor==='player'?'mayor':'laws'),P=S.money.P,T=S.town;let h=tabs('w:townhall',[['laws','Laws'],['mayor',T.mayor==='player'?'Mayor':'Council'],['election','Election'],['projects','Projects'],['work','Road work'],['tax','Taxes']],t);
  if(t==='laws')h+=lawList();
  else if(t==='mayor'){h+=winMayor();if(T.mayor!=='player')h+=councilInfo()}
  else if(t==='election')h+=winElection();
  else if(t==='projects')h+=winProjects();
  else h=winTownhallRest(t,h);
  return h}
function councilInfo(){const P=S.money.P,T=S.town;let h='';{h+=`<div class="stats4"><div><small>Treasury</small><b>${money(T.cash)}</b></div><div><small>Prints a day</small><b>${money(T.print*P)}</b></div><div><small>Land tax</small><b>${(T.tax*100).toFixed(1)}%</b></div><div><small>Printed total</small><b>${money(T.printedTotal)}</b></div></div>
    <p>The Council pays the sheriff, the clerk and the banker. It pays for roads and helps poor families. When the treasury is short, it prints new notes. New notes with no new silver behind them make every note worth less.</p><h4>Decisions</h4>`+
    (S.journal.filter(j=>j.cat==='law'&&j.txt.startsWith('Council')).slice(0,12).map(j=>`<div class="je"><span class="jt">Day ${j.d}</span>${j.txt.slice(9)}</div>`).join('')||'<p class="dim">No decisions yet. The Council meets each morning.</p>')}
  return h}
// road work and taxes tabs of the Town Hall window
function winTownhallRest(t,h){const T=S.town;
  if(t==='work'){const w=shiftPay('townhall');h+=`<p>The road crew fixes streets and drains. Pay is ${money(w)} for a 2-hour shift${T.works>=day()?' (road bonus is on)':''}.</p>
    <button class="gold big" onclick="workShift('townhall')">Work a road shift (+${money(w)})</button>`}
  else{const mine=ownedPlots();h+=`<p>Land tax is ${(T.tax*100).toFixed(1)}% of the plot value each day. The town takes it each morning.</p>`;
    h+=mine.length?mine.map(q=>`<div class="deed">Plot ${q.px},${q.py} · ${money(Math.max(1,Math.round(plotValue(q)*T.tax)))} a day${q.arrears?` · <span class="bad">${q.arrears} days unpaid</span> <button onclick="payArrears(${q.id})">Pay now</button>`:' · paid'}</div>`).join(''):'<p class="dim">You own no land, so you pay no land tax.</p>'}
  return h}
function winOffice(){const p=S.player;if(!UI.selPlot)UI.selPlot=S.plots[p.lastPlot??plotAt(p.x,p.y).id];const q=UI.selPlot,v=plotValue(q),own=q.owner;
  let h=`<div class="office"><div><canvas id="plotmap" width="${PW*24}" height="${PH*24}"></canvas><small class="dim">Click a plot. Gold = yours, coloured = other owners, dark = Crown land. Red pins = rumours.</small>${crownList()}</div><div>${plotCard(q)}`;
  if(p.fineDebt>0)h+=`<div class="banner bad">You owe ${money(p.fineDebt)} in fines. The clerk will not record a sale until you pay the sheriff.</div>`;
  else if(own==='crown')h+=`<button class="gold big" onclick="landAct('claim')">Stake a claim · ${money(v)}</button><p class="dim">The money goes to the Town treasury.</p>`;
  else if(own==='player')h+=`<button class="big" onclick="landAct('sell')">Sell to the Crown · ${money(v*.7)}</button>`;
  else if(own!=='town'){const n=S.npcs.find(x=>x.id===own),ask=Math.round(v*askMult(n));h+=`<button class="gold big" onclick="landAct('buy')">Buy from ${n.name} · ${money(ask)}</button>
    <button class="big" onclick="landAct('lease')" ${q.lease&&q.lease.until>S.time?'disabled':''}>Lease 3 days · ${money(v*.25)}</button><p class="dim">${n.name} asks ${Math.round(askMult(n)*100)}% of value. A better reputation gets a better price.</p>`}
  else h+='<p class="dim">Town land is not for sale.</p>';
  return h+'</div></div>'}
function crownList(){const list=S.plots.filter(q=>q.owner==='crown'&&plotDeposits(q).some(d=>d.reach)).map(q=>({q,v:plotValue(q),ds:plotDeposits(q)})).sort((a,b)=>a.v-b.v).slice(0,8);
  if(!list.length)return'<p class="dim">No Crown land with ore is left.</p>';
  return'<h4>Crown land with ore</h4>'+list.map(o=>`<div class="row" style="margin:3px 0"><button onclick="UI.selPlot=S.plots[${o.q.id}];renderWin()">Plot ${o.q.px},${o.q.py}</button><span>${money(o.v)}</span>${o.ds.map(d=>ico(d.type)+(d.vein?'<b class=vein>VEIN</b>':'')).join('')}</div>`).join('')}
function askMult(n){const o=(n?n.opinion:0)+S.player.rep;return clamp(1.45-o*.004,1.15,1.8)}
function winSheriff(){const p=S.player;return`<p>Claim jumping is a crime in this valley. Mine only on your own plots or on plots you lease.</p>
  <table class="kv"><tr><td>Your fines</td><td>${p.stats.fined}</td></tr><tr><td>Fines paid</td><td>${money(p.finesPaid||0)}</td></tr><tr><td>Unpaid fines</td><td class="${p.fineDebt?'bad':''}">${money(p.fineDebt)}</td></tr><tr><td>Reputation</td><td>${p.rep}</td></tr></table>
  ${p.fineDebt?`<button class="gold big" onclick="payFines()">Pay ${money(Math.min(p.fineDebt,p.cash))}</button>`:''}<h4>Laws</h4>${lawList()}`}
function winInn(){const P=S.money.P,c=n=>Math.round(n*P);return`<div class="cards">
  <div class="card"><h4>🛏 Room for the night</h4><p>Sleep until 06:00. Energy goes to full.</p><button class="gold" onclick="innSleep()">Sleep · ${money(c(10))}</button></div>
  <div class="card"><h4>☕ Nap</h4><p>Rest for 2 hours. +30 energy.</p><button onclick="innNap()">Nap · ${money(c(3))}</button></div>
  <div class="card"><h4>🍲 Hot stew</h4><p>Hunger to full.</p><button onclick="innMeal()">Eat · ${money(c(8))}</button></div>
  <div class="card"><h4>🍺 Buy a round</h4><p>Hear the talk at the bar. You get a rumour and people like you more.</p><button onclick="innRound()">Buy · ${money(c(15))}</button></div></div>
  <p class="dim">The game saves when you sleep and at the start of each day.</p>`}

// ---------- dialogue ----------
function openDialog(n){UI.dialog={n,text:null};stopAt(n);n.talking=true;const o=n.opinion+S.player.rep;
  UI.dialog.text=o<-20?line('greetBad',{n:S.player.name}):pick([`What do you need, ${S.player.name.split(' ')[0]}?`,'Yes?','Good to see you.','Make it quick, I have work to do.']);renderDialog();$('#dialog').classList.add('show');sfx('ui_open')}
function closeDialog(){if(!UI.dialog)return;UI.dialog.n.talking=false;UI.dialog=null;$('#dialog').classList.remove('show')}
function renderDialog(){const d=UI.dialog;if(!d)return;const n=d.n,o=n.opinion+S.player.rep,own=ownedPlots(n.id);
  $('#dlgPortrait').src=portrait(n.cls,n);$('#dlgName').innerHTML=`${n.name} <small style="color:${CLASSES[n.cls].col}">${CLASSES[n.cls].n}</small>`;
  const rt=n.rel?relText(n):'';$('#dlgMood').innerHTML=`<span class="${o>15?'good':o<-15?'bad':'dim'}">${n.grudge?'Wants you dead':o>15?'Friendly':o<-15?'Hostile':'Neutral'}</span> · ${stateName(n)} · ${money(n.cash)}${rt?`<br><small class="dim">${rt[0].toUpperCase()+rt.slice(1)}</small>`:''}`;
  $('#dlgText').textContent=d.text;
  if(d.offer){const q=QUESTS[d.offer];$('#dlgOpts').innerHTML=`<button class="gold" onclick="dlg('qacc:${d.offer}')"><span class="k">1</span>Accept: ${q.title}</button><button onclick="dlg('qdec:${d.offer}')"><span class="k">2</span>Not now</button>`;return}
  const opts=n.cls==='peddler'?[['wares','Show me your wares']]:[['work','How is work?'],['town','How is the town?'],['rumour','Heard any rumours?'],['money','What do you think of the money?']];
  if(n.cls==='sheriff'&&S.player.wanted)opts.unshift(['surrender','I surrender. (Pay the fine or go to jail.)']);
  for(const qo of questTalkOptions(n).reverse())opts.unshift([qo.k,qo.t,qo.off]);
  if(own.length)opts.push(['buy',`Will you sell plot ${own[0].px},${own[0].py}? (${money(plotValue(own[0])*askMult(n))})`]);
  const needs=npcNeeds(n);if(needs.length)opts.splice(1,0,['needs','Do you need anything?']);
  for(const w of needs)if(S.player.inv[w.k]>0)opts.unshift(['sell:'+w.k,`Sell ${an(GOODS[w.k].n.toLowerCase())} for ${money(Math.min(npcOffer(n,w.k,w.m),Math.floor(n.cash)))}`]);
  if(S.player.inv.bread&&!needs.some(w=>w.k==='bread'))opts.push(['gift','Give them a loaf of bread']);
  opts.push(['bye','Goodbye']);
  $('#dlgOpts').innerHTML=opts.map(([k,t,off],i)=>`<button class="${k.startsWith('sell:')||k.startsWith('q')?'gold':''}" ${off?'disabled':''} onclick="dlg('${k}')"><span class="k">${i+1}</span>${t}</button>`).join('')}
function dlg(k){const d=UI.dialog;if(!d)return;const n=d.n;sfx('ui_click');
  if(k==='bye'){closeDialog();return}
  if(k==='surrender'){surrender();return}
  if(/^q(offer|talk|give):/.test(k)){questDialog(k,n);return}
  if(k.startsWith('qacc:')){const id=k.slice(5),q=QUESTS[id],s=S.quests[id];d.offer=null;acceptQuest(id);d.text=fill(q.accept||'Good luck.',s);renderDialog();return}
  if(k.startsWith('qdec:')){declineQuest(k.slice(5));d.offer=null;d.text='Maybe another time, then.';renderDialog();return}
  if(k.startsWith('sell:')){sellToNpc(n.id,k.slice(5));return}
  if(k==='needs'){const ns=npcNeeds(n);d.text=ns.length?ns.map(w=>`${w.why} I pay up to ${money(Math.min(npcOffer(n,w.k,w.m),Math.floor(n.cash)))} for ${an(GOODS[w.k].n.toLowerCase())}.`).join(' '):'No, I have all I need.'}
  if(k==='work')d.text=npcWork(n);
  if(k==='money')d.text=npcMoneyView(n);
  if(k==='town')d.text=npcTownView(n);
  if(k==='wares'){closeDialog();openWin({kind:'peddler',name:"Peddler's Wagon",bizId:n.bizId});return}
  if(k==='rumour'){const r=rumour(n);d.text=r.txt;if(r.good){n.opinion-=1;toast('Rumour: a pin is on your map.','info');checkAch()}}
  if(k==='gift'){S.player.inv.bread--;if(!S.player.inv.bread)delete S.player.inv.bread;n.opinion+=8;n.hunger=100;d.text=pick(['Thank you, friend!','You are kind.','I will not forget this.']);fx.ring(n.x,n.y,'#8fcf6a')}
  if(k==='buy'){const q=ownedPlots(n.id)[0],o=n.opinion+S.player.rep,ask=Math.round(plotValue(q)*askMult(n));
    if(o<-25)d.text='I do not sell to claim jumpers.';else if(S.player.fineDebt>0)d.text='Pay your fines first. The clerk will not record it.';
    else if(S.player.cash<ask)d.text=`It costs ${money(ask)}. Come back with the money.`;
    else{S.player.cash-=ask;n.cash+=ask;transferPlot(q,'player','bought for '+money(ask));d.text='The plot is yours. Treat it well.';sfx('stamp');toast(`You bought plot ${q.px},${q.py}.`,'good');checkAch()}}
  renderDialog()}
