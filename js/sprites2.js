'use strict';
// ===== detailed pixel sprites: 4-way characters with outlines, weapons, monsters, animals, props =====
const OUTLINE='#1a120c';
const DRAW_HOOKS=[],GROUND_HOOKS=[];
// draw a list of rects [x,y,w,h,col] at feet position; flip mirrors x; outline draws a 1px dark border around the shape
function rects(g,list,x,y,flip,outline,white){x=Math.round(x);y=Math.round(y);
  if(outline){g.fillStyle=OUTLINE;for(const r of list){if(r[5])continue;g.fillRect(flip?x-r[0]-r[2]-1:x+r[0]-1,y+r[1]-1,r[2]+2,r[3]+2)}}
  for(const r of list){g.fillStyle=white?'#ffffff':r[4];g.fillRect(flip?x-r[0]-r[2]:x+r[0],y+r[1],r[2],r[3])}}
function faceOf(dx,dy,prev){if(Math.abs(dx)<.01&&Math.abs(dy)<.01)return prev||'down';return Math.abs(dy)>Math.abs(dx)*1.1?(dy>0?'down':'up'):'side'}
function hatRects(L,face,hy){const c=L.hatCol,d=shadeC(c||'#333',-.25),out=[];switch(L.hat){
  case'helmet':out.push([-4,hy+1,8,2,c],[-3,hy-1,6,2,c],[-2,hy-2,4,1,shadeC(c,.2)]);if(face!=='up')out.push([face==='side'?2:-1,hy,2,2,'#fff3a0']);break;
  case'stetson':case'wide':out.push([-6,hy+2,12,1,d],[-3,hy-1,6,3,c],[-3,hy+1,6,1,L.hat==='wide'?'#c8a040':'#5a3a22'],[-2,hy-2,4,1,shadeC(c,.15)]);break;
  case'straw':out.push([-6,hy+2,12,1,shadeC(c,-.15)],[-3,hy,6,2,c],[-3,hy+1,6,1,'#a83a2a']);break;
  case'cap':out.push([-3,hy,6,3,c]);if(face==='side')out.push([3,hy+2,3,1,d]);else if(face==='down')out.push([-3,hy+2,6,1,d]);break;
  case'toque':out.push([-3,hy-2,6,4,'#ffffff'],[-4,hy-4,8,3,'#f4f4f4']);break;
  case'bowler':out.push([-4,hy+2,8,1,c],[-3,hy-1,6,3,c],[-2,hy-2,4,1,shadeC(c,.2)]);break;
  case'tophat':out.push([-4,hy+2,8,1,c],[-3,hy-4,6,6,c],[-3,hy,6,1,'#6a2a3a']);break;
  case'bandana':out.push([-3,hy+1,6,2,c]);if(face!=='down')out.push([-4,hy+2,1,3,c]);break;
  case'goggles':out.push([-3,hy+1,6,2,L.hair]);if(face!=='up')out.push([-3,hy+2,6,1,'#3a2a1a'],[face==='side'?1:-2,hy+1,2,2,'#c89a40'],[face==='side'?1:1,hy+1,face==='side'?0:2,2,'#c89a40']);break;}
  return out}
function charRects(L,o){const face=o.face||'side',ph=o.moving?Math.sin(o.walk*3.2):0,lo=Math.round(ph*1.6),a=Math.round(ph*1.3),bob=o.moving&&Math.abs(ph)>.6?-1:0;
  const sk=L.skin,skD=shadeC(sk,-.18),sh=L.shirt,shD=shadeC(sh,-.25),pa=L.pants,boot='#2a1c12',hair=L.hair||'#3a2a1a',R=[];const k=o.kneel?3:0,by=bob+k;
  // legs
  if(o.kneel){R.push([-3,-3,6,3,pa],[-3,-1,2,1,boot],[2,-1,2,1,boot])}
  else if(face==='side'){R.push([-2+lo,-6,2,6,pa],[0-lo,-6,2,6,shadeC(pa,-.15)],[-2+lo,-1,3,1,boot],[0-lo,-1,3,1,boot])}
  else{const l1=lo>0?1:0,l2=lo<0?1:0;R.push([-3,-6,2,6-l1,pa],[1,-6,2,6-l2,pa],[-3,-1-l1,2,1,boot],[1,-1-l2,2,1,boot],[-1,-6,2,1,shadeC(pa,-.2)])}
  // body
  if(face==='side'){R.push([-3,-13+by,6,7,sh],[1,-13+by,2,7,shD],[-3,-7+by,6,1,'#3a2a1a'])}
  else{R.push([-4,-13+by,8,7,sh],[3,-13+by,1,7,shD],[-4,-7+by,8,1,'#3a2a1a']);if(face==='down')R.push([-1,-7+by,2,1,'#d8b040'])}
  if(o.carry&&face!=='down')R.push([face==='side'?-5:-3,-13+by,face==='side'?3:6,5,'#8a6a3a'],[face==='side'?-5:-3,-13+by,face==='side'?3:6,1,'#a8884a']);
  if(face!=='up'){if(L.vest)R.push([-4,-13+by,2,6,L.vest],[2,-13+by,2,6,L.vest]);if(L.apron)R.push([-3,-11+by,6,5,L.apron]);if(L.star)R.push([face==='side'?1:1,-11+by,1,1,'#ffd23f']);if(L.bandana)R.push([-2,-13+by,4,1,L.bandana])}
  // arms
  const up=o.kneel;if(face==='side'){if(!o.armOut)R.push([-1+a,-12+by,2,5,shD],[-1+a,-8+by,2,1,sk])}
  else if(up){R.push([-5,-17+by,1,5,sh],[4,-17+by,1,5,sh],[-5,-18+by,1,1,sk],[4,-18+by,1,1,sk])}
  else{R.push([-5,-12+by+a,1,5,sh],[4,-12+by-a,1,5,shD],[-5,-7+by+a,1,1,sk],[4,-7+by-a,1,1,sk])}
  // head
  const hy=-20+by;
  if(face==='up'){R.push([-3,hy+1,6,6,hair],[-1,hy+7,2,1,skD])}
  else if(face==='side'){R.push([-3,hy+1,6,6,sk],[2,hy+3,2,2,sk],[3,hy+4,1,1,skD],[1,hy+3,1,1,'#1a1410'],[-3,hy+1,3,3,hair],[-3,hy+4,1,2,hair]);if(L.female)R.push([-4,hy+2,2,6,hair]);if(L.beard)R.push([0,hy+6,3,1,hair])}
  else{R.push([-3,hy+1,6,6,sk],[2,hy+1,1,6,skD],[-2,hy+4,1,1,'#1a1410'],[1,hy+4,1,1,'#1a1410'],[-3,hy+1,6,2,hair]);if(L.female)R.push([-4,hy+2,1,6,hair],[3,hy+2,1,6,hair]);if(L.beard)R.push([-2,hy+6,4,1,hair]);else R.push([-1,hy+6,2,1,shadeC(sk,-.3)])}
  R.push(...hatRects(L,face,hy));
  if(o.tied)R.push([-4,-11+by,8,1,'#c8a870'],[-4,-9+by,8,1,'#c8a870']);
  return R}
function drawChar2(g,x,y,L,o){const flip=o.face==='side'&&o.dir<0;
  if(o.dead){g.save();g.translate(Math.round(x),Math.round(y));g.rotate(Math.PI/2*(o.dir<0?-1:1));const R=charRects(L,{...o,moving:false,face:'side'});rects(g,R,0,4,false,true);g.restore();return}
  g.fillStyle='rgba(0,0,0,.32)';g.beginPath();g.ellipse(x,y,5,1.8,0,0,7);g.fill();
  if(o.roll>0){g.save();g.translate(Math.round(x),Math.round(y-6));g.rotate((1-o.roll)*Math.PI*2*(o.dir||1));g.globalAlpha=.9;const R=charRects(L,{...o,moving:false,face:'down'});rects(g,R,0,7,false,true);g.restore();g.globalAlpha=1;return}
  const R=charRects(L,o),white=o.hurt>0&&Math.floor(o.hurt*20)%2===0;
  // weapon behind the body when facing up
  if(o.face==='up')drawWeapon(g,x,y,o);
  rects(g,R,x,y,flip,true,white);
  if(o.face!=='up')drawWeapon(g,x,y,o);
  if(o.lamp){g.fillStyle='#ffd870';g.fillRect(Math.round(x)+(flip?-6:5),Math.round(y)-8,1,2)}}
// weapon or tool in hand. o.aim = angle; o.swing 1→0 during an attack; o.gun shows a held gun
function drawWeapon(g,x,y,o){const k=o.weapon||o.toolKind;if(!k)return;const sw=o.swing>0;if(!sw&&!o.gun&&!o.show)return;
  g.save();g.translate(Math.round(x),Math.round(y-9));
  const W2=GOODS[k]&&GOODS[k].w;let ang=o.aim!=null?o.aim:(o.dir<0?Math.PI:0);
  if(sw&&!(W2&&W2.gun)){const arc=(W2&&W2.arc)||1.6,t=1-o.swing;ang=ang-arc/2+arc*Math.min(1,t*1.6);
    if(W2&&o.swing>.2){g.globalAlpha=.35*o.swing;g.fillStyle=W2.glow||'#ffffff';g.beginPath();g.moveTo(0,0);g.arc(0,0,(W2.range||1)*TS*.9,ang-arc*.6,ang,false);g.closePath();g.fill();g.globalAlpha=1}}
  g.rotate(ang);const F=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(a,b,w,h)};
  switch(k){
    case'knife':F(2,-1,4,2,'#5a3a22');F(6,-1,6,2,'#d8dce4');F(6,-1,6,1,'#ffffff');break;
    case'saber':F(2,-1,3,2,'#c8a040');F(5,-1,11,2,'#e0e4ec');F(5,-1,11,1,'#ffffff');F(4,-2,1,4,'#c8a040');break;
    case'spear':F(-2,-1,20,1,'#8a6a3a');F(18,-2,5,3,'#c8ccd4');F(22,-1,2,1,'#ffffff');break;
    case'starblade':F(2,-1,3,2,'#3a3a5a');F(5,-2,14,3,'#7ad8ff');F(5,-2,14,1,'#e8ffff');F(4,-3,1,5,'#9ae8ff');if(Math.random()<.4){F(8+Math.random()*10,-3+Math.random()*4,1,1,'#ffffff')}break;
    case'revolver':F(3,-2,4,4,'#4a3a2a');F(5,-2,7,2,'#6a6e78');F(5,-2,7,1,'#9aa0aa');break;
    case'rifle':F(-2,-1,8,3,'#7a5a3a');F(6,-1,12,2,'#5a5e68');F(6,-1,12,1,'#8a8e98');break;
    case'pick':case'pickaxe':case'drill':F(0,-1,9,1,'#7a5230');F(8,-4,1,7,k==='drill'?'#8ab0d0':'#b8bcc4');break;
    case'axe':F(0,-1,9,1,'#7a5230');F(7,-3,3,4,'#b8bcc4');break;
    case'hammer':F(0,-1,7,1,'#7a5230');F(6,-2,3,3,'#5a5e66');break;
    case'sickle':F(0,-1,5,1,'#7a5230');F(5,-3,1,1,'#d0d4dc');F(6,-4,2,1,'#d0d4dc');F(8,-3,1,2,'#d0d4dc');break;
    case'can':F(2,-2,4,4,'#3a3a40');F(2,-2,4,1,'#7a4bd0');break;
    default:F(2,-1,6,2,'#c8ccd4')}
  g.restore()}

// ---------- monsters ----------
function drawMob(g,e){const x=Math.round(e.x*TS),y=Math.round(e.y*TS),t=clock+e.id*.7,wind=e.state==='windup',white=e.hurt>0&&Math.floor(e.hurt*20)%2===0;
  const F=(a,b,w,h,c)=>{g.fillStyle=white?'#fff':wind&&Math.floor(clock*14)%2===0?shadeC(c,.35):c;g.fillRect(x+a,y+b,w,h)};
  const O=(a,b,w,h)=>{g.fillStyle=OUTLINE;g.fillRect(x+a-1,y+b-1,w+2,h+2)};const sh=(rx,ry)=>{g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill()};
  const fl=e.vx<0?-1:1;
  if(e.dead){g.globalAlpha=Math.max(0,1-e.deadT*1.4)}
  switch(e.type){
    case'bat':{const h=-10-Math.sin(t*6)*2,w=Math.sin(t*18)>0?6:3;sh(3,1);O(-2,h,4,3);F(-2,h,4,3,'#4a3a5a');F(-2-w,h-1+(w<4?2:0),w,2,'#5a4a6a');F(2,h-1+(w<4?2:0),w,2,'#5a4a6a');F(-1,h+1,1,1,'#ff4040');F(1,h+1,1,1,'#ff4040');break}
    case'spider':{sh(7,2);const l=Math.sin(t*12)*1.2;for(let i=0;i<4;i++){F(-8,-5+i*2+(i%2?l:-l),5,1,'#2a1a14');F(3,-5+i*2+(i%2?-l:l),5,1,'#2a1a14')}
      O(-4,-8,8,6);F(-4,-8,8,6,'#3a2a22');F(-3,-8,6,2,'#5a4232');F(-1,-5,2,2,'#c82a2a');F(-2,-9,1,1,'#ff5050');F(1,-9,1,1,'#ff5050');F(-3,-9,1,1,'#ff5050');F(2,-9,1,1,'#ff5050');break}
    case'crawler':case'minicrawler':{const s=e.type==='crawler'?1:.6,sq=1+Math.sin(t*5)*.12;const w=Math.round(10*s*sq),h=Math.round(7*s/sq);sh(w/2+1,2);
      g.globalAlpha=(e.dead?g.globalAlpha:1)*.85;O(-w/2,-h,w,h);F(-w/2,-h,w,h,'#6ab830');F(-w/2+1,-h,w-2,2,'#9ae060');F(-2,-h+2,1,2,'#1a2a10');F(1,-h+2,1,2,'#1a2a10');g.globalAlpha=e.dead?g.globalAlpha:1;break}
    case'golem':{sh(10,3);const st=Math.sin(t*3)*.8;O(-8,-20,16,16);F(-8,-20,16,16,'#7a746c');F(-8,-20,16,3,'#9a948a');F(-8,-6,16,2,'#5a5650');
      F(-12,-16+st,4,9,'#6a645c');F(8,-16-st,4,9,'#6a645c');F(-7,-4,5,4,'#5a5650');F(2,-4,5,4,'#5a5650');
      const glow=wind?'#ffd040':'#ff8a30';F(-4,-16,2,2,glow);F(2,-16,2,2,glow);F(-1,-11,2,4,glow);F(-5,-9,1,3,glow);F(4,-12,1,3,glow);break}
    case'ghost':{const a=e.phase>0?.25:.7+Math.sin(t*3)*.1;g.globalAlpha=(e.dead?g.globalAlpha:1)*a;const fy=-16+Math.sin(t*2)*2;
      F(-5,fy,10,12,'#9af0e0');F(-4,fy-3,8,4,'#c8fff4');F(-5,fy-4,10,2,'#c9a23a');F(-2,fy,1,2,'#1a3a3a');F(1,fy,1,2,'#1a3a3a');for(let i=0;i<5;i++)F(-5+i*2,fy+12+((i+Math.floor(t*6))%2),2,2,'#9af0e0');g.globalAlpha=1;break}
    case'wolf':case'alpha':{const s=e.type==='alpha'?1.35:1;sh(7*s,2);g.save();g.translate(x,y);g.scale(fl*s,s);g.translate(-x,-y);const l=e.moving?Math.sin(t*14)*1.5:0,c=e.type==='alpha'?'#5a5258':'#8a8890',cd=shadeC(c,-.25);
      O(-6,-9,12,5);F(-6,-9,12,5,c);F(-6,-5,12,1,cd);F(4,-11,5,5,c);F(7,-9,3,2,cd);F(5,-12,1,2,cd);F(8,-12,1,2,cd);F(7,-10,1,1,e.type==='alpha'?'#ff3030':'#ffd040');
      F(-9,-9,3,2,cd);F(-5,-4,2,4+Math.round(l),cd);F(-2,-4,2,4-Math.round(l),c);F(2,-4,2,4+Math.round(l),cd);F(4,-4,2,4-Math.round(l),c);g.restore();break}
    case'bear':{sh(12,3);g.save();g.translate(x,y);g.scale(fl,1);g.translate(-x,-y);const l=e.moving?Math.sin(t*10)*1.5:0;O(-10,-15,20,10);F(-10,-15,20,10,'#5a3a24');F(-10,-15,20,3,'#7a5234');
      F(7,-17,7,7,'#5a3a24');F(12,-14,3,3,'#8a6a4a');F(8,-18,2,2,'#4a2a1a');F(11,-15,1,1,'#1a1010');for(let i=0;i<4;i++)F(-9+i*5,-5,3,5+(i%2?l:-l),'#4a2e1c');g.restore();break}
    case'bandit':case'outlaw':{const L=e.look||CLASSES.outlaw;drawChar2(g,e.x*TS,e.y*TS,L,{face:e.face||'side',dir:fl,walk:e.walk||0,moving:e.moving,hurt:e.hurt,weapon:e.weapon||'revolver',gun:true,aim:e.aim,kneel:e.state==='surrender',tied:e.tied,dead:e.dead,swing:0});
      if(wind&&!e.dead){g.strokeStyle='rgba(255,60,40,.6)';g.lineWidth=.6;g.beginPath();g.moveTo(e.x*TS,e.y*TS-9);g.lineTo(e.x*TS+Math.cos(e.aim)*TS*8,e.y*TS-9+Math.sin(e.aim)*TS*8);g.stroke()}break}
    case'maw':{const rise=e.phase==='burrow'?Math.max(0,1-e.pt*2):1,h=Math.round(46*rise);sh(22,6);
      for(let i=0;i<6;i++){const w=26-i*2;F(-w/2,-8-i*7*rise,w,8,i%2?'#6a2a3a':'#7a3a4a');F(-w/2,-8-i*7*rise,w,2,'#9a5a6a')}
      if(rise>.6){const open=wind||e.state==='attack'?6:2;F(-10,-h-6,20,8,'#4a1a2a');F(-8,-h-4,16,open,'#1a0508');for(let i=0;i<5;i++){F(-8+i*4,-h-4,2,3,'#f0e8d8');F(-7+i*4,-h-4+open-1,2,2,'#f0e8d8')}
        F(-12,-h-2,3,3,'#ff4a8a');F(9,-h-2,3,3,'#ff4a8a')}break}
  }
  g.globalAlpha=1;
  if(e.poisoned>0){g.fillStyle='#8ad040';g.fillRect(x-1,y-22,2,2)}
  // health bar when hurt
  if(!e.dead&&e.hp<e.max&&e.type!=='maw'){const w=16;g.fillStyle='rgba(0,0,0,.6)';g.fillRect(x-w/2,y-26,w,2);g.fillStyle=e.hostile===false?'#9ad672':'#e8504a';g.fillRect(x-w/2,y-26,w*Math.max(0,e.hp/e.max),2)}
  if(e.state==='windup'&&e.slam){g.strokeStyle=`rgba(255,80,40,${.4+Math.sin(clock*20)*.2})`;g.lineWidth=1;g.beginPath();g.ellipse(x,y,e.slam*TS,e.slam*TS*.5,0,0,7);g.stroke()}}
// ---------- animals ----------
function drawAnimal(g,e){const x=Math.round(e.x*TS),y=Math.round(e.y*TS),t=clock+e.id,fl=e.vx<0?-1:1,l=e.moving?Math.round(Math.sin(t*12)*1.2):0,white=e.hurt>0&&Math.floor(e.hurt*20)%2===0;
  g.save();g.translate(x,y);g.scale(fl,1);const F=(a,b,w,h,c)=>{g.fillStyle=white?'#fff':c;g.fillRect(a,b,w,h)},O=(a,b,w,h)=>{g.fillStyle=OUTLINE;g.fillRect(a-1,b-1,w+2,h+2)};
  g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(0,0,{chicken:3,rabbit:3,sheep:6,pig:6,cow:8,deer:6}[e.type]||5,1.5,0,0,7);g.fill();
  if(e.dead)g.globalAlpha=Math.max(0,1-e.deadT*1.4);
  switch(e.type){
    case'chicken':{const p=e.peck>0?2:0;O(-3,-6,5,4);F(-3,-6,5,4,'#f4f0e0');F(1,-8+p,3,3,'#f4f0e0');F(4,-7+p,1,1,'#e0a020');F(2,-9+p,2,1,'#d83a2a');F(3,-7+p,1,1,'#1a1010');F(-1,-2,1,2,'#e0a020');F(1,-2,1,2,'#e0a020');F(-4,-6,2,2,'#e8e4d4');break}
    case'rabbit':{const hop=e.moving?Math.abs(Math.sin(t*10))*2:0;O(-3,-5-hop,6,4);F(-3,-5-hop,6,4,'#b8a088');F(2,-7-hop,3,3,'#b8a088');F(3,-10-hop,1,3,'#c8b098');F(4,-6-hop,1,1,'#1a1010');F(-4,-4-hop,2,2,'#f0f0f0');break}
    case'sheep':{O(-6,-9,11,6);F(-6,-9,11,6,e.wool?'#f0ece4':'#d8d0c0');for(let i=0;i<4;i++)F(-6+i*3,-10,2,1,'#f8f6f0');F(4,-9,3,4,'#2a2a2a');F(5,-8,1,1,'#ffffff');F(-5,-3,1,3+l,'#2a2a2a');F(-2,-3,1,3-l,'#2a2a2a');F(1,-3,1,3+l,'#2a2a2a');F(3,-3,1,3-l,'#2a2a2a');break}
    case'pig':{O(-6,-7,11,5);F(-6,-7,11,5,'#f0a8a8');F(-6,-7,11,1,'#f8c0c0');F(4,-7,3,4,'#f0a8a8');F(7,-5,1,2,'#d88888');F(5,-6,1,1,'#1a1010');F(-7,-6,1,1,'#d88888');F(-5,-2,2,2+l,'#d88888');F(1,-2,2,2-l,'#d88888');break}
    case'cow':{O(-8,-11,15,7);F(-8,-11,15,7,'#f0ece4');F(-6,-11,4,3,'#2a2a2a');F(0,-8,4,3,'#2a2a2a');F(6,-12,4,5,'#f0ece4');F(8,-9,3,2,'#f0b0a0');F(7,-13,1,2,'#d8c8a0');F(9,-13,1,2,'#d8c8a0');F(7,-11,1,1,'#1a1010');
      for(const lx of[-7,-4,1,4])F(lx,-4,2,4+(lx%2?l:-l),'#e0dcd0');F(-1,-4,2,1,'#f0b0a0');break}
    case'deer':{O(-6,-11,11,5);F(-6,-11,11,5,'#a8784a');F(-6,-7,11,1,'#8a5a30');F(4,-15,3,5,'#a8784a');F(5,-13,1,1,'#1a1010');F(3,-18,1,3,'#d8c8a0');F(6,-18,1,3,'#d8c8a0');F(2,-19,1,1,'#d8c8a0');F(7,-19,1,1,'#d8c8a0');
      F(-7,-10,2,2,'#f0f0f0');for(const lx of[-5,-3,1,3])F(lx,-6,1,6+(lx%2?l:-l),'#8a5a30');break}
  }
  g.restore();
  if(e.ready&&!e.dead){g.fillStyle='rgba(20,14,8,.85)';g.beginPath();g.arc(x,y-20,6,0,7);g.fill();const im=iconImg(ANIMALS[e.type].produce);if(im.complete){g.imageSmoothingEnabled=false;g.drawImage(im,x-5,y-25,10,10)}}}
// ---------- props, drops, projectiles ----------
function drawDrop(g,d){const x=d.x*TS,y=d.y*TS,b=Math.sin(clock*4+d.id)*1.5;g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x,y,4,1.5,0,0,7);g.fill();
  const im=iconImg(d.k);if(im.complete){g.imageSmoothingEnabled=false;g.drawImage(im,Math.round(x-6),Math.round(y-14+b),12,12)}
  if(GOODS[d.k]&&(GOODS[d.k].cat==='Gem'||GOODS[d.k].cat==='Quest')&&Math.random()<.05)fx.glint(d.x+rnd(-.2,.2),d.y-.5,'#ffffff')}
function drawChest(g,c){const x=Math.round(c.x*TS),y=Math.round(c.y*TS),F=(a,b,w,h,col)=>{g.fillStyle=col;g.fillRect(x+a,y+b,w,h)};
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,7,2,0,0,7);g.fill();g.fillStyle=OUTLINE;g.fillRect(x-7,y-10,14,10);
  const gold=c.rare;F(-6,-7,12,7,gold?'#8a5a2a':'#7a4a24');F(-6,-7,12,1,'#a8784a');F(-6,-4,12,1,'#4a2e18');F(-1,-5,2,3,gold?'#ffd23f':'#c8a040');
  if(c.open){F(-6,-12,12,4,'#5a3a1c');F(-5,-11,10,2,'#2a1a0c');if(c.t<1.2)for(let i=0;i<2;i++)fx.glint(c.x+rnd(-.3,.3),c.y-.6,'#ffd860')}else{F(-6,-9,12,3,gold?'#a86a2a':'#8a5a2c');F(-6,-9,12,1,'#b8885a')}
  if(gold&&!c.open&&Math.random()<.04)fx.glint(c.x+rnd(-.3,.3),c.y-.5,'#ffd860')}
function drawProj(g,p){const x=p.x*TS,y=p.y*TS-8;
  if(p.k==='bullet'){g.strokeStyle=p.enemy?'#ff9a60':'#fff0a0';g.lineWidth=1.4;g.beginPath();g.moveTo(x,y);g.lineTo(x-p.vx*.06*TS,y-p.vy*.06*TS);g.stroke()}
  else if(p.k==='spit'){g.fillStyle='#8ad040';g.beginPath();g.arc(x,y,2.5,0,7);g.fill()}
  else if(p.k==='acid'){g.fillStyle='#ff4a8a';g.beginPath();g.arc(x,y,3.5,0,7);g.fill();g.fillStyle='#ffc0d8';g.fillRect(x-1,y-1,1,1)}
  else if(p.k==='dynamite'){g.save();g.translate(x,y-p.z*TS);g.rotate(clock*12);g.fillStyle='#d83a2a';g.fillRect(-3,-1,6,2);g.fillStyle='#fff0a0';g.fillRect(3,-1,1,1);g.restore();if(Math.random()<.5)fx.sparks(p.x+.2,p.y-p.z-.5,1)}
  else if(p.k==='wave'){g.strokeStyle=`rgba(122,216,255,${p.life})`;g.lineWidth=2;g.beginPath();g.arc(x,y+6,p.r*TS,0,7);g.stroke()}}

// ---------- shared drawing used by the valley and the caves ----------
function drawEnt(g,e){if(e.kind==='mob')drawMob(g,e);else if(e.kind==='animal')drawAnimal(g,e);else if(e.kind==='drop')drawDrop(g,e);else if(e.kind==='chest')drawChest(g,e);else if(e.kind==='friend')drawChar2(g,e.x*TS,e.y*TS,e.look,{face:'down',dir:1,walk:0,moving:false,swing:0,kneel:true})}
function playerDrawOpts(){const p=S.player,c=p.cmb||{},W=p.equip.weapon?p.equip.weapon.k:null,showW=!!W&&(inCombatCache||c.atk>0||CB.down);
  let weapon=null,aim=null;if(showW){weapon=W;aim=c.atk>0?c.aim:aimAtSafe()}else if(p.swing>0)weapon=p.toolNow||(p.equip.tool?p.equip.tool.k:'pick');
  return{face:p.face||'down',dir:p.dir,walk:p.walk,moving:p.moving,swing:p.swing,hurt:c.hurt||0,roll:c.dodge>0?c.dodge/.32:0,dead:p.dead,carry:load(p)>0,lamp:!!p.equip.hand,
    weapon,aim,gun:!!(W&&GOODS[W].w&&GOODS[W].w.gun&&showW),show:showW}}
function aimAtSafe(){try{return aimAt()}catch(e){return 0}}
function drawPlayer(g){const p=S.player;drawChar2(g,p.x*TS,p.y*TS,playerLook(),playerDrawOpts());
  const c=p.cmb;if(c&&c.charging&&c.charge>.15){const k=Math.min(1,c.charge/.45);g.strokeStyle=hexA(k>=1?'#ffd23f':'#ffffff',.35+.4*k);g.lineWidth=1;g.beginPath();g.ellipse(p.x*TS,p.y*TS,6+k*4,2+k*1.5,0,0,7);g.stroke()}}
function drawParticles(g,z){for(const p of fx.parts){const a=1-p.life/p.max;
    if(p.k==='smoke'){g.globalAlpha=a*.45;g.fillStyle=p.col;const r=p.s*(1+p.life*.8);g.beginPath();g.arc(p.x*TS,(p.y-p.z)*TS,r,0,7);g.fill()}
    else if(p.k==='spark'){g.globalAlpha=a;g.fillStyle=p.col;g.fillRect(p.x*TS,(p.y-p.z)*TS,1,1)}
    else if(p.k==='fw'){g.globalAlpha=a;g.fillStyle=p.col;g.fillRect(p.x*TS,(p.y-p.z)*TS,2,2)}
    else if(p.k==='glint'){g.globalAlpha=Math.sin(a*Math.PI);g.fillStyle=p.col;const x=p.x*TS,y=(p.y-p.z)*TS;g.fillRect(x-1,y,3,1);g.fillRect(x,y-1,1,3)}
    else if(p.k==='coin'){g.globalAlpha=a;g.fillStyle=Math.sin(p.life*30)>0?'#ffd23f':'#b8902a';g.fillRect(p.x*TS-1,(p.y-p.z)*TS-1,2,2)}
    else{g.globalAlpha=Math.min(1,a*1.5);g.fillStyle=p.col;const s=p.s||1;g.fillRect(p.x*TS,(p.y-p.z)*TS,s,s)}}
  g.globalAlpha=1;for(const r of fx.rings){const a=1-r.t/r.max;g.strokeStyle=hexA(r.col,a);g.lineWidth=2/z*2;g.beginPath();g.ellipse(r.x*TS,r.y*TS-6,4+r.t*30,2+r.t*12,0,0,7);g.stroke()}}
function drawTexts(g){for(const t of fx.texts){const s=toScreen(t.x,t.y),k=t.t/t.max;g.globalAlpha=k<.7?1:1-(k-.7)/.3;g.font=`700 ${t.big?18:14}px Inter,system-ui,sans-serif`;g.textAlign='center';
  const y=s.y-k*40*(t.big?1.3:1);g.lineWidth=3;g.strokeStyle='rgba(20,12,6,.85)';g.strokeText(t.txt,s.x,y);g.fillStyle=t.col;g.fillText(t.txt,s.x,y)}g.globalAlpha=1}
function drawEntBubbles(g){const z=cam.zoom;for(const e of curEnts()){if(!e.bubble)continue;const s=toScreen(e.x,e.y);bubble(g,s.x,s.y-20*z,e.bubble)}}
function drawScreenOverlay(g,dt){drawTargetPrompt(g);drawEntBubbles(g);if(S.player.bubble){const s=toScreen(S.player.x,S.player.y);bubble(g,s.x,s.y-20*cam.zoom-6,S.player.bubble)}drawTexts(g);
  if(typeof drawQuestArrow==='function')drawQuestArrow(g);
  const vg=g.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*.4,VW/2,VH/2,Math.max(VW,VH)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=vg;g.fillRect(0,0,VW,VH);
  if(S.player.dead){g.fillStyle=`rgba(60,0,0,${Math.min(.6,S.player.cmb.deadT*.4)})`;g.fillRect(0,0,VW,VH);g.font='700 34px Cinzel,Georgia';g.textAlign='center';g.fillStyle='#f3cc6e';g.fillText('You are knocked out',VW/2,VH/2)}}
function drawCaveMouth(g,c){const x=c.x*TS,y=c.y*TS;g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x+8,y+16,12,3,0,0,7);g.fill();
  g.fillStyle='#3a2c22';g.fillRect(x-3,y-2,22,18);g.fillStyle='#0c0806';g.beginPath();g.ellipse(x+8,y+9,8,8,0,Math.PI,0);g.fill();g.fillRect(x,y+9,16,7);
  g.fillStyle='#7a5230';g.fillRect(x-1,y,3,16);g.fillRect(x+14,y,3,16);g.fillRect(x-2,y-2,20,3);g.fillStyle='#9a7040';g.fillRect(x-2,y-2,20,1);
  g.fillStyle=c.story?'#d8b040':'#c8a070';g.fillRect(x+5,y-6,6,4);g.fillStyle='#3a2a1a';g.fillRect(x+7,y-5,2,2)}
