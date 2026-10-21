'use strict';
// ===== NPCs: creation, daily routine, work, shopping, speech, rumours =====
let npcSeq=0;
function makeNpc(cls){const used=new Set(S.npcs?S.npcs.map(n=>n.name.split(' ')[0]):[]);let nm=pick(NAMES),tries=0;while(used.has(nm)&&tries++<40)nm=pick(NAMES);
  const door=bOf('inn').door,id='n'+(S.npcSeq=(S.npcSeq||0)+1);
  return{id,name:nm+' '+pick(SURNAMES),cls,x:door.x+.5+rnd(-2,2),y:door.y+.5+rnd(0,1),
    cash:ri(50,130),silver:ri(0,6),gold:0,inv:{},cap:24,hunger:ri(60,100),pick:cls==='miner'&&chance(.45)?1:0,axe:cls==='woodcutter'?1:0,
    dir:1,walk:0,moving:false,swing:0,state:'idle',timer:0,path:[],pi:0,goal:null,bubble:null,
    greetCD:rnd(5,20),chatCD:rnd(5,40),sleeping:false,wakeH:rnd(5.4,7),bedH:cls==='sheriff'?23:rnd(20.3,22.3),
    rogue:cls==='miner'&&chance(.2),opinion:ri(-5,15),rumourDay:0,skin:pick(SKINS),hair:pick(HAIRS),speed:rnd(2.1,2.7),
    female:chance(.45),beard:chance(.3),wantCoin:false,hp:cls==='sheriff'?140:60,max:cls==='sheriff'?140:60,rel:{},callout:null,shifts:0,wk:{ore:0,made:0,sold:0,orders:0}}}
function makeNpcs(){S.npcs=[];S.npcSeq=0;for(const cls in CLASSES)for(let k=0;k<CLASSES[cls].count;k++)S.npcs.push(makeNpc(cls));
  const miners=S.npcs.filter(n=>n.cls==='miner');
  for(const m of miners.slice(0,6)){const opts=S.deposits.filter(d=>d.reach&&d.type!=='oil'&&!d.vein&&plotAt(d.x,d.y).owner==='crown');if(opts.length){const d=pick(opts);plotAt(d.x,d.y).owner=m.id}}
  const may=S.npcs.find(n=>n.cls==='mayor');S.town.mayor=may?may.id:null;return S.npcs}

// ---------- movement ----------
function timeFactor(){return S.settings.speed/8}
function go(n,tx,ty,dt){tx|=0;ty|=0;
  if(!n.goal||n.goal.x!==tx||n.goal.y!==ty){n.goal={x:tx,y:ty};n.path=findPath(n.x,n.y,tx,ty)||[];n.pi=0;if(!n.path.length&&dist(n.x,n.y,tx+.5,ty+.5)>1.5)n.stuck=(n.stuck||0)+1}
  return follow(n,dt)}
function follow(n,dt){const p=n.path;if(!p||n.pi>=p.length){n.moving=false;return true}
  const node=p[n.pi],dx=node.x-n.x,dy=node.y-n.y,d=Math.hypot(dx,dy);
  const sp=n.speed*dt*timeFactor()/Math.sqrt(COST[tileAt(n.x,n.y)]||1)*(S.weather==='storm'?.8:1);
  if(d<=sp){n.x=node.x;n.y=node.y;n.pi++}else{n.x+=dx/d*sp;n.y+=dy/d*sp}
  if(Math.abs(dx)>.05)n.dir=dx>0?1:-1;n.moving=true;n.walk+=sp*2.6;return false}
function stopAt(n){n.goal=null;n.path=[];n.pi=0;n.moving=false}

// ---------- speech ----------
function say(n,text,dur=4.2){n.bubble={text,t:0,dur:Math.max(dur,1.5+text.length*.06)}}
function nearPlayer(n,r){return!S.where&&dist(n.x,n.y,S.player.x,S.player.y)<r}

// ---------- AI ----------
function npcTick(n,dt,mins){
  if(n.bubble){n.bubble.t+=dt;if(n.bubble.t>n.bubble.dur)n.bubble=null}
  if(n.swing>0)n.swing=Math.max(0,n.swing-dt*3.2);
  if(n.cls==='peddler'){peddleTick(n,dt,mins);return}
  const h=S.time/60%24;
  const asleepHours=n.bedH<n.wakeH?(h>=n.bedH&&h<n.wakeH):(h>=n.bedH||h<n.wakeH);
  if(n.sleeping){if(!asleepHours){n.sleeping=false;const d=bOf('inn').door;n.x=d.x+.5;n.y=d.y+.6;n.state='idle';n.hunger=Math.max(n.hunger,70);
    if(Math.random()<.3)say(n,line('morning'))}return}
  if(n.hp!=null&&npcCombat(n,dt,mins))return;
  n.hunger-=mins*.035;
  const busy=['toBed','mine','chop','farm'];
  if(asleepHours&&!busy.includes(n.state)){if(load(n)>0&&n.state!=='sell')n.state='sell';else n.state='toBed'}
  if(asleepHours&&busy.includes(n.state)&&n.state!=='toBed')n.state=load(n)?'sell':'toBed';
  if(n.hunger<35&&!['eat','sell','toBed'].includes(n.state)){n.state='eat';n.goal=null;n.shopAt=null}
  if(n.wantCoin&&n.state==='idle')n.state='bank';
  if(n.callout&&n.cls==='sheriff')n.state='callout';

  n.chatCD-=dt;n.greetCD-=dt;
  if(n.greetCD<=0&&nearPlayer(n,2.6)&&!n.bubble){n.greetCD=rnd(40,80);
    const o=n.opinion+S.player.rep;say(n,line(o>15?'greetGood':o<-15?'greetBad':'greetMid',{n:S.player.name.split(' ')[0]}))}
  else if(n.chatCD<=0){n.chatCD=rnd(25,70);if(nearPlayer(n,16)&&!n.bubble&&Math.random()<.55)say(n,chatter(n))}

  const mk=bOf('market').door;
  switch(n.state){
  case'toBed':{const d=bOf('inn').door;if(go(n,d.x,d.y,dt)){n.sleeping=true;n.state='sleep';stopAt(n);nightSpend(n)}break}
  case'eat':{if(!n.shopAt){const z=cheapestSeller('bread',n);n.shopAt=z?z.id:'inn'}
    const z=n.shopAt==='inn'?null:bizById(n.shopAt),b=z?bldOfBiz(z):bOf('inn');if(!b){n.shopAt='inn';break}
    if(go(n,b.door.x,b.door.y,dt)){n.shopAt=null;
      if(z&&(z.inv.bread||0)>0){const before=n.cash;retailBuy(n,z,'bread',n.cash>60*S.money.P?2:1);if(n.inv.bread){n.inv.bread--;if(!n.inv.bread)delete n.inv.bread;n.hunger=100;if(n.cash<before&&Math.random()<.15)say(n,line('shopper'))}}
      else if(z){S.dem.bread.want++;say(n,line('shortage',{g:'bread'}));n.hunger+=15}
      else{const c=Math.round(6*S.money.P);if(n.cash>=c){n.cash-=c;S.town.cash+=c;n.hunger=100}else{n.hunger+=25;say(n,line('hungry'))}}
      n.state='idle'}break}
  case'shop':{const k=n.shopFor;if(!n.shopAt){const z=cheapestSeller(k,n);if(!z){S.dem[k]&&S.dem[k].want++;n.state='idle';if(Math.random()<.4)say(n,line('shortage',{g:GOODS[k].n.toLowerCase()}));break}n.shopAt=z.id}
    const z=bizById(n.shopAt),b=bldOfBiz(z);if(!z||!b){n.shopAt=null;n.state='idle';break}
    if(go(n,b.door.x,b.door.y,dt)){n.shopAt=null;if((z.inv[k]||0)>0&&n.cash>=shopPrice(z,k)){retailBuy(n,z,k);n.inv[k]--;if(!n.inv[k])delete n.inv[k];
      if(k==='pickaxe'||k==='drill'){n.pick=k==='drill'?2:1;n.pickDur=240}if(k==='axe'){n.axe=1;n.axeDur=200}
      say(n,'A new '+GOODS[k].n.toLowerCase()+'!');if(GOODS[k].item&&Math.random()<.6)jlog('people',`${n.name} bought ${an(GOODS[k].n.toLowerCase())} at the ${z.name}.`)}
      else if(S.dem[k])S.dem[k].want++;n.state='idle'}break}
  case'bank':{const d=bOf('bank').door;if(go(n,d.x,d.y,dt)){const q=Math.floor(n.cash*.35/coinQuote('silver','buy'));const got=exchange(n,'silver','buy',q);
    if(got)jlog('bank',`${n.name} changed notes for ${got} silver coins.`);else say(n,line('run'));if(got&&Math.random()<.5)say(n,line('inflation'));
    n.wantCoin=false;n.state='idle'}break}
  case'sell':if(go(n,mk.x,mk.y,dt)){let got=0;for(const k in n.inv)if(!isFinished(k)){got+=sellGoods(n,k,n.inv[k]).got;if(n.inv[k]&&marketFull(k)){delete n.inv[k];if(Math.random()<.5)say(n,'Nobody wants '+GOODS[k].n.toLowerCase()+' today.')}}
    if(load(n)>=n.cap*.5)n.sellFail=S.time;
    if(got){weekAdd(n.id,'sold',got);if(Math.random()<.45)say(n,got>60*S.money.P?line('sellGood',{p:money(got)}):line('sellBad'))}
    n.state='idle';if(n.cash>350*S.money.P&&Math.random()<.18){n.state='shop';n.shopFor=pick(['boots','lantern','backpack','ring','cart']);n.shopAt=null}}break;
  case'idle':decide(n);break;
  case'mine':mineTick(n,dt,mins);break;
  case'chop':chopTick(n,dt,mins);break;
  case'farm':farmTick(n,dt,mins);break;
  case'labour':labourTick(n,dt,mins);break;
  case'patrol':{if(!n.dest||go(n,n.dest.x,n.dest.y,dt)){n.timer+=mins;if(n.timer>30||!n.dest){n.timer=0;const c=world;
    n.dest={x:c.cx+ri(-18,18),y:c.cy+pick([0,7,ri(-2,12)])};if(Math.random()<.3){const d=pick(S.deposits.filter(d=>d.reach&&d.amount>0));if(d)n.dest={x:d.sx,y:d.sy}}}}break}
  case'callout':{const c=n.callout;if(!c||S.time-c.t>240){n.callout=null;n.state='idle';break}
    if(go(n,c.x,c.y,dt)){say(n,line('fined',{f:money(S.town.fine*S.money.P)}));n.callout=null;n.state='idle'}break}
  case'post':{const b=postOf(n);n.timer+=mins;if(!b){n.state='wander';break}
    if(n.timer>40||!n.dest){n.timer=0;n.dest={x:b.door.x+ri(-1,1),y:b.door.y+ri(0,1)}}go(n,n.dest.x,n.dest.y,dt);if(h>=18)n.state='wander';break}
  case'wander':{if(!n.dest||go(n,n.dest.x,n.dest.y,dt)){n.timer+=mins;if(n.timer>45||!n.dest){n.timer=0;const c=world,inn=bOf('inn').door;
    n.dest=eventActive('festival')||Math.random()<.5?{x:c.cx+ri(-4,2),y:c.cy+ri(1,6)}:{x:inn.x+ri(-3,3),y:inn.y+ri(0,1)};if(eventActive('festival')&&Math.random()<.3)say(n,line('festival'))}}
    if(h>=7&&h<18&&!postOf(n))n.state='idle';if(postOf(n)&&h>=8&&h<18)n.state='post';break}
  }
}
function postOf(n){if(n.mgrOf){const z=bizById(n.mgrOf);if(z&&z.manager&&z.manager.id===n.id)return bldOfBiz(z);n.mgrOf=null}if(n.story)return bOf((CHARS[n.story]&&CHARS[n.story].home)||'inn');if(n.cls==='clerk')return bOf('office');if(n.cls==='banker')return bOf('bank');if(n.cls==='mayor'&&S.town.mayor===n.id)return bOf('townhall');
  if(n.cls==='merchant'){const z=S.biz.find(z=>z.owner===n.id&&!BIZ_TYPES[z.type].station);return z?bldOfBiz(z):null}return null}
function peddleTick(n,dt,mins){n.chatCD-=dt;if(n.chatCD<=0){n.chatCD=rnd(15,30);if(nearPlayer(n,14))say(n,pick(['Rare goods! Fair prices!','Steel drills from the East!','Only today in your valley!']))}
  n.dir=Math.sin(S.time/20)>0?1:-1}
function nightSpend(n){const P=S.money.P,lodge=Math.min(n.cash,Math.round(2*P));n.cash-=lodge;S.town.cash+=lodge;
  const extra=Math.max(0,n.cash-80*P)*.2;if(extra<1)return;n.cash-=extra;S.folk.cash+=extra*.75;
  if(S.bank.convertible){const s=Math.min(S.bank.silver-30,Math.floor(extra*.25/P/silverCoinReal()));if(s>0)S.bank.silver-=s;S.today.imports+=extra*.25/P}else S.town.cash+=extra*.25}
function chatter(n){const v=S.money.v;
  if(v<.85&&Math.random()<.4)return line('inflation');
  if((S.weather==='rain'||S.weather==='storm')&&Math.random()<.3)return line('rain');
  if(eventActive('festival')&&Math.random()<.5)return line('festival');
  const sh=townShortList()[0];if(sh&&sh.ema>.3&&Math.random()<.3)return line('shortage',{g:GOODS[sh.k].n.toLowerCase()});
  if(day()>=S.town.nextElection-2&&Math.random()<.25){const c=candidates(),f=c[Math.floor(Math.random()*c.length)];return line('vote',{c:f.name.split(' ')[0]})}
  if(n.cash>500*S.money.P&&Math.random()<.2)return line('rich');
  if(n.cash<15*S.money.P&&Math.random()<.4)return line('poor');
  switch(n.state){case'mine':return n.target&&n.target.vein?line('mineVein'):line(n.cls==='hauler'?'haul':'mine');
    case'chop':return line('chop');case'farm':return line('farm');
    case'labour':return line(n.cls==='smith'?'smith':n.cls==='baker'?'baker':'labour');
    case'patrol':return line('sheriff',{f:money(S.town.fine*S.money.P)});
    case'post':return line(n.cls==='mayor'?'mayor':n.cls==='merchant'?'merchant':'labour');
    case'toBed':return line('night');}
  return line(hour()<11?'morning':'labour')}

function decide(n){const h=S.time/60%24,P=S.money.P,day_=h>=6&&h<20;
  const full=load(n)>=n.cap*.8;if(full&&!(n.sellFail>S.time-360)){n.state='sell';return}
  if(staffDecide(n,h))return;
  if(n.cls==='sheriff'){n.state='patrol';n.dest=null;return}
  if(postOf(n)||['clerk','banker','merchant'].includes(n.cls)||(n.cls==='mayor'&&S.town.mayor===n.id)){n.state=h>=8&&h<18&&postOf(n)?'post':'wander';n.dest=null;if(n.cls!=='merchant'||postOf(n))return}
  const wanted=d=>S.market.stock[d.type]<target(d.type)*4&&!(d.closed>S.time);
  if(n.cls==='miner'){
    if(!n.pick&&n.cash>price('pickaxe')+40){n.state='shop';n.shopFor='pickaxe';n.shopAt=null;return}
    if(n.pick===1&&n.cash>price('drill')+150&&sellersOf('drill').length){n.state='shop';n.shopFor='drill';n.shopAt=null;return}
    let mine=S.deposits.filter(d=>d.reach&&d.amount>=1&&d.type!=='oil'&&wanted(d)&&mayMine(n.id,plotAt(d.x,d.y)));
    if(!mine.length){
      const free=S.deposits.filter(d=>d.reach&&d.amount>=1&&d.type!=='oil'&&wanted(d)&&plotAt(d.x,d.y).owner==='crown')
        .filter(d=>plotValue(plotAt(d.x,d.y))<=n.cash-25*P).sort((a,b)=>(dist(a.x,a.y,n.x,n.y)-price(a.type)*2)-(dist(b.x,b.y,n.x,n.y)-price(b.type)*2));
      if(free.length){const p=plotAt(free[0].x,free[0].y),v=plotValue(p);n.cash-=v;S.town.cash+=v;transferPlot(p,n.id,'staked for '+money(v));say(n,line('claim'));mine=[free[0]]}
      else{const own=S.plots.filter(p=>p.owner!=='crown'&&p.owner!=='town'&&p.owner!==n.id&&!(p.lease&&p.lease.until>S.time)&&(p.owner!=='player'||S.player.leaseOut));
        const lp=own.find(p=>plotDeposits(p).some(d=>d.reach&&d.type!=='oil'&&wanted(d))&&plotValue(p)*.25<n.cash-10*P);
        if(lp){const v=Math.round(plotValue(lp)*.25);n.cash-=v;
          if(lp.owner==='player'){S.player.cash+=v;jlog('land',`${n.name} leased your plot ${lp.px},${lp.py} for 3 days. You received ${money(v)}.`,{toast:'good'});sfx('coins')}
          else{const o=S.npcs.find(x=>x.id===lp.owner);if(o)o.cash+=v;jlog('land',`${n.name} leased plot ${lp.px},${lp.py} from ${o?o.name:'?'} for ${money(v)}.`)}
          lp.lease={who:n.id,until:S.time+3*1440};mine=plotDeposits(lp).filter(d=>d.type!=='oil'&&wanted(d))}
        else if(n.rogue){mine=S.deposits.filter(d=>d.reach&&d.amount>=1&&d.type!=='oil'&&!d.vein&&wanted(d))}}}
    if(mine.length&&day_&&!full){n.target=mine.sort((a,b)=>(dist(a.x,a.y,n.x,n.y)-price(a.type)*1.5)-(dist(b.x,b.y,n.x,n.y)-price(b.type)*1.5))[0];n.state='mine';n.goal=null;return}}
  else if(n.cls==='hauler'){const oil=S.deposits.filter(d=>d.type==='oil'&&d.reach&&d.amount>=4&&!marketFull('oil')&&(plotAt(d.x,d.y).owner==='crown'||mayMine(n.id,plotAt(d.x,d.y))));
    if(oil.length&&day_&&!full){n.target=pick(oil);n.state='mine';n.goal=null;return}}
  else if(n.cls==='woodcutter'){if(!n.axe&&n.cash>price('axe')+20){n.state='shop';n.shopFor='axe';n.shopAt=null;return}
    if(n.axe&&day_&&!full&&S.market.stock.wood<target('wood')*3){const t=findTree(n);if(t>=0){n.tree=t;n.state='chop';n.goal=null;n.timer=0;return}}}
  else if(n.cls==='farmer'){if(day_&&!full&&S.market.stock.wheat<target('wheat')*3){const f=findField(n);if(f>=0){n.field=f;n.state='farm';n.goal=null;n.timer=0;return}}}
  if(h>=7&&h<18){const z=pickJob(n);if(z){n.state='labour';n.work=z.id;n.goal=null;n.spot=null;return}}
  n.state='wander';n.dest=null;
}
function mineTick(n,dt,mins){const d=n.target;if(!d||d.amount<1||d.closed>S.time){n.state=load(n)?'sell':'idle';return}
  if(!go(n,d.sx,d.sy,dt))return;
  n.dir=d.x+.5>n.x?1:-1;n.timer+=mins;
  const every=n.cls==='hauler'?16:18;
  if(n.timer>=every){n.timer=0;const p=plotAt(d.x,d.y);n.swing=1;
    const legal=n.cls==='hauler'&&p.owner==='crown'||mayMine(n.id,p);
    if(legal||!trespass(n,p)){const q=Math.min(n.cls==='hauler'?2:1+n.pick,Math.floor(d.amount));if(n.pick&&n.cls==='miner'&&(n.pickDur=(n.pickDur??240)-1)<=0){n.pick=0;n.pickDur=240;say(n,'My pick broke!')}
      d.amount-=q;n.inv[d.type]=(n.inv[d.type]||0)+q;S.today.gdp+=GOODS[d.type].p*q;weekAdd(n.id,'ore',q);
      if(!legal&&p.owner==='player'&&nearPlayer(n,12))say(n,'Nobody is watching...');
      if(onScreen(n.x,n.y)){fx.debris(d.x+.5,d.y+.6,GOODS[d.type].col,4);sfxAt(n.cls==='hauler'?'oil':'pick',n.x,n.y)}
      if(d.amount<1&&!d.regen){jlog('econ',`The ${GOODS[d.type].n.toLowerCase()} deposit on plot ${p.px},${p.py} is empty.`);fx.burst('dust',{x:d.x,y:d.y,w:1,h:1});sfxAt('rock_break',d.x,d.y)}}
    else{n.state='sell'}
    if(load(n)>=n.cap)n.state='sell'}}
// trees and fields
function treeFree(i){return!(S.cut[i]>S.time)}
function treeLegal(i,who){const t=world.trees[i],q=plotAt(t.x/TS,t.y/TS);return q.owner==='crown'||q.owner==='town'||mayMine(who,q)}
function findTree(n){let best=-1,bd=1e9;for(let i=0;i<world.trees.length;i++){const t=world.trees[i];
  if(t.k!=='pine'&&t.k!=='oak'||!treeFree(i))continue;const d=dist(t.x/TS,t.y/TS,n.x,n.y)+Math.random()*4;if(d<bd&&walkable(t.x/TS,t.y/TS+.6)&&treeLegal(i,n.id)){bd=d;best=i}}return best}
function chopTick(n,dt,mins){const i=n.tree,t=world.trees[i];if(i==null||!t||!treeFree(i)){n.state=load(n)?'sell':'idle';return}
  if(!go(n,t.x/TS,t.y/TS+.6,dt))return;n.dir=1;n.timer+=mins;
  if(n.timer>=8){n.timer=0;n.swing=1;n.hits=(n.hits||0)+1;if(onScreen(n.x,n.y)){fx.debris(t.x/TS,t.y/TS-.4,'#9a6a3a',3);sfxAt('pick',n.x,n.y)}
    if(n.hits>=3){n.hits=0;S.cut[i]=S.time+4*1440;n.inv.wood=(n.inv.wood||0)+3;S.today.gdp+=GOODS.wood.p*3;if(Math.random()<.3)say(n,line('chop'));
      if((n.axeDur=(n.axeDur??200)-1)<=0){n.axe=0;n.axeDur=200;say(n,'My axe broke!')}
      n.state=load(n)>=n.cap*.7?'sell':'idle'}}}
function cropGrowthPerMin(){return 1/(1.6*1440)*eventCrop()*(S.weather==='rain'||S.weather==='storm'?1.3:1)}
function findField(n){let best=-1,bd=1e9;for(let j=0;j<world.fields.length;j++){if(S.crops[j]<1)continue;const i=world.fields[j],x=i%W,y=i/W|0,d=dist(x,y,n.x,n.y)+Math.random()*3;if(d<bd){bd=d;best=j}}return best}
function farmTick(n,dt,mins){const j=n.field;if(j==null||S.crops[j]<1){const f=findField(n);if(f<0||load(n)>=n.cap*.7){n.state=load(n)?'sell':'idle';return}n.field=f;n.goal=null;return}
  const i=world.fields[j];if(!go(n,i%W,i/W|0,dt))return;n.timer+=mins;
  if(n.timer>=12){n.timer=0;n.swing=1;S.crops[j]=0;n.inv.wheat=(n.inv.wheat||0)+3;S.today.gdp+=GOODS.wheat.p*3;if(onScreen(n.x,n.y))fx.debris(n.x,n.y-.2,'#e0c050',4);if(Math.random()<.15)say(n,line('farm'));n.field=null}}
function labourTick(n,dt,mins){const z=bizById(n.work),b=bldOfBiz(z);if(!z||!b||z.closedUntil>S.time){n.state='idle';n.spot=null;return}
  if(!n.spot)n.spot={x:b.door.x+ri(-2,2),y:b.door.y+ri(0,1)};
  if(!go(n,n.spot.x,n.spot.y,dt))return;
  n.timer+=mins;if(BIZ_TYPES[z.type].station==='anvil'&&Math.random()<dt*.6){n.swing=1;if(onScreen(n.x,n.y)){fx.sparks(n.x+n.dir*.5,n.y-.4,5);if(Math.random()<.4)sfxAt('anvil',n.x,n.y)}}
  if(n.timer>=60){n.timer=0;
    if(n.employer===z.id){staffHour(z,n);const hh=S.time/60%24;if(hh>=18||n.absentDay===day()){n.state='idle';n.spot=null}else if(Math.random()<.2)n.spot=null;return}
    if(z.job||z.labour<2){if(z.cash>=z.wage&&z.wage>0){z.cash-=z.wage;z.today.wages+=z.wage;n.cash+=z.wage;z.labour+=BIZ_TYPES[z.type].cls===n.cls?1.5:1;n.shifts++}
      else{say(n,'No wages today!');n.state='wander';n.dest=null;n.spot=null;return}}
    else if(Math.random()<.5){n.state='idle';n.spot=null;return}
    const h=S.time/60%24;if(h>=18||['miner','hauler','woodcutter','farmer'].includes(n.cls)&&Math.random()<.3){n.state='idle';n.spot=null}
    else if(Math.random()<.2)n.spot=null}}

// ---------- talk ----------
function npcWork(n){const P=S.money.P;
  switch(n.state){
    case'mine':if(n.target){const p=plotAt(n.target.x,n.target.y);return n.cls==='hauler'?`I pump oil at plot ${p.px},${p.py}. Crude sells for ${money(price('oil'))} a barrel.`:
      `I work a ${GOODS[n.target.type].n.toLowerCase()} seam on plot ${p.px},${p.py}${mayMine(n.id,p)?'':' (do not tell the sheriff)'}. It sells for ${money(price(n.target.type))}.`}break;
    case'labour':{const z=bizById(n.work),e=z&&n.employer===z.id&&empOf(z,n.id);if(e)return`I work for you at the ${z.name} for ${money(e.wage)} an hour. ${e.morale>.85?'I like it here.':e.morale>.55?'It is fair work.':'The pay is too low, boss.'}`;if(z)return`I work at the ${z.name}. They pay ${money(z.wage)} an hour.${z.cash<z.wage*5?' The money is running out.':''}`;break}
    case'chop':return`I cut timber. It sells for ${money(price('wood'))} at the Market Hall.`;
    case'farm':return`I bring in the wheat. The bakers need ${GOODS.wheat.n.toLowerCase()} for bread. It sells for ${money(price('wheat'))}.`;
    case'patrol':return`I keep the law. ${S.stats.fines?'Some people jump claims.':'All quiet.'} The fine is ${money(S.town.fine*P)}.`;
  }
  const z=bizOwned(n.id)[0];if(z)return`I own the ${z.name}. ${z.hist.profit.length?'Yesterday it made '+money(z.hist.profit.at(-1))+'.':'Business is new.'}`;
  if(n.cls==='mayor'&&S.town.mayor===n.id)return`I am the mayor. The treasury holds ${money(S.town.cash)}. ${S.town.approval>55?'The people are happy.':'People complain about prices.'}`;
  const own=ownedPlots(n.id).length;
  return own?`I hold ${own} plot${own>1?'s':''}. I have ${money(n.cash)} in notes.`:`Times are ${n.cash<30*P?'hard':'fair'}. I have ${money(n.cash)} to my name.`}
function npcMoneyView(n){const v=S.money.v,b=S.money.backing;
  if(!S.bank.convertible)return'The Bank will not give silver for notes. I do not trust paper now. I keep coin under the floor.';
  if(v<.7)return`A note buys ${Math.round(v*100)} cents of silver now. The Town prints too much paper.`;
  if(v<.92)return'Prices go up each week. I change my notes for silver when I can.';
  if(b>.6)return'The vault is full. A note is as good as silver.';
  return'Notes are fine while the Bank holds silver. Watch the vault.'}
function npcTownView(n){const sh=townShortList().filter(d=>d.ema>.15).slice(0,2);
  if(!sh.length)return'The shops have what we need. More people come to the valley each week.';
  return`The town is short of ${sh.map(d=>GOODS[d.k].n.toLowerCase()).join(' and ')}. ${sh[0].k==='bread'?'The bakers need more wheat and more hands.':'Whoever makes more will get rich.'}`}
function rumour(n){const p=S.player;
  if(n.opinion+p.rep<-20)return{txt:'I do not talk to claim jumpers.'};
  if(n.rumourDay===day())return{txt:line('rumourNone')};
  const known=new Set(p.pins.map(x=>x.id));
  const cand=S.deposits.filter(d=>d.reach&&d.amount>=1&&!known.has(d.id)&&dist(d.x,d.y,p.x,p.y)>6)
    .sort((a,b)=>(b.vein*3+(b.type==='gold_ore')*2+(b.type==='silver_ore')+(plotAt(b.x,b.y).owner==='crown')*1.5+Math.random())-(a.vein*3+(a.type==='gold_ore')*2+(a.type==='silver_ore')+(plotAt(a.x,a.y).owner==='crown')*1.5+Math.random()));
  if(!cand.length)return{txt:line('rumourNone')};
  const d=cand[Math.random()<.5?0:Math.min(1,cand.length-1)];n.rumourDay=day();
  p.pins.push({id:d.id,x:d.x,y:d.y});p.stats.rumours++;
  const pl=plotAt(d.x,d.y),dir=compass(d.x-p.x,d.y-p.y);
  jlog('you',`${n.name} told you of ${d.vein?'a VEIN of ':''}${GOODS[d.type].n.toLowerCase()} to the ${dir}, plot ${pl.px},${pl.py} (${ownerName(pl.owner)}). A pin is on your map.`);
  return{txt:`They say there is ${d.vein?'a great vein of ':'some '}${GOODS[d.type].n.toLowerCase()} to the ${dir}, on plot ${pl.px},${pl.py}. ${pl.owner==='crown'?'Nobody has claimed it yet.':'It belongs to '+ownerName(pl.owner)+'.'}`,good:true}}
function compass(dx,dy){const a=Math.atan2(dy,dx)*180/Math.PI;const dirs=['east','south-east','south','south-west','west','north-west','north','north-east'];return dirs[Math.round(((a+360)%360)/45)%8]}

// ---------- needs: what a person will buy from the player ----------
function npcNeeds(n){const out=[];if(!n||n.cls==='peddler')return out;
  if(n.cls==='miner'&&!n.pick)out.push({k:'pickaxe',m:1.25,why:'My pick broke. I cannot dig without one.'});
  else if(n.cls==='miner'&&n.pick===1&&n.cash>price('drill')*.9)out.push({k:'drill',m:1.05,why:'A steel drill would double my ore.'});
  if(n.cls==='woodcutter'&&!n.axe)out.push({k:'axe',m:1.25,why:'I have no axe. No axe, no timber.'});
  if(n.hunger<60)out.push({k:'bread',m:1.3,why:'I am hungry. I would pay well for bread.'});
  if(n.wish&&n.cash>price(n.wish))out.push({k:n.wish,m:1.05,why:`I want ${an(GOODS[n.wish].n.toLowerCase())}.`});
  return out}
function npcOffer(n,k,m){const o=n.opinion+S.player.rep;return Math.max(1,Math.round(price(k)*m*(1+clamp(o,-50,50)/250)))}
function sellToNpc(id,k){const n=S.npcs.find(x=>x.id===id),p=S.player;if(!n||!(p.inv[k]>0))return;const need=npcNeeds(n).find(x=>x.k===k);
  if(!need){if(UI.dialog)UI.dialog.text='I do not need that.';renderDialog();return}
  let pr=npcOffer(n,k,need.m);if(n.cash<pr*.6){UI.dialog.text=`I only have ${money(n.cash)}. I cannot pay ${money(pr)}.`;renderDialog();return}pr=Math.min(pr,Math.floor(n.cash));
  p.inv[k]--;if(!p.inv[k])delete p.inv[k];p.cash+=pr;n.cash-=pr;n.opinion+=4;
  if(k==='pickaxe'){n.pick=1;n.pickDur=240}else if(k==='drill'){n.pick=2;n.pickDur=240}else if(k==='axe'){n.axe=1;n.axeDur=200}else if(k==='bread')n.hunger=100;if(n.wish===k)n.wish=null;
  if(S.dem[k]){S.dem[k].want++;S.dem[k].got++}if(n.state==='shop'&&n.shopFor===k)n.state='idle';
  afterSale(pr,`${GOODS[k].n} to ${n.name}`);UI.dialog.text=pick(['Thank you! Just what I needed.','A fair deal. Thank you, friend.','You saved my day.']);say(n,'Thank you!');renderDialog()}
function npcWishes(){for(const n of S.npcs){if(n.cls==='peddler')continue;if(n.wish&&Math.random()<.3)n.wish=null;
  if(!n.wish&&n.cash>300*S.money.P&&Math.random()<.3)n.wish=pick(['boots','lantern','backpack','ring','cart'])}}
