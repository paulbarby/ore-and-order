'use strict';
// ===== entities: monsters, animals, outlaws, ground items, chests, projectiles =====
let ESEQ=1;const PROJ=[];
function curEnts(){return S.where?CAVE.ents:S.ents}
function walkAt(x,y){return S.where?caveWalk(x,y):walkable(x,y)}
function solidFor(e,x,y){if(e.fly==='ghost')return false;return!walkAt(x,y)}
function spawnMob(type,x,y,o={}){const M=MOBS[type];const hp=Math.round(M.hp*(o.hpMul||1));
  const e={id:ESEQ++,kind:'mob',type,x,y,vx:0,vy:0,kx:0,ky:0,hp,max:hp,state:'idle',st:0,cd:rnd(.6,1.6),hostile:true,hurt:0,stun:0,home:{x,y},fly:M.ai==='flyer'?'air':M.ai==='phaser'?'ghost':null,...o};delete e.list;
  (o.list||curEnts()).push(e);return e}
function spawnAnimal(type,x,y,o={}){const A=ANIMALS[type];const e={id:ESEQ++,kind:'animal',type,x,y,vx:0,vy:0,kx:0,ky:0,hp:A.hp,max:A.hp,state:'wander',st:0,cd:0,hurt:0,home:{x,y},...o};delete e.list;(o.list||curEnts()).push(e);return e}
function dropItem(k,n,x,y,list){for(let i=0;i<n;i++)(list||curEnts()).push({id:ESEQ++,kind:'drop',k,x:x+rnd(-.4,.4),y:y+rnd(-.3,.3),t:0})}
function spawnChest(x,y,loot,o={}){const c={id:ESEQ++,kind:'chest',x,y,loot,open:false,t:0,...o};delete c.list;(o.list||curEnts()).push(c);return c}

// ---------- loot ----------
function chestLoot(depth,rare){const out=[['$',Math.round(ri(8,30)*depth*(rare?3:1)*S.money.P)]];
  const T=[['cartridge',.5,ri(4,10)],['bandage',.5,ri(1,3)],['torch',.45,ri(2,4)],['dynamite',.3,1],['tonic',.25,1],['jerky',.35,ri(2,4)],
    ['amethyst',.35,1],['emerald',.15*depth,1],['ruby',.08*depth,1],['diamond',.04*depth,1],['silver',.4,ri(3,10)],['gold',.12*depth,ri(1,3)],['treasure_map',rare?.35:.1,1]];
  for(const[k,p,n]of T)if(Math.random()<p*(rare?1.8:1))out.push([k,n]);return out}
function giveLoot(list,x,y,src){const p=S.player,got=[];
  for(const[k,n]of list){if(k==='$'){p.cash+=n;got.push(money(n))}else if(k==='silver'||k==='gold'){p[k]+=n;got.push(`${n} ${k} coins`)}
    else if(k==='treasure_map'){newTreasureMap();got.push('a treasure map')}
    else{dropItem(k,n,x,y)}}
  if(got.length){fx.text(x,y-1,got.join(', '),'#ffd86b');sfx('coins')}}

// ---------- damage ----------
function damageEnt(e,dmg,o={}){if(e.dead||e.phaseOn)return 0;const M=e.kind==='mob'?MOBS[e.type]:ANIMALS[e.type];
  let d=dmg*(1-(M.armor||0));if(o.crit)d*=2;d=Math.max(1,Math.round(d));e.hp-=d;e.hurt=.25;
  const a=o.ang??Math.atan2(e.y-S.player.y,e.x-S.player.x),kb=(o.kb||.3)*(M.boss?.25:1);e.kx+=Math.cos(a)*kb*10;e.ky+=Math.sin(a)*kb*10;if(o.stun&&!M.boss)e.stun=Math.max(e.stun,o.stun);
  fx.text(e.x,e.y-1.2,(o.crit?'CRIT ':'')+d,o.crit?'#ffd23f':'#ffffff',o.crit);fx.debris(e.x,e.y-.5,M.human?'#a83a2a':e.type==='golem'?'#8a837a':e.type==='crawler'||e.type==='minicrawler'?'#8ad040':'#c04a3a',4);
  if(e.kind==='animal'&&!ANIMALS[e.type].wild&&e.owned){/* hurting your own animal */}
  if(e.kind==='animal'&&ANIMALS[e.type].wild){e.state='flee';e.st=0}
  if(e.hostile===false&&e.kind==='mob')e.hostile=true;
  if(e.bounty&&e.hp<=e.max*.25&&e.hp>0&&e.surrenders){e.state='surrender';e.hostile=false;say2(e,pick(['I give up! Don\'t shoot!','Alright, alright! I surrender!','You win. Take me in.']))}
  if(e.hp<=0)killEnt(e,o);return d}
function killEnt(e,o={}){e.dead=true;e.deadT=0;e.hp=0;const M=e.kind==='mob'?MOBS[e.type]:ANIMALS[e.type],p=S.player;
  if(e.kind==='mob'){p.stats.kills=(p.stats.kills||0)+1;addXp('combat',M.xp||4);award('blood');if(p.stats.kills>=50)award('slayer');questEvent('kill',e.type,e);
    if(M.split&&e.type==='crawler')for(let i=0;i<2;i++)spawnMob('minicrawler',e.x+rnd(-.5,.5),e.y+rnd(-.5,.5));
    if(M.cash){const c=Math.round(ri(M.cash[0],M.cash[1])*S.money.P);dropCash(c,e.x,e.y)}
    if(e.bounty)bountyKilled(e);if(e.type==='maw')mawDefeated(e)}
  else{questEvent('kill',e.type,e);if(e.owned)removeOwnedAnimal(e)}
  for(const[k,ch,n]of(M.loot||[]))if(Math.random()<ch)dropItem(k,n,e.x,e.y);
  if(M.butcher)dropItem('meat',M.butcher,e.x,e.y);
  sfx(M.boss?'rock_break':'pick',.7);if(M.boss){cam.shake=10;fx.burst('dust',{x:e.x-1,y:e.y-1,w:2,h:2})}}
function dropCash(c,x,y){curEnts().push({id:ESEQ++,kind:'drop',k:'$',n:c,x,y,t:0})}
function say2(e,txt,dur=3.5){e.bubble={text:txt,t:0,dur}}

// ---------- update ----------
function entsUpdate(dt){const list=curEnts(),p=S.player;
  for(let i=list.length-1;i>=0;i--){const e=list[i];
    if(e.kind==='drop'){e.t+=dt;if(!p.dead&&dist(e.x,e.y,p.x,p.y)<.8&&e.t>.4)pickupDrop(e,list,i);else if(e.t>600)list.splice(i,1);continue}
    if(e.kind==='chest'){if(e.open)e.t+=dt;continue}
    if(e.bubble){e.bubble.t+=dt;if(e.bubble.t>e.bubble.dur)e.bubble=null}
    if(e.dead){e.deadT+=dt;if(e.deadT>.8)list.splice(i,1);continue}
    e.hurt=Math.max(0,e.hurt-dt);e.cd-=dt;e.st+=dt;
    // knock-back
    if(Math.abs(e.kx)+Math.abs(e.ky)>.05){moveEnt(e,e.kx*dt,e.ky*dt);e.kx*=Math.pow(.02,dt);e.ky*=Math.pow(.02,dt)}
    if(e.stun>0){e.stun-=dt;continue}
    if(e.poisoned>0){e.poisoned-=dt;if(Math.random()<dt*2)damageEnt(e,2,{kb:0})}
    if(e.kind==='mob')mobAI(e,dt);else if(e.kind==='animal')animalAI(e,dt)}
  projUpdate(dt);
  if(!S.where){spawnTimer-=dt;if(spawnTimer<=0){spawnTimer=2;worldSpawns()}}}
function moveEnt(e,dx,dy){const r=.2;
  if(!solidFor(e,e.x+dx+Math.sign(dx)*r,e.y))e.x+=dx;else e.kx=0;if(!solidFor(e,e.x,e.y+dy+Math.sign(dy)*r*.5))e.y+=dy;else e.ky=0;e.moving=Math.abs(dx)+Math.abs(dy)>.001;if(Math.abs(dx)>.001)e.vx=dx}
function steer(e,tx,ty,spd,dt){const dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy)||1;moveEnt(e,dx/d*spd*dt,dy/d*spd*dt);e.face=faceOf(dx,dy,e.face);return d}
function pickupDrop(e,list,i){const p=S.player;
  if(e.k==='$'){p.cash+=e.n;fx.text(e.x,e.y-.8,'+'+money(e.n),'#ffd86b');sfx('coins');list.splice(i,1);return}
  const mk=isMarketGood(e.k)||GOODS[e.k].cat==='Food';if(mk&&load(p)>=p.cap){if(!e.full){e.full=1;toast('Your pack is full.','bad')}return}
  p.inv[e.k]=(p.inv[e.k]||0)+1;list.splice(i,1);if(e.questItem)e.questItem.taken=true;fx.text(e.x,e.y-.8,'+1 '+GOODS[e.k].n,GOODS[e.k].col||'#fff');sfx('ui_click');
  if(GOODS[e.k].cat==='Gem')award('gem');questEvent('have',e.k);if(UI.panel==='pack')renderPanel()}

// ---------- monster AI ----------
const AGGRO=9;
function mobAI(e,dt){const M=MOBS[e.type],p=S.player,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),sp=M.spd*(e.slow?.5:1);
  if(e.state==='surrender'){if(e.tied){const dd=Math.hypot(dx,dy);if(dd>1.4)steer(e,p.x-Math.cos(ang)*1.1,p.y-Math.sin(ang)*1.1,sp*1.2,dt);else e.moving=false;
      if(e.escapeT==null)e.escapeT=rnd(40,90);e.escapeT-=dt;if(e.escapeT<=0&&dd<3){e.tied=false;e.state='flee';e.st=0;say2(e,'So long, sucker!');toast(`${e.name} broke free! Catch them.`,'bad');e.escapeT=null}}
    else e.moving=false;return}
  if(!e.hostile||p.dead||d>AGGRO+3&&e.state!=='attack'){wander(e,dt,sp*.4);return}
  if(e.state==='flee'){steer(e,e.x-dx,e.y-dy,sp*1.1,dt);if(e.st>3){e.state='chase';e.st=0}return}
  if(d>AGGRO&&e.state==='idle'){wander(e,dt,sp*.4);return}
  e.aim=ang;e.vx=dx;
  switch(M.ai){
  case'flyer':
    if(e.state==='windup'){if(e.st>.25){e.state='attack';e.st=0;e.dx=dx/d;e.dy=dy/d}}
    else if(e.state==='attack'){moveEnt(e,e.dx*sp*2.4*dt,e.dy*sp*2.4*dt);if(d<.6&&!e.hit){e.hit=1;hurtPlayer(M.dmg,e)}if(e.st>.3){e.state='retreat';e.st=0;e.hit=0}}
    else if(e.state==='retreat'){steer(e,e.x-dx+Math.sin(e.st*5)*2,e.y-dy,sp,dt);if(e.st>.7){e.state='chase';e.st=0;e.cd=rnd(.4,1)}}
    else{const o=Math.sin(e.st*3+e.id)*1.5;steer(e,p.x-dy/d*o,p.y+dx/d*o-.3,sp,dt);if(d<1.4&&e.cd<=0){e.state='windup';e.st=0}else e.state='chase'}break;
  case'lunger':
    if(e.state==='windup'){if(e.st>.55){e.state='attack';e.st=0;e.dx=dx/d;e.dy=dy/d}}
    else if(e.state==='attack'){moveEnt(e,e.dx*sp*3.3*dt,e.dy*sp*3.3*dt);if(d<.75&&!e.hit){e.hit=1;if(hurtPlayer(M.dmg,e)&&M.poison)p.cmb.poison=5}if(e.st>.32){e.state='recover';e.st=0;e.hit=0}}
    else if(e.state==='recover'){if(e.st>.8){e.state='chase';e.cd=rnd(.6,1.4)}}
    else{if(d>2.4)steer(e,p.x,p.y,sp,dt);else if(e.cd<=0){e.state='windup';e.st=0}else steer(e,p.x-dy/d*2,p.y+dx/d*2,sp*.6,dt)}break;
  case'blob':
    if(e.state==='windup'){if(e.st>.4){e.state='recover';e.st=0;if(d<1.05)hurtPlayer(M.dmg,e)}}
    else if(e.state==='recover'){if(e.st>.6){e.state='chase';e.cd=rnd(.4,1)}}
    else{steer(e,p.x,p.y,sp,dt);if(d<.95&&e.cd<=0){e.state='windup';e.st=0}}break;
  case'brute':
    if(e.state==='windup'){e.slam=1.7;if(e.st>.9){e.state='recover';e.st=0;e.slam=0;cam.shake=Math.max(cam.shake,5);sfx('rock_break',.6);fx.burst('dust',{x:e.x-1,y:e.y-.5,w:2,h:1});if(d<1.8)hurtPlayer(M.dmg,e,{kb:1})}}
    else if(e.state==='recover'){if(e.st>1.3){e.state='chase';e.cd=rnd(.5,1.2)}}
    else{steer(e,p.x,p.y,sp,dt);if(d<1.6&&e.cd<=0){e.state='windup';e.st=0}}break;
  case'phaser':
    if(e.phaseOn){e.phaseOn-=dt;if(e.phaseOn<=0){e.phaseOn=0;const a=ang+Math.PI+rnd(-.6,.6);e.x=p.x-Math.cos(a)*1.4;e.y=p.y-Math.sin(a)*1.4;e.state='windup';e.st=0}e.phase=1;return}
    e.phase=0;
    if(e.state==='windup'){if(e.st>.5){e.state='recover';e.st=0;if(d<1.3)hurtPlayer(M.dmg,e)}}
    else if(e.state==='recover'){if(e.st>.7){e.state='chase';e.cd=rnd(2,3.5)}}
    else{steer(e,p.x,p.y,sp,dt);if(e.cd<=0&&d<6){e.phaseOn=.9;sfx('whistle',.25)}else if(d<1.2&&e.cd<=1){e.state='windup';e.st=0}}break;
  case'pack':{const lowHp=e.hp<e.max*.25&&!M.boss;if(lowHp){e.state='flee';e.st=0;return}
    if(e.state==='windup'){if(e.st>.35){e.state='attack';e.st=0;e.dx=dx/d;e.dy=dy/d}}
    else if(e.state==='attack'){moveEnt(e,e.dx*sp*2.6*dt,e.dy*sp*2.6*dt);if(d<.7&&!e.hit){e.hit=1;hurtPlayer(M.dmg,e)}if(e.st>.3){e.state='chase';e.st=0;e.hit=0;e.cd=rnd(1.2,2.4)}}
    else{const a0=e.id*1.7+e.st*.6,r=2.3;steer(e,p.x+Math.cos(a0)*r,p.y+Math.sin(a0)*r,sp,dt);if(e.cd<=0&&d<3){e.state='windup';e.st=0}}break}
  case'gunman':{const want=5;
    if(e.state==='windup'){if(e.st>.7){e.state='recover';e.st=0;shoot(e.x,e.y,e.aim+rnd(-.08,.08),12,M.dmg,true,e)}}
    else if(e.state==='recover'){if(e.st>.4){e.state='chase';e.cd=rnd(1.4,2.4)}}
    else{if(d>want+1)steer(e,p.x,p.y,sp,dt);else if(d<want-1.5)steer(e,e.x-dx,e.y-dy,sp,dt);else steer(e,e.x-dy/d,e.y+dx/d,sp*.6,dt);if(e.cd<=0&&d<9){e.state='windup';e.st=0}}break}
  case'boss':mawAI(e,dt,d,dx,dy,ang);break}}
function wander(e,dt,sp){if(!e.wt||e.wt<=0){e.wt=rnd(1.5,4);e.wa=Math.random()*6.28;e.wgo=Math.random()<.6}e.wt-=dt;
  if(e.wgo){const hx=e.home.x-e.x,hy=e.home.y-e.y;let a=e.wa;if(Math.hypot(hx,hy)>5)a=Math.atan2(hy,hx);moveEnt(e,Math.cos(a)*sp*dt,Math.sin(a)*sp*dt)}else e.moving=false;e.state=e.state==='surrender'?e.state:'idle'}
function animalAI(e,dt){const A=ANIMALS[e.type],p=S.player,d=dist(p.x,p.y,e.x,e.y);if(e.peck>0)e.peck-=dt;
  if(A.wild&&(d<4||e.state==='flee')){if(e.state!=='flee'){e.state='flee';e.st=0}steer(e,e.x-(p.x-e.x),e.y-(p.y-e.y),A.spd,dt);if(e.st>4&&d>6)e.state='wander';return}
  if(e.led){if(d>1.6)steer(e,p.x,p.y,A.spd*1.3,dt);else e.moving=false;return}
  wander(e,dt,A.spd*.35);if(e.type==='chicken'&&Math.random()<dt*.4)e.peck=.3}

// ---------- projectiles ----------
function shoot(x,y,ang,spd,dmg,enemy,src,k='bullet',o={}){PROJ.push({k,x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,dmg,enemy,src,life:o.life||1.4,pierce:o.pierce||0,z:o.z||0,vz:o.vz||0,hits:new Set()});if(k==='bullet')sfx('pick',.5)}
function projUpdate(dt){const p=S.player,list=curEnts();
  for(let i=PROJ.length-1;i>=0;i--){const b=PROJ[i];b.life-=dt;
    if(b.k==='wave'){b.r+=dt*7;if(b.life<=0){PROJ.splice(i,1);continue}for(const e of list)if(e.kind==='mob'&&!e.dead&&!b.hits.has(e.id)&&Math.abs(dist(e.x,e.y,b.x,b.y)-b.r)<.6){b.hits.add(e.id);damageEnt(e,b.dmg,{kb:.8,ang:Math.atan2(e.y-b.y,e.x-b.x)})}continue}
    if(b.k==='dynamite'){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.pow(.15,dt);b.vy*=Math.pow(.15,dt);b.z=Math.max(0,b.z+b.vz*dt);b.vz-=14*dt;if(b.life<=0){explode(b.x,b.y,2.2,60);PROJ.splice(i,1)}continue}
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.life<=0||!walkAt(b.x,b.y)&&!(!S.where&&tileAt(b.x,b.y)===T.WATER)){if(!walkAt(b.x,b.y))fx.debris(b.x,b.y,'#8a837a',2);PROJ.splice(i,1);continue}
    if(b.enemy){if(!p.dead&&dist(b.x,b.y,p.x,p.y-.4)<.5){hurtPlayer(b.dmg,b.src||{x:b.x,y:b.y});if(b.k==='acid')p.cmb.poison=3;PROJ.splice(i,1)}continue}
    let hit=false;for(const e of list){if((e.kind==='mob'||e.kind==='animal')&&!e.dead&&!b.hits.has(e.id)&&dist(b.x,b.y,e.x,e.y-.4)<(MOBS[e.type]?MOBS[e.type].r:.4)+.2){b.hits.add(e.id);damageEnt(e,b.dmg,{kb:.25,ang:Math.atan2(b.vy,b.vx),crit:b.crit});if(b.pierce--<=0){hit=true;break}}}
    if(!hit&&!S.where)for(const n of S.npcs){if(n.sleeping||n.dead||b.hits.has('n'+n.id))continue;if(dist(b.x,b.y,n.x,n.y-.4)<.4){b.hits.add('n'+n.id);npcHurt(n,b.dmg,'shot');hit=true;break}}
    if(hit)PROJ.splice(i,1)}}
function explode(x,y,r,dmg){cam.shake=12;sfx('rock_break');for(let i=0;i<30;i++)fx.add({k:'spark',x,y,z:.3,vx:rnd(-6,6),vy:rnd(-4,4),vz:rnd(2,7),life:0,max:rnd(.3,.8),col:pick(['#fff3b0','#ffd060','#ff7a20','#e04020'])});
  for(let i=0;i<10;i++)fx.smoke(x+rnd(-1,1),y+rnd(-.5,.5),'#4a4a50',2.5);fx.ring(x,y,'#ff9a40');
  for(const e of curEnts())if((e.kind==='mob'||e.kind==='animal')&&!e.dead){const d=dist(x,y,e.x,e.y);if(d<r)damageEnt(e,dmg*(1-d/r*.5),{kb:1.2,ang:Math.atan2(e.y-y,e.x-x),stun:.6})}
  const p=S.player,dp=dist(x,y,p.x,p.y);if(dp<r)hurtPlayer(dmg*.6*(1-dp/r*.5),{x,y},{kb:1.2,noDodge:false});
  if(!S.where)for(const n of S.npcs)if(!n.sleeping&&!n.dead&&dist(x,y,n.x,n.y)<r)npcHurt(n,dmg*.8,'dynamite');
  if(S.where)caveBlast(x,y,r)}

// ---------- spawning around the player in the valley ----------
let spawnTimer=2;
function worldSpawns(){const p=S.player,list=S.ents,night=isNight();
  for(let i=list.length-1;i>=0;i--){const e=list[i];if(e.persist||e.owned||e.bounty)continue;if(dist(e.x,e.y,p.x,p.y)>38)list.splice(i,1)}
  if(S.demo||p.dead)return;const inTown=plotAt(p.x,p.y).owner==='town';
  const count=t=>list.filter(e=>e.type===t&&!e.dead).length;
  const spot=(minD,maxD,ok)=>{for(let k=0;k<25;k++){const a=Math.random()*6.28,r=rnd(minD,maxD),x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;if(walkable(x,y)&&ok(tileAt(x,y))&&plotAt(x,y).owner!=='town')return{x,y}}return null};
  if(!night&&count('deer')<3&&Math.random()<.3){const s=spot(14,26,t=>t===T.FOREST||t===T.GRASS);if(s)spawnAnimal('deer',s.x,s.y,{list})}
  if(count('rabbit')<4&&Math.random()<.35){const s=spot(10,22,t=>t===T.GRASS||t===T.FOREST);if(s)spawnAnimal('rabbit',s.x,s.y,{list})}
  if(night&&!inTown&&count('wolf')<4&&Math.random()<.18){const s=spot(15,24,t=>t===T.FOREST||t===T.HILL);if(s){const n=ri(2,3);for(let k=0;k<n;k++)spawnMob('wolf',s.x+rnd(-1,1),s.y+rnd(-1,1),{list})}}
  if(night&&!inTown&&count('bandit')<2&&Math.random()<(eventActive('bandits')?.25:.06)){const s=spot(14,22,t=>t===T.ROAD||t===T.GRASS);if(s){const b=spawnMob('bandit',s.x,s.y,{list,look:outlawLook()});b.name=pick(NAMES)+' '+pick(SURNAMES)}}}
function outlawLook(){return{...CLASSES.outlaw,skin:pick(SKINS),hair:pick(HAIRS),beard:Math.random()<.6,female:Math.random()<.2}}
