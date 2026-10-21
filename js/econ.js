'use strict';
// ===== economy: market, money (notes, silver, gold), bank, town council, factories, law =====
function resReq(){return S&&S.town&&S.town.resReq||.3} // reserve ratio the bank needs to keep notes at par

const day=()=>Math.floor(S.time/1440)+1;
const hour=()=>Math.floor(S.time/60)%24;
const minute=()=>Math.floor(S.time)%60;
const isNight=()=>{const h=hour();return h<6||h>=20};

// ---------- journal ----------
function jlog(cat,txt,opt={}){
  S.journal.unshift({d:day(),h:hour(),m:minute(),cat,txt});if(S.journal.length>400)S.journal.length=400;
  if(opt.toast)toast(txt,opt.toast);
  if(typeof UI!=='undefined')UI.journalDirty=true;
}

// ---------- market ----------
function target(k){return(GOODS[k].tgt||(GOODS[k].item?3:k==='bread'?50:RAW.includes(k)?60:14))*(S.events?eventTarget(k):1)}
function scarcity(k){return clamp(Math.sqrt(target(k)/(S.market.stock[k]+1)),.35,3)}
function realPrice(k){return GOODS[k].p*scarcity(k)}
function price(k){if(isFinished(k))return(S.rref&&S.rref[k])||Math.max(1,Math.round(refPrice(k)));return Math.max(1,Math.round(realPrice(k)*S.money.P))}
function tradeBonus(a){if(a!==S.player)return 0;return(a.equip.ring?.1:0)+Math.min(.1,(level('trade')-1)*.012)}
function sellPrice(a,k){return Math.max(1,Math.round(price(k)*.9*(1+tradeBonus(a))))}
function buyPrice(a,k){return Math.max(1,Math.round(price(k)*(1-tradeBonus(a))))}
function sellGoods(a,k,q=1){let n=0,got=0;if(!isMarketGood(k))return{n:0,got:0};q=Math.min(q,a.inv[k]||0);
  for(let i=0;i<q;i++){const p=sellPrice(a,k);if(S.market.cash<p||marketFull(k))break;S.market.cash-=p;a.cash+=p;got+=p;S.market.stock[k]++;a.inv[k]--;n++}
  if(a.inv[k]<=0)delete a.inv[k];S.today.trade+=got;return{n,got}}
function marketFull(k){return S.market.stock[k]>=target(k)*(RAW.includes(k)?3:5)}
function buyGoods(a,k,q=1){let n=0,cost=0;
  for(let i=0;i<q;i++){const p=buyPrice(a,k);if(S.market.stock[k]<1||a.cash<p)break;a.cash-=p;S.market.cash+=p;cost+=p;S.market.stock[k]--;a.inv[k]=(a.inv[k]||0)+1;n++}
  S.today.trade+=cost;return{n,cost}}
// light goods (cartridges, bandages, seeds, gems, quest items) weigh less than a load of ore
const load=a=>{let s=0;for(const k in a.inv)if(!GOODS[k].item)s+=a.inv[k]*(GOODS[k].wt??1);return Math.ceil(s-1e-9)};

// ---------- money ----------
function silverCoinReal(){return(GOODS.silver_ingot.p*.6+realPrice('silver_ingot')*.4)/SILVER_PER_INGOT}
function goldCoinReal(){return(GOODS.gold_ingot.p*.6+realPrice('gold_ingot')*.4)/GOLD_PER_INGOT}
function coinReal(c){return c==='gold'?goldCoinReal():silverCoinReal()}
function coinNotes(c){return coinReal(c)*S.money.P}
function reserves(){return S.bank.silver*silverCoinReal()+S.bank.gold*goldCoinReal()}
function moneySupply(){let m=S.player.cash+S.player.bankBal+S.market.cash+S.town.cash;
  for(const n of S.npcs)m+=n.cash;for(const z of S.biz)m+=z.cash;return m+S.folk.cash}
function updateMoney(){
  const M=moneySupply(),Rv=reserves(),b=Rv/Math.max(1,M);
  const rr=resReq(),tgt=b>=rr?1:Math.max(.12,b/rr);
  S.money.v+=(tgt-S.money.v)*.06;S.money.P=1/S.money.v;S.money.M=M;S.money.R=Rv;S.money.backing=b;
}
// bank coin to/from notes for any agent. dir 'buy' = agent gets coin.
function coinQuote(c,dir){const v=coinNotes(c);return Math.max(1,Math.round(dir==='buy'?v*1.03:v*.97))}
function exchange(a,c,dir,q=1){let n=0;for(let i=0;i<q;i++){const p=coinQuote(c,dir);
  if(dir==='buy'){if(!S.bank.convertible||S.bank[c]<(c==='silver'?10:2)||a.cash<p)break;a.cash-=p;S.bank.cash+=p;S.bank[c]--;a[c]=(a[c]||0)+1}
  else{if((a[c]||0)<1)break;a[c]--;S.bank[c]++;if(S.bank.cash>=p)S.bank.cash-=p;a.cash+=p}n++}return n}

// ---------- land ----------
function plotReal(p){let v=50;for(const d of S.deposits)if(plotAt(d.x,d.y)===p){v+=d.regen?160:Math.min(d.amount,4000)*GOODS[d.type].p*.035}
  return v}
function plotValue(p){return Math.round(plotReal(p)*S.money.P)}
function plotDeposits(p){return S.deposits.filter(d=>plotAt(d.x,d.y)===p&&d.amount>=1)}
function ownerName(o){if(o==='crown')return'Crown land';if(o==='town')return'Town';if(o==='player')return S.player.name+' (you)';const n=S.npcs.find(n=>n.id===o);return n?n.name:'?'}
function mayMine(who,p){return p.owner===who||(p.lease&&p.lease.who===who&&p.lease.until>S.time)}
function ownedPlots(who='player'){return S.plots.filter(p=>p.owner===who)}
function transferPlot(p,to,why){const from=p.owner;p.owner=to;p.lease=null;p.arrears=0;
  jlog('land',`Plot ${p.px},${p.py} passed from ${ownerName(from)} to ${ownerName(to)}${why?' ('+why+')':''}.`)}

// ---------- law ----------
function laws(){const t=S.town,P=S.money.P;return[
  ['Mining rights','Only the owner or a leaseholder of a plot may take ore from it.'],
  ['Claim jumping',`Each strike on land that is not yours has a ${Math.round(t.catch*100)}% chance of a ${money(t.fine*P)} fine. The fine goes to the owner.`],
  ['Land tax',`Owners pay ${(t.tax*100).toFixed(1)}% of plot value each day. After 3 unpaid days the Crown takes the plot.`],
  ['Land transfer','A plot changes owner only through the Land Office or a signed sale between two people.'],
  ['Leases','A lease gives mining rights for 3 days. The owner gets the fee.'],
  ['Bank loans','Plots are the security for a loan. If you do not repay by the due day, the bank takes plots to cover the debt.'],
  ['Currency',S.bank.convertible?'Bank notes can be changed for silver and gold at the Bank.':'SUSPENDED: the Bank does not change notes for coin at this time.'],
  ['Note printing',`Town Hall prints ${money(t.print*P)} in new notes each day.`],
  ['Sales tax',`${Math.round(t.salesTax*100)}% of every shop sale goes to the town.`],
  ['Import tariff',`Goods brought into the valley cost ${Math.round(t.tariff*100)}% more.`],
  ['Bread price',t.breadCap?`No shop may charge more than ${money(t.breadCap*P)} for a loaf.`:'Shops set their own bread price.'],
  ['Mayor',`${t.mayor==='player'?S.player.name+' (you)':(S.npcs.find(n=>n.id===t.mayor)||{name:'?'}).name}. Next election: day ${t.nextElection}, 12:00.`],
]}
function trespass(a,p){
  if(Math.random()>=S.town.catch)return false;
  const f=Math.round(S.town.fine*S.money.P),paid=Math.min(a.cash,f);a.cash-=paid;
  const owner=S.npcs.find(n=>n.id===p.owner);
  if(owner)owner.cash+=paid;else if(p.owner==='player'){S.player.cash+=paid;jlog('law',`${a.name} was fined ${money(paid)} for mining on your plot. You get the fine.`,{toast:'good'})}else S.town.cash+=paid;
  S.stats.fines++;
  const sh=S.npcs.find(n=>n.cls==='sheriff');if(sh&&!sh.sleeping){sh.callout={x:a.x,y:a.y,t:S.time};}
  if(a===S.player){a.fineDebt+=f-paid;a.stats.fined++;a.rep=Math.max(-100,a.rep-6);
    jlog('law',`The sheriff fined you ${money(f)} for mining on ${ownerName(p.owner)}.${f>paid?' Unpaid: '+money(f-paid)+'.':''}`,{toast:'bad'});
    sfx('whistle');fx.text(a.x,a.y-1.2,'-'+money(paid),'#ff6b5a');}
  else{say(a,'...!');jlog('law',`${a.name} was fined ${money(paid)} for claim jumping on ${ownerName(p.owner)}.`)}
  return true}

function bOf(kind){return world.buildings.find(b=>b.kind===kind)}

// ---------- hourly / daily ----------
function hourly(){
  const P=S.money.P,m=S.market;
  // exports bring specie into the valley, imports send it out
  for(const k in GOODS){const t=target(k),st=m.stock[k];
    if(!isMarketGood(k))continue;
    if(st>t*1.25){const cap=6*(projectDone('railway')?3:1)*(eventTarget(k)>1?2:1),n=Math.min(cap,Math.ceil((st-t)*.05)),real=n*realPrice(k)*.65*(projectDone('railway')?1.15:1);m.stock[k]-=n;
      S.bank.silverAcc+=real*.42/silverCoinReal();S.bank.goldAcc+=real*.08/goldCoinReal();m.cash+=real*P;S.today.exports+=real}
    else if(st<t*.2&&RAW.includes(k)){const mult=(S.bank.convertible?1.4:2.1)*(1+S.town.tariff),cost=Math.round(2*GOODS[k].p*mult*P);
      if(m.cash>cost*3){m.cash-=cost;m.stock[k]+=2;const real=cost/P;
        const s=Math.min(S.bank.silver,Math.floor(real/silverCoinReal()));S.bank.silver-=s;S.today.imports+=real}}}
  const sw=Math.floor(S.bank.silverAcc),gw=Math.floor(S.bank.goldAcc);S.bank.silver+=sw;S.bank.gold+=gw;S.bank.silverAcc-=sw;S.bank.goldAcc-=gw;
  // the mint buys ingots and strikes coin
  for(const[k,c,per]of[['silver_ingot','silver',SILVER_PER_INGOT],['gold_ingot','gold',GOLD_PER_INGOT]])
    if(m.stock[k]>2&&realPrice(k)<=GOODS[k].p*1.15){const p=price(k);m.stock[k]--;m.cash+=p;S.bank[c]+=per;S.bank.minted+=per}
  // bank credit keeps the market liquid. These notes have no metal behind them.
  if(m.cash<400*P&&(S.bank.marketDebt||0)<6000*P){const loan=Math.round(1500*P);m.cash+=loan;S.bank.marketDebt=(S.bank.marketDebt||0)+loan;S.bank.credit=(S.bank.credit||0)+loan;
    jlog('bank',`The Bank lends ${money(loan)} in new notes to the Market Hall. The Market owes ${money(S.bank.marketDebt)}.`)}
  else if(m.cash>4500*P&&S.bank.marketDebt>0){const r=Math.min(S.bank.marketDebt,Math.round(m.cash-3000*P));m.cash-=r;S.bank.marketDebt-=r;jlog('bank',`The Market Hall repays ${money(r)} to the Bank. Those notes are cancelled.`)}
  updateMoney();
  // bank run: low confidence makes people swap notes for silver
  if(S.money.v<.8&&S.bank.convertible){for(const n of S.npcs)if(n.cash>120&&Math.random()<.08){n.wantCoin=true}}
  if(S.bank.convertible&&!S.bank.forcedOn&&(S.money.backing<resReq()*.72||S.bank.silver<15&&S.bank.gold<8)){S.bank.convertible=false;S.town.suspendedDay=day();
    jlog('bank','The Bank stops changing notes for coin. The vault is almost empty.',{toast:'bad'});crier('The Bank has stopped silver payments!');}
  else if(!S.bank.convertible&&!S.bank.forced&&S.bank.silver+S.bank.gold*5>150&&S.money.backing>resReq()*1.05){S.bank.convertible=true;
    jlog('bank','The Bank changes notes for coin again.',{toast:'good'});crier('The Bank pays silver again!');}
  // history
  const hp=S.hist;for(const k in GOODS){(hp.price[k]=hp.price[k]||[]).push(price(k));if(hp.price[k].length>96)hp.price[k].shift()}
  folkHour();eventsHourly();
  const cpi=['bread','iron_ore','iron_ingot','pickaxe','coal'].reduce((s,k)=>s+price(k),0)/['bread','iron_ore','iron_ingot','pickaxe','coal'].reduce((s,k)=>s+GOODS[k].p,0);
  for(const[k,v]of[['v',S.money.v],['M',S.money.M],['R',S.money.R*S.money.P],['cpi',cpi],['silver',S.bank.silver]]){(hp[k]=hp[k]||[]).push(v);if(hp[k].length>240)hp[k].shift()}
}
function daily(){
  const P=S.money.P,t=S.town;
  bizDaily();demandDaily();npcWishes();
  // land tax
  let taxed=0;
  for(const p of S.plots){if(p.owner==='crown'||p.owner==='town')continue;const tax=Math.max(1,Math.round(plotValue(p)*t.tax));
    let a=p.owner==='player'?S.player:S.npcs.find(n=>n.id===p.owner);if(!a){p.owner='crown';continue}
    if(a.cash>=tax){a.cash-=tax;t.cash+=tax;taxed+=tax;p.arrears=0}
    else if(a===S.player&&a.bankBal>=tax){a.bankBal-=tax;S.bank.cash=Math.max(0,S.bank.cash-tax);t.cash+=tax;taxed+=tax;p.arrears=0}
    else{p.arrears++;if(a===S.player)jlog('land',`You could not pay ${money(tax)} land tax on plot ${p.px},${p.py}. Unpaid days: ${p.arrears} of 3.`,{toast:'bad'});
      if(p.arrears>=3){transferPlot(p,'crown','unpaid tax');if(a===S.player)toast(`The Crown took plot ${p.px},${p.py} for unpaid tax.`,'bad')}}}
  if(S.player&&ownedPlots().length)jlog('you',`Land tax paid today: ${money(ownedPlots().reduce((s,p)=>s+Math.max(1,Math.round(plotValue(p)*t.tax)),0))}.`);
  // town prints fiat notes and spends them
  const printed=Math.round(t.print*P);t.cash+=printed;t.printedTotal+=printed;
  for(const cls of['sheriff','clerk','banker']){const n=S.npcs.find(n=>n.cls===cls);if(n&&t.cash>15*P){const s=Math.round(15*P);t.cash-=s;n.cash+=s}}
  if(t.cash>1200*P){const budget=Math.round((t.cash-1200*P)*.3);t.cash-=budget;const crew=[...S.npcs].sort(()=>Math.random()-.5).slice(0,6);for(const n of crew)n.cash+=budget*.7/crew.length;
    S.folk.cash+=budget*.3;
    jlog('law',`Council spends ${money(budget)} on road work and bread for poor families.`)}
  const poor=S.npcs.filter(n=>n.cash<20*P).slice(0,4);for(const n of poor){const s=Math.round(10*P);if(t.cash>s){t.cash-=s;n.cash+=s}}
  // bank interest
  const pl=S.player;if(pl.bankBal>0){const i=Math.round(pl.bankBal*S.bank.depRate);pl.bankBal+=i;if(i)jlog('bank',`The Bank paid ${money(i)} interest on your account.`)}
  for(const L of pl.loans){L.owed=Math.round(L.owed*(1+S.bank.loanRate))}
  for(const L of[...pl.loans])if(day()>L.due){
    let need=L.owed;const mine=ownedPlots().sort((a,b)=>plotValue(b)-plotValue(a));
    for(const p of mine){if(need<=0)break;need-=plotValue(p)*.8;transferPlot(p,'crown','bank seizure')}
    pl.loans.splice(pl.loans.indexOf(L),1);pl.rep=Math.max(-100,pl.rep-25);
    jlog('bank',`You did not repay your loan. The Bank took your plots to cover ${money(L.owed)}.`,{toast:'bad'});}
  // lease expiry
  for(const p of S.plots)if(p.lease&&p.lease.until<=S.time)p.lease=null;
  townDaily();eventsDaily();
  if(day()>1&&(day()-1)%7===0)weekEnd();
  // weather
  const r=Math.random();S.weather=r<.62?'clear':r<.82?'cloudy':r<.95?'rain':'storm';
  if(S.weather==='rain'||S.weather==='storm')jlog('people','Rain today. The roads are mud.');
  // records
  const nw=netWorth();S.hist.net.push(nw);if(S.hist.net.length>120)S.hist.net.shift();
  S.hist.gdp.push(S.today.gdp);if(S.hist.gdp.length>60)S.hist.gdp.shift();
  S.today={gdp:0,trade:0,exports:0,imports:0};
  sfx('rooster');
  jlog('you',`Day ${day()} begins. Net worth ${money(nw)}.`);
  saveGame(true);
}
function council(){const t=S.town,P=S.money.P,v=S.money.v;const opts=[];
  if(t.cash<300*P)opts.push(()=>{const amt=Math.round(400*P);t.cash+=amt;t.printedTotal+=amt;t.print+=30;return`Council prints ${money(amt)} in new notes to pay its bills. Daily printing rises to ${money(t.print*P)}.`});
  if(v<.85&&t.print>0)opts.push(()=>{t.print=Math.max(0,t.print-40);return`Council cuts note printing to ${money(t.print*P)} a day to slow inflation.`});
  if(t.cash<600*P&&t.tax<.03)opts.push(()=>{t.tax=+(t.tax+.005).toFixed(3);return`Council raises land tax to ${(t.tax*100).toFixed(1)}% a day.`});
  if(t.cash>3500*P&&t.tax>.005)opts.push(()=>{t.tax=+(t.tax-.005).toFixed(3);return`Council lowers land tax to ${(t.tax*100).toFixed(1)}% a day.`});
  if(S.stats.fines>4){opts.push(()=>{t.fine+=20;S.stats.fines=0;return`Too much claim jumping. Council raises the fine to ${money(t.fine*P)}.`})}
  if(t.cash>1500*P)opts.push(()=>{t.works=day()+3;return'Council pays for new roads. Town Hall pays 50% more for road work for 3 days.'});
  if(v>.97&&t.print<60&&t.cash<1200*P)opts.push(()=>{t.print+=25;return`Prices are steady. Council raises daily printing to ${money(t.print*P)} for public works.`});
  if(!opts.length||Math.random()>.45)return;
  const txt=pick(opts)();jlog('law','Council: '+txt,{toast:'law'});crier(txt.split('.')[0]+'!');
}
function crier(txt){const n=S.npcs.find(n=>n.cls==='sheriff'&&!n.sleeping)||S.npcs.find(n=>!n.sleeping);if(n)say(n,txt,6)}

// ---------- player stats ----------
function level(sk){return Math.floor(Math.sqrt((S.player.xp[sk]||0)/25))+1}
function addXp(sk,n){const before=level(sk);S.player.xp[sk]=(S.player.xp[sk]||0)+n;const after=level(sk);
  if(after>before){toast(`${sk[0].toUpperCase()+sk.slice(1)} skill is now level ${after}.`,'level');sfx('levelup');fx.ring(S.player.x,S.player.y,'#ffd86b');jlog('you',`Your ${sk} skill rose to level ${after}.`)}}
function invValue(a){let v=0;for(const k in a.inv)v+=a.inv[k]*price(k)*.9;for(const s in a.equip)v+=price(a.equip[s].k)*.5;return v}
function netWorth(){const p=S.player;return Math.round(bizOwned().reduce((s,z)=>s+bizValue(z),0)+p.cash+p.bankBal-p.loans.reduce((s,l)=>s+l.owed,0)-p.fineDebt+p.silver*coinNotes('silver')+p.gold*coinNotes('gold')+invValue(p)+ownedPlots().reduce((s,q)=>s+plotValue(q),0))}
function rankOf(nw){let r=RANKS[0][1];for(const[v,n]of RANKS)if(nw>=v*S.money.P)r=n;return r}
function creditLimit(){const p=S.player;return Math.max(0,Math.round(100*S.money.P+ownedPlots().reduce((s,q)=>s+plotValue(q)*.5,0)-p.loans.reduce((s,l)=>s+l.owed,0)))}
