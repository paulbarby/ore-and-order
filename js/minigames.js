'use strict';
// ===== work mini-games: forge (anvil), smelt (furnace), bake (oven), serve (shop counter) =====
// Each game returns a quality from 0 to 1. Work mode makes real goods for the shop's work orders.
const MG={on:null,raf:0,last:0,parts:[],texts:[],imgs:{},mx:0,my:0};
const MGW=760,MGH=400;
function mgImg(src){if(!MG.imgs[src]){const im=new Image();im.src=src;MG.imgs[src]=im}return MG.imgs[src]}
function grade(q){return q>=.9?['Excellent','#ffd23f']:q>=.7?['Good','#9ad672']:q>=.45?['Fair','#d4c79a']:q>=.25?['Poor','#e0a060']:['Failed','#e8705e']}
const MG_HELP={anvil:'Press SPACE or click when the marker is in the green. Hot metal only: press R to reheat when the bar goes blue.',
  furnace:'Hold SPACE or the mouse to pump the bellows. Keep the heat in the green band. Then hold to pour and let go at the line.',
  oven:'Knead: press SPACE or click when the ring meets the dough. Bake: click a loaf (or press 1, 2, 3) when it turns golden.',
  counter:'Click the item each customer asks for. If the shop has none, click Sold out. Be quick for a tip.'};

// ---------- work orders: what a business needs made now ----------
function matStatus(z,r){let ok=true,cost=0;const buy={},missing=[];
  for(const k in r.in){const short=r.in[k]-(z.inv[k]||0);if(short<=0)continue;const c=price(k)*short;
    if(S.market.stock[k]>=short&&z.cash>=cost+c){buy[k]=short;cost+=c}else{ok=false;missing.push(k)}}
  return{ok,cost,buy,missing}}
function workOrders(z){const T=BIZ_TYPES[z.type],out=[];if(!T.station)return out;
  for(const r of RECIPES[T.station]){const k=r.out;let need=0,why=[];
    const ext=S.orders.filter(o=>o.k===k&&o.from!==z.id&&o.got<o.qty);const extQty=ext.reduce((a,o)=>a+o.qty-o.got,0);
    if(T.retail){const n=Math.max(0,(z.make[k]||0)-(z.inv[k]||0));if(n){need+=n;why.push(`shelf ${z.inv[k]||0} of ${z.make[k]}`)}}
    else if(z.make[k]){const ms=S.market.stock[k],n=Math.max(0,Math.ceil((target(k)*2-ms)/2));if(n){need+=n;why.push(`market has ${ms}`)}}
    if(extQty){need+=extQty;why.push(...ext.map(o=>`${orderFrom(o)} wants ${o.qty-o.got}`))}
    if(z.job===k&&!need){need=1;why.push('job in progress')}
    if(need)out.push({r,k,need,why:why.join(' · '),ext:extQty,mat:matStatus(z,r)})}
  return out.sort((a,b)=>b.ext-a.ext||b.need-a.need)}
function piecePay(z,r,q){return z.owner==="player"?0:Math.max(1,Math.round(z.wage*r.t*.6*(.25+q)))}

// ---------- start ----------
function mgWork(zid,k){const z=bizById(zid),p=S.player;if(!z)return;const st=BIZ_TYPES[z.type].station,r=RECIPES[st].find(r=>r.out===k);
  const cost=Math.max(3,r.t*1.6);if(p.energy<cost){toast('You are too tired to work. Eat, then sleep at the Inn.','bad');return}
  const m=matStatus(z,r);if(!m.ok){toast(`The ${z.name} has no ${m.missing.map(x=>GOODS[x].n.toLowerCase()).join(' or ')}. Deliver some, or buy them at the Market Hall.`,'bad');return}
  if(z.owner!=='player'&&z.cash<piecePay(z,r,.5)+m.cost){toast(`The ${z.name} cannot pay you now.`,'bad');return}
  mgStart({kind:st,mode:'work',z,r,k,title:`${STATION_NAME[st]}: ${r.n>1?r.n+' × ':''}${GOODS[k].n} for the ${z.name}`})}
function mgCraft(zid,k){const z=bizById(zid),p=S.player;if(!z)return;const st=BIZ_TYPES[z.type].station,r=RECIPES[st].find(r=>r.out===k);
  if(!hasInputs(r)){toast('You do not have the materials.','bad');return}const cost=Math.max(2,r.t*1.2);if(p.energy<cost){toast('You are too tired to craft.','bad');return}
  if(p.cash<craftFee(z)){toast('You cannot pay the bench fee.','bad');return}
  mgStart({kind:st,mode:'craft',z,r,k,title:`${STATION_NAME[st]}: ${r.n>1?r.n+' × ':''}${GOODS[k].n} for you`})}
function mgServe(zid){const z=bizById(zid),p=S.player;if(!z)return;if(p.energy<6){toast('You are too tired to work.','bad');return}
  if(!Object.keys(z.inv).some(k=>sellsGood(z,k)&&z.inv[k]>0)){toast('The shelves are empty. Nothing to sell.','bad');return}
  mgStart({kind:'counter',mode:'serve',z,k:null,title:`Serve customers at the ${z.name}`})}
function mgStart(cfg){const g={...cfg,t:0,phase:0,done:false,res:null};MG.parts=[];MG.texts=[];MG.on=g;UI.mg=true;
  MG_INIT[g.kind](g);$('#mgTitle').textContent=g.title;$('#mgHelp').textContent=MG_HELP[g.kind];$('#mgIcon').src=iconOf(g.k||'notes');
  $('#mgSkip').style.display='';$('#mgAgain').style.display='none';$('#mgQuit').textContent='Stop';$('#mgStatus').textContent='';
  $('#mg').classList.add('show');mgResize();MG.last=performance.now();cancelAnimationFrame(MG.raf);MG.raf=requestAnimationFrame(mgFrame);sfx('ui_open')}
function mgResize(){const c=$('#mgCanvas'),d=Math.min(2,devicePixelRatio||1);c.width=MGW*d;c.height=MGH*d;c.getContext('2d').setTransform(d,0,0,d,0,0)}
function mgClose(){const g=MG.on;MG.on=null;UI.mg=false;cancelAnimationFrame(MG.raf);$('#mg').classList.remove('show');for(const k in keys)keys[k]=false;if(g&&g.done)renderWin()}
function mgAgain(){const g=MG.on;if(!g)return;const{mode,z,k}=g;mgClose();if(mode==='work')mgWork(z.id,k);else if(mode==='craft')mgCraft(z.id,k);else mgServe(z.id)}
function mgSkip(){const g=MG.on;if(!g||g.done)return;g.plain=true;if(g.kind==='oven')g.good=Math.max(1,Math.round((g.r.n||3)*.66));mgFinish(g,.55)}

// ---------- loop and input ----------
function mgFrame(now){const g=MG.on;if(!g)return;const dt=Math.min(.05,(now-MG.last)/1000);MG.last=now;mgStep(g,dt);mgDraw(g);MG.raf=requestAnimationFrame(mgFrame)}
function mgStep(g,dt){g.t+=dt;if(!g.done)MG_UPD[g.kind](g,dt);
  for(let i=MG.parts.length-1;i>=0;i--){const p=MG.parts[i];p.l+=dt;if(p.l>=p.m){MG.parts.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt}
  for(let i=MG.texts.length-1;i>=0;i--){const t=MG.texts[i];t.l+=dt;if(t.l>1.1)MG.texts.splice(i,1)}
  if(g.shake)g.shake=Math.max(0,g.shake-dt*30)}
function mgKey(e,down){const g=MG.on;if(!g)return false;const k=e.key.toLowerCase();
  if(k==='escape'&&down){mgClose();return true}
  if(g.done){if(down&&(k===' '||k==='enter'))mgClose();return true}
  if(e.repeat)return true;MG_IN[g.kind](g,down?'down':'up',{key:k});return true}
function mgMouse(e,down){const g=MG.on;if(!g||g.done)return;const c=$('#mgCanvas'),r=c.getBoundingClientRect();
  MG_IN[g.kind](g,down?'down':'up',{x:(e.clientX-r.left)/r.width*MGW,y:(e.clientY-r.top)/r.height*MGH,mouse:true})}
function spark(x,y,n,col,sp=180){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=rnd(sp*.3,sp);MG.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-sp*.4,g:420,l:0,m:rnd(.3,.8),col:col||pick(['#fff3b0','#ffd060','#ff9a30'])})}}
function mgText(x,y,txt,col){MG.texts.push({x,y,txt,col,l:0})}

// ---------- forge: hammer timing ----------
const MG_INIT={},MG_UPD={},MG_IN={},MG_DRAW={};
MG_INIT.anvil=g=>{g.N=clamp(Math.round(4+g.r.t*.7),5,12);g.hits=[];g.x=0;g.dir=1;g.c=rnd(.3,.7);g.heat=1;g.reheat=0;g.swing=0};
MG_UPD.anvil=(g,dt)=>{g.swing=Math.max(0,g.swing-dt*5);if(g.reheat>0){g.reheat-=dt;if(g.reheat<=0)g.heat=1;return}
  const sp=.85+.09*g.hits.length;g.x+=g.dir*sp*dt;if(g.x>1){g.x=1;g.dir=-1}if(g.x<0){g.x=0;g.dir=1}g.heat=Math.max(0,g.heat-dt*.075)};
MG_IN.anvil=(g,type,d)=>{if(type!=='down'||g.reheat>0)return;
  if(d.key==='r'||d.mouse&&d.x<150&&d.y>330){g.reheat=1.1;sfx('oil',.6);mgText(90,300,'Reheating...','#ff9a30');return}
  if(d.key&&d.key!==' '&&d.key!=='enter')return;
  const dd=Math.abs(g.x-g.c),v=dd<.035?1:dd<.085?.6:.12,hf=g.heat>=.35?1:.35;g.hits.push(v*hf);g.swing=1;g.shake=v===1?6:3;
  mgText(380,170,hf<1?'Too cold!':v===1?'PERFECT':v>.5?'GOOD':'MISS',hf<1?'#86b8e6':v===1?'#ffd23f':v>.5?'#9ad672':'#e8705e');
  spark(380,250,v===1?24:v>.5?12:5);sfx('anvil',v===1?1:.6);g.c=rnd(.2,.8);
  if(g.hits.length>=g.N)mgFinish(g,g.hits.reduce((a,b)=>a+b,0)/g.N)};
MG_DRAW.anvil=(c,g)=>{const gr=c.createRadialGradient(120,300,10,120,300,360);gr.addColorStop(0,'#5a2410');gr.addColorStop(1,'#120a06');c.fillStyle=gr;c.fillRect(0,0,MGW,MGH);
  // forge fire
  for(let i=0;i<8;i++){const h=40+Math.sin(g.t*9+i)*14+Math.random()*10;c.fillStyle=i%2?'rgba(255,140,40,.55)':'rgba(255,210,90,.45)';c.beginPath();c.ellipse(60+i*12,360-h/2,8,h/2,0,0,7);c.fill()}
  // timing bar
  const bx=120,bw=520,by=50;c.fillStyle='#3a1a14';c.fillRect(bx,by,bw,22);c.fillStyle='#8a6a20';c.fillRect(bx+(g.c-.085)*bw,by,.17*bw,22);c.fillStyle='#4aa04a';c.fillRect(bx+(g.c-.035)*bw,by,.07*bw,22);
  c.strokeStyle='#d4a54a';c.strokeRect(bx,by,bw,22);const cx=bx+g.x*bw;c.fillStyle='#fff';c.beginPath();c.moveTo(cx,by-4);c.lineTo(cx-7,by-16);c.lineTo(cx+7,by-16);c.fill();c.fillRect(cx-1,by,2,22);
  // anvil
  c.fillStyle='#3a3a42';c.fillRect(300,280,160,26);c.fillRect(330,306,100,30);c.fillRect(310,336,140,14);c.beginPath();c.moveTo(300,280);c.lineTo(250,284);c.lineTo(300,296);c.fill();c.fillStyle='#5a5a66';c.fillRect(300,280,160,5);
  // hot metal shaped by progress
  const h=g.heat,col=h>.6?'#ffe08a':h>.35?'#ff7a20':'#6a7a9a',pr=g.hits.length/g.N;c.fillStyle=col;c.shadowColor=col;c.shadowBlur=h>.35?20:0;c.fillRect(330+pr*10,262,100-pr*20,18-pr*4);c.shadowBlur=0;
  const im=mgImg(iconOf(g.k));if(im.complete){c.globalAlpha=.25+pr*.75;c.imageSmoothingEnabled=false;c.drawImage(im,340,120,80,80);c.globalAlpha=1}
  // hammer
  c.save();c.translate(470,190);c.rotate(-1.1+g.swing*1.1);c.fillStyle='#7a5230';c.fillRect(-4,0,8,90);c.fillStyle='#4a4a52';c.fillRect(-22,82,44,22);c.restore();
  // heat gauge
  c.fillStyle='#1a1010';c.fillRect(40,90,24,160);c.fillStyle=col;c.fillRect(40,90+160*(1-h),24,160*h);c.strokeStyle='#d4a54a';c.strokeRect(40,90,24,160);c.fillStyle='#86b8e6';c.fillRect(36,90+160*.65,32,2);
  c.fillStyle='#f1e4c8';c.font='600 12px Inter';c.fillText('HEAT',36,268);
  c.fillStyle=g.reheat>0?'#ff9a30':'#2a1a14';c.fillRect(20,340,120,40);c.strokeStyle='#d4a54a';c.strokeRect(20,340,120,40);c.fillStyle='#f1e4c8';c.font='700 14px Inter';c.fillText(g.reheat>0?'Reheating…':'R  Reheat',38,365);
  c.font='700 16px Inter';c.fillText(`Strike ${Math.min(g.hits.length+1,g.N)} of ${g.N}`,600,380)};

// ---------- furnace: heat and pour ----------
MG_INIT.furnace=g=>{g.T=.3;g.prog=0;g.imp=0;g.fill=0;g.hold=false;g.pouring=false};
MG_UPD.furnace=(g,dt)=>{if(g.phase===0){g.b=.62+.14*Math.sin(g.t*.7);const hw=.085;g.T+=(g.hold?.42:-.2)*dt;if(Math.random()<dt*.35)g.T+=rnd(.03,.09);g.T=clamp(g.T,0,1);
    const inB=Math.abs(g.T-g.b)<hw;if(inB)g.prog+=dt*.17*(1-Math.abs(g.T-g.b)/hw*.5);else if(g.T>g.b+hw){g.imp=Math.min(1,g.imp+dt*.09);if(Math.random()<dt*4)spark(380,230,2,'#888')}
    if(Math.random()<dt*8)spark(380,300,1);if(g.prog>=1){g.phase=1;g.hold=false;mgText(380,140,'Molten! Hold to pour.','#ffd060');sfx('rock_break',.6)}}
  else{if(g.hold){g.fill+=dt*.45;g.pouring=true;if(Math.random()<.6)spark(560,250,1,'#ffb040',60)}else if(g.pouring)return finishPour(g);if(g.fill>1.3)finishPour(g)}};
function finishPour(g){const f=g.fill,acc=f>1?Math.max(0,1-(f-1)*4):f>=.9?1:f/.9*.75;mgText(560,180,f>1?'Spilled!':f>=.9?'Full mould!':'Short pour',f>1?'#e8705e':f>=.9?'#ffd23f':'#e0a060');mgFinish(g,clamp((1-g.imp)*.6+acc*.4,0,1))}
MG_IN.furnace=(g,type,d)=>{if(d.key&&d.key!==' '&&d.key!=='enter')return;g.hold=type==='down';if(g.hold&&g.phase===0)sfx('footstep',.4)};
MG_DRAW.furnace=(c,g)=>{c.fillStyle='#1a0e08';c.fillRect(0,0,MGW,MGH);
  c.fillStyle='#5a2a1e';c.fillRect(250,120,260,240);for(let y=120;y<360;y+=14)for(let x=250+((y/14)%2)*13;x<510;x+=26){c.fillStyle='#6a3426';c.fillRect(x,y,24,12)}
  c.fillStyle='#120804';c.beginPath();c.ellipse(380,300,90,60,0,Math.PI,0);c.fill();c.fillRect(290,300,180,60);
  const T=g.T,fl=30+T*80;for(let i=0;i<9;i++){const h=fl*(.6+Math.random()*.5);c.fillStyle=i%2?`rgba(255,${120+T*100|0},40,.6)`:'rgba(255,220,120,.5)';c.beginPath();c.ellipse(310+i*18,350-h/2,10,h/2,0,0,7);c.fill()}
  // crucible
  const tilt=g.phase===1&&g.hold?.7:g.phase===1?.2:0;c.save();c.translate(g.phase?480:380,g.phase?220:250);c.rotate(tilt);c.fillStyle='#5a5a62';c.beginPath();c.moveTo(-40,-30);c.lineTo(40,-30);c.lineTo(30,30);c.lineTo(-30,30);c.fill();
  const melt=g.phase?1:g.prog;c.fillStyle=melt>.95?'#ffcc40':shadeC(GOODS[Object.keys(g.r.in)[0]].col,melt*.5-.2);c.fillRect(-34,-26,68,14);c.restore();
  if(g.phase===1){if(g.hold){c.fillStyle='#ffb040';c.fillRect(520,230,8,110-0)}c.fillStyle='#3a3a40';c.fillRect(520,300,90,50);c.fillStyle='#1a1a1e';c.fillRect(528,306,74,38);
    const f=Math.min(g.fill,1.3);c.fillStyle='#ffa030';c.fillRect(528,344-38*Math.min(f,1),74,38*Math.min(f,1));if(f>1){c.fillStyle='#ff6a20';c.fillRect(510,348,110,6)}
    c.strokeStyle='#fff';c.setLineDash([4,3]);c.beginPath();c.moveTo(522,344-38*.9);c.lineTo(608,344-38*.9);c.stroke();c.setLineDash([])}
  // thermometer
  c.fillStyle='#120804';c.fillRect(60,60,30,280);const b=g.b||.62;c.fillStyle='rgba(74,160,74,.6)';c.fillRect(60,60+280*(1-b-.085),30,280*.17);
  c.fillStyle=T>b+.085?'#ff4a2a':T<b-.085?'#86b8e6':'#ffd060';c.fillRect(66,60+280*(1-T),18,280*T);c.strokeStyle='#d4a54a';c.strokeRect(60,60,30,280);
  c.fillStyle='#f1e4c8';c.font='600 12px Inter';c.fillText('HEAT',58,356);
  const bar=(x,y,v,col,l)=>{c.fillStyle='#2a1a14';c.fillRect(x,y,200,14);c.fillStyle=col;c.fillRect(x,y,200*clamp(v,0,1),14);c.strokeStyle='#d4a54a';c.strokeRect(x,y,200,14);c.fillStyle='#f1e4c8';c.font='600 12px Inter';c.fillText(l,x,y-5)};
  bar(540,60,g.prog,'#ffb040','MELT');bar(540,110,g.imp,'#8a8a8a','SLAG (too hot)');if(g.phase===1){c.font='700 16px Inter';c.fillStyle='#ffd060';c.fillText('Hold to pour. Let go at the dashed line.',150,40)}};

// ---------- oven: knead rhythm, then pull golden loaves ----------
MG_INIT.oven=g=>{g.beats=6;g.bt=0;g.kn=[];g.L=g.r.n||3;g.loaves=[];g.pt=0};
MG_UPD.oven=(g,dt)=>{if(g.phase===0){g.bt+=dt;if(g.bt>1.05){g.kn.push(0);mgText(380,140,'MISS','#e8705e');g.bt=0;if(g.kn.length>=g.beats)toBake(g)}}
  else{g.pt+=dt;let open=0;for(const l of g.loaves){if(l.s==='wait'&&g.pt>=l.start)l.s='in';if(l.s==='in'){l.b+=l.rate*dt;open++;if(l.b>=1.15){l.s='burnt';mgText(l.x,200,'Burnt!','#e8705e');sfx('rock_break',.3)}}if(l.s==='wait')open++}
    if(!open){const good=g.loaves.filter(l=>l.s==='good').length,kn=g.kn.reduce((a,b)=>a+b,0)/g.beats;g.good=good+(good===g.L&&kn>=.85?1:0);mgFinish(g,good/g.L*.7+kn*.3)}}};
function toBake(g){g.phase=1;g.pt=0;g.loaves=Array.from({length:g.L},(_,i)=>({x:250+i*(260/Math.max(1,g.L-1)),b:0,rate:rnd(.17,.24),start:i*.9,s:'wait'}));mgText(380,120,'Into the oven!','#ffd060');sfx('door')}
MG_IN.oven=(g,type,d)=>{if(type!=='down')return;
  if(g.phase===0){if(d.key&&d.key!==' '&&d.key!=='enter')return;const r=120-90*(g.bt/.9),dd=Math.abs(r-30),v=dd<9?1:dd<22?.6:.15;g.kn.push(v);g.bt=0;
    mgText(380,140,v===1?'PERFECT':v>.5?'GOOD':'MISS',v===1?'#ffd23f':v>.5?'#9ad672':'#e8705e');spark(380,240,v===1?14:6,'#f4ead0',120);sfx('footstep',.6);if(g.kn.length>=g.beats)toBake(g);return}
  let i=-1;if(d.key&&/^[1-9]$/.test(d.key))i=+d.key-1;else if(d.mouse)i=g.loaves.findIndex(l=>Math.abs(d.x-l.x)<40&&d.y>170&&d.y<300);
  const l=g.loaves[i];if(!l||l.s!=='in')return;l.s=l.b<.62?'raw':l.b<=.95?'good':'burnt';mgText(l.x,170,l.s==='good'?'Golden!':l.s==='raw'?'Raw!':'Burnt!',l.s==='good'?'#ffd23f':'#e8705e');sfx(l.s==='good'?'coins':'footstep',.6)};
MG_DRAW.oven=(c,g)=>{c.fillStyle='#2a1a10';c.fillRect(0,0,MGW,MGH);c.fillStyle='#4a2e1c';c.fillRect(0,330,MGW,70);
  if(g.phase===0){c.fillStyle='#e8d8b8';c.beginPath();c.arc(380,240,30,0,7);c.fill();c.fillStyle='#f4ead0';c.beginPath();c.arc(372,232,12,0,7);c.fill();
    const r=120-90*(g.bt/.9);c.strokeStyle=Math.abs(r-30)<9?'#ffd23f':'#d4a54a';c.lineWidth=4;c.beginPath();c.arc(380,240,Math.max(4,r),0,7);c.stroke();c.lineWidth=1;
    c.fillStyle='#f1e4c8';c.font='700 16px Inter';c.fillText(`Knead ${Math.min(g.kn.length+1,g.beats)} of ${g.beats}`,330,380)}
  else{c.fillStyle='#5a3a2a';c.beginPath();c.ellipse(380,230,250,120,0,Math.PI,0);c.fill();c.fillRect(130,230,500,90);c.fillStyle='#1a0e08';c.beginPath();c.ellipse(380,240,220,90,0,Math.PI,0);c.fill();c.fillRect(160,240,440,70);
    c.fillStyle='rgba(255,120,40,.25)';c.fillRect(160,290,440,20);
    g.loaves.forEach((l,i)=>{if(l.s==='wait')return;const b=Math.min(l.b,1.15),col=b<.62?shadeC('#f0dcb0',-b*.2):b<=.95?'#d89a40':shadeC('#6a3a1a',-(b-.95)*2);
      c.fillStyle=col;c.beginPath();c.ellipse(l.x,265,34,18,0,0,7);c.fill();c.fillStyle='rgba(255,255,255,.2)';c.fillRect(l.x-18,256,8,3);c.fillRect(l.x+2,256,8,3);
      c.fillStyle='#2a1a14';c.fillRect(l.x-35,300,70,8);c.fillStyle='#4aa04a';c.fillRect(l.x-35+70*.62/1.15,300,70*.33/1.15,8);c.fillStyle='#fff';c.fillRect(l.x-35+70*Math.min(l.b,1.15)/1.15,297,2,14);
      c.fillStyle='#f1e4c8';c.font='700 14px Inter';c.fillText(l.s==='in'?String(i+1):l.s==='good'?'✔':'✘',l.x-5,330)})}};

// ---------- shop counter: serve customers ----------
MG_INIT.counter=g=>{const z=g.z;g.goods=Object.keys(z.make).filter(k=>z.make[k]>0&&sellsGood(z,k)).slice(0,8);if(z.type==='peddler')g.goods=Object.keys(z.inv).slice(0,8);
  g.C=8;g.n=0;g.ok=0;g.sales=0;g.tips=0;g.cust=null;nextCustomer(g)};
function nextCustomer(g){if(g.n>=g.C){mgFinish(g,g.ok/g.C);return}g.n++;const w=g.goods.map(k=>(DEMAND[k]||.5)+(g.z.inv[k]?0:.3));let s=w.reduce((a,b)=>a+b,0),r=Math.random()*s,k=g.goods[0];
  for(let i=0;i<g.goods.length;i++){if((r-=w[i])<0){k=g.goods[i];break}}const cls=pick(['miner','farmer','woodcutter','hauler','refiner','baker','smith','merchant']);
  g.cust={k,cls,pat:7,max:7,img:mgImg(portrait(cls))}}
MG_UPD.counter=(g,dt)=>{if(!g.cust)return;g.cust.pat-=dt;if(g.cust.pat<=0){mgText(380,90,'The customer left!','#e8705e');if(S.dem[g.cust.k])S.dem[g.cust.k].want++;nextCustomer(g)}};
MG_IN.counter=(g,type,d)=>{if(type!=='down'||!g.cust)return;let i=-1;if(d.key&&/^[1-9]$/.test(d.key))i=+d.key-1;else if(d.key==='0'||d.key==='x')i=99;
  else if(d.mouse){g.goods.forEach((k,j)=>{const x=40+j*86,y=300;if(d.x>x&&d.x<x+78&&d.y>y&&d.y<y+80)i=j});if(d.x>640&&d.x<740&&d.y>300&&d.y<380)i=99}
  if(i<0)return;const z=g.z,want=g.cust.k,stock=z.inv[want]||0;
  if(i===99){if(stock>0){g.cust.pat-=2;mgText(380,90,'You have it on the shelf!','#e8705e');return}g.ok++;if(S.dem[want])S.dem[want].want++;mgText(380,90,'Polite. They will come back.','#d4c79a');nextCustomer(g);return}
  const k=g.goods[i];if(k!==want){g.cust.pat-=2;mgText(380,90,`I asked for ${GOODS[want].n.toLowerCase()}!`,'#e8705e');sfx('ui_click');return}
  if(!stock){g.cust.pat-=2;mgText(380,90,'That shelf is empty. Say Sold out.','#e8705e');return}
  const pr=shopPrice(z,k);const r=retailBuy('folk',z,k,1);if(!r.n){S.folk.cash+=pr;retailBuy('folk',z,k,1)}if(S.dem[k]){S.dem[k].want++;S.dem[k].got++}
  g.ok++;g.sales+=pr;const tip=g.cust.pat/g.cust.max>.55?Math.max(1,Math.round(pr*.08)):0;g.tips+=tip;S.player.cash+=tip;
  mgText(380,90,tip?`Sold! Tip ${money(tip)}`:'Sold!','#9ad672');spark(380,200,10,'#ffd23f',120);sfx('coins');nextCustomer(g)};
MG_DRAW.counter=(c,g)=>{c.fillStyle='#3a2616';c.fillRect(0,0,MGW,MGH);for(let x=0;x<MGW;x+=40){c.fillStyle=x%80?'#40291a':'#36231a';c.fillRect(x,0,40,260)}
  c.fillStyle='#6a4428';c.fillRect(0,250,MGW,20);c.fillStyle='#8a5a34';c.fillRect(0,250,MGW,4);
  const cu=g.cust;if(cu){if(cu.img.complete){c.imageSmoothingEnabled=false;c.drawImage(cu.img,320,70,120,120)}c.strokeStyle='#d4a54a';c.strokeRect(320,70,120,120);
    c.fillStyle='#fbf4e4';rrect(c,460,80,160,70,10);c.fill();c.beginPath();c.moveTo(460,120);c.lineTo(445,130);c.lineTo(462,132);c.fill();
    const im=mgImg(iconOf(cu.k));if(im.complete)c.drawImage(im,472,92,46,46);c.fillStyle='#2a2018';c.font='700 13px Inter';c.fillText(GOODS[cu.k].n,524,112);c.font='12px Inter';c.fillText('please!',524,130);
    c.fillStyle='#2a1a14';c.fillRect(320,200,120,10);c.fillStyle=cu.pat/cu.max>.55?'#9ad672':cu.pat/cu.max>.25?'#f0b050':'#e8705e';c.fillRect(320,200,120*Math.max(0,cu.pat/cu.max),10)}
  for(let i=0;i<g.C-g.n;i++){c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.arc(120-i*16,200,14,0,7);c.fill();c.fillRect(106-i*16,212,28,40)}
  g.goods.forEach((k,j)=>{const x=40+j*86,y=300,st=g.z.inv[k]||0,hov=MG.mx>x&&MG.mx<x+78&&MG.my>y&&MG.my<y+80;c.fillStyle=hov?'#5a3a22':'#2a1a10';c.fillRect(x,y,78,80);c.strokeStyle='#d4a54a';c.strokeRect(x,y,78,80);
    const im=mgImg(iconOf(k));if(im.complete){c.globalAlpha=st?1:.3;c.drawImage(im,x+15,y+6,48,48);c.globalAlpha=1}c.fillStyle='#f1e4c8';c.font='600 11px Inter';c.fillText(`${j+1} · ${st} left`,x+6,y+72)});
  c.fillStyle='#5a2a20';c.fillRect(640,300,100,80);c.strokeStyle='#e8705e';c.strokeRect(640,300,100,80);c.fillStyle='#f1e4c8';c.font='700 13px Inter';c.fillText('Sold out',660,335);c.font='11px Inter';c.fillText('key 0',672,352);
  c.fillStyle='#f1e4c8';c.font='700 14px Inter';c.fillText(`Customer ${g.n} of ${g.C} · sales ${money(g.sales)} · tips ${money(g.tips)}`,20,30)};

// ---------- draw, finish, results ----------
function mgDraw(g){const c=$('#mgCanvas').getContext('2d');c.save();if(g.shake)c.translate(rnd(-g.shake,g.shake),rnd(-g.shake,g.shake));MG_DRAW[g.kind](c,g);
  for(const p of MG.parts){c.globalAlpha=1-p.l/p.m;c.fillStyle=p.col;c.fillRect(p.x,p.y,3,3)}c.globalAlpha=1;
  for(const t of MG.texts){c.globalAlpha=Math.max(0,1-t.l);c.font='800 22px Inter';c.textAlign='center';c.lineWidth=4;c.strokeStyle='rgba(0,0,0,.7)';c.strokeText(t.txt,t.x,t.y-t.l*30);c.fillStyle=t.col;c.fillText(t.txt,t.x,t.y-t.l*30);c.textAlign='left'}c.globalAlpha=1;
  if(g.done&&g.res){c.fillStyle='rgba(10,6,4,.82)';c.fillRect(150,60,460,280);c.strokeStyle=g.res.col;c.lineWidth=2;c.strokeRect(150,60,460,280);c.lineWidth=1;
    c.textAlign='center';c.fillStyle=g.res.col;c.font='700 34px Cinzel,Georgia';c.fillText(g.res.grade,380,112);c.fillStyle='#f1e4c8';c.font='600 15px Inter';
    g.res.lines.forEach((l,i)=>c.fillText(l,380,150+i*26));c.textAlign='left'}
  c.restore()}
function mgFinish(g,q){if(g.done)return;g.done=true;const[gr,col]=grade(q);let lines=[];
  try{lines=g.mode==='work'?workResult(g,q):g.mode==='craft'?craftResult(g,q):serveResult(g,q)}catch(e){lines=['Error: '+e.message]}
  g.res={grade:gr,col,lines};$('#mgSkip').style.display='none';$('#mgQuit').textContent='Close (Space)';$('#mgAgain').style.display=g.mode==='serve'||g.again?'':'none';
  $('#mgStatus').textContent=g.plain?'Plain work: Fair result.':'';if(q>=.9){sfx('achievement');spark(380,120,40,null,260)}else if(q>=.25)sfx('levelup');else sfx('rock_break')}
function unitsFor(g,q){if(g.kind==='oven')return g.good??Math.round((g.r.n||3)*q);return q<.25?0:(g.r.n||1)}
function workResult(g,q){const z=g.z,r=g.r,p=S.player,k=g.k,m=matStatus(z,r);if(!m.ok)return['The materials were used by someone else.'];
  for(const x in m.buy)for(let i=0;i<m.buy[x];i++){const pr=price(x);z.cash-=pr;z.today.cost+=pr;S.market.cash+=pr;S.market.stock[x]--;z.inv[x]=(z.inv[x]||0)+1}
  for(const x in r.in){z.inv[x]-=r.in[x];if(z.inv[x]<=0)delete z.inv[x]}
  let u=unitsFor(g,q);const made=u,lines=[];
  // fill orders on the notice board first
  for(const o of S.orders.filter(o=>o.k===k&&o.from!==z.id&&o.got<o.qty)){if(u<=0)break;const purse=orderPurse(o);const n=Math.min(u,o.qty-o.got);if(!purse||purse.cash<o.price*n)continue;
    purse.cash-=o.price*n;z.cash+=o.price*n;z.today.rev+=o.price*n;o.got+=n;u-=n;
    if(o.from.startsWith('proj:')){const pr=S.town.projects.find(x=>x.key===o.from.slice(5));if(pr)pr.mat[k]=(pr.mat[k]||0)+n}else if(o.from!=='town'){const b=bizById(o.from);b.inv[k]=(b.inv[k]||0)+n;b.today.cost+=o.price*n}
    lines.push(`${n} sent to ${orderFrom(o)} (${money(o.price*n)} to the ${z.name}).`);if(o.got>=o.qty)S.orders=S.orders.filter(x=>x!==o)}
  if(u>0){z.inv[k]=(z.inv[k]||0)+u;lines.push(`${u} ${GOODS[k].n} on the ${BIZ_TYPES[z.type].retail?'shelf':'store pile'} of the ${z.name}.`)}
  if(!made)lines.push(g.kind==='furnace'?'Slag! The metal is spoiled.':g.kind==='oven'?'No good loaves this time.':'The metal cracked. The materials are lost.');
  z.made+=made;z.today.units+=made;S.today.gdp+=GOODS[k].p*made;
  const pay=Math.min(piecePay(z,r,q),Math.max(0,z.owner==='player'?0:z.cash));if(pay){z.cash-=pay;z.today.wages+=pay;p.cash+=pay;lines.push(`Your pay: ${money(pay)}.`)}else if(z.owner==='player')lines.push('Your own business: no wage, all stock is yours.');
  const cost=Math.max(3,r.t*1.6);p.energy=Math.max(0,p.energy-cost);p.hunger=Math.max(0,p.hunger-r.t);p.stats.shifts++;p.stats.crafted=(p.stats.crafted||0)+made;p.wk.made+=made;if(made)questEvent('craft',k,made);
  challengeAdd('crafted',made);challengeAdd('shifts',1);addXp('labour',Math.round(r.t*2));addXp('craft',Math.round(r.t*3*(.5+q)));if(p.rep<40&&q>=.7)p.rep++;fastForward(Math.round(r.t*20));
  lines.push(`Energy −${Math.round(cost)} · ${Math.round(r.t*20)} minutes passed.`);
  jlog('you',`You worked at the ${z.name}: ${made} ${GOODS[k].n.toLowerCase()} made (${grade(q)[0]}).${pay?' Pay '+money(pay)+'.':''}`);
  g.again=workOrders(z).some(w=>w.k===k&&w.mat.ok)&&p.energy>=cost;checkAch();return lines}
function craftResult(g,q){const z=g.z,r=g.r,p=S.player,k=g.k;if(!hasInputs(r))return['You no longer have the materials.'];const fee=craftFee(z),lv=level('craft');
  for(const x in r.in){let n=r.in[x];if(n>1&&Math.random()<(lv-1)*.05)n--;p.inv[x]-=n;if(!p.inv[x])delete p.inv[x]}
  const u=unitsFor(g,q);if(u)p.inv[k]=(p.inv[k]||0)+u;p.cash-=fee;z.cash+=fee;const cost=Math.max(2,r.t*1.2);p.energy=Math.max(0,p.energy-cost);
  p.stats.crafted=(p.stats.crafted||0)+u;p.wk.made+=u;if(u)questEvent('craft',k,u);challengeAdd('crafted',u);addXp('craft',Math.round(r.t*3*(.5+q)));fastForward(Math.round(r.t*15*(1-Math.min(.4,(lv-1)*.06))));
  jlog('you',`You crafted ${u} ${GOODS[k].n.toLowerCase()} at the ${z.name} (${grade(q)[0]}).`);g.again=hasInputs(r)&&p.energy>=cost;checkAch();
  return[u?`${u} ${GOODS[k].n} in your pack.`:'Nothing usable came out. The materials are lost.',fee?`Bench fee ${money(fee)}.`:'Your own bench: no fee.',`Energy −${Math.round(cost)}.`]}
function serveResult(g,q){const z=g.z,p=S.player;let pay=0;if(z.owner!=='player'){pay=Math.min(Math.round(Math.max(1,z.wage||6*S.money.P)*1.5*(.5+q)+g.sales*.06),Math.max(0,z.cash));z.cash-=pay;z.today.wages+=pay;p.cash+=pay}
  p.energy=Math.max(0,p.energy-6);p.stats.shifts++;challengeAdd('shifts',1);challengeAdd('sold',g.sales);addXp('trade',Math.round(4+g.sales/(10*S.money.P)));fastForward(60);
  jlog('you',`You served ${g.ok} of ${g.C} customers at the ${z.name}. Sales ${money(g.sales)}.`);checkAch();
  return[`${g.ok} of ${g.C} customers served. Sales ${money(g.sales)}.`,`Tips ${money(g.tips)}${pay?' · pay '+money(pay):z.owner==='player'?' · the sales go to your till':''}.`,'One hour passed.']}
// canvas input
(()=>{const c=document.getElementById('mgCanvas');if(!c)return;
  c.addEventListener('mousedown',e=>{e.preventDefault();mgMouse(e,true)});addEventListener('mouseup',e=>{if(MG.on)mgMouse(e,false)});
  c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();MG.mx=(e.clientX-r.left)/r.width*MGW;MG.my=(e.clientY-r.top)/r.height*MGH});
  c.addEventListener('touchstart',e=>{e.preventDefault();mgMouse(e.touches[0],true)},{passive:false});c.addEventListener('touchend',e=>{e.preventDefault();mgMouse(e.changedTouches[0],false)},{passive:false})})();

// the workbench uses the forge timing game
MG_INIT.bench=g=>MG_INIT.anvil(g);MG_UPD.bench=(g,dt)=>MG_UPD.anvil(g,dt);MG_IN.bench=(g,t,e)=>MG_IN.anvil(g,t,e);MG_DRAW.bench=(g,c,dt)=>MG_DRAW.anvil(g,c,dt);MG_HELP.bench=MG_HELP.anvil;
