'use strict';
// ===== main: state, player, actions, input, save/load, loop =====
const SETTINGS_DEFAULT={master:.8,sfx:.9,amb:.6,music:.4,speed:8,fx:1,bubbles:true};
let SET={...SETTINGS_DEFAULT};try{Object.assign(SET,JSON.parse(localStorage.getItem('oreorder.settings')||'{}'))}catch(e){}
function saveSettings(){try{localStorage.setItem('oreorder.settings',JSON.stringify(SET))}catch(e){}AU.applyVol()}
const keys={};let mouse={x:0,y:0,down:false};

// ---------- new state ----------
function makeClouds(){const a=[];for(let i=0;i<9;i++)a.push({x:Math.random()*W*TS,y:Math.random()*H*TS,r:rnd(60,140)});return a}
function newState(seed,o={}){
  const{deposits,plots}=genWorld(seed);
  S={v:5,seed,time:6*60+30,lastHour:6,deposits,plots,settings:SET,weather:'clear',wind:.6,demo:!!o.demo,
    market:{stock:{},cash:4200},bank:{silver:320,gold:58,cash:0,convertible:true,depRate:.005,loanRate:.02,minted:0,silverAcc:0,goldAcc:0},
    town:{cash:1500,print:110,tax:.01,fine:40,catch:.25,printedTotal:0,works:0,salesTax:.03,tariff:.1,breadCap:0,resReq:.3,salary:20,roadMult:1,
      approval:60,nextElection:7,cand:false,campaign:0,promises:[],projects:[],mayor:null,rival:null,today:{tax:0}},money:{v:1,P:1,M:0,R:0,backing:1},
    biz:[],bizSeq:0,lots:[],orders:[],orderSeq:1,events:[],cut:{},crops:world.fields.map(()=>rnd(.3,1.05)),week:1,challenges:[],leader:{history:[]},
    journal:[],hist:{price:{},net:[],gdp:[]},today:{gdp:0,trade:0,exports:0,imports:0},stats:{fines:0},clouds:makeClouds(),fireflies:[],npcs:[],player:null,
    where:null,ents:[],caves:{},flags:{},quests:{},caveItems:[],friends:{},bounties:[],storyNpcs:{},graves:[],reqs:{},track:null};
  for(const k in GOODS)S.market.stock[k]=!isMarketGood(k)?0:GOODS[k].mstock??(k==='gold_ore'?22:k==='silver_ore'?28:RAW.includes(k)?50:16);
  const bg=BACKGROUNDS[o.bg||'prospector'],door=bOf('townhall').door;
  S.player={name:o.name||'Drifter',bg:o.bg||'prospector',skin:o.skin||SKINS[1],hair:o.hair||HAIRS[1],female:!!o.female,x:door.x+.5,y:door.y+1.6,dir:1,walk:0,moving:false,swing:0,
    cash:bg.cash,silver:bg.silver,gold:bg.gold,bankBal:0,loans:[],inv:{bread:3,bandage:2},equip:{},hunger:100,energy:100,cap:25,xp:{mining:0,labour:0,trade:0,craft:0,...bg.xp},rep:bg.rep,
    fineDebt:0,finesPaid:0,stats:{ore:0,sold:0,shifts:0,fined:0,rumours:0,loans:0,crafted:0,orders:0,wood:0,wheat:0,bizProfit:0},ach:{},pins:[],offers:[],leaseOut:false,path:null,pi:0,lastPlot:null,bubble:null,strikeCD:0,warned:{},
    wk:{ore:0,made:0,sold:0,orders:0},trophies:[0,0,0],goal:0};
  for(const k of bg.equip){const it=GOODS[k].item;S.player.equip[it.slot]={k,v:it.v,dur:it.dur}}recalc();
  demandInit();makeNpcs();initBiz();newChallenges();placeCaves();cmbInit(S.player);farmInit();initRelations();ensureCharacters();
  for(const b of world.buildings)buildingSprite(b);
  updateMoney();S.money.v=1;S.money.P=1;updateRetailRefs();hourly();
  jlog('you',`You arrive in the valley with ${money(S.player.cash)} in notes${S.player.silver?' and '+S.player.silver+' silver coins':''}${S.player.gold?' and '+S.player.gold+' gold coins':''}.`);
  jlog('you','Stake a claim at the Land Office before you mine. Check the notice board in the plaza for orders. Press G for your goals.');
}

// ---------- player ----------
function recalc(){const p=S.player;p.cap=25+(p.equip.back?p.equip.back.v:0)}
function canStand(x,y){return canStandAt(x,y)}
let footT=0;
function playerUpdate(dt,mins){const p=S.player;unstickPlayer();
  if(p.bubble){p.bubble.t+=dt;if(p.bubble.t>p.bubble.dur)p.bubble=null}
  if(p.swing>0)p.swing=Math.max(0,p.swing-dt*3.4);p.strikeCD-=dt;
  let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(UI.blocking||p.dead){mx=my=0}
  if(mx||my){p.path=null;p.autoMine=null;p.onArrive=null}
  else if(p.path){if(p.pi>=p.path.length){p.path=null;const f=p.onArrive;p.onArrive=null;if(f)f()}else{const n=p.path[p.pi],dx=n.x-p.x,dy=n.y-p.y;if(Math.hypot(dx,dy)<.12)p.pi++;else{mx=dx;my=dy}}}
  if(p.cmb&&p.cmb.dodge>0){mx=my=0}
  if(mx||my){const ar=p.equip.armor?GOODS[p.equip.armor.k].slow||0:0,tc=S.where?CCOST[CAVE.tiles[idx(p.x|0,p.y|0)]]||1:COST[tileAt(p.x,p.y)]||1;
    const l=Math.hypot(mx,my),sp=Math.min(4.4*(p.equip.feet?1+p.equip.feet.v:1)*(p.energy<10?.6:1)*(1-ar)*(p.cmb&&p.cmb.charging?.55:1)/Math.sqrt(tc)*dt,p.path?Math.hypot(mx,my):9);
    const nx=p.x+mx/l*sp,ny=p.y+my/l*sp;if(canStand(nx,p.y))p.x=nx;if(canStand(p.x,ny))p.y=ny;
    if(Math.abs(mx)>.01)p.dir=mx>0?1:-1;if(!(p.cmb&&(p.cmb.atk>0||p.cmb.charging)))p.face=faceOf(mx,my,p.face);p.moving=true;p.walk+=sp*2.6;p.acc=(p.acc||0)+sp;
    footT-=dt;if(footT<=0){footT=.34;sfx('footstep',.5);if(Math.random()<.5)fx.dust(p.x,p.y)}
    if(p.acc>6){p.acc=0;wear('feet')}}
  else if(!(p.cmb&&p.cmb.dodge>0))p.moving=false;
  p.hunger=Math.max(0,p.hunger-mins*.032);if(p.hunger<=0)p.energy-=mins*.06;p.energy=Math.max(0,p.energy-mins*.004);
  if(p.hunger<25&&!p.warned.h){p.warned.h=1;toast('You are hungry. Press F to eat bread, or eat stew at the Inn.','bad')}if(p.hunger>40)p.warned.h=0;
  if(p.energy<15&&!p.warned.e){p.warned.e=1;toast('You are tired. Sleep at the Inn.','bad')}if(p.energy>30)p.warned.e=0;
  if(p.energy<=0)collapse();
  if(!S.where){const pl=plotAt(p.x,p.y);if(pl.owner!=='town')p.lastPlot=pl.id}
  // hold E or auto-mine
  if(UI.target&&UI.target.kind==='dep'&&(keys.e||keys[' ']||p.autoMine===UI.target.o)&&p.strikeCD<=0&&!UI.blocking){p.toolNow=null;if(!strike(UI.target.o))p.autoMine=null}
  if(UI.target&&UI.target.kind==='tree'&&(keys.e||keys[' '])&&p.strikeCD<=0&&!UI.blocking){if(!chop(UI.target.i))keys.e=keys[' ']=false}
  if(UI.target&&UI.target.kind==='node'&&(keys.e||keys[' '])&&p.strikeCD<=0&&!UI.blocking){if(!strikeNode(UI.target.o))keys.e=keys[' ']=false}
}
function strike(d){const p=S.player;
  if(p.energy<2){say(p,'Too tired...');toast('Too tired to mine. Sleep at the Inn.','bad');return false}
  if(load(p)>=p.cap){say(p,'My pack is full.');toast('Your pack is full. Sell at the Market.','bad');return false}
  if(d.closed>S.time){toast('This shaft has collapsed. Try again tomorrow.','bad');return false}
  const q=plotAt(d.x,d.y),legal=mayMine('player',q),lv=level('mining');
  p.swing=1;p.dir=d.x+.5>p.x?1:-1;p.strikeCD=.55/(1+(lv-1)*.07);
  if(!legal&&trespass(p,q)){const o=S.npcs.find(n=>n.id===q.owner);if(o){o.opinion-=6;if(!o.sleeping&&dist(o.x,o.y,p.x,p.y)<14)say(o,line('trespass'))}return false}
  const oil=d.type==='oil';let n=oil?1:1+(p.equip.tool?p.equip.tool.v:0);if(Math.random()<(lv-1)*.08)n++;
  if(isNight()&&!p.equip.hand&&Math.random()<.5){fx.text(d.x+.5,d.y,'Too dark','#aab4c8');p.energy-=.6;sfx('pick',.4);return true}
  n=Math.min(n,Math.floor(d.amount),p.cap-load(p));if(n<=0)return false;
  d.amount-=n;p.inv[d.type]=(p.inv[d.type]||0)+n;p.energy-=1.3;S.time+=3;p.stats.ore+=n;p.wk.ore+=n;challengeAdd('ore',n);S.today.gdp+=GOODS[d.type].p*n;addXp('mining',1+n);
  fx.debris(d.x+.5,d.y+.6,GOODS[d.type].col,oil?3:7);if(oil)fx.splash(d.x+.5,d.y+.8);fx.text(d.x+.5,d.y,`+${n} ${GOODS[d.type].n}`,GOODS[d.type].col);
  sfx(oil?'oil':'pick');cam.shake=oil?.4:1.3;if(!oil)wear('tool');if(isNight())wear('hand');
  if(!legal&&q.owner!=='crown'){const o=S.npcs.find(x=>x.id===q.owner);if(o){o.opinion-=1;if(!o.sleeping&&dist(o.x,o.y,p.x,p.y)<10&&!o.bubble)say(o,line('trespass'))}}
  if(d.amount<1&&!d.regen){sfx('rock_break');fx.burst('dust',{x:d.x,y:d.y,w:1,h:1});cam.shake=4;jlog('you',`You emptied the ${GOODS[d.type].n.toLowerCase()} deposit on plot ${q.px},${q.py}.`)}
  if(UI.panel==='pack')renderPanel();return true}
function chop(i){const p=S.player,t=world.trees[i];if(!p.equip.axe){toast('You need an axe to cut timber. Shops sell axes, or craft one at an anvil.','bad');return false}
  if(load(p)>=p.cap){toast('Your pack is full.','bad');return false}if(p.energy<2){toast('Too tired.','bad');return false}
  if(!treeLegal(i,'player')){const q=plotAt(t.x/TS,t.y/TS);if(trespass(p,q))return false}
  p.toolNow='axe';p.swing=1;p.dir=t.x/TS>p.x?1:-1;p.strikeCD=.6;p.energy-=1;S.time+=3;p.chopHits=(p.chopHits||0)+1;fx.debris(t.x/TS,t.y/TS-.5,'#9a6a3a',4);sfx('pick',.7);
  if(p.chopHits>=3){p.chopHits=0;const n=Math.min(2+p.equip.axe.v,p.cap-load(p));S.cut[i]=S.time+4*1440;p.inv.wood=(p.inv.wood||0)+n;p.stats.wood=(p.stats.wood||0)+n;challengeAdd('wood',n);addXp('labour',2);
    fx.text(t.x/TS,t.y/TS-1,'+'+n+' Timber','#c8a070');cam.shake=2;sfx('rock_break',.5);wear('axe');if(p.stats.wood>=50)award('wood');return false}return true}
function harvest(j){const p=S.player;if(S.crops[j]<1)return;if(load(p)>=p.cap){toast('Your pack is full.','bad');return}if(p.energy<1.5){toast('Too tired.','bad');return}
  S.crops[j]=0;p.inv.wheat=(p.inv.wheat||0)+2;p.stats.wheat=(p.stats.wheat||0)+2;challengeAdd('wheat',2);p.energy-=1.2;S.time+=4;p.swing=1;p.toolNow='sickle';addXp('labour',1);
  const i=world.fields[j];fx.debris(i%W+.5,(i/W|0)+.6,'#e0c050',5);fx.text(i%W+.5,i/W|0,'+2 Wheat','#e0c050');sfx('footstep');if(p.stats.wheat>=30)award('harvest')}
function wear(slot){const p=S.player,it=p.equip[slot];if(!it||GOODS[it.k].item.dur>=9999)return;it.dur--;
  if(it.dur<=0){toast(`Your ${GOODS[it.k].n.toLowerCase()} broke.`,'bad');jlog('you',`Your ${GOODS[it.k].n.toLowerCase()} broke.`);delete p.equip[slot];recalc()}}
function equip(k){const p=S.player,it=GOODS[k].item;if(!(p.inv[k]>0))return;if(p.equip[it.slot])p.inv[p.equip[it.slot].k]=(p.inv[p.equip[it.slot].k]||0)+1;
  p.inv[k]--;if(!p.inv[k])delete p.inv[k];p.equip[it.slot]={k,v:it.v,dur:it.dur};recalc();sfx('ui_click');toast(`Equipped: ${GOODS[k].n}. ${it.d}.`,'good');checkAch();renderPanel()}
function unequip(s){const p=S.player,e=p.equip[s];if(!e)return;if(e.dur<GOODS[e.k].item.dur&&!confirm(`This ${GOODS[e.k].n.toLowerCase()} is worn. If you remove it, it goes back to your pack as a new item only if unused. Remove it?`))return;
  if(e.dur>=GOODS[e.k].item.dur)p.inv[e.k]=(p.inv[e.k]||0)+1;else toast(`You threw away the worn ${GOODS[e.k].n.toLowerCase()}.`);delete p.equip[s];recalc();renderPanel()}
function eatQuick(){const p=S.player;if(p.inv.bread){eat();toast('You eat a loaf of bread. Hunger +35.','good');return}const z=cheapestSeller('bread',p);
  toast(z?`You have no bread. The ${z.name} sells it for ${money(shopPrice(z,'bread'))}. Or eat stew at the Inn.`:'You have no bread and the shops are out. Eat stew at the Inn.','bad')}
function eat(){const p=S.player;if(!p.inv.bread)return;p.inv.bread--;if(!p.inv.bread)delete p.inv.bread;p.hunger=Math.min(100,p.hunger+GOODS.bread.food);sfx('eat');fx.text(p.x,p.y-1,'+35 hunger','#e8c070');renderPanel()}
function collapse(){const p=S.player,fee=Math.round(p.cash*.15);p.cash-=fee;S.town.cash+=fee;const d=bOf('inn').door;p.x=d.x+.5;p.y=d.y+.6;p.path=null;
  fastForward(minsUntil(7));p.energy=55;p.hunger=Math.max(p.hunger,40);fade('You collapse from exhaustion...');
  jlog('you',`You collapsed. People carried you to the inn. The doctor took ${money(fee)}.`,{toast:'bad'})}
function minsUntil(h){const now=S.time%1440,t=h*60;return t>now?t-now:1440-now+t}
function fastForward(mins){let left=mins;while(left>0){const step=Math.min(60,left);S.time+=step;left-=step;hourTick();for(const z of S.biz)bizTick(z,step);growCrops(step);if(S.farm)farmGrow(step);
  for(const d of S.deposits)if(d.regen)d.amount=Math.min(d.max,d.amount+d.regen*step/10)}
  for(const n of S.npcs){stopAt(n);n.spot=null;if(n.state==='mine'&&!n.sleeping)n.state='idle'}}
function fade(txt){const f=$('#fader');f.querySelector('span').textContent=txt;f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}

// ---------- actions (called from UI) ----------
function pbuy(k,q){const p=S.player,G=GOODS[k];if(!G.item&&load(p)+q>p.cap){q=p.cap-load(p);if(q<=0){toast('Your pack is full.','bad');return}}
  const r=buyGoods(p,k,q);if(!r.n){toast(S.market.stock[k]<1?'The market has none in stock.':'You do not have enough notes.','bad');return}
  sfx('coins');addXp('trade',Math.max(1,r.cost/(15*S.money.P)));toast(`Bought ${r.n} ${G.n} for ${money(r.cost)}.`,'good');checkAch();renderWin()}
function psell(k,q){const p=S.player,r=sellGoods(p,k,q);if(!r.n){toast(marketFull(k)?`The market is full of ${GOODS[k].n.toLowerCase()}. It buys no more today.`:'The market has no cash to pay you now.','bad');return}afterSale(r.got,`${r.n} ${GOODS[k].n}`);renderWin()}
function psellRaw(){let got=0,n=0;for(const k of RAW)if(S.player.inv[k]){const r=sellGoods(S.player,k,S.player.inv[k]);got+=r.got;n+=r.n}if(!n){toast('You have no ore or oil.','info');return}afterSale(got,n+' loads of ore');renderWin()}
function psellAllGoods(){let got=0,n=0;for(const k in S.player.inv)if(isMarketGood(k)){const r=sellGoods(S.player,k,S.player.inv[k]);got+=r.got;n+=r.n}if(!n){toast('Nothing to sell.','info');return}afterSale(got,n+' goods');renderWin()}
function exportPrice(k){return Math.max(1,Math.round(price(k)*.55))}
function exportSell(k,q){const p=S.player;q=Math.min(q,p.inv[k]||0);let got=0,n=0;
  for(let i=0;i<q;i++){const pr=exportPrice(k);if(S.market.cash<pr)break;S.market.cash-=pr;p.cash+=pr;got+=pr;p.inv[k]--;n++}
  if(!p.inv[k])delete p.inv[k];if(!n){toast('The trader has no cash now.','bad');return}S.today.exports+=got/S.money.P;afterSale(got,`${n} ${GOODS[k].n} to the export trader`);renderWin()}
function afterSale(got,what){const p=S.player;p.stats.sold+=got;p.wk.sold+=got;challengeAdd('sold',got);addXp('trade',Math.max(1,got/(12*S.money.P)));sfx(got>100*S.money.P?'cash_big':'coins');fx.coins(p.x,p.y-.5,Math.min(14,3+got/20));fx.text(p.x,p.y-1,'+'+money(got),'#ffd86b',got>200);
  toast(`Sold ${what} for ${money(got)}.`,'good');jlog('you',`You sold ${what} for ${money(got)}.`);checkAch()}
function bankDep(n){const p=S.player;n=Math.min(Math.round(n),p.cash);if(n<=0)return;p.cash-=n;p.bankBal+=n;S.bank.cash+=n;sfx('coins');toast(`Deposited ${money(n)}.`,'good');checkAch();renderWin()}
function bankWd(n){const p=S.player;n=Math.min(Math.round(n),p.bankBal);if(n<=0)return;p.bankBal-=n;p.cash+=n;S.bank.cash=Math.max(0,S.bank.cash-n);sfx('coins');renderWin()}
function pex(c,dir,q){const p=S.player,before=p.cash,n=exchange(p,c,dir,q);if(!n){toast(dir==='buy'?(S.bank.convertible?'Not enough notes.':'The bank does not sell coin now.'):'You have no coin.','bad');return}
  sfx('coins');addXp('trade',2);toast(`${dir==='buy'?'Bought':'Sold'} ${n} ${c} coin${n>1?'s':''} for ${money(Math.abs(p.cash-before))}.`,'good');jlog('bank',`You ${dir==='buy'?'bought':'sold'} ${n} ${c} coins.`);checkAch();renderWin()}
function takeLoan(n){const p=S.player;if(n>creditLimit())return;p.cash+=n;p.loans.push({owed:n,due:day()+10});S.bank.cash=Math.max(0,S.bank.cash-n);sfx('stamp');
  jlog('bank',`You borrowed ${money(n)}. Repay by day ${day()+10}.`,{toast:'info'});renderWin()}
function repay(i){const p=S.player,L=p.loans[i];if(!L)return;const pay=Math.min(L.owed,p.cash);if(pay<=0)return;p.cash-=pay;L.owed-=pay;S.bank.cash+=pay;sfx('coins');
  if(L.owed<=0){p.loans.splice(i,1);p.stats.loans++;p.rep=Math.min(100,p.rep+3);jlog('bank','You repaid a loan in full.',{toast:'good'});checkAch()}renderWin()}
function mint(k){const p=S.player;if(!p.inv[k])return;p.inv[k]--;if(!p.inv[k])delete p.inv[k];const c=k==='gold_ingot'?'gold':'silver',n=c==='gold'?GOLD_PER_INGOT:SILVER_PER_INGOT;p[c]+=n;S.bank.minted+=n;
  sfx('anvil');fx.coins(p.x,p.y-.5,8);toast(`The Mint struck ${n} ${c} coins for you.`,'good');p.ach.mint||award('mint');renderWin()}
function shiftPay(id){const lv=1+(level('labour')-1)*.1;if(id==='townhall')return Math.round(BASE_WAGE.townhall*2*S.money.P*S.town.roadMult*(S.town.works>=day()?1.5:1)*lv);const z=bizById(id);return z?Math.round(z.wage*2*lv):0}
function workShift(id){const p=S.player,pay=shiftPay(id),cost=Math.max(8,18-(level('labour')-1)*1.5);
  if(p.energy<cost){toast('You are too tired to work. Sleep at the Inn.','bad');return}
  const z=id==='townhall'?null:bizById(id),purse=z||S.town;
  if(purse.cash<pay){toast('They cannot pay you now.','bad');return}
  purse.cash-=pay;p.cash+=pay;p.energy-=cost;p.hunger=Math.max(0,p.hunger-8);if(z){z.labour+=2+(level('labour')-1)*.25;z.today.wages+=pay}
  p.stats.shifts++;challengeAdd('shifts',1);if(p.rep<40)p.rep++;addXp('labour',7);fastForward(120);sfx('coins');fade('Two hours of hard work...');
  fx.text(p.x,p.y-1,'+'+money(pay),'#ffd86b');jlog('you',`You worked a shift at the ${z?z.name:'Town Hall road crew'}. You earned ${money(pay)}.`);checkAch();renderWin()}
function payArrears(id){const q=S.plots[id],tax=Math.max(1,Math.round(plotValue(q)*S.town.tax))*q.arrears;if(S.player.cash<tax){toast('Not enough notes.','bad');return}
  S.player.cash-=tax;S.town.cash+=tax;q.arrears=0;toast('Tax paid.','good');renderWin()}
function payFines(){const p=S.player,n=Math.min(p.fineDebt,p.cash);if(n<=0)return;p.cash-=n;p.fineDebt-=n;p.finesPaid=(p.finesPaid||0)+n;S.town.cash+=n;sfx('coins');toast(`Paid ${money(n)} in fines.`,'good');renderWin()}
function landAct(a){const p=S.player,q=UI.selPlot,v=plotValue(q);if(!q)return;
  if(p.fineDebt>0){toast('Pay your fines at the Sheriff first.','bad');return}
  if(a==='claim'){if(p.cash<v){toast('Not enough notes.','bad');return}p.cash-=v;S.town.cash+=v;transferPlot(q,'player','claimed for '+money(v))}
  else if(a==='sell'){const g=Math.round(v*.7);p.cash+=g;S.town.cash=Math.max(0,S.town.cash-g);transferPlot(q,'crown','sold for '+money(g))}
  else if(a==='buy'){const n=S.npcs.find(x=>x.id===q.owner),ask=Math.round(v*askMult(n));if(p.cash<ask){toast(`It costs ${money(ask)}.`,'bad');return}
    if(n.opinion+p.rep<-25){toast(`${n.name} will not sell to you.`,'bad');return}p.cash-=ask;n.cash+=ask;transferPlot(q,'player','bought for '+money(ask))}
  else if(a==='lease'){const fee=Math.round(v*.25),n=S.npcs.find(x=>x.id===q.owner);if(p.cash<fee){toast('Not enough notes.','bad');return}p.cash-=fee;if(n)n.cash+=fee;q.lease={who:'player',until:S.time+3*1440};
    jlog('land',`You leased plot ${q.px},${q.py} for 3 days for ${money(fee)}.`)}
  sfx('stamp');toast('The clerk stamps the deed.','good');checkAch();renderWin()}
function innPay(n){const c=Math.round(n*S.money.P);if(S.player.cash<c){toast('Not enough notes.','bad');return false}S.player.cash-=c;S.town.cash+=c*.2;S.market.cash+=c*.8;return true}
function innSleep(){if(!innPay(10))return;const p=S.player;fastForward(minsUntil(6));p.energy=100;p.hunger=Math.max(10,p.hunger-15);fade('You sleep until morning...');closeWin();saveGame(true);toast('You wake rested. The game is saved.','good')}
function innNap(){if(!innPay(3))return;fastForward(120);S.player.energy=Math.min(100,S.player.energy+30);fade('You rest for two hours...');renderWin()}
function innMeal(){if(!innPay(8))return;S.player.hunger=100;sfx('eat');toast('A hot stew. You are full.','good');renderWin()}
function innRound(){if(!innPay(15))return;const p=S.player;p.rep=Math.min(100,p.rep+3);for(let i=0;i<5;i++)pick(S.npcs).opinion+=2;const n=pick(S.npcs);n.rumourDay=0;const r=rumour(n);
  toast(r.good?'You hear a rumour. Check your map for a red pin.':'The talk is dull tonight.','info');if(r.good){$('#winGreet').textContent='"'+r.txt+'"'}sfx('coins');checkAch()}
function offerAccept(i){const p=S.player,o=p.offers[i];if(!o)return;const n=S.npcs.find(x=>x.id===o.npc),q=S.plots[o.plot];p.offers.splice(i,1);
  if(!n||q.owner!=='player'||n.cash<o.amt){toast('The offer is no longer good.','bad');renderPanel();return}n.cash-=o.amt;p.cash+=o.amt;transferPlot(q,n.id,'sold for '+money(o.amt));sfx('cash_big');toast(`Sold plot ${q.px},${q.py} for ${money(o.amt)}.`,'good');renderPanel()}
function offerDecline(i){S.player.offers.splice(i,1);renderPanel()}
function offersTick(){const p=S.player;p.offers=p.offers.filter(o=>o.until>S.time&&S.plots[o.plot].owner==='player');
  const mine=ownedPlots();if(!mine.length||Math.random()>.035||p.offers.length>=3)return;const q=pick(mine),v=plotValue(q);
  const n=S.npcs.find(n=>n.cls==='miner'&&n.cash>v*1.3&&!p.offers.some(o=>o.npc===n.id));if(!n)return;const amt=Math.round(v*rnd(1.15,1.5));
  p.offers.push({npc:n.id,plot:q.id,amt,until:S.time+1440});jlog('land',`${n.name} offers ${money(amt)} for your plot ${q.px},${q.py}. Open Land & Deeds (L) to answer.`,{toast:'info'})}

// ---------- achievements ----------
function award(id){const p=S.player;if(p.ach[id])return;p.ach[id]=day();const a=ACH.find(a=>a.id===id);toast(`<b>${a.n}</b> · ${a.d}`,'ach');sfx('achievement');jlog('you','Achievement: '+a.n+'.');fx.ring(p.x,p.y,'#ffd23f');fx.coins(p.x,p.y-.5,10)}
function checkAch(){if(!S||S.demo)return;const p=S.player,nw=netWorth(),P=S.money.P,mine=ownedPlots();
  if(p.stats.ore>0)award('ore');if(p.stats.sold>0)award('sale');if(mine.length)award('claim');if(mine.some(q=>plotDeposits(q).some(d=>d.vein)))award('vein');if(mine.length>=5)award('baron');
  if(nw>=1000*P)award('k1');if(nw>=10000*P)award('k10');if(p.stats.shifts>=10)award('shift');if(p.silver>=100)award('silver');if(p.gold>=20)award('gold');
  if(p.stats.loans>0)award('loan');if(p.stats.fined>=3)award('outlaw');if(p.stats.rumours>=5)award('rumour');if(Object.keys(p.equip).length>=4)award('kit');if(p.bankBal>=1000*P)award('saver');
  if(p.stats.crafted>0)award('craft');if(p.stats.orders>0)award('order');const nb=bizOwned().length;if(nb)award('biz');if(nb>=3)award('chain');checkGoals()}

// ---------- interaction ----------
function findTarget(){const p=S.player;if(p.dead){UI.target=null;return}if(S.where){UI.target=caveTarget(p);return}let best=null,bd=9;
  for(const b of world.buildings){const d=dist(p.x,p.y,b.door.x+.5,b.door.y+.4);if(d<1.4&&d<bd){bd=d;best={kind:'bld',o:b,label:'Enter '+b.name}}}
  for(const n of S.npcs){if(n.sleeping)continue;const d=dist(p.x,p.y,n.x,n.y);if(d<1.5&&d+.2<bd){bd=d+.2;best={kind:'npc',o:n,label:'Talk to '+n.name.split(' ')[0]}}}
  for(const dp of S.deposits){if(dp.amount<1)continue;const d=dist(p.x,p.y,dp.x+.5,dp.y+.6);if(d<1.7&&d<bd){bd=d;const q=plotAt(dp.x,dp.y),ok=mayMine('player',q);
    best={kind:'dep',o:dp,bad:!ok,label:`${dp.type==='oil'?'Pump':'Mine'} ${GOODS[dp.type].n}${dp.vein?' (vein)':''}${ok?'':' · NOT YOUR CLAIM'}`}}}
  const bd2=dist(p.x,p.y,world.board.x,world.board.y+.3);if(bd2<1.5&&bd2<bd){bd=bd2;best={kind:'board',label:'Notice board · '+S.orders.length+' orders',at:{x:world.board.x,y:world.board.y-1}}}
  for(const l of S.lots){if(l.biz)continue;const L=world.lots[l.i],d=dist(p.x,p.y,L.door.x+.5,L.door.y);if(d<1.6&&d<bd){bd=d;best={kind:'lot',l,label:lotLabel(l),at:{x:L.door.x+.5,y:L.door.y-1}}}}
  if(!best||bd>1.1){const tx=p.x|0,ty=p.y|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!inB(tx+dx,ty+dy)||!world.fieldIdx)continue;const j=world.fieldIdx[idx(tx+dx,ty+dy)];if(j>=0&&S.crops[j]>=1){const d=dist(p.x,p.y,tx+dx+.5,ty+dy+.5);if(d<1.2&&d<bd){bd=d;best={kind:'field',j,label:'Harvest wheat',at:{x:tx+dx+.5,y:ty+dy-.2}}}}}}
  if(!best){let ti=-1,td=1.3;for(let i=0;i<world.trees.length;i++){const t=world.trees[i];if(t.k!=='pine'&&t.k!=='oak')continue;if(Math.abs(t.x/TS-p.x)>2||Math.abs(t.y/TS-p.y)>2)continue;const d=dist(p.x,p.y,t.x/TS,t.y/TS);if(d<td&&!(S.cut[i]>S.time)){td=d;ti=i}}
    if(ti>=0){const t=world.trees[ti];best={kind:'tree',i:ti,bad:!p.equip.axe,label:p.equip.axe?'Cut timber':'Cut timber (you need an axe)',at:{x:t.x/TS,y:t.y/TS-1.6}}}}
  UI.target=valleyTarget(p,best,bd)}
// targets added by caves, combat, bounties, farming and treasure
function valleyTarget(p,best,bd){const near=(x,y,r)=>{const d=dist(p.x,p.y,x,y);return d<r&&d<bd?d:0};let d;
  for(const c of world.caves||[])if((d=near(c.sx+.5,c.sy+.5,1.6))){bd=d;best={kind:'cave',o:c,label:'Enter '+c.name+(c.story?' (story)':''),at:{x:c.sx+.5,y:c.sy-.6}}}
  for(const e of S.ents){if(e.dead)continue;
    if(e.kind==='chest'&&!e.open&&(d=near(e.x,e.y,1.4))){bd=d;best={kind:'chest',o:e,label:'Open the chest',at:{x:e.x,y:e.y-1}}}
    if(e.kind==='mob'&&e.state==='surrender'&&!e.tied&&(d=near(e.x,e.y,1.6))){bd=d;best={kind:'tie',o:e,label:'Tie up '+(e.name||'the outlaw'),at:{x:e.x,y:e.y-1.8}}}}
  for(const m of p.tmaps||[])if(!m.found&&(d=near(m.x,m.y,1.4))){bd=d;best={kind:'dig',o:m,bad:!(p.inv.shovel>0),label:p.inv.shovel>0?'Dig for treasure':'Dig (you need a shovel)',at:{x:m.x,y:m.y-1}}}
  if(!best||bd>1){const a=animalTarget(p);if(a)best=a;else{const f=farmTarget(p);if(f)best=f}}
  return best}
function caveTarget(p){let best=null,bd=1.6;const L=CAVE,near=(x,y,r)=>{const d=dist(p.x,p.y,x,y);return d<r&&d<bd?d:0};let d;
  const lad=(i,t)=>{if((d=near(i%W+.5,(i/W|0)+.5,1.6))){bd=d;best={kind:'ladder',t,label:t===CT.UP?(L.depth===1?'Climb out of the cave':'Climb up to level '+(L.depth-1)):'Climb down to level '+(L.depth+1),at:{x:i%W+.5,y:(i/W|0)-.4}}}};
  lad(L.up,CT.UP);if(L.down>=0)lad(L.down,CT.DOWN);
  for(const n of L.nodes){if(n.hp<=0)continue;if((d=near(n.x+.5,n.y+.6,1.5))){bd=d;const lock=n.locked&&!S.flags[n.locked];best={kind:'node',o:n,bad:!p.equip.tool||lock,label:`Mine ${GOODS[n.k].n.toLowerCase()}${n.gem?' (gem)':''}${p.equip.tool?'':' · you need a pickaxe'}`,at:{x:n.x+.5,y:n.y-.3}}}}
  for(const e of L.ents){if(e.kind==='chest'&&!e.open&&(d=near(e.x,e.y,1.4))){bd=d;best={kind:'chest',o:e,label:e.rare?'Open the old chest':'Open the chest',at:{x:e.x,y:e.y-1}}}
    if(e.kind==='friend'&&(d=near(e.x,e.y,1.7))){bd=d;best={kind:'friend',o:e,label:'Talk to '+e.name,at:{x:e.x,y:e.y-1.7}}}}
  return best}
function act(){const t=UI.target;if(!t||UI.blocking)return;if(t.kind==='bld')openWin(t.o);else if(t.kind==='npc')openDialog(t.o);else if(t.kind==='dep'){S.player.toolNow=null;strike(t.o)}
  else if(t.kind==='board')openWin({kind:'board',name:'Notice Board'});else if(t.kind==='lot')openWin({kind:'lot',name:'Town lot '+(t.l.i+1),lotI:t.l.i});else if(t.kind==='tree')chop(t.i);else if(t.kind==='field')harvest(t.j);
  else if(t.kind==='cave')enterCave(t.o,1);else if(t.kind==='ladder')useLadder(t.t);else if(t.kind==='node')strikeNode(t.o);else if(t.kind==='chest')openChest(t.o);
  else if(t.kind==='friend')meetFriend(t.o);else if(t.kind==='tie')tieUp(t.o);else if(t.kind==='animal')animalAct(t.o);else if(t.kind==='farm')farmAct(t);else if(t.kind==='dig')digAt(t.o)}
function meetFriend(e){if(friendTalk(e.fid)){const f=S.friends[e.fid];f.found=true;CAVE.ents=CAVE.ents.filter(x=>x!==e);fx.ring(e.x,e.y,'#9ad672');toast(`${e.name} climbs out to the surface.`,'good')}else say2(e,'I am fine. Get out while you can!')}
function npcAt(wx,wy){let best=null,bd=.8;for(const n of S.npcs){if(n.sleeping)continue;const d=dist(wx,wy,n.x,n.y-.5);if(d<bd){bd=d;best=n}}return best}
function clickWorld(sx,sy){const w=toWorld(sx,sy),p=S.player;p.autoMine=null;if(S.where||p.dead)return;
  const n=npcAt(w.x,w.y);if(n){if(dist(n.x,n.y,p.x,p.y)<2)openDialog(n);else walkTo(n.x,n.y,()=>{if(dist(n.x,n.y,p.x,p.y)<2.5)openDialog(n)});return}
  const b=world.buildings.find(b=>w.x>=b.x&&w.x<b.x+b.w&&w.y>=b.y-1&&w.y<b.y+b.h+.6);if(b){walkTo(b.door.x+.5,b.door.y+.5,()=>openWin(b));return}
  const d=S.deposits.find(d=>d.amount>=1&&Math.abs(w.x-(d.x+.5))<.8&&Math.abs(w.y-(d.y+.4))<.9);if(d){walkTo(d.sx+.5,d.sy+.5,()=>{findTarget();if(UI.target&&UI.target.o===d)p.autoMine=d});return}
  walkTo(w.x,w.y,null);fx.ring(w.x,w.y+.3,'#ffffff')}
function walkTo(x,y,cb){const p=S.player,path=findPath(p.x,p.y,x,y);if(!path){toast('You cannot get there.','bad');return}p.path=path;p.pi=0;p.onArrive=cb}

// ---------- world ambience ----------
let smokeT=0,ambT=0,slowT=1;
function ambience(dt,mins){
  S.wind=Math.sin(S.time/300)*.8+(S.weather==='storm'?1.2:0);
  for(const c of S.clouds){c.x+=(8+S.wind*10)*dt;if(c.x>W*TS+200){c.x=-200;c.y=Math.random()*H*TS}}
  smokeT-=dt;if(smokeT<=0){smokeT=.22;const h=hour();
    for(const b of world.buildings){if(!onScreen(b.x+b.w/2,b.y,4))continue;const z=bizOfBld(b);
      if(z&&z.closedUntil>S.time){for(let i=0;i<3;i++)fx.flame(b.x+rnd(.5,b.w-.5),b.y+b.h-.2);fx.smoke(b.x+b.w/2,b.y+.5,'#4a4a50',2)}
      if(!b.smoke||!b.smoke.length)continue;const st=z&&BIZ_TYPES[z.type].station;const on=z?(!!z.job||st==='oven'&&h>=4&&h<11):b.kind==='inn'?h>=17||h<1:false;if(!on)continue;
      const s=b.spr,top=b.y+b.h-s.height/TS;for(const e of b.smoke)fx.smoke(b.x+e.x/TS,top+e.y/TS+.5,b.kind==='refinery'?'#5a5a60':'#9a9aa0',b.kind==='refinery'?1.4:1)}}
  if(Math.random()<dt*3)for(const d of S.deposits)if((d.type==='gold_ore'||d.type==='silver_ore'||d.vein)&&d.amount>0&&Math.random()<.15&&onScreen(d.x,d.y,0))fx.glint(d.x+rnd(.2,.8),d.y+rnd(.3,.8),'#ffffff');
  // fireflies
  const night=isNight()&&S.weather!=='rain'&&S.weather!=='storm';if(night&&S.fireflies.length<24&&Math.random()<dt*4){const x=S.player.x+rnd(-14,14),y=S.player.y+rnd(-9,9),t=tileAt(x,y);if(t===T.GRASS||t===T.FOREST)S.fireflies.push({x,y,vx:0,vy:0,life:rnd(6,14)})}
  for(let i=S.fireflies.length-1;i>=0;i--){const f=S.fireflies[i];f.vx+=rnd(-1,1)*dt;f.vy+=rnd(-1,1)*dt;f.vx*=.98;f.vy*=.98;f.x+=f.vx*dt;f.y+=f.vy*dt;f.life-=dt;if(f.life<=0||!night)S.fireflies.splice(i,1)}
  if(S.weather==='rain'||S.weather==='storm'){if(Math.random()<dt*20){const x=S.player.x+rnd(-12,12),y=S.player.y+rnd(-8,8);if(onScreen(x,y,0))fx.splash(x,y)}}
  if(eventActive('festival')&&isNight()&&Math.random()<dt*.8)fx.firework(world.cx+rnd(-8,6),world.cy+rnd(-2,8));
  ambT-=dt;if(ambT<=0){ambT=2;AU.loop('amb',S.weather==='rain'||S.weather==='storm'?'amb_rain':isNight()?'amb_night':'amb_day',.9)}
}

// ---------- time ----------
function hourTick(){const h=Math.floor(S.time/60);while(S.lastHour<h){S.lastHour++;hourly();if(!S.demo)questScheduler();if(S.lastHour%24===6){daily();staffDaily();if(!S.demo){socialDaily();animalsDaily();genRequests()}}if(!S.demo)offersTick();if(S.lastHour%24===12){sfxAt('bell',bOf('townhall').door.x,bOf('townhall').door.y);if(day()>=S.town.nextElection){if(S.demo)S.town.nextElection+=7;else runElection()}}}}
function growCrops(mins){const g=cropGrowthPerMin()*mins;for(let j=0;j<S.crops.length;j++)if(S.crops[j]<1.2)S.crops[j]+=g}
function simulate(dt){if(UI.blocking&&!S.demo)return;const mins=dt*SET.speed;S.time+=mins;hourTick();growCrops(mins);
  if(!S.demo){playerUpdate(dt,mins);combatTick(dt);lawTick(dt);farmGrow(mins);bountyTick();slowT-=dt;if(slowT<=0){slowT=1;animalsFromPack();checkQuestGoals()}}
  for(const n of S.npcs)if(!n.talking)npcTick(n,dt,mins);
  for(const z of S.biz)bizTick(z,mins);
  for(const d of S.deposits)if(d.regen)d.amount=Math.min(d.max,d.amount+d.regen*mins/10);
  if(!S.where)ambience(dt,mins);else{ambT-=dt;if(ambT<=0){ambT=2;AU.loop('amb','amb_night',.35)}}}

// ---------- camera ----------
let demoT=0;
function camUpdate(dt){let tx,ty;
  if(S.demo){demoT+=dt*.05;tx=(world.cx+Math.cos(demoT)*22)*TS;ty=(world.cy+3+Math.sin(demoT*1.3)*14)*TS;cam.zoom+=(2.6-cam.zoom)*dt}
  else if(UI.follow&&performance.now()<UI.follow.until){tx=UI.follow.n.x*TS;ty=UI.follow.n.y*TS}
  else{UI.follow=null;tx=S.player.x*TS;ty=S.player.y*TS-8}
  const k=Math.min(1,dt*(S.demo?1.2:6));cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;cam.zoom+=((UI.zoom||3)-cam.zoom)*Math.min(1,dt*8)*(S.demo?0:1);
  const hw=VW/2/cam.zoom,hh=VH/2/cam.zoom;const mw=S.where?CW:W,mh=S.where?CH:H;cam.x=clamp(cam.x,hw,Math.max(hw,mw*TS-hw));cam.y=clamp(cam.y,hh,Math.max(hh,mh*TS-hh))}

// ---------- save / load ----------
function saveGame(silent){if(!S||S.demo)return;try{
  const data={...S,settings:undefined,clouds:undefined,fireflies:undefined,
    npcs:S.npcs.map(n=>({...n,path:[],pi:0,goal:null,bubble:null,spot:null,dest:null,talking:false,target:n.target?n.target.id:null})),player:{...S.player,path:null,onArrive:null,autoMine:null,bubble:null},
    ents:S.ents.filter(e=>!e.dead&&(e.persist||e.owned||e.bounty)).map(e=>({...e,bubble:null,list:undefined,questItem:undefined}))};
  localStorage.setItem('oreorder.save',JSON.stringify(data));if(!silent)toast('Game saved.','good')}catch(e){toast('The game could not save: '+e.message,'bad')}}
function hasSave(){try{return!!localStorage.getItem('oreorder.save')}catch(e){return false}}
async function loadGame(){let data;try{data=JSON.parse(localStorage.getItem('oreorder.save'))}catch(e){toast('The save file is damaged.','bad');return}
  if(!data||!data.biz){toast('This save is from an older version. Start a new game.','bad');return}
  showScreen('loading');await nextFrame();genWorld(data.seed);
  S=data;S.settings=SET;S.clouds=makeClouds();S.fireflies=[];S.demo=false;
  upgradeSave();
  for(const l of S.lots){if(l.biz){const z=bizById(l.biz);if(z)addLotBuilding(l,z)}else if(l.build){const L=world.lots[l.i];for(let y=L.y;y<L.y+L.h;y++)for(let x=L.x;x<L.x+L.w;x++)world.tiles[idx(x,y)]=T.BUILD;world.tiles[idx(L.door.x,L.door.y)]=T.ROAD}}
  for(const z of S.biz){const b=world.buildings.find(b=>b.kind===z.type&&b.lot==null);if(b&&z.lot==null)b.bizId=z.id}
  paintTerrain();
  for(const n of S.npcs){n.target=n.target!=null?S.deposits[n.target]:null}
  for(const b of world.buildings)buildingSprite(b);startPlay();toast(`Welcome back, ${S.player.name}. Day ${day()}.`,'good')}
function upgradeSave(){for(const k of['ents','caveItems','bounties','graves'])S[k]=S[k]||[];for(const k of['caves','flags','quests','friends','storyNpcs','reqs'])S[k]=S[k]||{};
  // a save from before the expansion: new goods, demand rows, classes, shops and recipes
  for(const k in GOODS)if(S.market.stock[k]==null)S.market.stock[k]=isMarketGood(k)?GOODS[k].mstock??16:0;demandFill();
  for(const cls in CLASSES)if(CLASSES[cls].count>0&&!S.npcs.some(n=>n.cls===cls))for(let k=0;k<CLASSES[cls].count;k++)S.npcs.push(makeNpc(cls));
  const added=addExpansionShops();for(const z of added)jlog('econ',`The ${z.name} opens in town.`);
  for(const z of S.biz){if(z.owner==='player')continue;const dm=defaultMake(z.type);for(const k in dm)if(z.make[k]==null)z.make[k]=dm[k]}
  placeCaves();cmbInit(S.player);farmInit();if(!S.npcs.some(n=>n.rel))initRelations();ensureCharacters();for(const id in S.reqs)registerQuests(S.reqs[id],'request');
  ESEQ=S.ents.reduce((m,e)=>Math.max(m,e.id+1),ESEQ);PROJ.length=0;
  if(S.where){const c=world.caves[+S.where.slice(1).split(':')[0]];S.where=null;CAVE=null;if(c){S.player.x=c.sx+.5;S.player.y=c.sy+.7}}
  if(S.player.dead){S.player.dead=false;S.player.hp=S.player.maxHp*.5}S.v=5}
const nextFrame=()=>new Promise(r=>{let done=false;const f=()=>{if(!done){done=true;setTimeout(r,20)}};requestAnimationFrame(f);setTimeout(f,120)});

// ---------- flow ----------
async function startDemo(){showScreen('loading');await nextFrame();newState(ri(1,9e8)|0||7,{demo:true});
  // demo: put everyone to work at once
  S.time=9*60;S.lastHour=9;for(const n of S.npcs){n.x+=rnd(-6,6);n.y+=rnd(0,2);if(!walkable(n.x,n.y)){const w=nearestWalkable(n.x|0,n.y|0);n.x=w.x+.5;n.y=w.y+.5}}
  paintTerrain();cam.x=world.cx*TS;cam.y=world.cy*TS;cam.zoom=2.6;showScreen('title');$('#hud').classList.add('hidden');$('#btnContinue').disabled=!hasSave()}
async function startNew(o){showScreen('loading');await nextFrame();newState(o.seed,o);paintTerrain();startPlay();
  setTimeout(()=>toast('Walk with WASD. Press E near a door, a person or a deposit. Click the map to walk.','info'),900);
  setTimeout(()=>toast('Go to the Land Office (north side of Main Street) to stake a claim.','info'),5500)}
function startPlay(){$('#hPortrait').src=portrait('player');hideScreens();$('#hud').classList.remove('hidden');cam.x=S.player.x*TS;cam.y=S.player.y*TS;UI.zoom=3;cam.zoom=3;UI.journalDirty=true;AU.loop('music','music_game',.7)}
function quitToTitle(){saveGame(true);closeWin();closeDialog();closePanel();AU.loop('music','music_title',.8);startDemo()}

// ---------- input ----------
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;if(UI.mg){if(mgKey(e,true))e.preventDefault();return}keys[k]=true;
  if(UI.screen&&UI.screen!=='pause'){if(k==='escape'&&UI.screen!=='title'&&UI.screen!=='loading')showScreen(S.demo?'title':'pause');return}
  if(k==='escape'){if(UI.dialog)closeDialog();else if(UI.win)closeWin();else if(UI.panel)closePanel();else if(UI.screen==='pause')resume();else showScreen('pause');return}
  if(UI.screen)return;
  if(UI.dialog&&/^[1-9]$/.test(k)){const b=$$('#dlgOpts button')[+k-1];if(b)b.click();return}
  if(e.repeat)return;
  if(k==='e'||k===' '){e.preventDefault();act()}
  if(!UI.win&&!UI.dialog&&!S.demo){if(/^[1-5]$/.test(k))useQuick(+k-1);if(k==='r')reloadGun();if(k==='shift')dodge();if(k==='x')attackPress();if(k==='q')togglePanel('quests')}
  const pk={i:'pack',c:'char',l:'land',j:'journal',t:'town',k:'craft',g:'goals',b:'leaders',p:'props'}[k];if(pk&&!UI.win&&!UI.dialog)togglePanel(pk);
  if(k==='f'&&!UI.win&&!UI.dialog)eatQuick();
  if(k==='m'){UI.overlay=!UI.overlay;toast(UI.overlay?'Ownership map ON. Each colour is one owner.':'Ownership map OFF.','info')}
  if(k==='='||k==='+')UI.zoom=clamp((UI.zoom||3)+.5,2,5);if(k==='-')UI.zoom=clamp((UI.zoom||3)-.5,2,5)});
addEventListener('keyup',e=>{if(UI.mg){mgKey(e,false);return}const k=e.key.toLowerCase();keys[k]=false;if(k==='x'&&S&&!S.demo)attackRelease()});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
function resume(){hideScreens()}
cv.addEventListener('wheel',e=>{if(S&&!S.demo){UI.zoom=clamp((UI.zoom||3)-Math.sign(e.deltaY)*.5,2,5);e.preventDefault()}},{passive:false});
cv.addEventListener('mousemove',e=>{mouse.x=e.offsetX;mouse.y=e.offsetY;CB.mx=e.offsetX;CB.my=e.offsetY;if(!S||S.demo)return;const w=toWorld(e.offsetX,e.offsetY);UI.hoverNpc=npcAt(w.x,w.y);cv.style.cursor=UI.hoverNpc?'pointer':'default'});
cv.addEventListener('click',e=>{if(!S||S.demo||UI.blocking)return;if(CB.used){CB.used=false;return}clickWorld(e.offsetX,e.offsetY)});
cv.addEventListener('mousedown',e=>{if(!S||S.demo||UI.blocking)return;CB.mx=e.offsetX;CB.my=e.offsetY;if(e.button===2){dodge();return}if(e.button!==0)return;if(wantsAttack(e.offsetX,e.offsetY)){CB.used=true;attackPress()}});
addEventListener('mouseup',e=>{if(e.button===0&&CB.down&&S&&!S.demo)attackRelease()});
cv.addEventListener('contextmenu',e=>e.preventDefault());
function wantsAttack(sx,sy){const p=S.player;if(p.dead)return false;if(S.where||inCombatCache)return true;const w=toWorld(sx,sy);if(npcAt(w.x,w.y))return false;return!!p.equip.weapon&&dist(w.x,w.y,p.x,p.y-.5)<3.2}
addEventListener('pointerdown',()=>{if(!AU.ctx){AU.init();if(AU.ctx){AU.ctx.resume();AU.loop('music',S&&!S.demo?'music_game':'music_title',.8);AU.loop('amb','amb_day',.9)}}else if(AU.ctx.state!=='running')AU.ctx.resume()},{capture:true});
document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');const tip=$('#tooltip');if(!t){tip.classList.remove('show');return}tip.innerHTML=t.dataset.tip;tip.classList.add('show');tip.style.left=Math.min(innerWidth-tip.offsetWidth-10,e.clientX+14)+'px';tip.style.top=Math.min(innerHeight-tip.offsetHeight-10,e.clientY+16)+'px'});
document.addEventListener('mousemove',e=>{const tip=$('#tooltip');if(tip.classList.contains('show')){tip.style.left=Math.min(innerWidth-tip.offsetWidth-10,e.clientX+14)+'px';tip.style.top=Math.min(innerHeight-tip.offsetHeight-10,e.clientY+16)+'px'}});
document.addEventListener('click',e=>{if(e.target.closest('button'))sfx('ui_click')},true);

// ---------- plot map in the Land Office ----------
function drawPlotMap(){const c=$('#plotmap');if(!c)return;const g=c.getContext('2d'),sx=c.width/W,sy=c.height/H;g.imageSmoothingEnabled=false;g.drawImage(world.mini,0,0,c.width,c.height);
  for(const q of S.plots){const x=q.px*PS*sx,y=q.py*PS*sy,w=PS*sx,h=PS*sy;if(q.owner==='crown'){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x,y,w,h)}else{g.fillStyle=hexA(ownerColor(q.owner),q.owner==='player'?.55:.35);g.fillRect(x,y,w,h)}
    g.strokeStyle='rgba(0,0,0,.45)';g.strokeRect(x+.5,y+.5,w,h);for(const d of plotDeposits(q)){g.fillStyle=GOODS[d.type].col;g.fillRect(d.x*sx-2,d.y*sy-2,d.vein?6:4,d.vein?6:4)}}
  for(const pin of S.player.pins){const d=S.deposits[pin.id];if(d&&d.amount>=1){g.fillStyle='#ff3a20';g.beginPath();g.arc(d.x*sx,d.y*sy-4,4,0,7);g.fill()}}
  const s=UI.selPlot;g.strokeStyle='#fff';g.lineWidth=3;g.strokeRect(s.px*PS*sx+1.5,s.py*PS*sy+1.5,PS*sx-3,PS*sy-3);g.lineWidth=1;
  const p=S.player;g.fillStyle='#fff';g.beginPath();g.arc(p.x*sx,p.y*sy,4,0,7);g.fill();
  c.onclick=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;UI.selPlot=plotAt(x,y);sfx('ui_click');renderWin()}}

// ---------- creator ----------
const NEW={name:'',bg:'prospector',skin:SKINS[1],hair:HAIRS[1],female:false,seed:0};
function openCreator(){NEW.name=pick(NAMES)+' '+pick(SURNAMES);NEW.seed=Math.floor(Math.random()*9e8);showScreen('newgame');renderCreator()}
function renderCreator(){$('#ngName').value=NEW.name;$('#ngSeed').value=NEW.seed;
  $('#ngBgs').innerHTML=Object.entries(BACKGROUNDS).map(([k,b])=>`<button class="bgcard ${NEW.bg===k?'on':''}" onclick="NEW.bg='${k}';renderCreator()"><b>${b.n}</b><small>${b.d}</small><span>${money(b.cash)}${b.silver?' · '+b.silver+' silver':''}${b.gold?' · '+b.gold+' gold':''}${b.equip.length?' · '+b.equip.map(k=>GOODS[k].n).join(', '):''}</span></button>`).join('');
  $('#ngSkins').innerHTML=SKINS.map(s=>`<button class="sw ${NEW.skin===s?'on':''}" style="background:${s}" onclick="NEW.skin='${s}';renderCreator()"></button>`).join('');
  $('#ngHairs').innerHTML=HAIRS.map(s=>`<button class="sw ${NEW.hair===s?'on':''}" style="background:${s}" onclick="NEW.hair='${s}';renderCreator()"></button>`).join('')+`<button class="chip ${NEW.female?'on':''}" onclick="NEW.female=!NEW.female;renderCreator()">Long hair</button>`;
  const p=S.player;Object.assign(p,{skin:NEW.skin,hair:NEW.hair,female:NEW.female});$('#ngPortrait').src=portrait('player')}
function beginNew(){NEW.name=($('#ngName').value.trim()||NEW.name).slice(0,24);NEW.seed=parseInt($('#ngSeed').value)||NEW.seed;startNew({...NEW})}

// ---------- loop ----------
let last=performance.now(),hudT=0,achT=0,winT=0;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
  if(S&&world&&world.terrain&&UI.screen!=='loading'){
    if(UI.screen!=='pause'&&UI.screen!=='settings'&&UI.screen!=='howto'||S.demo)simulate(dt);
    fx.update(dt);if(!S.demo)findTarget();camUpdate(dt);render(dt);
    if(!S.demo){hudT-=dt;if(hudT<=0){hudT=.2;hudUpdate();drawMinimap($('#minimap'))}
      achT-=dt;if(achT<=0){achT=2;checkAch()}
      winT-=dt;if(winT<=0){winT=1;if(UI.win&&!document.querySelector('#win:hover'))renderWin();if(UI.panel&&UI.panel!=='journal'&&!document.querySelector('#panel:hover'))renderPanel()}}}
  requestAnimationFrame(frame)}
addEventListener('resize',resizeView);
window.addEventListener('load',()=>{resizeView();loadPainted();startDemo().then(()=>requestAnimationFrame(frame))});
