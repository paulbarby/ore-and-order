'use strict';
// ===== particles, floating text, rings, audio =====
const fx={parts:[],texts:[],rings:[],
  add(p){if(this.parts.length<1600)this.parts.push(p)},
  debris(x,y,col,n=6){for(let i=0;i<n*Q();i++)this.add({k:'debris',x:x+rnd(-.2,.2),y:y+rnd(-.1,.1),z:.3,vx:rnd(-1.6,1.6),vy:rnd(-.8,.8),vz:rnd(2,4.5),life:0,max:rnd(.6,1.1),col:Math.random()<.35?'#8a8278':col,s:Math.random()<.5?1:2})},
  sparks(x,y,n=8){for(let i=0;i<n*Q();i++)this.add({k:'spark',x,y,z:.4,vx:rnd(-2.5,2.5),vy:rnd(-1,1),vz:rnd(1,4),life:0,max:rnd(.25,.6),col:pick(['#fff3b0','#ffd060','#ff9a30'])})},
  smoke(x,y,col='#7a7a80',s=1){this.add({k:'smoke',x,y,z:0,vx:rnd(.1,.4)*S.wind,vy:0,vz:rnd(.5,.9),life:0,max:rnd(2.5,4.5),col,s:rnd(2,3.5)*s})},
  dust(x,y){this.add({k:'dust',x:x+rnd(-.15,.15),y,z:.05,vx:rnd(-.3,.3),vy:rnd(-.1,.1),vz:rnd(.2,.5),life:0,max:rnd(.35,.6),col:'#c8b48a',s:rnd(1,2)})},
  glint(x,y,col){this.add({k:'glint',x,y,z:rnd(.2,.6),vx:0,vy:0,vz:0,life:0,max:.7,col})},
  coins(x,y,n=6){for(let i=0;i<n*Q();i++)this.add({k:'coin',x,y,z:.8,vx:rnd(-1,1),vy:rnd(-.4,.4),vz:rnd(2.5,4),life:0,max:rnd(.8,1.2),col:'#ffd23f'})},
  firework(x,y){const col=pick(['#ff5a4a','#ffd23f','#6fd0ff','#9aff7a','#ff8af0','#ffffff']),z=rnd(5,8);for(let i=0;i<42*Q();i++){const a=Math.random()*6.283,v=rnd(1.5,4);
    this.add({k:'fw',x,y,z,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.5,vz:Math.sin(a)*v*.6+1,life:0,max:rnd(1,1.7),col})}},
  flame(x,y){this.add({k:'spark',x:x+rnd(-.4,.4),y,z:rnd(0,.3),vx:rnd(-.3,.3),vy:0,vz:rnd(1.5,3),life:0,max:rnd(.4,.8),col:pick(['#ffd060','#ff8a30','#ff5020'])})},
  splash(x,y){for(let i=0;i<3;i++)this.add({k:'debris',x,y,z:0,vx:rnd(-.6,.6),vy:rnd(-.3,.3),vz:rnd(1,2),life:0,max:.35,col:'#bfe3ff',s:1})},
  text(x,y,txt,col='#fff',big){this.texts.push({x,y,txt,col,t:0,max:big?2.2:1.5,big})},
  ring(x,y,col){this.rings.push({x,y,col,t:0,max:.9})},
  burst(kind,b){const cx=b.x+(b.w||1)/2,cy=b.y+(b.h||1)/2;if(kind==='sparks')this.sparks(cx+1,b.y+b.h,10);else for(let i=0;i<12;i++)this.add({k:'dust',x:cx+rnd(-.8,.8),y:cy+rnd(-.5,.5),z:.1,vx:rnd(-1,1),vy:rnd(-.5,.5),vz:rnd(.5,1.5),life:0,max:rnd(.6,1.2),col:'#9a9088',s:rnd(2,4)})},
  update(dt){
    for(let i=this.parts.length-1;i>=0;i--){const p=this.parts[i];p.life+=dt;if(p.life>=p.max){this.parts.splice(i,1);continue}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      if(p.k==='debris'||p.k==='coin'){p.vz-=14*dt;if(p.z<0){p.z=0;p.vz*=-.35;p.vx*=.6;p.vy*=.6}}
      else if(p.k==='spark'){p.vz-=8*dt}
      else if(p.k==='fw'){p.vz-=1.6*dt;p.vx*=.985;p.vy*=.985}
      else if(p.k==='smoke'){p.vx+=S.wind*.15*dt;p.vz*=.995}}
    for(let i=this.texts.length-1;i>=0;i--){const t=this.texts[i];t.t+=dt;if(t.t>=t.max)this.texts.splice(i,1)}
    for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.t+=dt;if(r.t>=r.max)this.rings.splice(i,1)}
  }};
function Q(){return S&&S.settings?S.settings.fx:1}

// ---------- audio ----------
const AU={ctx:null,buf:{},master:null,bus:{},loops:{},ready:false,
  files:['pick1','pick2','pick3','rock_break','coins','cash_big','ui_click','ui_open','ui_close','anvil','whistle','stamp','levelup','achievement','eat','oil','footstep','rooster','bell','door','amb_day','amb_night','amb_rain','music_title','music_game'],
  gainOf:{amb_day:2.6,amb_night:.45,amb_rain:.7,footstep:.35,ui_click:.6,pick1:.7,pick2:.7,pick3:.7,anvil:.55,oil:.6,rooster:.5,bell:.6},
  init(){if(this.ctx)return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return}
    const c=this.ctx;this.master=c.createGain();this.master.connect(c.destination);
    for(const b of['sfx','amb','music']){this.bus[b]=c.createGain();this.bus[b].connect(this.master)}
    this.applyVol();
    for(const f of this.files)fetch(`assets/audio/${f}.mp3`).then(r=>r.ok?r.arrayBuffer():Promise.reject()).then(a=>c.decodeAudioData(a)).then(b=>{this.buf[f]=b;if(this.want&&this.want[f])this.startLoop(f,this.want[f])}).catch(()=>{});
    this.ready=true},
  applyVol(){if(!this.ctx)return;const s=(S&&S.settings)||SETTINGS_DEFAULT;this.master.gain.value=s.master;this.bus.sfx.gain.value=s.sfx;this.bus.amb.gain.value=s.amb;this.bus.music.gain.value=s.music},
  play(name,vol=1,rate=1,pan=0){if(!this.ctx||this.ctx.state!=='running')return;const b=this.buf[name];
    if(!b){synth(name,vol);return}
    const c=this.ctx,src=c.createBufferSource(),g=c.createGain();src.buffer=b;src.playbackRate.value=rate;g.gain.value=vol*(this.gainOf[name]||1);
    let node=g;if(pan&&c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=clamp(pan,-1,1);g.connect(p);node=p}
    src.connect(g);node.connect(this.bus.sfx);src.start()},
  want:{},
  loop(bus,name,vol=1){// one loop per bus, cross-fade
    if(!this.ctx)return;for(const k in this.want)if(this.want[k].bus===bus)delete this.want[k];if(name)this.want[name]={bus,vol};const cur=this.loops[bus];if(cur&&cur.name===name){cur.g.gain.setTargetAtTime(vol*(this.gainOf[name]||1),this.ctx.currentTime,.6);return}
    if(cur){cur.g.gain.setTargetAtTime(0,this.ctx.currentTime,.7);const s=cur.src;setTimeout(()=>{try{s.stop()}catch(e){}},3000);delete this.loops[bus]}
    if(name&&this.buf[name])this.startLoop(name,{bus,vol})},
  startLoop(name,{bus,vol}){if(!this.ctx||this.loops[bus]&&this.loops[bus].name===name)return;const c=this.ctx,src=c.createBufferSource(),g=c.createGain();
    src.buffer=this.buf[name];src.loop=true;g.gain.value=0;g.gain.setTargetAtTime(vol*(this.gainOf[name]||1),c.currentTime,.8);src.connect(g);g.connect(this.bus[bus]);src.start();this.loops[bus]={name,src,g}},
  stop(bus){const cur=this.loops[bus];if(!cur)return;cur.g.gain.setTargetAtTime(0,this.ctx.currentTime,.5);const s=cur.src;setTimeout(()=>{try{s.stop()}catch(e){}},2500);delete this.loops[bus];
    for(const k in this.want)if(this.want[k].bus===bus)delete this.want[k]}
};
function sfx(name,vol=1){if(name==='pick')name='pick'+(1+Math.floor(Math.random()*3));AU.play(name,vol,name.startsWith('pick')?rnd(.9,1.1):1)}
function sfxAt(name,x,y){if(S.where)return;const d=dist(x,y,S.player.x,S.player.y);if(d>16)return;const v=Math.pow(1-d/16,1.6)*.8;
  if(name==='pick')name='pick'+(1+Math.floor(Math.random()*3));AU.play(name,v,rnd(.9,1.1),(x-S.player.x)/12)}
// fallback tones when a file is missing
function synth(name,vol){const c=AU.ctx;if(!c)return;const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(AU.bus.sfx);
  const t=c.currentTime,f={ui_click:900,coins:1400,levelup:660,achievement:520,whistle:2200}[name]||300;
  o.type=name.startsWith('pick')?'square':'triangle';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.6,t+.12);
  g.gain.setValueAtTime(.08*vol,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.start(t);o.stop(t+.16)}
