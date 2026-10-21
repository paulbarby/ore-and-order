'use strict';
// ===== relationships, crime, the law, bounties =====
const FIGHTERS=new Set(['miner','woodcutter','smith','sheriff','deputy','hauler','rancher','outlaw']);
function initRelations(){const byName={};for(const n of S.npcs){n.rel=n.rel||{};n.hp=n.hp??(n.cls==='sheriff'?140:60);n.max=n.hp}
  // some people share a family name: they are family
  for(const n of S.npcs)if(Math.random()<.35){const o=pick(S.npcs);if(o!==n&&!['mayor','peddler'].includes(n.cls)){n.name=n.name.split(' ')[0]+' '+o.name.split(' ').pop()}}
  for(const n of S.npcs){const sur=n.name.split(' ').pop();(byName[sur]=byName[sur]||[]).push(n)}
  for(const sur in byName){const fam=byName[sur];for(const a of fam)for(const b of fam)if(a!==b)a.rel[b.id]=.9}
  for(const n of S.npcs){const pool=S.npcs.filter(o=>o!==n&&!n.rel[o.id]),same=pool.filter(o=>o.cls===n.cls);for(let i=0;i<2;i++){const o=pick(i===0&&same.length?same:pool);if(o){n.rel[o.id]=Math.max(n.rel[o.id]||0,.5);o.rel[n.id]=Math.max(o.rel[n.id]||0,.5)}}}}
function relText(n){const out=[];for(const id in n.rel){const o=npcById(id);if(!o)continue;out.push(`${n.rel[id]>=.8?'family of':'friend of'} ${o.name}`)}return out.slice(0,3).join(', ')}

// ---------- hurting townspeople ----------
function npcHurt(n,dmg,how){if(n.dead||S.demo)return;const p=S.player;dmg=Math.round(dmg);n.hp=(n.hp??60)-dmg;n.hurt=.3;fx.text(n.x,n.y-1.4,'-'+dmg,'#ff5a4a');fx.debris(n.x,n.y-.5,'#a83a2a',4);
  const a=Math.atan2(n.y-p.y,n.x-p.x);if(walkable(n.x+Math.cos(a)*.4,n.y+Math.sin(a)*.4)){n.x+=Math.cos(a)*.4;n.y+=Math.sin(a)*.4}
  if(n.talking)closeDialog();
  const defence=n.hostile;// hitting someone who attacks you is self defence
  if(!defence){p.wanted=Math.min(5,(p.wanted||0)+1);p.rep=Math.max(-100,p.rep-8);n.opinion-=40;
    for(const w of S.npcs)if(w!==n&&!w.sleeping&&!w.dead&&dist(w.x,w.y,n.x,n.y)<10){w.opinion-=10;if(!w.bubble&&Math.random()<.5)say(w,pick(['Help! Sheriff!','Leave them alone!','Murderer!','Somebody stop that devil!']))}
    jlog('law',`You attacked ${n.name}. The sheriff is after you.`,{toast:'bad'})}
  if(n.hp<=0){npcKilled(n,how);return}
  if(FIGHTERS.has(n.cls)&&n.hp>n.max*.3){n.hostile=true;n.calm=0;say(n,pick(['You will pay for that!','Come here!','Big mistake!']))}
  else{n.fleeT=8;n.hostile=false;say(n,pick(['Help!','Don\'t hurt me!','Sheriff!']))}
  const sh=S.npcs.find(x=>x.cls==='sheriff'&&!x.dead);if(sh&&!sh.sleeping)sh.hostile=p.wanted>=2||sh.hostile}
function npcKilled(n,how){const p=S.player;n.dead=true;n.hostile=false;S.npcs=S.npcs.filter(x=>x!==n);S.graves=S.graves||[];S.graves.push({name:n.name,cls:n.cls,day:day(),by:'player'});
  p.stats.murders=(p.stats.murders||0)+1;p.wanted=Math.min(5,(p.wanted||0)+3);p.rep=Math.max(-100,p.rep-30);p.bountyOnMe=(p.bountyOnMe||0)+Math.round(250*S.money.P);award('murder');
  jlog('law',`You killed ${n.name}. The whole valley will hear of it. There is a price on your head: ${money(p.bountyOnMe)}.`,{toast:'bad'});sfx('whistle');
  for(const o of S.npcs){const r=o.rel&&o.rel[n.id];if(r>=.8){o.grudge=true;o.opinion=-100;o.hostile=FIGHTERS.has(o.cls)||Math.random()<.5;say(o,pick([`You killed my kin! I will see you dead!`,`Blood for blood!`]),5)}
    else if(r){o.opinion-=50;if(p.stats.murders>=2){o.grudge=true;o.hostile=FIGHTERS.has(o.cls)}}else o.opinion-=15}
  // heirs take the land and the business
  const heir=S.npcs.find(o=>o.rel&&o.rel[n.id]>=.8)||S.npcs.find(o=>o.rel&&o.rel[n.id]);
  for(const q of S.plots)if(q.owner===n.id){q.owner=heir?heir.id:'crown'}for(const z of S.biz)if(z.owner===n.id){z.owner=heir?heir.id:'town'}for(const l of S.lots)if(l.owner===n.id)l.owner=heir?heir.id:'town';
  if(heir)jlog('people',`${heir.name} inherits what ${n.name} owned.`);
  if(S.town.mayor===n.id){S.town.mayor=null;S.town.nextElection=day()+1;jlog('law','The mayor is dead. An election is called for tomorrow.')}
  for(const id in S.quests){const s=S.quests[id];if(s.giverId===n.id&&s.state!=='done')failQuest(id,`${n.name} is dead.`)}
  if(p.stats.murders>=2)callPosse();else toast('The kin of '+n.name+' swear revenge. Kill again and a posse rides out.','bad')}
function callPosse(){if(S.posse&&S.posse>S.time)return;S.posse=S.time+1440;const d=bOf('sheriff').door;
  for(let i=0;i<2+Math.min(3,S.player.stats.murders||0);i++){const n=makeNpc('deputy');n.x=d.x+.5+rnd(-1,1);n.y=d.y+.8;n.hp=90;n.max=90;n.hostile=true;n.grudge=true;n.deputy=true;n.rel={};S.npcs.push(n)}
  const sh=S.npcs.find(x=>x.cls==='sheriff');if(sh){sh.hostile=true;sh.grudge=true}toast('<b>A posse rides out to hunt you!</b> Pay your bounty at the Sheriff, or run.','bad')}

// ---------- townspeople in a fight ----------
function npcCombat(n,dt,mins){const p=S.player;if(n.hurt>0)n.hurt-=dt;
  if(n.fleeT>0){n.fleeT-=dt;const d=bOf('inn').door;go(n,d.x,d.y,dt);return true}
  if(!n.hostile)return false;
  if(S.where||p.dead){if(!n.grudge){n.hostile=false}return false}
  const d=dist(n.x,n.y,p.x,p.y);n.calm=(n.calm||0)+mins;if(!n.grudge&&n.calm>120&&d>8){n.hostile=false;return false}
  if(d>30&&!n.deputy)return false;
  const gun=n.cls==='sheriff'||n.cls==='deputy';n.atkCd=(n.atkCd||0)-dt;
  const want=gun?4.5:.9;if(d>want){const a=Math.atan2(p.y-n.y,p.x-n.x),sp=n.speed*1.25*dt;if(walkable(n.x+Math.cos(a)*sp,n.y+Math.sin(a)*sp)){n.x+=Math.cos(a)*sp;n.y+=Math.sin(a)*sp}else go(n,p.x|0,p.y|0,dt);
    n.dir=Math.cos(a)>0?1:-1;n.face=faceOf(Math.cos(a),Math.sin(a),n.face);n.moving=true;n.walk+=sp*2.6}else n.moving=false;
  if(n.atkCd<=0&&d<(gun?8:1.3)){n.atkCd=gun?rnd(1.4,2.2):rnd(1,1.6);n.swing=1;
    if(gun){const a=Math.atan2(p.y-n.y,p.x-n.x);shoot(n.x,n.y-.4,a+rnd(-.08,.08),12,14,true,n)}else{setTimeout(()=>{if(!n.dead&&dist(n.x,n.y,p.x,p.y)<1.5)hurtPlayer(n.cls==='smith'?14:10,n)},250)}}
  return true}
// the sheriff asks you to surrender when you are wanted
function lawTick(dt){const p=S.player;if(S.where||p.dead||!p.wanted)return;const sh=S.npcs.find(n=>n.cls==='sheriff'&&!n.sleeping);if(!sh||sh.hostile)return;
  const d=dist(sh.x,sh.y,p.x,p.y);if(d<14&&d>1.6){go(sh,p.x|0,p.y|0,dt)}if(d<2&&!sh.bubble)say(sh,'Stop right there! Talk to me and come quietly.',4)}
function surrender(){const p=S.player,fine=Math.round((80*p.wanted)*S.money.P+(p.bountyOnMe||0));closeDialog();
  if(p.cash>=fine){p.cash-=fine;S.town.cash+=fine;toast(`You paid ${money(fine)} in fines.`,'law')}else{const days=Math.max(1,p.wanted);S.town.cash+=p.cash;p.cash=0;fastForward(days*1440);const d=bOf('sheriff').door;p.x=d.x+.5;p.y=d.y+.8;fade(`You spend ${days} day${days>1?'s':''} in jail...`);toast(`You served ${days} day${days>1?'s':''} in jail.`,'law')}
  p.wanted=0;p.bountyOnMe=0;for(const n of S.npcs){if(n.deputy){n.dead=true}else if(!n.grudge)n.hostile=false;if(n.cls==='sheriff'){n.hostile=false;n.grudge=false}}S.npcs=S.npcs.filter(n=>!n.deputy);
  jlog('law','You settled with the law. Some people will never forgive you.')}
function socialDaily(){const p=S.player;if(p.wanted>0&&!(p.stats.murders>0&&p.bountyOnMe))p.wanted=Math.max(0,p.wanted-1);bountyDaily()}

// ---------- bounties ----------
function newBounty(o){S.bounties.push({id:o.id||'b'+(S.bseq=(S.bseq||0)+1),name:o.name,kind:o.kind||'outlaw',mode:o.mode||'either',reward:o.reward,state:o.state||'open',x:o.x,y:o.y,quest:o.quest||null,day:day()})}
function wildSpot(minD,maxD){for(let k=0;k<500;k++){const x=ri(4,W-5),y=ri(4,H-5),t=tileAt(x,y);if(![T.GRASS,T.FOREST,T.HILL].includes(t)||!world.reach[idx(x,y)])continue;const d=dist(x,y,world.cx,world.cy);if(d>=minD&&d<=maxD)return{x:x+.5,y:y+.5}}return{x:world.cx+20,y:world.cy+20}}
function bountyDaily(){const open=S.bounties.filter(b=>b.state==='open'||b.state==='taken').length;if(open>=3||Math.random()<.4)return;
  const beast=Math.random()<.25,mode=beast?'dead':pick(['alive','alive','either','either','dead']),base=beast?ri(250,400):ri(150,350);
  const s=wildSpot(22,45);newBounty({name:beast?pick(['The Ridge Wolf','Old Grizzly']):pick(['"Snake" ','"Two-Gun" ','"Mad Dog" ','"Red" ','"Kid" '])+pick(NAMES)+' '+pick(SURNAMES),kind:beast?'beast':'outlaw',mode,reward:Math.round(base*(mode==='alive'?1.5:1)),x:s.x,y:s.y});
  jlog('law','A new bounty is posted at the Sheriff\'s office.')}
function takeBounty(id){const b=S.bounties.find(b=>b.id===id);if(!b||b.state!=='open')return;b.state='taken';toast(`Bounty taken: ${b.name}. The camp is marked on your map.`,'law');sfx('stamp');renderWin()}
function bountyTick(){if(S.where||S.demo)return;const p=S.player;
  for(const b of S.bounties){if(b.state!=='taken'||b.spawned)continue;if(dist(p.x,p.y,b.x,b.y)>32)continue;b.spawned=true;
    if(b.kind==='beast'){const t=b.name.includes('Grizzly')?'bear':'alpha';const e=spawnMob(t,b.x,b.y,{list:S.ents,bounty:b.id,name:b.name,persist:true});if(t==='alpha')for(let i=0;i<3;i++)spawnMob('wolf',b.x+rnd(-2,2),b.y+rnd(-2,2),{list:S.ents,persist:true})}
    else{const e=spawnMob('bandit',b.x,b.y,{list:S.ents,bounty:b.id,name:b.name,hpMul:2.4,persist:true,surrenders:b.mode!=='dead',look:{...outlawLook(),hat:'stetson',hatCol:'#1a1a1a',vest:'#5a1a1a'}});e.home={x:b.x,y:b.y};
      for(let i=0;i<ri(2,3);i++){const m=spawnMob('bandit',b.x+rnd(-3,3),b.y+rnd(-3,3),{list:S.ents,persist:true,look:outlawLook()});m.home={x:b.x,y:b.y}}}}}
function bountyKilled(e){const b=S.bounties.find(b=>b.id===e.bounty);if(!b)return;
  if(b.mode==='alive'){b.state='failed';S.player.rep=Math.max(-100,S.player.rep-5);toast(`${b.name} is dead. The bounty wanted them alive: no reward.`,'bad');for(const id in S.quests)if(S.quests[id].state==='active'&&curStage(S.quests[id]).goal[0]==='bounty'&&curStage(S.quests[id]).goal[1]===b.id)failQuest(id,'The target died.');return}
  b.state='killed';dropItem(b.kind==='beast'?'beast_trophy':'outlaw_badge',1,e.x,e.y,S.ents);S.ents[S.ents.length-1].bountyId=b.id;toast(`${b.name} is dead. Take the ${b.kind==='beast'?'trophy':'badge'} to the Sheriff.`,'law')}
function tieUp(e){e.tied=true;e.escapeT=null;sfx('ui_click');toast(`You tie up ${e.name}. Walk them to the Sheriff's office.`,'law');say2(e,'These ropes are too tight...')}
function captiveNear(){return S.ents.find(e=>e.tied&&!e.dead&&dist(e.x,e.y,S.player.x,S.player.y)<4)}
function handOver(){const e=captiveNear();if(!e)return;const b=S.bounties.find(b=>b.id===e.bounty);S.ents=S.ents.filter(x=>x!==e);if(!b)return;payBounty(b,true)}
function turnInProof(){const p=S.player;for(const b of S.bounties){if(b.state!=='killed')continue;const k=b.kind==='beast'?'beast_trophy':'outlaw_badge';if(!(p.inv[k]>0))continue;p.inv[k]--;if(!p.inv[k])delete p.inv[k];payBounty(b,false);return}toast('You carry no proof of a bounty.','bad')}
function payBounty(b,alive){const p=S.player,c=Math.round(b.reward*S.money.P);b.state='done';p.cash+=c;p.rep=Math.min(100,p.rep+(alive?6:3));p.stats.bounties=(p.stats.bounties||0)+1;award('bounty');if(alive)award('alive');
  toast(`<b>Bounty paid: ${b.name}</b> · +${money(c)}`,'ach');sfx('cash_big');jlog('law',`You brought in ${b.name}${alive?' alive':''}. Reward ${money(c)}.`);checkQuestGoals();checkGoals();renderWin()}
ACTIONS.bounty=(a,s)=>{const sp=wildSpot(24,40);newBounty({id:a[1],name:sv(a[2]),mode:a[3],reward:+a[4],kind:a[5]||'outlaw',state:'taken',x:sp.x,y:sp.y,quest:s&&s.id})};
GOALCHK.bounty=(g)=>S.bounties.some(b=>b.id===g[1]&&b.state==='done');
DRAW_HOOKS.push((...a)=>drawCamps(...a));
function drawCamps(list,vx0,vy0,vx1,vy1){for(const b of S.bounties){if(b.state!=='taken'&&b.state!=='open')continue;if(b.kind==='beast')continue;const x=b.x*TS,y=b.y*TS;if(x<vx0-40||x>vx1+40||y<vy0-40||y>vy1+40)continue;
  list.push({y:y-8,k:10,o:{f:()=>{const g=ctx;for(const[tx,ty]of[[-2,-1],[2,-1.5]]){const X=x+tx*TS,Y=y+ty*TS;g.fillStyle=OUTLINE;g.beginPath();g.moveTo(X-11,Y+1);g.lineTo(X,Y-13);g.lineTo(X+11,Y+1);g.fill();g.fillStyle='#c8b890';g.beginPath();g.moveTo(X-10,Y);g.lineTo(X,Y-12);g.lineTo(X+10,Y);g.fill();g.fillStyle='#3a2a1a';g.fillRect(X-2,Y-6,4,6)}
    g.fillStyle='#5a3a22';g.fillRect(x-4,y+2,8,2);g.fillStyle=Math.random()<.5?'#ffb040':'#ff7020';g.fillRect(x-2,y-2,4,4);if(Math.random()<.1)fx.smoke(b.x,b.y,'#6a6a70',1)}}})}}
