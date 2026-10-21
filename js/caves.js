'use strict';
// ===== caves: entrances, generation, levels, gem veins, chests, hidden rooms, treasure maps, the Deep Maw =====
const CW=64,CH=44,CT={WALL:0,FLOOR:1,WATER:2,UP:3,DOWN:4,CRACK:5,MUD:6};
const CCOST=[0,1,0,1,1,0,1.6];
let CAVE=null;
const CAVE_NAMES=['Old Shaft','Bat Hollow','Crystal Grotto','Widow\'s Den','Echo Mine','Blackrock Drift','Golem Deep'];
function caveWalk(x,y){x|=0;y|=0;return x>=0&&y>=0&&x<CW&&y<CH&&CCOST[CAVE.tiles[idx(x,y)]]>0}
// cave mouths are chosen with their own random stream so the valley layout does not change
function placeCaves(){const r=mulberry(world.seed*7+13),cx=world.cx,cy=world.cy,out=[];
  for(let i=0;i<6000&&out.length<7;i++){const x=2+Math.floor(r()*(W-4)),y=2+Math.floor(r()*(H-4)),t=world.tiles[idx(x,y)];if(t!==T.MOUNT&&t!==T.HILL)continue;
    const d=dist(x,y,cx,cy);if(out.length===0?(d<16||d>30):d<20)continue;if(out.some(c=>dist(c.x,c.y,x,y)<12))continue;
    const st=standTile(x,y);if(!st||!world.reach[idx(st.x,st.y)]||st.y<=y)continue;if(S&&S.deposits&&S.deposits.some(dp=>Math.abs(dp.x-x)<2&&Math.abs(dp.y-y)<2))continue;
    out.push({id:out.length,x,y,sx:st.x,sy:st.y,name:CAVE_NAMES[out.length],depths:out.length===0?3:out.length<3?2:out.length===6?3:1+Math.floor(r()*2),story:out.length===0})}
  world.caves=out}
function caveAt(x,y){return world.caves.find(c=>dist(x,y,c.sx+.5,c.sy+.5)<1.3)}

// ---------- generation ----------
function genCave(c,depth){const key=`c${c.id}:${depth}`,rng=mulberry(world.seed*31+c.id*977+depth*131),R2=()=>rng(),RI=(a,b)=>a+Math.floor(R2()*(b-a+1));
  const tiles=new Uint8Array(W*H);const inR=(x,y)=>x>0&&y>0&&x<CW-1&&y<CH-1;
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++)tiles[idx(x,y)]=inR(x,y)&&R2()>.46?CT.FLOOR:CT.WALL;
  for(let it=0;it<5;it++){const nt=tiles.slice();for(let y=1;y<CH-1;y++)for(let x=1;x<CW-1;x++){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&tiles[idx(x+dx,y+dy)]===CT.WALL)n++;nt[idx(x,y)]=n>=5?CT.WALL:n<=3?CT.FLOOR:tiles[idx(x,y)]}tiles.set(nt)}
  const boss=c.story&&depth===c.depths;
  if(boss){const ax=CW-18,ay=CH/2|0;for(let y=-9;y<=9;y++)for(let x=-12;x<=12;x++)if(x*x/144+y*y/81<1&&inR(ax+x,ay+y))tiles[idx(ax+x,ay+y)]=CT.FLOOR}
  // keep the largest open area
  const lab=new Int32Array(W*H).fill(-1);let best=-1,bestN=0,id=0;
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){if(tiles[idx(x,y)]!==CT.FLOOR||lab[idx(x,y)]>=0)continue;let n=0;const q=[idx(x,y)];lab[q[0]]=id;
    while(q.length){const i=q.pop();n++;const qx=i%W,qy=i/W|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const j=idx(qx+dx,qy+dy);if(tiles[j]===CT.FLOOR&&lab[j]<0){lab[j]=id;q.push(j)}}}
    if(n>bestN){bestN=n;best=id}id++}
  const floors=[];for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){const i=idx(x,y);if(tiles[i]===CT.FLOOR){if(lab[i]!==best)tiles[i]=CT.WALL;else floors.push(i)}}
  // entrance near the west, the way down far from it
  floors.sort((a,b)=>(a%W)-(b%W));const up=floors[RI(0,Math.min(30,floors.length-1))];tiles[up]=CT.UP;
  const far=bfsFar(tiles,up);let down=-1;if(depth<c.depths&&!boss){down=far.order[far.order.length-1-RI(0,10)];tiles[down]=CT.DOWN}
  // water and mud
  for(const i of floors){if(tiles[i]!==CT.FLOOR)continue;const x=i%W,y=i/W|0,n=vnoise(x/5,y/5,c.id*13+depth);if(n>.78)tiles[i]=CT.WATER;else if(n>.7)tiles[i]=CT.MUD}
  // re-check that water does not cut the way: turn water into mud where it blocks
  const reach=bfsFar(tiles,up);for(const i of floors)if(tiles[i]===CT.FLOOR&&!reach.dist.has(i))tiles[i]=CT.MUD;
  // features
  const open=floors.filter(i=>tiles[i]===CT.FLOOR&&dist(i%W,i/W|0,up%W,up/W|0)>5);const take=()=>open.splice(RI(0,open.length-1),1)[0];
  const nodes=[],gemW=[['amethyst',5],['emerald',2+depth],['ruby',depth],['diamond',depth*.5]],oreW=['iron_ore','copper_ore','coal','silver_ore','gold_ore'];
  const wp=(arr)=>{let t=0;for(const a of arr)t+=a[1];let r=R2()*t;for(const a of arr){if((r-=a[1])<0)return a[0]}return arr[0][0]};
  for(let k=0;k<6+depth*3;k++){const i=take();if(i==null)break;const gem=R2()<.55;nodes.push({i:k,x:i%W,y:i/W|0,k:gem?wp(gemW):oreW[RI(0,oreW.length-1)],gem,hp:gem?RI(4,6):RI(18,40),max:0});nodes[nodes.length-1].max=nodes[nodes.length-1].hp}
  if(boss)nodes.push({i:99,x:CW-10,y:(CH/2|0)+5,k:'starsteel_ore',gem:false,hp:400,max:400,locked:'maw_dead'});
  const chests=[];for(let k=0;k<2+depth;k++){const i=take();if(i==null)break;chests.push({i:k,x:i%W+.5,y:(i/W|0)+.7,rare:false})}
  // hidden rooms behind cracked walls
  const cracks=[];for(let k=0;k<1+depth;k++){for(let tries=0;tries<200;tries++){const i=floors[RI(0,floors.length-1)],x=i%W,y=i/W|0;const dx=[[1,0],[-1,0],[0,-1],[0,1]][RI(0,3)];
      let ok=true;for(let s=1;s<=6;s++){const tx=x+dx[0]*s,ty=y+dx[1]*s;if(!inR(tx,ty)||tiles[idx(tx,ty)]!==CT.WALL){ok=false;break}}if(!ok)continue;
      const cx2=x+dx[0]*4,cy2=y+dx[1]*4;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)if(inR(cx2+xx,cy2+yy))tiles[idx(cx2+xx,cy2+yy)]=CT.FLOOR;
      for(let s=1;s<=2;s++)tiles[idx(x+dx[0]*s,y+dx[1]*s)]=CT.CRACK;tiles[idx(x+dx[0]*3,y+dx[1]*3)]=CT.FLOOR;
      cracks.push({i:k,cells:[idx(x+dx[0],y+dx[1]),idx(x+dx[0]*2,y+dx[1]*2)]});chests.push({i:10+k,x:cx2+.5,y:cy2+.7,rare:true});break}}
  // monsters by depth
  const mobs=[],pool=depth===1?[['bat',4],['crawler',3],['spider',2]]:depth===2?[['bat',3],['spider',3],['crawler',2],['golem',2]]:[['spider',2],['golem',3],['ghost',3],['bat',2]];
  for(let k=0;k<5+depth*3;k++){const i=take();if(i==null)break;mobs.push({i:k,type:wp(pool),x:i%W+.5,y:(i/W|0)+.5})}
  if(boss)mobs.push({i:99,type:'maw',x:CW-18,y:CH/2|0,boss:true});
  const torches=[];for(const i of floors){if(tiles[i]!==CT.FLOOR)continue;const x=i%W,y=i/W|0;if(tiles[idx(x,y-1)]===CT.WALL&&R2()<.035)torches.push({x:x+.5,y:y+.05})}
  const decor=[];for(let k=0;k<40;k++){const i=floors[RI(0,floors.length-1)];if(tiles[i]!==CT.FLOOR)continue;decor.push({x:i%W+R2(),y:(i/W|0)+R2(),k:['mush','mush','rock','bones','crystal','stal'][RI(0,5)],c:pick(['#7ad8ff','#b070e0','#40d080'])})}
  return{key,c,depth,tiles,up,down,nodes,chests,cracks,mobs,torches,decor,boss}}
function bfsFar(tiles,start){const dist2=new Map([[start,0]]),q=[start],order=[start];while(q.length){const i=q.shift(),x=i%W,y=i/W|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const j=idx(x+dx,y+dy);if(CCOST[tiles[j]]>0&&!dist2.has(j)){dist2.set(j,dist2.get(i)+1);q.push(j);order.push(j)}}}return{dist:dist2,order}}

// ---------- entering and leaving ----------
function enterCave(c,depth){const p=S.player;if(!S.where)S.retPos={x:p.x,y:p.y};
  const L=genCave(c,depth),st=S.caves[L.key]=S.caves[L.key]||{mined:{},chests:{},cracked:{},killed:{}};
  for(const cr of L.cracks)if(st.cracked[cr.i])for(const i of cr.cells)L.tiles[i]=CT.FLOOR;
  CAVE={...L,ents:[]};PROJ.length=0;
  for(const n of CAVE.nodes){if(st.mined[n.i]!=null)n.hp=st.mined[n.i]}
  for(const ch of L.chests)if(!st.chests[ch.i])spawnChest(ch.x,ch.y,null,{list:CAVE.ents,cidx:ch.i,rare:ch.rare,depth});
  for(const m of L.mobs){const k=st.killed[m.i];if(m.boss&&S.flags.maw_dead)continue;if(k!=null&&day()-k<2)continue;spawnMob(m.type,m.x,m.y,{list:CAVE.ents,midx:m.i,hpMul:1+(depth-1)*.25})}
  const far=bfsFar(L.tiles,L.up).order;
  for(const q of(S.caveItems||[]))if(q.key===L.key&&!q.taken){if(q.x==null){const ch=q.hidden&&L.chests.find(c=>c.rare);if(ch){q.x=ch.x+.6;q.y=ch.y-.2}else{const i=far[far.length-1-Math.floor(Math.random()*Math.min(40,far.length))];q.x=i%W+.5;q.y=(i/W|0)+.6}}
    CAVE.ents.push({id:ESEQ++,kind:'drop',k:q.k,x:q.x,y:q.y,t:0,questItem:q})}
  for(const fid in S.friends){const f=S.friends[fid];if(f.key!==L.key||f.found)continue;const i=far[Math.floor(far.length*.6)];
    CAVE.ents.push({id:ESEQ++,kind:'friend',fid,name:f.name,x:i%W+.5,y:(i/W|0)+.6,look:{...CLASSES.miner,skin:SKINS[2],hair:HAIRS[3],beard:true,female:false}})}
  S.where=L.key;const u=L.up;p.x=u%W+.5;p.y=(u/W|0)+1.5;if(!caveWalk(p.x,p.y)){p.y-=1}p.path=null;
  paintCave();cam.x=p.x*TS;cam.y=p.y*TS;p.stats.caves=(p.stats.caves||0)+1;if(depth>=3)award('deep');
  toast(`${c.name} · level ${depth}${L.boss&&!S.flags.maw_dead?' · something huge stirs in the dark':''}`,'event');sfx('door');questEvent('go',L.key);checkGoals()}
function leaveCave(quiet){const p=S.player,L=CAVE;S.where=null;CAVE=null;PROJ.length=0;const c=L.c;p.x=c.sx+.5;p.y=c.sy+.7;cam.x=p.x*TS;cam.y=p.y*TS;if(!quiet){toast('Back in the open air.','info');sfx('door')}}
function useLadder(t){const L=CAVE;if(t===CT.UP){if(L.depth===1)leaveCave();else enterCave(L.c,L.depth-1)}else enterCave(L.c,L.depth+1)}
function caveBlast(x,y,r){const st=S.caves[CAVE.key];for(const cr of CAVE.cracks){if(st.cracked[cr.i])continue;if(cr.cells.some(i=>dist(i%W+.5,(i/W|0)+.5,x,y)<r+.6)){st.cracked[cr.i]=1;for(const i of cr.cells)CAVE.tiles[i]=CT.FLOOR;paintCave();toast('The wall caves in. A hidden chamber!','good');sfx('rock_break')}}}
function openChest(c){if(c.open)return;c.open=true;c.t=0;const loot=c.loot||chestLoot(c.depth||1,c.rare);giveLoot(loot,c.x,c.y-.5);sfx(c.rare?'achievement':'coins');
  if(c.rare){award('treasure');S.player.stats.treasures=(S.player.stats.treasures||0)+1}
  if(S.where&&c.cidx!=null)S.caves[CAVE.key].chests[c.cidx]=1;if(c.mapIdx!=null){const m=S.player.tmaps[c.mapIdx];if(m)m.found=true}questEvent('chest',c.rare?'rare':'plain')}
function strikeNode(n){const p=S.player;if(n.locked&&!S.flags[n.locked]){toast('Something keeps you away from this vein.','bad');return false}
  if(!p.equip.tool){toast('You need a pickaxe or a drill to break this.','bad');return false}if(p.energy<1.5){toast('Too tired.','bad');return false}
  if(n.hp<=0)return false;p.swing=1;p.toolNow=null;p.strikeCD=.5;p.energy-=1;S.time+=2;n.hp--;S.caves[CAVE.key].mined[n.i]=n.hp;
  fx.debris(n.x+.5,n.y+.6,GOODS[n.k].col,6);sfx('pick');cam.shake=1;wear('tool');addXp('mining',2);
  if(!n.gem){const q=1+(p.equip.tool?p.equip.tool.v:0);if(load(p)+q>p.cap){toast('Your pack is full.','bad');n.hp++;return false}p.inv[n.k]=(p.inv[n.k]||0)+q;p.stats.ore+=q;challengeAdd('ore',q);fx.text(n.x+.5,n.y,`+${q} ${GOODS[n.k].n}`,GOODS[n.k].col)}
  else if(n.hp<=0){const q=Math.random()<.35?2:1;dropItem(n.k,q,n.x+.5,n.y+.8);fx.text(n.x+.5,n.y,GOODS[n.k].n+'!',GOODS[n.k].col);sfx('levelup',.6)}
  return n.hp>0}

// ---------- treasure maps ----------
function newTreasureMap(){const p=S.player;p.tmaps=p.tmaps||[];for(let k=0;k<400;k++){const x=ri(4,W-5),y=ri(4,H-5),t=tileAt(x,y);if((t===T.GRASS||t===T.FOREST||t===T.SAND)&&world.reach[idx(x,y)]&&dist(x,y,world.cx,world.cy)>18){
  p.tmaps.push({x:x+.5,y:y+.5,found:false});jlog('you',`A treasure map! An X marks a spot ${compass(x-p.x,y-p.y)} of here. It is on your minimap. Dig there with a shovel.`,{toast:'good'});return}}}
function digAt(m){const p=S.player;if(!(p.inv.shovel>0)){toast('You need a shovel. The Smithy and the Outfitter sell them.','bad');return}
  p.swing=1;p.toolNow='pick';sfx('footstep');fx.debris(m.x,m.y,'#8a6a3a',8);m.dug=(m.dug||0)+1;p.energy-=2;
  if(m.dug>=3){m.found=true;S.flags.dug_treasure=true;setTimeout(checkQuestGoals,50);spawnChest(m.x,m.y+.2,chestLoot(3,true),{rare:true,list:S.ents,persist:true});toast('You dug up a buried chest!','good');cam.shake=3}}

// ---------- the Deep Maw ----------
function mawAI(e,dt,d,dx,dy,ang){const p=S.player,rage=e.hp<e.max*.3;e.pt=(e.pt||0)+dt;
  if(!e.summ1&&e.hp<e.max*.6){e.summ1=1;for(let i=0;i<3;i++)spawnMob('crawler',e.x+rnd(-3,3),e.y+rnd(-2,2));say2(e,'The cave shakes!')}
  if(!e.summ2&&e.hp<e.max*.3){e.summ2=1;for(let i=0;i<4;i++)spawnMob('crawler',e.x+rnd(-3,3),e.y+rnd(-2,2));cam.shake=8}
  if(e.phase==='burrow'){e.phaseOn=1;if(e.pt>1.6){e.x=e.tx;e.y=e.ty;e.phase=null;e.phaseOn=0;e.pt=0;cam.shake=10;sfx('rock_break');fx.burst('dust',{x:e.x-2,y:e.y-1,w:4,h:2});
      if(dist(p.x,p.y,e.x,e.y)<2.4)hurtPlayer(34,e,{kb:1.4});e.state='recover';e.st=0}else{e.tx=lerp(e.tx,p.x,dt*.8);e.ty=lerp(e.ty,p.y,dt*.8);if(Math.random()<dt*20)fx.debris(e.tx+rnd(-1,1),e.ty+rnd(-.5,.5),'#5a4a40',1)}return}
  if(e.state==='windup'){e.slam=e.atk==='sweep'?3:0;if(e.st>(e.atk==='sweep'?1:.8)/(rage?1.3:1)){e.state='recover';e.st=0;e.slam=0;
      if(e.atk==='spit'){for(let i=-2;i<=2;i++)shoot(e.x,e.y-1,ang+i*.22,7,16,true,e,'acid');sfx('oil')}
      else{cam.shake=7;sfx('rock_break');if(d<3.2)hurtPlayer(30,e,{kb:1.6})}}}
  else if(e.state==='recover'){if(e.st>(rage?.7:1.2)){e.state='chase';e.cd=rnd(.6,1.4)}}
  else{if(d>4)steer(e,p.x,p.y,e.type==='maw'?1.4:1,dt);if(e.cd<=0){const r=Math.random();if(r<.3){e.phase='burrow';e.pt=0;e.tx=e.x;e.ty=e.y;sfx('rock_break',.5)}else{e.atk=d<3.4&&r<.7?'sweep':'spit';e.state='windup';e.st=0}}}}
function mawDefeated(e){S.flags.maw_dead=true;award('hero');fireworks(e.x,e.y);toast('<b>The Deep Maw is dead!</b> A vein of starsteel glows in the dark.','ach');jlog('event','The Deep Maw is dead. The tremors stop. Starsteel glows in the deepest cave.');
  const c=world.caves[0];if(!S.deposits.some(d=>d.type==='starsteel_ore')){const st=standTile(c.x,c.y-1)||{x:c.sx,y:c.sy};S.deposits.push({id:S.deposits.length,x:c.x,y:c.y-1,type:'starsteel_ore',amount:6000,max:6000,regen:0,vein:true,sx:c.sx,sy:c.sy,reach:true})}}

// ---------- cave renderer ----------
function paintCave(){const L=CAVE,w=CW*TS,h=CH*TS,c=mk(w,h),g=c.getContext('2d'),im=g.createImageData(w,h),D=im.data,s=L.c.id*91+L.depth*7,t=L.tiles,tone=[[60,52,48],[58,54,62],[52,58,56]][L.depth-1]||[60,52,48];
  for(let py=0;py<h;py++){const ty=py>>4,fy=py&15;for(let px=0;px<w;px++){const tx=px>>4,fx2=px&15,k=t[idx(tx,ty)],hh=hash2(px,py,s),n=vnoise(px/9,py/9,s)*.25;let r,gg,b;
    if(k===CT.WALL||k===CT.CRACK){const below=ty<CH-1?t[idx(tx,ty+1)]:CT.WALL,face=below!==CT.WALL&&below!==CT.CRACK;
      if(face&&fy>=5){const st=(py+Math.floor(vnoise(px/10,py/30,s)*6))%6===0;r=tone[0]*1.25;gg=tone[1]*1.2;b=tone[2]*1.15;if(st){r*=.8;gg*=.8;b*=.8}if(fy>=14){r*=.6;gg*=.6;b*=.6}
        if(k===CT.CRACK){const cr=Math.abs(vnoise(px/4,py/4,s+3)-.5)<.05;if(cr){r=200;gg=150;b=90}}}
      else{r=tone[0]*.45;gg=tone[1]*.45;b=tone[2]*.45;if(face&&fy<5){r*=1.4;gg*=1.4;b*=1.4}}}
    else if(k===CT.WATER){const dd=vnoise(px/6,py/6,s+5);r=20+dd*20;gg=48+dd*30;b=62+dd*30;if(hh>.985){r+=40;gg+=50;b+=50}}
    else if(k===CT.MUD){r=74;gg=56;b=40}
    else{r=tone[0];gg=tone[1];b=tone[2];if(hh>.97){r*=1.25;gg*=1.25;b*=1.2}else if(hh<.04){r*=.75;gg*=.75;b*=.75}if(Math.abs(vnoise(px/8,py/8,s+9)-.5)<.012){r*=.7;gg*=.7;b*=.7}}
    const f=1+n-.12;const o=(py*w+px)*4;D[o]=r*f;D[o+1]=gg*f;D[o+2]=b*f;D[o+3]=255}}
  g.putImageData(im,0,0);L.terrain=c}
function renderCave(dt){const z=cam.zoom,g=ctx,L=CAVE;g.setTransform(DPR,0,0,DPR,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#0a0806';g.fillRect(0,0,VW,VH);
  const shx=cam.shake?rnd(-cam.shake,cam.shake):0,shy=cam.shake?rnd(-cam.shake,cam.shake):0;cam.shake=Math.max(0,cam.shake-dt*20);
  const ox=Math.round((cam.x-VW/2/z)*z)/z-shx,oy=Math.round((cam.y-VH/2/z)*z)/z-shy;g.setTransform(DPR*z,0,0,DPR*z,-ox*z*DPR,-oy*z*DPR);g.drawImage(L.terrain,0,0);
  // ladders
  const ld=(i,down)=>{const x=(i%W)*TS,y=(i/W|0)*TS;g.fillStyle=down?'#120a06':'#2a2016';g.fillRect(x+2,y+3,12,11);g.fillStyle='#8a6a3a';g.fillRect(x+4,y+1,1,14);g.fillRect(x+11,y+1,1,14);for(let k=0;k<4;k++)g.fillRect(x+4,y+3+k*3,8,1)};
  ld(L.up,false);if(L.down>=0)ld(L.down,true);
  const list=[];for(const n of L.nodes)if(n.hp>0)list.push({y:(n.y+.9)*TS,f:()=>drawNode(g,n)});for(const d of L.decor)list.push({y:d.y*TS,f:()=>drawCaveDecor(g,d)});
  for(const t of L.torches)list.push({y:t.y*TS,f:()=>{g.fillStyle='#5a3a22';g.fillRect(t.x*TS-1,t.y*TS+4,2,5);g.fillStyle=Math.random()<.5?'#ffd060':'#ff8a30';g.fillRect(t.x*TS-1,t.y*TS+2,2,2);if(Math.random()<dt*3)fx.smoke(t.x,t.y+.1,'#4a4a50',.6)}});
  for(const e of L.ents)list.push({y:e.y*TS,f:()=>drawEnt(g,e)});const p=S.player;list.push({y:p.y*TS,f:()=>drawPlayer(g)});
  list.sort((a,b)=>a.y-b.y);for(const o of list)o.f();
  for(const b of PROJ)drawProj(g,b);drawParticles(g,z);
  // darkness
  g.setTransform(DPR,0,0,DPR,0,0);const lt=lctx;lt.setTransform(DPR,0,0,DPR,0,0);lt.globalCompositeOperation='source-over';lt.clearRect(0,0,VW,VH);lt.fillStyle='rgba(4,3,8,.86)';lt.fillRect(0,0,VW,VH);lt.globalCompositeOperation='destination-out';
  const lights=[],add=(x,y,r,col)=>{const s=toScreen(x,y),R=r*TS*z*(1+Math.random()*.03);if(s.x<-R||s.y<-R||s.x>VW+R||s.y>VH+R)return;lights.push({x:s.x,y:s.y,R,col})};
  add(p.x,p.y-.5,p.cmb&&p.cmb.light>0?8:p.equip.hand?6.5:4.2,'#ffd890');for(const t of L.torches)add(t.x,t.y+.2,4.2,'#ff9a40');
  for(const n of L.nodes)if(n.hp>0&&n.gem)add(n.x+.5,n.y+.5,1.8,GOODS[n.k].col);for(const d of L.decor)if(d.k==='mush'||d.k==='crystal')add(d.x,d.y,.9,d.c);
  for(const e of L.ents){if(e.kind==='mob'&&e.type==='ghost')add(e.x,e.y-.8,1.4,'#9af0e0');if(e.kind==='mob'&&e.type==='maw')add(e.x,e.y-2,3,'#ff4a8a');if(e.kind==='drop'&&GOODS[e.k]&&GOODS[e.k].cat!=='Ore')add(e.x,e.y-.5,.8,'#ffd860')}
  for(const q of fx.parts)if(q.k==='spark')add(q.x,q.y-q.z,.5,'#ffb040');for(const b of PROJ)if(b.k==='acid'||b.k==='dynamite')add(b.x,b.y,.9,'#ff6040');
  for(const l of lights){const gr=lt.createRadialGradient(l.x,l.y,0,l.x,l.y,l.R);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.5,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');lt.fillStyle=gr;lt.beginPath();lt.arc(l.x,l.y,l.R,0,7);lt.fill()}
  lt.globalCompositeOperation='source-over';g.setTransform(1,0,0,1,0,0);g.drawImage(lc,0,0);g.setTransform(DPR,0,0,DPR,0,0);g.globalCompositeOperation='lighter';
  for(const l of lights){const gr=g.createRadialGradient(l.x,l.y,0,l.x,l.y,l.R*.7);gr.addColorStop(0,hexA(l.col,.22));gr.addColorStop(1,hexA(l.col,0));g.fillStyle=gr;g.beginPath();g.arc(l.x,l.y,l.R*.7,0,7);g.fill()}
  g.globalCompositeOperation='source-over';drawScreenOverlay(g,dt)}
function drawNode(g,n){const x=n.x*TS,y=n.y*TS,col=GOODS[n.k].col,f=n.hp/n.max;g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x+8,y+14,8,2.5,0,0,7);g.fill();
  pcirc(g,x+8,y+10,5,'#3a342e');pcirc(g,x+7,y+9,4,'#5a524a');
  if(n.gem){const k=Math.max(1,Math.round(f*4));for(let i=0;i<k;i++){const cx=x+4+i*3,cy=y+5+(i%2)*3;g.fillStyle=OUTLINE;g.fillRect(cx-1,cy-1,4,7);g.fillStyle=shadeC(col,-.3);g.fillRect(cx,cy,2,5);g.fillStyle=col;g.fillRect(cx,cy,1,4);g.fillStyle='#fff';if((clock*2+i)%3<.2)g.fillRect(cx,cy,1,1)}}
  else{for(let i=0;i<4;i++){const cx=x+4+((i*5)%9),cy=y+6+((i*3)%5);g.fillStyle=col;g.fillRect(cx,cy,2,2);g.fillStyle=shadeC(col,.4);g.fillRect(cx,cy,1,1)}}
  if(n.k==='starsteel_ore'){g.fillStyle=hexA('#7ad8ff',.4+Math.sin(clock*3)*.2);g.fillRect(x+2,y+4,12,8)}}
function drawCaveDecor(g,d){const x=d.x*TS,y=d.y*TS;switch(d.k){
  case'mush':g.fillStyle='#d8c8b0';g.fillRect(x,y-3,1,3);g.fillStyle=d.c;g.fillRect(x-1,y-5,3,2);break;
  case'rock':g.fillStyle='#4a4440';g.fillRect(x-2,y-2,4,2);g.fillStyle='#6a625a';g.fillRect(x-2,y-2,3,1);break;
  case'bones':g.fillStyle='#d8d0c0';g.fillRect(x-3,y-1,6,1);g.fillRect(x-2,y-2,1,3);g.fillRect(x+1,y-2,1,3);break;
  case'crystal':g.fillStyle=d.c;g.fillRect(x,y-5,1,5);g.fillRect(x-2,y-3,1,3);g.fillRect(x+2,y-4,1,4);break;
  case'stal':g.fillStyle='#5a524a';g.fillRect(x-2,y-6,4,6);g.fillRect(x-1,y-9,2,3);g.fillStyle='#7a726a';g.fillRect(x-2,y-6,1,6);break}}
