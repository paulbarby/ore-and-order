'use strict';
// ===== events, goals, weekly challenges, leaderboard, records, elections, mayor =====

// ---------- world events ----------
const EVENTS={
  goldrush:{n:'Gold rush',icon:'⛏',dur:3,d:'A rich gold vein was found. New miners arrive.',
    start(e){const d=spawnVein('gold_ore');e.data={dep:d?d.id:null};S.folk.pop+=12;immigrate(3,'miner');
      if(d){const q=plotAt(d.x,d.y);S.player.pins.push({id:d.id,x:d.x,y:d.y});jlog('event',`Gold was found on plot ${q.px},${q.py}. A red pin is on your map. ${q.owner==='crown'?'Nobody owns that plot yet!':''}`)}}},
  drought:{n:'Drought',icon:'☀',dur:3,d:'No rain. Wheat grows slowly. Bread gets dear.',crop:()=>projectDone('granary')?.6:.25},
  harvest:{n:'Bumper harvest',icon:'🌾',dur:2,d:'Wheat grows twice as fast.',crop:()=>2.2},
  buyers:{n:'Eastern buyers',icon:'🚂',dur:2,start(e){e.data={k:pick(['iron_ingot','copper_ingot','silver_ingot','iron_ore','copper_ore','coal','wood'])}},
    desc:e=>`Buyers from the East pay well for ${GOODS[e.data.k].n.toLowerCase()}. The market price is up.`,target:(e,k)=>k===e.data.k?2.4:1},
  collapse:{n:'Mine collapse',icon:'⚠',dur:1,ok:()=>S.deposits.some(d=>!d.vein&&d.amount>80&&d.type!=='oil'),
    start(e){const d=pick(S.deposits.filter(d=>!d.vein&&d.amount>80&&d.type!=='oil'));d.amount=Math.floor(d.amount*.6);d.closed=S.time+1440;e.data={dep:d.id};
      const q=plotAt(d.x,d.y);e.desc=`A shaft fell in on plot ${q.px},${q.py}. Nobody can mine there for a day.`;cam.shake=6}},
  fire:{n:'Fire',icon:'🔥',dur:1,ok:()=>S.biz.some(z=>bldOfBiz(z)),
    start(e){const z=pick(S.biz.filter(z=>bldOfBiz(z)));for(const k in z.inv)z.inv[k]=Math.floor(z.inv[k]/2);z.closedUntil=S.time+1440;e.data={z:z.id};
      e.desc=`Fire at the ${z.name}! Half its stock burned. It is closed for a day.`}},
  peddler:{n:'Travelling peddler',icon:'🛒',dur:1,d:'A peddler sells rare goods at low prices in the plaza today.',
    start(e){const z=makeBiz('peddler','town',{name:"Peddler's Wagon",cash:200,inv:{drill:ri(1,2),ring:1,cart:1,lantern:2,boots:1,backpack:1}});
      const n=makeNpc('peddler');n.x=world.well.x+2.5;n.y=world.well.y+1.6;n.state='peddle';n.bizId=z.id;S.npcs.push(n);e.data={z:z.id,n:n.id};say(n,'Rare goods! Fair prices!',6)},
    end(e){S.biz=S.biz.filter(z=>z.id!==e.data.z);S.npcs=S.npcs.filter(n=>n.id!==e.data.n)}},
  settlers:{n:'Settlers arrive',icon:'🐎',dur:1,d:'A wagon train of settlers arrives. The town needs more of everything.',start(){S.folk.pop+=22;immigrate(2)}},
  craze:{n:'A new craze',icon:'✨',dur:2,start(e){e.data={k:pick(['boots','lantern','backpack','ring','axe'])}},desc:e=>`Everyone wants ${GOODS[e.data.k].n.toLowerCase()}s. Demand is three times higher.`,
    demand:(e,k)=>k===e.data.k?3:1},
  festival:{n:'Festival',icon:'🎉',dur:1,d:'Music in the plaza. People spend more today.',demand:()=>1.3,start(){S.town.approval=Math.min(100,S.town.approval+6);for(const n of S.npcs)n.opinion+=1}},
  panic:{n:'Bank panic',icon:'🏦',dur:1,d:'A rumour says the vault is empty. People queue to change notes for silver.',ok:()=>S.bank.convertible,
    start(){for(const n of S.npcs)if(n.cash>60*S.money.P&&Math.random()<.45)n.wantCoin=true}},
  bandits:{n:'Bandits',icon:'🤠',dur:2,d:'Bandits rob travellers outside town at night. A lantern helps.',ok:()=>!projectDone('lamps')},
  coldsnap:{n:'Cold snap',icon:'❄',dur:2,d:'Cold nights. People buy lamp fuel and lanterns.',demand:(e,k)=>k==='fuel'?3:k==='lantern'?1.6:1},
};
function eventDesc(e){const E=EVENTS[e.key];return e.desc||(E.desc?E.desc(e):E.d)}
function eventActive(key){return S.events.some(e=>e.key===key)}
function eventCrop(){let m=1;for(const e of S.events){const E=EVENTS[e.key];if(E.crop)m*=E.crop(e)}return m}
function eventTarget(k){let m=1;for(const e of S.events){const E=EVENTS[e.key];if(E.target)m*=E.target(e,k)}return m}
function startEvent(key){const E=EVENTS[key],e={key,until:S.time+E.dur*1440,data:{}};S.events.push(e);if(E.start)E.start(e);
  jlog('event',`${E.icon} ${E.n}: ${eventDesc(e)}`,{toast:'event'});crier(E.n+'! '+eventDesc(e).split('.')[0]+'.');sfx('bell')}
function eventsDaily(){for(const e of[...S.events])if(e.until<=S.time){const E=EVENTS[e.key];if(E.end)E.end(e);S.events.splice(S.events.indexOf(e),1)}
  if(day()<2||Math.random()>.45)return;
  const ok=Object.keys(EVENTS).filter(k=>!eventActive(k)&&(!EVENTS[k].ok||EVENTS[k].ok()));if(ok.length)startEvent(pick(ok))}
function spawnVein(type){for(let i=0;i<4000;i++){const x=ri(3,W-4),y=ri(3,H-4);const t=world.tiles[idx(x,y)];if(t!==T.MOUNT&&t!==T.HILL)continue;
  if(S.deposits.some(d=>Math.abs(d.x-x)<4&&Math.abs(d.y-y)<4))continue;const st=standTile(x,y);if(!st||!world.reach[idx(st.x,st.y)])continue;
  const amt=type==='gold_ore'?ri(6000,9000):ri(14000,22000);const d={id:S.deposits.length,x,y,type,amount:amt,max:amt,regen:0,vein:true,sx:st.x,sy:st.y,reach:true};S.deposits.push(d);return d}return null}
function immigrate(n,cls){for(let i=0;i<n&&S.npcs.length<60;i++){let c=cls;
  if(!c&&S.market.stock.iron_ingot<3)c='refiner';if(!c){const sh=townShortList()[0];c=sh&&sh.ema>.2?(sh.k==='bread'?pick(['baker','farmer']):sh.k==='fuel'?'hauler':'smith'):pick(['miner','woodcutter','farmer','refiner'])}
  const m=makeNpc(c);const d=bOf('inn').door;m.x=d.x+.5;m.y=d.y+.6;S.npcs.push(m);jlog('people',`${m.name} (${CLASSES[c].n.toLowerCase()}) moves to the valley.`)}}

// ---------- goals ----------
const GOALS=[
  {n:'First sale',d:'Sell goods worth $50 in total.',prog:()=>[S.player.stats.sold/S.money.P,50],reward:{cash:30,rep:2}},
  {n:'A place to dig',d:'Own or lease a plot that holds ore.',prog:()=>[S.plots.some(q=>mayMine('player',q)&&plotDeposits(q).length)?1:0,1],reward:{cash:40}},
  {n:'Make something',d:'Craft an item at a furnace, an anvil or an oven.',prog:()=>[S.player.stats.crafted||0,1],reward:{cash:40}},
  {n:'Supplier',d:'Fill 2 orders on the notice board in the plaza.',prog:()=>[S.player.stats.orders||0,2],reward:{cash:80,rep:5}},
  {n:'Getting ahead',d:'Reach a net worth of $800.',prog:()=>[netWorth()/S.money.P,800],reward:{cash:60}},
  {n:'Proprietor',d:'Own a business. Buy one, or build one on a town lot.',prog:()=>[bizOwned().length,1],reward:{cash:150,rep:5}},
  {n:'Turning a profit',d:'Earn $400 profit from your businesses.',prog:()=>[(S.player.stats.bizProfit||0)/S.money.P,400],reward:{cash:150}},
  {n:'Run for office',d:'Register as a candidate for mayor at Town Hall.',prog:()=>[S.town.cand||S.town.mayor==='player'?1:0,1],reward:{rep:5}},
  {n:'Mayor',d:'Win a town election.',prog:()=>[S.player.stats.elected||0,1],reward:{cash:300}},
  {n:'Leave a mark',d:'Finish a town project while you are mayor.',prog:()=>[S.player.stats.projects||0,1],reward:{cash:300,rep:10}},
  {n:'Business empire',d:'Own 3 businesses.',prog:()=>[bizOwned().length,3],reward:{cash:500}},
  {n:'Tycoon of the Valley',d:'Reach a net worth of $25,000.',prog:()=>[netWorth()/S.money.P,25000],reward:{cash:1000}},
];
function goalNow(){return GOALS[S.player.goal||0]}
function checkGoals(){const p=S.player;let g=goalNow();while(g){const[a,b]=g.prog();if(a<b)break;
  const r=g.reward,c=Math.round((r.cash||0)*S.money.P);p.cash+=c;if(r.rep)p.rep=Math.min(100,p.rep+r.rep);p.goal=(p.goal||0)+1;
  toast(`<b>Goal complete: ${g.n}</b>${c?' · +'+money(c):''}${r.rep?' · +'+r.rep+' reputation':''}`,'ach');sfx('achievement');fx.ring(p.x,p.y,'#8fcf6a');fx.coins(p.x,p.y-.5,10);
  jlog('you',`Goal complete: ${g.n}.`);g=goalNow();if(g)setTimeout(()=>toast(`New goal: ${g.n}. ${g.d}`,'info'),1500)}}

// ---------- weekly challenges ----------
const CHALLENGES=[{k:'ore',n:'Mine {x} ore',base:60},{k:'orders',n:'Fill {x} orders',base:2},{k:'crafted',n:'Craft {x} items',base:4},
  {k:'sold',n:'Sell goods worth {x}',base:400,money:true},{k:'shifts',n:'Work {x} shifts',base:4},{k:'wood',n:'Cut {x} timber',base:30},{k:'wheat',n:'Harvest {x} wheat',base:30}];
function newChallenges(){const w=S.week,pool=[...CHALLENGES].sort(()=>Math.random()-.5).slice(0,3);
  S.challenges=pool.map(c=>({k:c.k,x:Math.round(c.base*(1+.35*(w-1))*(c.money?S.money.P:1)),got:0,done:false,reward:Math.round(60*w*S.money.P)}))}
function challengeText(c){const C=CHALLENGES.find(x=>x.k===c.k);return C.n.replace('{x}',C.money?money(c.x):c.x)}
function challengeAdd(k,n){if(!S.challenges)return;for(const c of S.challenges){if(c.k!==k||c.done)continue;c.got+=n;
  if(c.got>=c.x){c.done=true;S.player.cash+=c.reward;S.player.rep=Math.min(100,S.player.rep+3);toast(`<b>Weekly challenge done:</b> ${challengeText(c)} · +${money(c.reward)}`,'ach');sfx('achievement');jlog('you','Weekly challenge done: '+challengeText(c)+'.')}}}

// ---------- leaderboard ----------
const LB_CATS=[['net','Richest',true],['ore','Most ore mined',false],['made','Most goods made',false],['sold','Most trade',true]];
function weekAdd(who,k,n){if(!who||who==='town')return;if(who==='player'){S.player.wk[k]=(S.player.wk[k]||0)+n;return}const a=S.npcs.find(x=>x.id===who);if(a){a.wk=a.wk||{ore:0,made:0,sold:0,orders:0};a.wk[k]=(a.wk[k]||0)+n}}
function npcWorth(n){return Math.round(n.cash+(n.silver||0)*coinNotes('silver')+ownedPlots(n.id).reduce((s,q)=>s+plotValue(q),0)+bizOwned(n.id).reduce((s,z)=>s+bizValue(z),0))}
function lbRows(cat){const p=S.player,rows=[{id:'player',name:p.name,cls:'You',v:cat==='net'?netWorth():Math.round(p.wk[cat]||0)}];
  for(const n of S.npcs)if(n.cls!=='peddler')rows.push({id:n.id,name:n.name,cls:CLASSES[n.cls].n,v:cat==='net'?npcWorth(n):Math.round(n.wk?.[cat]||0)});
  return rows.sort((a,b)=>b.v-a.v)}
function weekEnd(){const w=S.week,res={},p=S.player;
  for(const[cat,label,isMoney]of LB_CATS){const top=lbRows(cat).slice(0,3);res[cat]=top.map(r=>({name:r.name,v:r.v,you:r.id==='player'}));
    const pl=top.findIndex(r=>r.id==='player');if(pl>=0){p.trophies[pl]++;const prize=Math.round([150,75,35][pl]*w*S.money.P);p.cash+=prize;
      toast(`<b>Week ${w}: ${['1st','2nd','3rd'][pl]} place, ${label}</b> · +${money(prize)}`,'ach');if(pl===0)award('week')}}
  S.leader.history.unshift({week:w,day:day(),res});if(S.leader.history.length>30)S.leader.history.pop();
  recordSubmit('netWeek',`Net worth at the end of week ${w}`,netWorth()/S.money.P,false,w);recordSubmit('oreWeek','Most ore in one week',p.wk.ore,false,w);recordSubmit('madeWeek','Most goods made in one week',p.wk.made,false,w);
  for(const n of S.npcs)n.wk={ore:0,made:0,sold:0,orders:0};p.wk={ore:0,made:0,sold:0,orders:0};
  // unkept election promises cost approval
  if(S.town.mayor==='player')for(const k of S.town.promises||[])if(!promiseKept(k)){S.town.approval=Math.max(0,S.town.approval-8);jlog('law',`You did not keep your promise: ${PROMISES[k].n}. Approval falls.`,{toast:'bad'})}
  S.week++;newChallenges();jlog('event',`Week ${w} is over. See the Leaderboard (B) for the winners. New weekly challenges are on the notice board.`,{toast:'event'})}
// Hall of Records: kept in this browser across games
function records(){try{return JSON.parse(localStorage.getItem('oreorder.records')||'{}')}catch(e){return{}}}
function recordSubmit(cat,label,value,lowerBetter,week){if(S.demo||!value)return;const R=records();const list=R[cat]||{label,rows:[]};list.label=label;
  list.rows.push({name:S.player.name,seed:S.seed,value:Math.round(value),week,date:new Date().toISOString().slice(0,10)});
  list.rows.sort((a,b)=>lowerBetter?a.value-b.value:b.value-a.value);list.rows=list.rows.slice(0,10);R[cat]=list;try{localStorage.setItem('oreorder.records',JSON.stringify(R))}catch(e){}}

// ---------- the mayor's powers ----------
const POLICIES=[
  {k:'tax',n:'Land tax',min:0,max:.03,step:.005,fmt:v=>(v*100).toFixed(1)+'% a day',d:'Plot owners pay this each day.'},
  {k:'salesTax',n:'Sales tax',min:0,max:.12,step:.01,fmt:v=>Math.round(v*100)+'%',d:'Taken from every shop sale.'},
  {k:'tariff',n:'Import tariff',min:0,max:.6,step:.1,fmt:v=>Math.round(v*100)+'%',d:'Makes imported goods dearer. Local producers sell more.'},
  {k:'fine',n:'Claim-jumping fine',min:0,max:200,step:20,fmt:v=>money(v*S.money.P),d:'Paid to the plot owner.'},
  {k:'print',n:'New notes each day',min:0,max:600,step:25,fmt:v=>money(v*S.money.P),d:'Paper money with no metal behind it. Too much makes prices rise.'},
  {k:'breadCap',n:'Bread price cap',min:0,max:12,step:1,fmt:v=>v?money(v*S.money.P):'Off',d:'Shops cannot charge more. If the cap is below cost, bakers stop baking.'},
  {k:'resReq',n:'Bank reserve rule',min:.1,max:.5,step:.05,fmt:v=>Math.round(v*100)+'%',d:'Metal the bank needs for each note. Lower keeps notes at par with less metal, but makes a run more likely.'},
  {k:'salary',n:"Mayor's salary",min:0,max:150,step:10,fmt:v=>money(v*S.money.P)+' a day',d:'Paid to the mayor from the treasury. A high salary costs approval.'},
  {k:'roadMult',n:'Road crew pay',min:.5,max:2.5,step:.25,fmt:v=>'×'+v,d:'Pay for road shifts at Town Hall.'},
];
const PROMISES={tax:{n:'Lower land tax',kept:()=>S.town.tax<=.007,likes:n=>['miner','farmer','woodcutter'].includes(n.cls)},
  bread:{n:'Cheap bread',kept:()=>S.town.breadCap>0,likes:n=>n.cash<120*S.money.P},
  print:{n:'Stop printing notes',kept:()=>S.town.print===0,likes:n=>n.cash>400*S.money.P||n.cls==='merchant'||n.cls==='banker'},
  rail:{n:'Build the railway',kept:()=>S.town.projects.some(p=>p.key==='railway'),likes:n=>['miner','hauler','refiner'].includes(n.cls)},
  roads:{n:'More pay for road work',kept:()=>S.town.roadMult>=1.5,likes:n=>n.cash<150*S.money.P}};
function promiseKept(k){return PROMISES[k].kept()}
function setPolicy(k,dir){if(S.town.mayor!=='player')return;const P=POLICIES.find(p=>p.k===k);let v=+(S.town[k]+dir*P.step).toFixed(3);v=clamp(v,P.min,P.max);S.town[k]=v;
  jlog('law',`Mayor ${S.player.name}: ${P.n} is now ${P.fmt(v)}.`);sfx('stamp');renderWin()}
function setConvertible(on){if(S.town.mayor!=='player')return;S.bank.convertible=on;S.bank.forced=!on;jlog('law',on?'Mayor orders the Bank to pay silver for notes again.':'Mayor orders the Bank to stop paying silver for notes.',{toast:'law'});renderWin()}
function approvalTarget(){const t=S.town,P=S.money.P;let a=62-(t.tax-.01)*900-t.salesTax*120-Math.max(0,1-S.money.v)*90-S.folk.short*45;
  if(t.breadCap&&t.breadCap*P<=refPrice('bread')*1.1)a+=6;if(t.salary>40)a-=(t.salary-40)*.15;a+=t.projects.filter(p=>p.done).length*3;if(eventActive('festival'))a+=8;
  if(!S.bank.convertible)a-=8;if(t.roadMult>1)a+=(t.roadMult-1)*5;if(t.cash<0)a-=10;return clamp(a,0,100)}
function townDaily(){const t=S.town,P=S.money.P;t.approval=t.approval*.7+approvalTarget()*.3;
  const sal=Math.round(t.salary*P);if(t.cash>=sal){t.cash-=sal;if(t.mayor==='player'){S.player.cash+=sal;jlog('you',`Mayor's salary paid: ${money(sal)}.`)}else{const m=S.npcs.find(n=>n.id===t.mayor);if(m)m.cash+=sal}}
  if(t.mayor==='player'){if(t.approval<22){t.lowDays=(t.lowDays||0)+1;if(t.lowDays>=2&&t.nextElection>day()+1){t.nextElection=day()+1;jlog('law','The people call a recall election for tomorrow at noon. Your approval is too low.',{toast:'bad'})}}else t.lowDays=0}
  projectsDaily();if(t.mayor!=='player'){council();if(Math.random()<.15)npcStartProject()}
  if(day()===t.nextElection-1)jlog('law',`Election tomorrow at noon. ${t.mayor==='player'?'You defend your office.':'Register at Town Hall to stand.'}`,{toast:'law'})}

// ---------- town projects ----------
const PROJECTS={
  railway:{n:'Railway spur',cost:2500,mat:{wood:40,iron_ingot:16},days:4,d:'Exports up to 3 times faster. Export prices +15%.'},
  assay:{n:'Assay office',cost:700,mat:{wood:10,copper_ingot:4},days:2,d:'Shows every deposit on the map with its size.'},
  deputies:{n:'Sheriff deputies',cost:600,mat:{lantern:2,boots:2},days:1,d:'Claim jumpers are caught 45% of the time.'},
  granary:{n:'Granary',cost:900,mat:{wood:30},days:3,d:'Stores grain. A drought hurts the harvest less.'},
  school:{n:'School',cost:1400,mat:{wood:25,iron_ingot:5},days:3,d:'+25% skill experience. More settlers come.'},
  lamps:{n:'Road lamps',cost:600,mat:{fuel:10,copper_ingot:6},days:2,d:'No bandits at night.'},
};
function projectDone(k){return!!(S&&S.town&&S.town.projects&&S.town.projects.some(p=>p.key===k&&p.done))}
function projectOf(k){return S.town.projects.find(p=>p.key===k)}
function startProject(k,byPlayer){const t=S.town,Pj=PROJECTS[k],c=Math.round(Pj.cost*S.money.P);if(projectOf(k))return;
  if(t.cash<c){if(byPlayer)toast(`The treasury needs ${money(c)}.`,'bad');return}t.cash-=c;t.projects.push({key:k,mat:{},stage:'gather',until:0,done:false,by:byPlayer?'player':t.mayor});
  for(const m in Pj.mat)postOrder('proj:'+k,m,Pj.mat[m],price(m)*1.3,6,'For the '+Pj.n);
  jlog('law',`Town project started: ${Pj.n}. Materials are on the notice board.`,{toast:'law'});crier('The town will build '+an(Pj.n.toLowerCase())+'!');if(byPlayer)renderWin()}
function npcStartProject(){const opts=Object.keys(PROJECTS).filter(k=>!projectOf(k)&&S.town.cash>PROJECTS[k].cost*S.money.P*1.6);if(opts.length)startProject(pick(opts),false)}
function projectsDaily(){for(const pr of S.town.projects){if(pr.done)continue;const Pj=PROJECTS[pr.key];
  if(pr.stage==='gather'){// the town buys what the market has
    for(const m in Pj.mat){const need=Pj.mat[m]-(pr.mat[m]||0);if(need<=0)continue;const q=Math.min(need,Math.floor(S.market.stock[m]*.3));
      for(let i=0;i<q;i++){const p=price(m);if(S.town.cash<p)break;S.town.cash-=p;S.market.cash+=p;S.market.stock[m]--;pr.mat[m]=(pr.mat[m]||0)+1}}
    if(Object.keys(Pj.mat).every(m=>(pr.mat[m]||0)>=Pj.mat[m])){pr.stage='build';pr.until=S.time+Pj.days*1440;S.orders=S.orders.filter(o=>o.from!=='proj:'+pr.key);jlog('law',`All materials are in. Builders start the ${Pj.n}.`)}}
  else if(pr.stage==='build'&&S.time>=pr.until){pr.done=true;pr.doneDay=day();jlog('law',`The ${Pj.n} is finished! ${Pj.d}`,{toast:'good'});crier('The '+Pj.n+' is open!');
    if(pr.key==='deputies')S.town.catch=.45;if(S.town.mayor==='player'){S.player.stats.projects=(S.player.stats.projects||0)+1;award('project')}fireworks(world.cx,world.cy+3)}}}

// ---------- elections ----------
function registerCandidate(){const t=S.town,p=S.player,fee=Math.round(50*S.money.P);if(t.mayor==='player'||t.cand)return;
  if(p.rep<-10){toast('Your reputation is too low to stand.','bad');return}if(p.cash<fee){toast(`The fee is ${money(fee)}.`,'bad');return}
  p.cash-=fee;t.cash+=fee;t.cand=true;t.campaign=0;jlog('law',`You stand for mayor. The election is on day ${t.nextElection} at noon.`,{toast:'law'});sfx('stamp');checkGoals();renderWin()}
function togglePromise(k){const t=S.town;t.promises=t.promises||[];if(t.promises.includes(k))t.promises=t.promises.filter(x=>x!==k);else if(t.promises.length<2)t.promises.push(k);else toast('You can make 2 promises.','bad');renderWin()}
function campaignSpeech(){const t=S.town,p=S.player;if(!(t.cand||t.mayor==='player'))return;if(t.speechDay===day()){toast('You gave a speech today. Try again tomorrow.','info');return}
  if(dist(p.x,p.y,world.cx,world.cy+3)>10){toast('Go to the plaza to give a speech.','bad');return}if(p.energy<8){toast('You are too tired.','bad');return}
  t.speechDay=day();p.energy-=8;t.campaign=(t.campaign||0)+6;let heard=0;
  for(const n of S.npcs){if(n.sleeping||dist(n.x,n.y,p.x,p.y)>10)continue;heard++;n.opinion+=3+(t.promises||[]).filter(k=>PROMISES[k].likes(n)).length*2;if(Math.random()<.4)say(n,line('campaign',{n:p.name.split(' ')[0]}))}
  say(p,pick(['Vote for me! A fair deal for every worker!','Honest money and full shelves!','I will build this town up!']),5);sfx('bell');closeWin();
  toast(`${heard} people heard your speech. Support +6.`,'good')}
function candidates(){const t=S.town,c=[];const inc=t.mayor==='player'?{id:'player',name:S.player.name,inc:true}:{id:t.mayor,name:(S.npcs.find(n=>n.id===t.mayor)||{name:'Mayor'}).name,inc:true};c.push(inc);
  if(t.cand&&t.mayor!=='player')c.push({id:'player',name:S.player.name});
  const r=S.npcs.find(n=>n.id===t.rival);if(r&&r.id!==t.mayor)c.push({id:r.id,name:r.name});return c}
function tally(rand=true){const t=S.town,p=S.player,cs=candidates(),R=()=>rand?rnd(-12,12):0;const res=cs.map(c=>({...c,named:0,folk:0}));
  for(const n of S.npcs){if(n.cls==='peddler')continue;let best=null,bs=-1e9;
    for(const c of res){let s;if(c.id==='player')s=n.opinion*.6+p.rep*.35+(t.campaign||0)*.3+(t.promises||[]).filter(k=>PROMISES[k].likes(n)).length*6+(c.inc?(t.approval-50)*.6+16:0)+R();
      else if(c.inc)s=(t.approval-50)*.6+22+(n.id===c.id?100:0)+R();else s=4+(n.id===c.id?100:0)+(S.npcs.find(x=>x.id===c.id)?.cls===n.cls?8:0)+R();
      if(s>bs){bs=s;best=c}}best.named++}
  const fv=Math.round(S.folk.pop/4);let sum=0;for(const c of res){c.appeal=c.inc?Math.max(5,t.approval):c.id==='player'?clamp(20+p.rep*.35+(t.campaign||0)*.5+(t.promises||[]).length*3,5,95):24;sum+=c.appeal}
  for(const c of res){c.folk=Math.round(fv*c.appeal/sum);c.total=c.named*3+c.folk}
  return res.sort((a,b)=>b.total-a.total)}
function runElection(){const t=S.town;if(!t.rival||t.rival===t.mayor){const r=[...S.npcs].filter(n=>!['sheriff','peddler','mayor'].includes(n.cls)&&n.id!==t.mayor).sort((a,b)=>npcWorth(b)-npcWorth(a))[0];t.rival=r?r.id:null}
  const res=tally(true),win=res[0],old=t.mayor;
  t.lastResult={day:day(),res:res.map(c=>({name:c.name,id:c.id,total:c.total,named:c.named,folk:c.folk,inc:!!c.inc}))};
  t.mayor=win.id;t.nextElection=day()+7;t.cand=false;t.campaign=0;
  if(win.id==='player'&&old!=='player'){S.player.stats.elected=(S.player.stats.elected||0)+1;award('mayor');recordSubmit('mayorDay','Fastest to become mayor (day)',day(),true,S.week);
    t.approval=Math.max(t.approval,60);jlog('law',`You won the election! You are the Mayor of the valley. Open the Mayor tab at Town Hall.`,{toast:'ach'});fireworks(world.cx,world.cy+3);sfx('achievement')}
  else if(old==='player'&&win.id!=='player'){t.promises=[];jlog('law',`You lost the election to ${win.name}.`,{toast:'bad'})}
  else jlog('law',`${win.name} wins the election${win.id===old?' and stays mayor':''}.`,{toast:'law'});
  if(win.id!=='player'){const m=S.npcs.find(n=>n.id===win.id);if(m&&m.cls!=='mayor'){m.oldCls=m.cls;m.cls='mayor'}const o=S.npcs.find(n=>n.id===old&&n.id!==win.id);if(o&&o.oldCls){o.cls=o.oldCls;delete o.oldCls}}
  else{const o=S.npcs.find(n=>n.id===old);if(o&&o.oldCls){o.cls=o.oldCls;delete o.oldCls}}
  UI.election=t.lastResult;if(res.some(c=>c.id==='player'))showElection();crier(win.name+' is the Mayor!')}

// ---------- hourly hooks ----------
function eventsHourly(){const p=S.player;
  if(eventActive('bandits')&&isNight()&&!S.demo){const q=plotAt(p.x,p.y);if(q.owner!=='town'&&p.cash>30*S.money.P&&Math.random()<(p.equip.hand?.06:.12)*(projectDone('deputies')?.5:1)){
    const lost=Math.round(p.cash*.3);p.cash-=lost;sfx('whistle');cam.shake=5;jlog('you',`Bandits robbed you of ${money(lost)} in notes. Your coins are safe.`,{toast:'bad'})}}
  ordersHourly();finishBuilds();deliveriesTick();staffHourly();updateRetailRefs()}
function fireworks(x,y){for(let i=0;i<6;i++)setTimeout(()=>{if(!S)return;fx.firework(x+rnd(-6,6),y+rnd(-4,2));sfx('pick',.3)},i*350)}
