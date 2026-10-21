'use strict';
// ===== farming on your own land, farm animals, the lost cow =====
const CROPS={wheat:{n:'Wheat',days:2,yield:4,col:'#d8b83a',top:'#f0d45a'},corn:{n:'Corn',days:2.6,yield:3,col:'#4a8a2a',top:'#f0d040'},
  potato:{n:'Potatoes',days:2.2,yield:4,col:'#5a9a3a',top:'#c8a060'},cotton:{n:'Cotton',days:2.8,yield:3,col:'#6a8a4a',top:'#f8f8f8'}};
function farmInit(){S.farm=S.farm||{tiles:{}}}
function canFarm(x,y){const q=plotAt(x,y);return mayMine('player',q)&&q.owner==='player'&&tileAt(x,y)===T.GRASS&&!world.trees.some((t,i)=>!(S.cut[i]>S.time)&&Math.abs(t.x/TS-x-.5)<.6&&Math.abs(t.y/TS-y-.8)<.6)}
function farmTile(x,y){return S.farm.tiles[idx(x|0,y|0)]}
function till(x,y){const p=S.player;if(!(p.inv.hoe>0)){toast('You need a hoe. The Ranch and the Smithy sell them.','bad');return}if(!canFarm(x,y)){toast('Till grass on a plot that you own.','bad');return}
  if(p.energy<2){toast('Too tired.','bad');return}S.farm.tiles[idx(x|0,y|0)]={crop:null,growth:0,water:0};p.energy-=2;S.time+=5;p.swing=1;p.toolNow='pick';fx.debris(x+.5,y+.6,'#6a4a2a',6);sfx('footstep')}
function plant(t,x,y){const p=S.player,seeds=Object.keys(p.inv).filter(k=>GOODS[k].cat==='Seed'&&p.inv[k]>0);if(!seeds.length){toast('You have no seeds. The Ranch sells them.','bad');return}
  const k=seeds.includes(S.lastSeed)?S.lastSeed:seeds[0];p.inv[k]--;if(!p.inv[k])delete p.inv[k];t.crop=GOODS[k].crop;t.growth=0;S.lastSeed=k;p.energy-=.5;S.time+=2;sfx('footstep',.5);fx.text(x+.5,y,'Planted '+CROPS[t.crop].n,'#9ad672')}
function water(t,x,y){const p=S.player;if(!(p.inv.can>0)){toast('You need a watering can.','bad');return}t.water=1440;fx.splash(x+.5,y+.6);fx.splash(x+.3,y+.5);sfx('oil',.4);S.time+=2}
function harvestFarm(t,x,y){const p=S.player,C=CROPS[t.crop],n=C.yield+(Math.random()<.3?1:0);if(load(p)+n>p.cap){toast('Your pack is full.','bad');return}
  p.inv[t.crop]=(p.inv[t.crop]||0)+n;if(Math.random()<.5){const sk='seed_'+t.crop;p.inv[sk]=(p.inv[sk]||0)+1}t.crop=null;t.growth=0;p.swing=1;p.toolNow='sickle';S.time+=4;p.energy-=1;
  fx.debris(x+.5,y+.6,C.top,6);fx.text(x+.5,y,`+${n} ${C.n}`,'#e0c050');award('grower');challengeAdd('wheat',n);sfx('coins',.4)}
function farmGrow(mins){const rain=S.weather==='rain'||S.weather==='storm',ec=eventCrop();for(const k in S.farm.tiles){const t=S.farm.tiles[k];if(rain)t.water=Math.max(t.water,600);
  if(t.crop&&t.growth<1){t.growth=Math.min(1,t.growth+mins/(CROPS[t.crop].days*1440)*(t.water>0?1.6:1)*ec)}if(t.water>0)t.water-=mins}}
// target for the E key
function farmTarget(p){const tx=p.x|0,ty=(p.y+.1)|0;let best=null,bd=1.3;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=tx+dx,y=ty+dy,t=farmTile(x,y),d=dist(p.x,p.y,x+.5,y+.5);if(d>bd)continue;
    if(t){if(t.crop&&t.growth>=1){bd=d;best={kind:'farm',act:'harvest',x,y,t,label:'Harvest '+CROPS[t.crop].n.toLowerCase(),at:{x:x+.5,y:y-.3}}}
      else if(!t.crop){bd=d;best={kind:'farm',act:'plant',x,y,t,label:Object.keys(p.inv).some(k=>GOODS[k].cat==='Seed')?'Plant seeds':'Plant (you need seeds)',bad:!Object.keys(p.inv).some(k=>GOODS[k].cat==='Seed'),at:{x:x+.5,y:y-.3}}}
      else if(t.water<=0&&p.inv.can>0){bd=d;best={kind:'farm',act:'water',x,y,t,label:'Water the crop',at:{x:x+.5,y:y-.3}}}}
    else if(p.inv.hoe>0&&dx===0&&dy===0&&canFarm(x,y)){best={kind:'farm',act:'till',x,y,label:'Till the soil (hoe)',at:{x:x+.5,y:y-.3}};bd=d}}
  return best}
function farmAct(t){if(t.act==='till')till(t.x,t.y);else if(t.act==='plant')plant(t.t,t.x,t.y);else if(t.act==='water')water(t.t,t.x,t.y);else harvestFarm(t.t,t.x,t.y)}
GROUND_HOOKS.push((g,tx0,ty0,tx1,ty1)=>{if(!S.farm)return;for(const k in S.farm.tiles){const i=+k,x=i%W,y=i/W|0;if(x<tx0-1||x>tx1||y<ty0-1||y>ty1)continue;const t=S.farm.tiles[k];
  g.fillStyle=t.water>0?'#4a3220':'#6a4a2c';g.fillRect(x*TS+1,y*TS+1,TS-2,TS-2);g.fillStyle=t.water>0?'#3a2616':'#5a3c22';for(let r=0;r<4;r++)g.fillRect(x*TS+2,y*TS+3+r*4,TS-4,1)}});
DRAW_HOOKS.push((list,vx0,vy0,vx1,vy1)=>{if(!S.farm)return;for(const k in S.farm.tiles){const t=S.farm.tiles[k];if(!t.crop)continue;const i=+k,x=i%W,y=i/W|0;if(x*TS<vx0-16||x*TS>vx1||y*TS<vy0-16||y*TS>vy1+16)continue;
  list.push({y:(y+.9)*TS,k:10,o:{f:()=>{const g=ctx,C=CROPS[t.crop],gr=t.growth,ripe=gr>=1,h=Math.round(2+gr*(t.crop==='corn'?10:6));
    for(let c=0;c<3;c++){const sx=x*TS+3+c*5,sy=y*TS+14,o=Math.round(Math.sin(clock*1.6+sx*.1+S.wind)*(gr>.4?1:0));g.fillStyle=C.col;g.fillRect(sx+o,sy-h,1,h);
      if(t.crop==='corn'&&gr>.5){g.fillRect(sx+o-2,sy-h+3,2,1);g.fillRect(sx+o+1,sy-h+5,2,1)}
      if(ripe){g.fillStyle=C.top;if(t.crop==='cotton'){g.fillRect(sx+o-1,sy-h-1,3,2)}else if(t.crop==='potato'){g.fillRect(sx+o-1,sy-2,3,2)}else g.fillRect(sx+o,sy-h-2,1,3)}
      else if(gr>.3){g.fillStyle=shadeC(C.col,.3);g.fillRect(sx+o,sy-h,1,1)}}}}})}});
// ---------- farm animals ----------
function homeSpot(){const mine=ownedPlots();if(!mine.length)return null;const q=mine[0];for(let k=0;k<60;k++){const x=q.px*PS+ri(1,PS-2)+.5,y=q.py*PS+ri(1,PS-2)+.5;if(walkable(x,y)&&tileAt(x,y)!==T.MOUNT)return{x,y}}return{x:q.px*PS+PS/2,y:q.py*PS+PS/2}}
function animalsFromPack(){const p=S.player;for(const k of Object.keys(p.inv)){if(GOODS[k].cat!=='Animal')continue;const h=homeSpot();
  if(!h){toast(`You need land to keep ${GOODS[k].n.toLowerCase()}s. The animal waits at the Ranch for you.`,'bad');continue}
  while(p.inv[k]>0){p.inv[k]--;const e=spawnAnimal(GOODS[k].animal,h.x+rnd(-1,1),h.y+rnd(-1,1),{list:S.ents,owned:true,persist:true,age:0,name:petName()});e.home={...h}}
  delete p.inv[k];toast(`Your ${GOODS[k].n.toLowerCase()} is at home on your land.`,'good');if(S.ents.filter(e=>e.owned&&!e.dead).length>=4)award('herd')}}
function petName(){const used=new Set(S.ents.filter(e=>e.owned).map(e=>e.name));const l=['Bessie','Daisy','Clover','Rosie','Pip','Hammy','Woolly','Henrietta','Duke','Mabel','Buttons','Maple','Ginger','Pepper','Biscuit','Nell'].filter(n=>!used.has(n));return l.length?pick(l):'Lucky '+(used.size+1)}
function animalsDaily(){for(const e of S.ents){if(!e.owned||e.dead)continue;const A=ANIMALS[e.type];if(!A.produce)continue;e.dayN=(e.dayN||0)+1;if(e.dayN>=A.every){e.dayN=0;e.ready=true}}}
function animalTarget(p){let best=null,bd=1.5;for(const e of S.ents){if(e.kind!=='animal'||e.dead||ANIMALS[e.type].wild)continue;const d=dist(e.x,e.y,p.x,p.y);if(d>=bd)continue;bd=d;
  const A=ANIMALS[e.type];best={kind:'animal',o:e,label:e.ready?`Collect ${GOODS[A.produce].n.toLowerCase()}`:e.type==='pig'&&e.owned?'Butcher the pig':e.led?`Stop leading ${e.name||A.n}`:`Lead ${e.name||A.n.toLowerCase()}`,at:{x:e.x,y:e.y-1.2}}}return best}
function animalAct(e){const p=S.player,A=ANIMALS[e.type];
  if(e.ready){if(load(p)>=p.cap){toast('Your pack is full.','bad');return}e.ready=false;p.inv[A.produce]=(p.inv[A.produce]||0)+1;fx.text(e.x,e.y-1,'+1 '+GOODS[A.produce].n,'#fff');sfx('ui_click');if(e.type==='sheep')e.wool=false;return}
  if(e.type==='pig'&&e.owned){if(!confirm('Butcher the pig for meat?'))return;killEnt(e);return}
  e.led=!e.led;if(e.led)say2(e,e.type==='cow'?'Moo.':e.type==='sheep'?'Baa.':e.type==='chicken'?'Bawk!':'Oink.');else e.home={x:e.x,y:e.y}}
function removeOwnedAnimal(e){toast(`Your ${ANIMALS[e.type].n.toLowerCase()} is dead.`,'bad')}
ACTIONS.spawn=((orig)=>(a,s)=>{if(a[1]!=='animal')return orig(a,s);const sp=wildSpot(20,38);const e=spawnAnimal(a[2],sp.x,sp.y,{list:S.ents,persist:true,questTag:s&&s.id,name:'Daisy'});e.home={...sp}})(ACTIONS.spawn);
GOALCHK.bring=(g,s)=>{const e=S.ents.find(e=>e.questTag===s.id&&!e.dead),n=resolveRef(g[1],s);if(e&&n&&dist(e.x,e.y,n.x,n.y)<3){e.dead=true;e.deadT=1;return true}return false};
