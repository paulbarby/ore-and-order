'use strict';
// ===== player combat: health, stamina, melee combos, heavy blows, dodge roll, guns, quick bar, death =====
const CB={hitstop:0,slow:0,mx:0,my:0,down:false,downT:0};
const FISTS={dmg:4,spd:.3,range:.95,arc:1.4,combo:3,kb:.2};
const QUICK=['bandage','tonic','dynamite','torch','food'];
function cmbInit(p){p.hp=p.hp??100;p.maxHp=p.maxHp??100;p.sta=p.sta??100;p.maxSta=p.maxSta??100;
  p.cmb=p.cmb||{atk:0,dur:.3,combo:0,comboT:0,charge:0,charging:false,dodge:0,dx:0,dy:0,iframe:0,perfect:0,crit:0,hurt:0,poison:0,staT:0,regenT:0,reload:0,mag:{},light:0,aim:0,lastHit:-99};
  p.xp.combat=p.xp.combat||0;p.wanted=p.wanted||0;p.stats.kills=p.stats.kills||0}
function weaponOf(p){const w=p.equip.weapon;return w?{k:w.k,...GOODS[w.k].w}:{k:null,...FISTS}}
function armorDef(p){const a=p.equip.armor;return a?GOODS[a.k].def||0:0}
function inCombat(){const p=S.player;if(S.where)return true;for(const e of curEnts())if(e.kind==='mob'&&!e.dead&&e.hostile&&dist(e.x,e.y,p.x,p.y)<10)return true;
  if(S.npcs.some(n=>n.hostile&&!n.dead&&!n.sleeping&&dist(n.x,n.y,p.x,p.y)<10))return true;return false}
function aimAt(){const p=S.player,w=toWorld(CB.mx,CB.my);return Math.atan2(w.y-(p.y-.5),w.x-p.x)}

// ---------- input ----------
function attackPress(){const p=S.player;if(p.dead||UI.blocking)return;CB.down=true;CB.downT=0;const W=weaponOf(p);
  if(W.gun){fireGun();return}p.cmb.charging=true;p.cmb.charge=0}
function attackRelease(){const p=S.player;if(!CB.down)return;CB.down=false;if(p.dead||UI.blocking)return;const W=weaponOf(p);if(W.gun)return;
  const heavy=p.cmb.charge>=.45&&p.sta>=25;p.cmb.charging=false;p.cmb.charge=0;melee(heavy)}
function dodge(){const p=S.player,c=p.cmb;if(p.dead||c.dodge>0||p.sta<20||UI.blocking)return;
  let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(!mx&&!my){const a=aimAt();mx=Math.cos(a);my=Math.sin(a)}const l=Math.hypot(mx,my);c.dx=mx/l;c.dy=my/l;c.dodge=.32;c.iframe=.3;c.dodgeAt=performance.now();
  p.sta-=22;c.staT=.7;sfx('footstep');for(let i=0;i<4;i++)fx.dust(p.x,p.y);p.path=null}
function melee(heavy){const p=S.player,c=p.cmb,W=weaponOf(p),cost=heavy?25:6;if(c.atk>0||c.dodge>0)return;if(p.sta<cost&&!heavy){fx.text(p.x,p.y-1.5,'Out of breath','#86b8e6');return}
  p.sta-=cost;c.staT=.7;c.combo=c.comboT>0?(c.combo+1)%W.combo:0;c.atk=W.spd*(heavy?1.5:1);c.dur=c.atk;c.heavy=heavy;c.aim=aimAt();c.struck=false;p.swing=1;p.dir=Math.cos(c.aim)>=0?1:-1;p.face=faceOf(Math.cos(c.aim),Math.sin(c.aim),p.face);
  sfx('footstep',.4)}
function meleeHit(){const p=S.player,c=p.cmb,W=weaponOf(p),lv=level('combat'),mult=[1,1.15,1.4,1.7][c.combo]||1;
  let dmg=W.dmg*mult*(c.heavy?2.2:1)*(1+(lv-1)*.04);const range=W.range*(c.heavy?1.25:1),arc=(W.arc||1.4)*(c.heavy?1.3:1);let hits=0;
  const tryHit=(x,y,r)=>{const d=dist(x,y-.3,p.x,p.y-.5);if(d>range+r)return false;let da=Math.atan2(y-.3-(p.y-.5),x-p.x)-c.aim;da=Math.atan2(Math.sin(da),Math.cos(da));return Math.abs(da)<=arc/2+.25||d<.5};
  const crit=c.crit>0||Math.random()<.08;
  for(const e of curEnts()){if((e.kind!=='mob'&&e.kind!=='animal')||e.dead)continue;const r=(MOBS[e.type]||ANIMALS[e.type]).r||.4;if(!tryHit(e.x,e.y,r))continue;
    damageEnt(e,dmg,{crit,kb:(W.kb||.3)*(c.heavy?2.2:1)*(c.combo===W.combo-1?1.6:1),ang:Math.atan2(e.y-p.y,e.x-p.x),stun:c.heavy?.5:0});hits++}
  if(!S.where)for(const n of S.npcs){if(n.sleeping||n.dead||n.talking)continue;if(!tryHit(n.x,n.y,.4))continue;
    if(!n.hostile){if(hits)continue;let da=Math.atan2(n.y-.3-(p.y-.5),n.x-p.x)-c.aim;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)>.45)continue}
    npcHurt(n,dmg*(crit?2:1),'struck');hits++}
  if(c.heavy&&W.wave)PROJ.push({k:'wave',x:p.x,y:p.y-.2,r:.5,dmg:dmg*.6,life:.45,hits:new Set()});
  if(hits){CB.hitstop=c.heavy?.09:.05;cam.shake=Math.max(cam.shake,c.heavy?5:2.5);sfx(W.k?'anvil':'footstep',.45);if(crit)c.crit=0;if(p.equip.weapon)wearW()}
  else if(c.heavy){cam.shake=2;fx.burst('dust',{x:p.x+Math.cos(c.aim)-.5,y:p.y+Math.sin(c.aim)-.5,w:1,h:1})}}
function wearW(){const e=S.player.equip.weapon;if(!e||GOODS[e.k].item.dur>=9999)return;e.dur--;if(e.dur<=0){toast(`Your ${GOODS[e.k].n.toLowerCase()} broke.`,'bad');delete S.player.equip.weapon}}
function fireGun(){const p=S.player,c=p.cmb,W=weaponOf(p);if(c.atk>0||c.reload>0)return;const m=c.mag[W.k]??0;
  if(m<=0){reloadGun();return}c.mag[W.k]=m-1;c.atk=W.spd;c.dur=W.spd;c.aim=aimAt();p.dir=Math.cos(c.aim)>=0?1:-1;p.face=faceOf(Math.cos(c.aim),Math.sin(c.aim),p.face);
  const crit=c.crit>0;if(crit)c.crit=0;const lv=level('combat');
  shoot(p.x+Math.cos(c.aim)*.6,p.y-.4+Math.sin(c.aim)*.6,c.aim+rnd(-W.spread,W.spread),16,W.dmg*(1+(lv-1)*.04),false,p,'bullet',{pierce:W.pierce||0});PROJ[PROJ.length-1].crit=crit;
  cam.shake=Math.max(cam.shake,2);fx.sparks(p.x+Math.cos(c.aim)*.8,p.y-.4+Math.sin(c.aim)*.8,4);sfx('pick',.9);wearW();
  if(c.mag[W.k]<=0&&(p.inv.cartridge||0)>0)setTimeout(reloadGun,250)}
function reloadGun(){const p=S.player,c=p.cmb,W=weaponOf(p);if(!W.gun||c.reload>0)return;const have=p.inv.cartridge||0;if(!have){fx.text(p.x,p.y-1.5,'No cartridges!','#e8705e');toast('No cartridges. Buy them at the Outfitter.','bad');return}
  if((c.mag[W.k]||0)>=W.mag)return;c.reload=W.reload;c.reloadK=W.k;sfx('ui_click')}
function useQuick(i){const p=S.player;if(p.dead||UI.blocking)return;let k=QUICK[i];
  if(k==='food'){k=['stew','pie','jerky','cornbread','bread'].find(x=>p.inv[x]>0);if(!k){toast('You have no food.','bad');return}eatFood(k);return}
  if(!(p.inv[k]>0)){toast(`You have no ${GOODS[k].n.toLowerCase()}. The Outfitter sells it.`,'bad');return}
  const U=GOODS[k].use;
  if(U.heal){p.inv[k]--;p.hp=Math.min(p.maxHp,p.hp+U.heal);if(U.cure)p.cmb.poison=0;fx.text(p.x,p.y-1.2,'+'+U.heal+' health','#9ad672');sfx('eat',.5);fx.ring(p.x,p.y,'#9ad672')}
  else if(U.throw){p.inv[k]--;const a=aimAt(),w=toWorld(CB.mx,CB.my),d=Math.min(6,dist(w.x,w.y,p.x,p.y));PROJ.push({k:'dynamite',x:p.x,y:p.y-.3,vx:Math.cos(a)*d*2.2,vy:Math.sin(a)*d*2.2,z:.5,vz:4,life:1.4,hits:new Set()});sfx('footstep');toast('Dynamite thrown! Stand clear.','info')}
  else if(U.light){p.inv[k]--;p.cmb.light=U.light;toast('The torch burns for 3 hours.','good');sfx('oil',.4)}
  if(!p.inv[k])delete p.inv[k];if(UI.panel==='pack')renderPanel()}
function eatFood(k){const p=S.player;if(!(p.inv[k]>0))return;p.inv[k]--;if(!p.inv[k])delete p.inv[k];const G=GOODS[k];p.hunger=Math.min(100,p.hunger+G.food);p.hp=Math.min(p.maxHp,p.hp+Math.round(G.food/3));
  if(G.buff==='sta'){p.sta=p.maxSta;p.cmb.staBuff=600}if(G.buff==='hp')p.hp=Math.min(p.maxHp,p.hp+30);sfx('eat');fx.text(p.x,p.y-1,`+${G.food} hunger`,'#e8c070');if(UI.panel==='pack')renderPanel()}

// ---------- damage to the player ----------
function hurtPlayer(dmg,src,o={}){const p=S.player,c=p.cmb;if(p.dead)return false;
  if(c.iframe>0&&!o.noDodge){if(performance.now()-c.dodgeAt<230&&!c.perfectUsed){c.perfectUsed=true;CB.slow=.7;c.crit=1.5;fx.text(p.x,p.y-1.6,'PERFECT DODGE','#7ad8ff',true);sfx('levelup',.5);fx.ring(p.x,p.y,'#7ad8ff')}return false}
  let d=Math.max(1,Math.round(dmg*(1-armorDef(p))));p.hp-=d;c.hurt=.4;c.lastHit=S.time;CB.hitstop=.06;cam.shake=Math.max(cam.shake,4);
  if(src){const a=Math.atan2(p.y-src.y,p.x-src.x),k=(o.kb||.4)*.9;moveP(Math.cos(a)*k,Math.sin(a)*k)}
  fx.text(p.x,p.y-1.4,'-'+d,'#ff5a4a');sfx('pick',.6);if(p.equip.armor&&GOODS[p.equip.armor.k].item.dur<9999){p.equip.armor.dur--;if(p.equip.armor.dur<=0){toast('Your armour broke.','bad');delete p.equip.armor}}
  if(p.hp<=0)playerDies(src);return true}
function moveP(dx,dy){const p=S.player;if(canStandAt(p.x+dx,p.y))p.x+=dx;if(canStandAt(p.x,p.y+dy))p.y+=dy}
function canStandAt(x,y){return walkAt(x-.22,y)&&walkAt(x+.22,y)&&walkAt(x,y-.12)&&walkAt(x,y+.12)}
function playerDies(src){const p=S.player;p.dead=true;p.hp=0;p.cmb.deadT=0;sfx('rock_break');cam.shake=8;
  const who=src&&src.kind==='mob'?MOBS[src.type].n:src&&src.name?src.name:'your wounds';jlog('you',`You were knocked out by ${who}.`,{toast:'bad'})}
function respawn(){const p=S.player,fee=Math.round(p.cash*.25);p.cash-=fee;S.town.cash+=fee;p.dead=false;p.hp=Math.round(p.maxHp*.6);p.sta=p.maxSta;p.cmb.poison=0;
  if(S.where)leaveCave(true);const d=bOf('inn').door;p.x=d.x+.5;p.y=d.y+.6;p.path=null;PROJ.length=0;
  for(const n of S.npcs)if(n.hostile&&!n.grudge)n.hostile=false;fastForward(360);fade('You wake up at the inn...');
  jlog('you',`The doctor patched you up for ${money(fee)}. Six hours passed.`,{toast:'bad'})}

// ---------- per-frame update ----------
function combatUpdate(dt,rdt){const p=S.player,c=p.cmb;if(!c)return;
  if(p.dead){c.deadT+=rdt;if(c.deadT>2.2)respawn();return}
  const W=weaponOf(p);
  if(CB.down&&c.charging){c.charge+=dt;if(c.charge>=.45&&!c.chargeFx){c.chargeFx=1;fx.ring(p.x,p.y,W.glow||'#ffd86b')}}else c.chargeFx=0;
  if(c.atk>0){const before=c.atk;c.atk-=dt;p.swing=Math.max(0,c.atk/c.dur);if(!W.gun&&!c.struck&&c.atk<=c.dur*.6){c.struck=true;meleeHit()}if(c.atk<=0){c.comboT=.35;p.swing=0}}
  else if(c.comboT>0)c.comboT-=dt;
  if(c.dodge>0){c.dodge-=dt;moveP(c.dx*9*dt,c.dy*9*dt);p.moving=true;if(c.dodge<=0)c.perfectUsed=false}
  c.iframe=Math.max(0,c.iframe-dt);c.hurt=Math.max(0,c.hurt-dt);c.crit=Math.max(0,c.crit-dt);
  if(c.reload>0){c.reload-=dt;if(c.reload<=0){const K=c.reloadK,cap=GOODS[K].w.mag,need=cap-(c.mag[K]||0),n=Math.min(need,p.inv.cartridge||0);c.mag[K]=(c.mag[K]||0)+n;p.inv.cartridge-=n;if(!p.inv.cartridge)delete p.inv.cartridge;sfx('ui_click')}}
  // stamina and health regeneration
  if(c.staT>0)c.staT-=dt;else p.sta=Math.min(p.maxSta,p.sta+(c.staBuff>0?40:28)*dt);if(c.staBuff>0)c.staBuff-=rdt*SET.speed;
  if(c.poison>0){c.poison-=dt;if(Math.random()<dt*2){p.hp-=1;fx.text(p.x,p.y-1.3,'-1','#8ad040')}if(p.hp<=0)playerDies({name:'poison'})}
  if(S.time-c.lastHit>30&&p.hp<p.maxHp&&!inCombatCache)p.hp=Math.min(p.maxHp,p.hp+dt*1.2);
  if(c.light>0)c.light-=rdt*SET.speed}
let inCombatCache=false,icT=0;
function combatTick(rdt){icT-=rdt;if(icT<=0){icT=.5;inCombatCache=inCombat()}
  let dt=rdt;if(CB.hitstop>0){CB.hitstop-=rdt;dt=0}else if(CB.slow>0){CB.slow-=rdt;dt=rdt*.35}
  combatUpdate(dt,rdt);entsUpdate(dt)}
