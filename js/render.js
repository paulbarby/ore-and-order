'use strict';
// ===== renderer: terrain painting, sprites, characters, lighting, weather, bubbles, minimap =====
const cv=document.getElementById('view'),ctx=cv.getContext('2d');
const lc=document.createElement('canvas'),lctx=lc.getContext('2d');
const cam={x:0,y:0,zoom:3,shake:0};
let VW=0,VH=0,DPR=1,clock=0;
function resizeView(){DPR=Math.min(2,window.devicePixelRatio||1);VW=cv.clientWidth;VH=cv.clientHeight;cv.width=VW*DPR;cv.height=VH*DPR;lc.width=cv.width;lc.height=cv.height}
function onScreen(x,y,m=2){if(S&&S.where)return false;const sx=(x*TS-cam.x)*cam.zoom+VW/2,sy=(y*TS-cam.y)*cam.zoom+VH/2;return sx>-m*TS*cam.zoom&&sy>-m*TS*cam.zoom&&sx<VW+m*TS*cam.zoom&&sy<VH+m*TS*cam.zoom}
function toScreen(x,y){return{x:(x*TS-cam.x)*cam.zoom+VW/2,y:(y*TS-cam.y)*cam.zoom+VH/2}}
function toWorld(sx,sy){return{x:((sx-VW/2)/cam.zoom+cam.x)/TS,y:((sy-VH/2)/cam.zoom+cam.y)/TS}}
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function pcirc(g,cx,cy,r,col){g.fillStyle=col;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r+r*.8)g.fillRect(cx+x,cy+y,1,1)}

// ---------- terrain painting ----------
const PAL={1:['#d9c48c','#cfb980','#e3d099'],2:['#5f9b46','#56913e','#69a64e'],3:['#3e7836','#386e31','#45823c'],4:['#87945b','#7d8a52','#929e64'],
  5:['#8a8279','#7c756d','#978f85'],6:['#ad9672','#a28b67','#b8a17b'],7:['#8c7240','#82683a','#977c48'],8:['#a69e92','#998f84','#b1a99c'],9:['#7a6a52','#7a6a52','#7a6a52']};
const PALN={};for(const k in PAL)PALN[k]=PAL[k].map(h=>{const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255]});
function paintTerrain(){
  const w=W*TS,h=H*TS,c=mk(w,h),g=c.getContext('2d'),im=g.createImageData(w,h),D=im.data,s=world.seed%9973,t=world.tiles,E=world.elev;
  const gx=new Float32Array(W*H),gy=new Float32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const e=(xx,yy)=>E[idx(clamp(xx,0,W-1),clamp(yy,0,H-1))];gx[idx(x,y)]=e(x+1,y)-e(x-1,y);gy[idx(x,y)]=e(x,y+1)-e(x,y-1)}
  const blendable=k=>k!==T.BUILD&&k!==T.PLAZA;
  const eAt=(qx,qy)=>{const fx=(qx-8)/16,fy=(qy-8)/16,x0=clamp(Math.floor(fx),0,W-1),y0=clamp(Math.floor(fy),0,H-1),x1=Math.min(x0+1,W-1),y1=Math.min(y0+1,H-1),ax=clamp(fx-x0,0,1),ay=clamp(fy-y0,0,1);const u=ax*ax*(3-2*ax),v=ay*ay*(3-2*ay);return lerp(lerp(E[y0*W+x0],E[y0*W+x1],u),lerp(E[y1*W+x0],E[y1*W+x1],u),v)+(vnoise(qx/10,qy/10,s+21)-.5)*.035+(vnoise(qx/4,qy/4,s+22)-.5)*.01};
  for(let py=0;py<h;py++){const ty=py>>4,fy=py&15;
    for(let px=0;px<w;px++){const tx=px>>4,fx=px&15;let k=t[ty*W+tx];const hh=hash2(px,py,s);
      const fxp=(px-8)/16,fyp=(py-8)/16,x0=clamp(Math.floor(fxp),0,W-1),y0=clamp(Math.floor(fyp),0,H-1),x1=Math.min(x0+1,W-1),y1=Math.min(y0+1,H-1),ax=clamp(fxp-x0,0,1),ay=clamp(fyp-y0,0,1);
      const e=lerp(lerp(E[y0*W+x0],E[y0*W+x1],ax),lerp(E[y1*W+x0],E[y1*W+x1],ax),ay);
      if(blendable(k)){let nk=-1,p=0;
        if(fx<3&&tx>0){nk=t[ty*W+tx-1];p=(3-fx)/7}else if(fx>12&&tx<W-1){nk=t[ty*W+tx+1];p=(fx-12)/7}
        if(nk>=0&&nk!==k&&blendable(nk)&&hash2(px,py,s+1)<p)k=nk;
        else{nk=-1;if(fy<3&&ty>0){nk=t[(ty-1)*W+tx];p=(3-fy)/7}else if(fy>12&&ty<H-1){nk=t[(ty+1)*W+tx];p=(fy-12)/7}
          if(nk>=0&&nk!==k&&blendable(nk)&&hash2(px,py,s+2)<p)k=nk}}
      const i=ty*W+tx;let r,gg,b;
      if(k===T.SAND||k===T.GRASS||k===T.HILL||k===T.MOUNT){const ej=e+(hh-.5)*.014;k=ej<.335?T.SAND:ej>.66?T.MOUNT:ej>.585?T.HILL:T.GRASS}
      if(k===T.WATER){const dpt=clamp((.315-e)/.13,0,1),n=vnoise(px/7,py/7,s+5)*.1+(hh>.985?.12:0);
        r=lerp(78,26,dpt)+n*40;gg=lerp(150,72,dpt)+n*50;b=lerp(196,122,dpt)+n*40;}
      else{const v=vnoise(px/22,py/22,s+3)+hh*.25,pal=PALN[k],c3=pal[v<.45?1:v>.85?2:0];r=c3[0];gg=c3[1];b=c3[2];
        if(k===T.MOUNT){const hi=clamp((e-.66)/.2,0,1),pn=vnoise(px/14,py/14,s+12);r=lerp(132,170,hi)+(pn-.5)*30;gg=lerp(122,160,hi)+(pn-.5)*28;b=lerp(112,150,hi)+(pn-.5)*24;
          if(e>.86+hh*.05){r=230;gg=236;b=242}}
        // details
        if(k===T.GRASS){if(hh>.993){[r,gg,b]=[[242,232,110],[242,141,187],[255,255,255],[180,138,240]][(hh*1e4|0)%4]}else if(hh>.95){r*=.82;gg*=.85;b*=.8}else if(hh<.02){r*=1.12;gg*=1.1;b*=1.05}}
        else if(k===T.FOREST){if(hh>.9){r*=.78;gg*=.8;b*=.78}else if(hh<.015){r=196;gg=60;b=50}}
        else if(k===T.MOUNT||k===T.HILL){const cr=Math.abs(vnoise(px/7,py/7,s+11)-.5);if(cr<.018){r*=.68;gg*=.68;b*=.7}else if(cr<.03){r*=1.1;gg*=1.1;b*=1.1}
          if(k===T.HILL&&hh>.9){r*=.85;gg*=.9;b*=.8}if(hh>.975){r*=.78;gg*=.78;b*=.78}else if(hh<.03){r*=1.12;gg*=1.12;b*=1.12}}
        else if(k===T.ROAD){const hz=(tx>0&&t[i-1]===T.ROAD)||(tx<W-1&&t[i+1]===T.ROAD);const q=hz?fy:fx;if((q===5||q===10)&&hh<.7){r*=.84;gg*=.84;b*=.82}if(hh>.97){r*=1.12;gg*=1.1;b*=1.08}}
        else if(k===T.FIELD){if(fy%4===0){r*=.78;gg*=.76;b*=.74}}
        else if(k===T.PLAZA){const off=((py>>2)&1)*2,cx2=(px+off)>>2,cy2=py>>2,stone=hash2(cx2,cy2,s+8);
          if((px+off)%4===0||py%4===0){r*=.72;gg*=.72;b*=.72}else{const f=.9+stone*.2;r*=f;gg*=f;b*=f}}
        else if(k===T.SAND){if(hh>.96){r*=.88;gg*=.86;b*=.84}}
        // hill shade, light from top-left
        const K=(k===T.MOUNT||k===T.HILL)?15:k===T.WATER?0:5,sh=clamp((eAt(px-3,py-3)-eAt(px+3,py+3))*K,-.3,.3);r*=1+sh;gg*=1+sh;b*=1+sh;
        // edge with water: wet darker sand
        if(k===T.SAND&&e<.318){r*=.86;gg*=.86;b*=.9}}
      const o=(py*w+px)*4;D[o]=r;D[o+1]=gg;D[o+2]=b;D[o+3]=255}}
  g.putImageData(im,0,0);
  // soft building footprint shadows
  for(const b of world.buildings){g.fillStyle='rgba(20,14,8,.35)';g.fillRect(b.x*TS+3,b.y*TS+6,b.w*TS,b.h*TS)}
  world.terrain=c;
}

// ---------- sprite sheets ----------
const SPR={trees:{},build:{},icons:{},portraits:{}};
function treeSprite(kind,v,sway){const key=kind+v+'_'+sway;if(SPR.trees[key])return SPR.trees[key];
  let c;const pals=[['#1f4d27','#2c6a33','#3c8743','#58a356'],['#24502a','#33733a','#468f4a','#69ad5f'],['#1d4428','#2a5e36','#3a7a46','#55965c']],P=pals[v%3];
  if(kind==='pine'){c=mk(18,30);const g=c.getContext('2d');g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(9,28,6,2,0,0,7);g.fill();
    g.fillStyle='#5a3a22';g.fillRect(8,22,2,6);g.fillStyle='#43291a';g.fillRect(9,22,1,6);
    const tiers=[[24,8],[19,7],[14,5.5],[9,4],[5,2.5]];tiers.forEach(([y,hw],ti)=>{const off=Math.round(sway*(ti/4));
      for(let r=0;r<6;r++){const ww=Math.round(hw*(r+1)/6+1),yy=y-6+r;for(let x=-ww;x<=ww;x++){g.fillStyle=x<-ww/3?P[2]:x>ww/3?P[0]:P[1];if(r===5&&x%2)g.fillStyle=P[0];g.fillRect(9+x+off,yy,1,1)}}
      g.fillStyle=P[3];g.fillRect(9-Math.round(hw/2)+off,y-4,1,1)});}
  else if(kind==='oak'){c=mk(22,26);const g=c.getContext('2d');g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(11,24,8,2.5,0,0,7);g.fill();
    g.fillStyle='#5e3e24';g.fillRect(10,15,3,9);g.fillStyle='#4a2f1b';g.fillRect(12,15,1,9);
    const o=Math.round(sway);pcirc(g,11+o,10,7,P[0]);pcirc(g,7+o,11,5,P[1]);pcirc(g,15+o,11,5,P[0]);pcirc(g,10+o,8,5,P[1]);pcirc(g,8+o,6,3,P[2]);pcirc(g,13+o,7,3,P[2]);
    g.fillStyle=P[3];g.fillRect(7+o,4,2,1);g.fillRect(12+o,5,2,1);
    if(v===2){g.fillStyle='#d8403a';g.fillRect(6+o,10,1,1);g.fillRect(14+o,8,1,1);g.fillRect(11+o,12,1,1)}}
  else if(kind==='bush'){c=mk(14,10);const g=c.getContext('2d');g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(7,9,6,1.5,0,0,7);g.fill();
    const o=Math.round(sway*.5);pcirc(g,5+o,6,3,P[1]);pcirc(g,9+o,6,3,P[0]);pcirc(g,7+o,4,3,P[2]);if(v===1){g.fillStyle='#f0e070';g.fillRect(5,4,1,1);g.fillRect(9,5,1,1)}}
  else{c=mk(10,12);const g=c.getContext('2d');for(let i=0;i<5;i++){const x=1+i*2,o=Math.round(sway*.6);g.fillStyle=i%2?'#6a8a3a':'#86a24a';g.fillRect(x+o,2+i%3,1,9-i%3);g.fillStyle='#7a5a2a';g.fillRect(x+o,1+i%3,1,2)}}
  SPR.trees[key]=c;return c}

const BEXTRA={townhall:28,refinery:34,inn:12,bank:12,market:10,smithy:14,bakery:14,office:10,sheriff:10,forge:14,bakehouse:14,smelter:26,store:12,post:12};
function buildingSprite(b){const key=b.kind+'_'+b.w+'_'+b.h,cached=SPR.build[key];if(cached){if(!b.windows)Object.assign(b,cached.meta);b.spr=cached;return cached}
  const ex=BEXTRA[b.kind]||10,bw=b.w*TS,bh=b.h*TS+ex,c=mk(bw,bh),g=c.getContext('2d');
  const wallH=b.kind==='inn'?28:22,wy=bh-wallH,roofTop=ex-4;const F=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
  const wall=b.wall,roof=b.roof;b.windows=[];b.smoke=[];b.glow=null;
  // roof body
  const rTop=Math.max(2,roofTop),rH=wy-rTop;
  for(let y=0;y<rH;y++){const row=rTop+y,inset=Math.max(0,Math.round((rH-y)*.12));for(let x=inset;x<bw-inset;x++){
    const left=x<bw/2;let col=shadeC(roof,left?.08:-.12);if((y+(x>>3))%4===0)col=shadeC(roof,-.25);if(y===0||y===1)col=shadeC(roof,.25);g.fillStyle=col;g.fillRect(x,row,1,1)}}
  F(0,wy-2,bw,2,shadeC(roof,-.45));
  // front wall
  const stone=b.kind==='bank'||b.kind==='townhall';
  for(let y=wy;y<bh;y++)for(let x=1;x<bw-1;x++){let col=wall;
    if(stone){if(y%5===0||((x+((y/5|0)%2)*4)%8===0))col=shadeC(wall,-.18)}else if(b.kind==='refinery'){if(y%3===0||((x+((y/3|0)%2)*3)%6===0))col=shadeC(wall,-.22)}else if(x%5===0)col=shadeC(wall,-.15);
    if(x>bw-4)col=shadeC(col.startsWith('#')?col:wall,-.2);g.fillStyle=col;g.fillRect(x,y,1,1)}
  F(1,bh-2,bw-2,2,shadeC(wall,-.35));
  const door=(dx)=>{const x=dx??(bw>>1)-3,y=bh-12;F(x-1,y-1,8,13,shadeC(wall,-.45));F(x,y,6,12,'#5a3a22');F(x+1,y+1,2,10,'#6e4a2c');F(x+4,y+6,1,1,'#e0c060');b.doorPx={x:x+3,y:bh}};
  const win=(x,y,w=6,h=6)=>{F(x-1,y-1,w+2,h+2,shadeC(wall,-.5));F(x,y,w,h,'#2a3a4a');F(x,y,w>>1,h>>1,'#4a6a8a');F(x+(w>>1),y,1,h,shadeC(wall,-.5));F(x,y+(h>>1),w,1,shadeC(wall,-.5));b.windows.push({x:x+w/2,y:y+h/2})};
  const sign=(x,y,draw)=>{F(x,y,12,9,'#5a3a22');F(x+1,y+1,10,7,'#c8a26a');draw(x+1,y+1)};
  const chimney=(x,h=10)=>{F(x,rTop-h+6,5,h,'#6a4a3a');F(x,rTop-h+6,5,2,'#4a3428');b.smoke.push({x:x+2.5,y:rTop-h+5})};
  switch(b.kind==='forge'?'smithy':b.kind==='bakehouse'?'bakery':b.kind){
  case'market':{door();for(let i=0;i<3;i++){const x=4+i*((bw-8)/3|0);win(x+3,wy+4,5,5)}
    for(let x=0;x<bw;x++){F(x,wy-1,1,6,(x>>2)%2?'#e8e0d0':'#b8382a')}for(let x=0;x<bw;x+=4)F(x,wy+5,4,1,'rgba(0,0,0,.25)');
    const crates=[['#b5653d',3],['#3fb8a0',bw-10],['#ffd23f',bw-18]];for(const[cl,x]of crates){F(x,bh-7,7,6,'#7a5230');F(x+1,bh-9,5,3,cl);F(x+2,bh-10,2,1,shadeC(cl,.4))}
    break}
  case'bank':{for(let i=0;i<4;i++){const x=6+i*((bw-12)/3);F(x-1,wy-1,4,wallH,'#f2eee4');F(x+2,wy-1,1,wallH,'#c8c2b4')}door();
    for(let y=0;y<8;y++)F(bw/2-y*2.6,rTop+y,y*5.2,1,'#e8e2d6');F(bw/2-3,rTop+3,6,4,'#d4a83a');F(bw/2-1,rTop+4,2,2,'#fff2a0');win(4,wy+5,4,6);win(bw-9,wy+5,4,6);break}
  case'townhall':{const tx=bw/2-6;F(tx,2,12,rTop+4,'#d8ccb0');F(tx+10,2,2,rTop+4,'#b8ac90');F(tx-1,0,14,3,shadeC(roof,-.1));
    pcirc(g,tx+6,10,4,'#f4f0e6');F(tx+6,7,1,3,'#222');F(tx+6,10,3,1,'#222');F(tx+2,16,8,6,'#3a2a1a');F(tx+4,17,4,4,'#c8a040');
    b.flag={x:tx+6,y:0};door();win(6,wy+6);win(bw-12,wy+6);win(14,wy+6,4,6);win(bw-18,wy+6,4,6);b.bell={x:tx+6,y:19};break}
  case'office':{door(5);win(bw-12,wy+6);sign(bw-14,wy-12,(x,y)=>{F(x+2,y+1,6,5,'#f0e6c8');F(x+3,y+2,4,1,'#6a5a3a');F(x+3,y+4,3,1,'#6a5a3a');F(x+7,y+1,1,5,'#a0805a')});break}
  case'sheriff':{door(5);const x=bw-13,y=wy+5;F(x-1,y-1,10,9,'#3a2a1a');F(x,y,8,7,'#1a1a22');for(let i=1;i<8;i+=2)F(x+i,y,1,7,'#8a8a90');
    sign(3,wy-12,(x,y)=>{pcirc(g,x+5,y+3,3,'#e8c040');F(x+5,y,1,7,'#e8c040');F(x+2,y+3,7,1,'#e8c040')});break}
  case'inn':{door();win(5,wy+8);win(bw-12,wy+8);win(5,wy-12,5,5);win(bw/2-2,wy-12,5,5);win(bw-11,wy-12,5,5);F(0,wy+1,bw,2,shadeC(wall,-.4));
    F(bw-5,wy-2,1,10,'#3a2a1a');F(bw-11,wy+2,8,7,'#3a2a1a');F(bw-10,wy+3,6,5,'#c8a26a');F(bw-9,wy+4,3,3,'#f0d070');F(bw-6,wy+5,1,2,'#f0d070');chimney(6,8);break}
  case'bakery':{door(4);win(bw-14,wy+6,8,6);sign(bw-14,wy-11,(x,y)=>{F(x+1,y+2,8,4,'#c87a30');F(x+2,y+1,6,1,'#e09a50');F(x+3,y+3,1,1,'#7a4a1a');F(x+6,y+3,1,1,'#7a4a1a')});chimney(bw-10,12);break}
  case'refinery':{F(2,wy-26,10,26,'#7a7e86');F(2,wy-26,10,3,'#9a9ea6');F(3,wy-20,8,1,'#5a5e66');F(3,wy-12,8,1,'#5a5e66');
    const cx=bw-14;F(cx,1,8,wy,'#6a4a3a');for(let y=3;y<wy;y+=4)F(cx,y,8,1,'#5a3a2e');F(cx-1,0,10,3,'#4a3428');b.smoke.push({x:cx+4,y:0});b.smoke.push({x:cx+4,y:0});
    F(14,wy-6,cx-15,2,'#5a5e66');door(18);F(bw-26,bh-11,9,8,'#2a1a14');F(bw-25,bh-10,7,6,'#ff8a2a');b.glow={x:bw-21.5,y:bh-7,col:'#ff8a2a',r:3.2};win(bw-38,wy+5);break}
  case'smithy':{door(3);const ox=bw-27;F(ox,wy+3,22,bh-wy-5,'#1e1610');F(ox+4,bh-8,10,5,'#3a2a20');F(ox+5,bh-9,8,2,'#ff7a20');F(ox+7,bh-10,4,1,'#ffd060');
    b.glow={x:ox+9,y:bh-8,col:'#ff7a20',r:2.6};chimney(ox+6,12);for(let i=0;i<4;i++)F(ox+14+i*2,wy+5,1,6,'#8a8a90');break}
  case'smelter':{const cx=bw-11;F(cx,2,7,wy,'#6a4a3a');for(let y=4;y<wy;y+=4)F(cx,y,7,1,'#5a3a2e');F(cx-1,1,9,2,'#4a3428');b.smoke.push({x:cx+3.5,y:1});
    door(4);F(16,bh-11,8,8,'#2a1a14');F(17,bh-10,6,6,'#ff8a2a');b.glow={x:20,y:bh-7,col:'#ff8a2a',r:2.6};break}
  case'store':case'post':{door();win(4,wy+5,7,6);win(bw-11,wy+5,7,6);for(let x=0;x<bw;x++)F(x,wy-1,1,4,(x>>2)%2?shadeC(roof,.4):roof);F(0,wy+3,bw,1,'rgba(0,0,0,.25)');
    F(2,bh-6,5,5,'#8a6a3a');F(3,bh-7,3,2,'#c8a870');F(bw-8,bh-8,5,7,'#6a4428');F(bw-8,bh-7,5,1,'#4a4a50');F(bw-8,bh-3,5,1,'#4a4a50');
    sign(bw/2-6,wy-12,(x,y)=>{F(x+2,y+1,6,6,'#d8c098');F(x+3,y,4,2,'#a88858');F(x+4,y+3,2,2,'#8a6a3a')});break}
  }
  b.ex=ex;c.meta={windows:b.windows,smoke:b.smoke,glow:b.glow,flag:b.flag,bell:b.bell,doorPx:b.doorPx,ex};SPR.build[key]=c;b.spr=c;return c}

// ---------- characters ----------
function drawChar(g,x,y,L,o){x=Math.round(x);y=Math.round(y);const d=o.dir||1,ph=o.moving?Math.sin(o.walk*3.2):0,bob=o.moving?Math.round(Math.abs(Math.sin(o.walk*3.2))*-1):0;
  const F=(px,py,w,h,col)=>{g.fillStyle=col;g.fillRect(d>0?x+px:x-px-w,y+py,w,h)};
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,4.5,1.6,0,0,7);g.fill();
  // legs
  const l1=Math.round(ph*1.5),l2=-l1;F(-3,-5+Math.min(0,l1),2,5-Math.min(0,l1)+0,L.pants);F(1,-5+Math.min(0,l2),2,5,L.pants);
  F(-3+(l1>0?1:0),-1,2,1,'#2a1e16');F(1+(l2>0?1:0),-1,2,1,'#2a1e16');
  const by=bob;
  if(o.carry){F(-5,-11+by,3,5,'#8a6a3a');F(-5,-11+by,3,1,'#a8884a')}
  F(-3,-10+by,6,6,L.shirt);F(2,-10+by,1,6,shadeC(L.shirt,-.25));
  if(L.apron)F(-2,-8+by,4,5,L.apron);if(L.vest){F(-3,-10+by,2,5,L.vest);F(1,-10+by,2,5,L.vest)}
  if(L.star)F(1,-8+by,1,1,'#ffd23f');if(L.bandana)F(-2,-10+by,4,1,L.bandana);
  // arms
  const sw=o.swing>0;const a1=Math.round(ph*1.2);
  if(!sw){F(-4,-9+by+a1,1,4,L.shirt);F(-4,-5+by+a1,1,1,L.skin)}
  F(3,-9+by-a1*(sw?0:1),1,4,shadeC(L.shirt,-.15));if(!sw)F(3,-5+by-a1,1,1,L.skin);
  // head
  F(-2,-15+by,5,5,L.skin);F(2,-15+by,1,5,shadeC(L.skin,-.12));F(1,-13+by,1,1,'#1a1410');
  if(L.beard)F(-1,-11+by,4,1,L.hair);
  F(-2,-15+by,1,3,L.hair);if(L.female)F(-3,-14+by,1,4,L.hair);
  // hats
  const hy=-16+by;switch(L.hat){
    case'helmet':F(-3,hy,7,2,L.hatCol);F(-2,hy-1,5,1,L.hatCol);F(3,hy,1,1,'#fff3a0');break;
    case'stetson':case'wide':F(-4,hy+1,9,1,shadeC(L.hatCol,-.2));F(-2,hy-1,5,2,L.hatCol);F(-2,hy,5,1,L.hat==='wide'?'#c8a040':'#5a3a22');break;
    case'cap':F(-2,hy,5,2,L.hatCol);F(3,hy+1,2,1,shadeC(L.hatCol,-.3));break;
    case'toque':F(-2,hy-2,5,3,'#ffffff');F(-3,hy-3,7,2,'#f4f4f4');break;
    case'bowler':F(-3,hy+1,7,1,L.hatCol);F(-2,hy-1,5,2,L.hatCol);break;
    case'tophat':F(-3,hy+1,7,1,L.hatCol);F(-2,hy-3,5,4,L.hatCol);F(-2,hy,5,1,'#6a2a3a');break;
    case'bandana':F(-2,hy+1,5,2,L.hatCol);F(-3,hy+2,1,2,L.hatCol);break;
    case'goggles':F(-2,hy+1,5,2,L.hair);F(-2,hy+2,5,1,'#3a2a1a');F(0,hy+1,2,2,'#c89a40');break;
    case'straw':F(-5,hy+1,11,1,shadeC(L.hatCol,-.15));F(-2,hy-1,5,2,L.hatCol);F(-2,hy,5,1,'#a83a2a');break;
  }
  // tools
  if(sw||o.tool==='hold'){const tool=o.toolKind||'pick';g.save();const sx=x+d*3,sy=y-9+by;g.translate(sx,sy);g.scale(d,1);
    const t=1-o.swing;const ang=sw?lerp(-2.4,.5,t<.35?t/.35:1-(t-.35)*.4):-.3;g.rotate(ang);
    if(tool==='pick'||tool==='drill'){g.fillStyle='#7a5230';g.fillRect(0,-1,1,8);g.fillStyle=tool==='drill'?'#8ab0d0':'#b8bcc4';g.fillRect(-3,7,7,1);g.fillRect(-3,6,1,1);g.fillRect(3,6,1,1)}
    else if(tool==='hammer'){g.fillStyle='#7a5230';g.fillRect(0,0,1,6);g.fillStyle='#5a5e66';g.fillRect(-1,5,3,2)}
    else if(tool==='axe'){g.fillStyle='#7a5230';g.fillRect(0,-1,1,8);g.fillStyle='#b8bcc4';g.fillRect(-2,5,3,3);g.fillRect(-3,6,1,1)}
    else if(tool==='sickle'){g.fillStyle='#7a5230';g.fillRect(0,0,1,4);g.fillStyle='#d0d4dc';g.fillRect(0,4,1,1);g.fillRect(-1,5,1,1);g.fillRect(-2,5,1,1);g.fillRect(-3,4,1,1)}
    else if(tool==='can'){g.fillStyle='#3a3a40';g.fillRect(-1,1,3,4);g.fillStyle='#7a4bd0';g.fillRect(-1,1,3,1)}
    g.fillStyle=L.skin;g.fillRect(0,-1,1,1);g.restore()}
  if(o.lamp){g.fillStyle='#ffd870';g.fillRect(d>0?x+4:x-5,y-7+by,1,2)}
}
function lookOf(n){const C=CLASSES[n.cls];return{shirt:C.shirt,pants:C.pants,hat:C.hat,hatCol:C.hatCol,apron:C.apron,vest:C.vest,star:C.star,skin:n.skin,hair:n.hair,beard:n.beard&&!n.female,female:n.female}}
function playerLook(){const p=S.player;return{...PLAYER_LOOK,skin:p.skin,hair:p.hair,female:p.female,beard:false}}

// ---------- world props ----------
function drawDeposit(g,d){const x=d.x*TS,y=d.y*TS,f=d.amount/d.max;
  if(d.type==='oil'){const bx=x+8,by=y+14;g.fillStyle='rgba(10,8,20,.55)';g.beginPath();g.ellipse(bx,by,7,2.5,0,0,7);g.fill();g.fillStyle='rgba(140,90,220,.25)';g.fillRect(bx-3,by-1,3,1);
    g.strokeStyle='#5a3a22';g.lineWidth=1;g.beginPath();g.moveTo(bx-6,by);g.lineTo(bx,by-20);g.lineTo(bx+6,by);g.moveTo(bx-4,by-6);g.lineTo(bx+4,by-6);g.moveTo(bx-2,by-12);g.lineTo(bx+2,by-12);g.moveTo(bx-4,by-6);g.lineTo(bx+2,by-12);g.stroke();
    const a=d.amount>=1?Math.sin(clock*2.2+d.id)*.35:0;g.save();g.translate(bx,by-15);g.rotate(a);g.fillStyle='#3a3a40';g.fillRect(-8,-1,14,2);g.fillStyle='#8a2a20';g.fillRect(-9,-2,3,5);g.restore();
    if(d.amount<5){g.fillStyle='#fff';g.globalAlpha=.6;g.fillRect(bx-1,by-24,2,2);g.globalAlpha=1}return}
  if(d.amount<1){g.fillStyle='#6a645c';g.fillRect(x+4,y+11,3,2);g.fillRect(x+9,y+12,2,2);g.fillStyle='#8a847a';g.fillRect(x+6,y+10,3,2);return}
  const col=GOODS[d.type].col,big=d.vein;
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x+8,y+14,big?10:7,2.5,0,0,7);g.fill();
  const rocks=big?[[3,10,5],[11,9,6],[7,6,5],[14,12,3]]:[[5,11,4],[11,11,3],[8,8,4]];const rc=d.type==='coal'?'#4a4a50':'#8a837a';
  for(const[rx,ry,r]of rocks){pcirc(g,x+rx,y+ry,r,shadeC(rc,-.25));pcirc(g,x+rx-1,y+ry-1,r-1,rc);g.fillStyle=shadeC(rc,.3);g.fillRect(x+rx-r+1,y+ry-r+1,2,1)}
  const n=Math.max(1,Math.round(f*(big?9:5)));
  for(let i=0;i<n;i++){const h1=hash2(d.id,i,7),h2=hash2(i,d.id,9),cx=x+3+Math.round(h1*(big?12:9)),cy=y+5+Math.round(h2*(big?8:6));
    g.fillStyle=shadeC(col,-.3);g.fillRect(cx-1,cy,3,1);g.fillRect(cx,cy-1,1,3);g.fillStyle=col;g.fillRect(cx,cy,1,1);g.fillStyle='#fff';if((clock*1.5+h1*6)%4<.2)g.fillRect(cx,cy-1,1,1)}
  if(big){g.strokeStyle=hexA(col,.55+Math.sin(clock*2+d.id)*.25);g.lineWidth=1;g.beginPath();g.moveTo(x+2,y+9);g.lineTo(x+7,y+7);g.lineTo(x+10,y+10);g.lineTo(x+15,y+8);g.stroke()}
}
function drawDecor(g,o){const x=o.x*TS,y=o.y*TS;
  switch(o.k){
    case'well':g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,9,3,0,0,7);g.fill();pcirc(g,x,y-4,7,'#7a746a');pcirc(g,x,y-5,5,'#1e3248');g.fillStyle='#5a3a22';g.fillRect(x-7,y-17,1,12);g.fillRect(x+6,y-17,1,12);
      g.fillStyle='#8a3a2a';for(let i=0;i<5;i++)g.fillRect(x-8+i,y-18-i,17-i*2,1);g.fillStyle='#4a3a2a';g.fillRect(x-1,y-14,2,5);break;
    case'board':g.fillStyle='#5a3a22';g.fillRect(x-6,y-10,1,10);g.fillRect(x+5,y-10,1,10);g.fillStyle='#8a6a42';g.fillRect(x-7,y-14,14,8);g.fillStyle='#efe2c0';g.fillRect(x-5,y-13,4,5);g.fillRect(x,y-12,4,4);g.fillStyle='#c84030';g.fillRect(x-4,y-13,1,1);break;
    case'crate':g.fillStyle='#7a5230';g.fillRect(x-4,y-7,8,7);g.fillStyle='#9a7040';g.fillRect(x-4,y-7,8,1);g.fillStyle='#5a3a22';g.fillRect(x-4,y-4,8,1);break;
    case'barrel':g.fillStyle='#6a4428';g.fillRect(x-3,y-8,6,8);g.fillStyle='#4a4a50';g.fillRect(x-3,y-7,6,1);g.fillRect(x-3,y-2,6,1);g.fillStyle='#8a6038';g.fillRect(x-2,y-8,2,8);break;
    case'cart':g.fillStyle='#6a4a2a';g.fillRect(x-7,y-8,13,5);g.fillStyle='#3a2a1a';pcirc(g,x-4,y-2,2,'#3a2a1a');pcirc(g,x+3,y-2,2,'#3a2a1a');g.fillStyle='#8a8278';g.fillRect(x-6,y-10,11,2);break;
    case'wagon':{g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,11,3,0,0,7);g.fill();g.fillStyle='#6a4428';g.fillRect(x-9,y-9,18,6);pcirc(g,x-6,y-2,3,'#3a2a1a');pcirc(g,x+6,y-2,3,'#3a2a1a');
      for(let i=0;i<16;i++){const hh=Math.round(7-Math.abs(i-7.5)*.5);g.fillStyle=i%4<2?'#e8e0d0':'#7a3a8a';g.fillRect(x-8+i,y-9-hh,1,hh)}g.fillStyle='#c8a040';g.fillRect(x+4,y-12,4,3);g.fillStyle='#b5653d';g.fillRect(x-7,y-11,3,2);break}
    case'lamp':g.fillStyle='#2a2a2e';g.fillRect(x,y-16,1,16);g.fillRect(x-1,y-1,3,1);g.fillStyle=isNight()?'#ffe090':'#c8c0a0';g.fillRect(x-1,y-19,3,3);g.fillStyle='#2a2a2e';g.fillRect(x-2,y-20,5,1);break;
  }}
function drawBuilding(g,b){const s=buildingSprite(b),x=b.x*TS,y=(b.y+b.h)*TS-s.height;g.drawImage(s,x,y);
  if(b.flag){const fx=x+b.flag.x,fy=y+b.flag.y;g.fillStyle='#3a2a1a';g.fillRect(fx,fy-12,1,12);for(let i=0;i<7;i++){const o=Math.round(Math.sin(clock*4-i*.7)*1);g.fillStyle=i<2?'#2a4a8a':'#c83a2a';g.fillRect(fx+1+i,fy-12+o,1,4);g.fillStyle='#f0e6c8';g.fillRect(fx+1+i,fy-10+o,1,1)}}
  if(b.glow){const a=.7+Math.sin(clock*9)*.15+Math.random()*.1;g.fillStyle=hexA(b.glow.col,a*.6);g.fillRect(x+b.glow.x-3,y+b.glow.y-2,6,3)}
  if(isNight()&&b.windows)for(const w of b.windows){g.fillStyle='rgba(255,200,110,.85)';g.fillRect(x+w.x-2,y+w.y-2,4,4)}}

// ---------- main draw ----------
const rain=[];for(let i=0;i<260;i++)rain.push({x:Math.random(),y:Math.random(),l:rnd(8,16),s:rnd(.9,1.3)});
let flash=0;
function lightLevel(){const h=S.time/60%24;let d;
  if(h<5)d=.66;else if(h<6.5)d=lerp(.66,.08,(h-5)/1.5);else if(h<7.5)d=lerp(.08,0,(h-6.5));else if(h<17.5)d=0;else if(h<19.5)d=lerp(0,.3,(h-17.5)/2);else if(h<21)d=lerp(.3,.66,(h-19.5)/1.5);else d=.66;
  const w={clear:0,cloudy:.08,rain:.18,storm:.28}[S.weather]||0;return{dark:clamp(d+w*(1-d),0,.8),warm:(h>5.5&&h<7.5)?1-Math.abs(h-6.5):(h>17&&h<19.5)?1-Math.abs(h-18.4)/1.2:0}}
function render(dt){clock+=dt;if(S.where&&CAVE){if(VW>0&&VH>0&&lc.width&&lc.height)renderCave(dt);return}
  const z=cam.zoom,g=ctx;g.setTransform(DPR,0,0,DPR,0,0);g.imageSmoothingEnabled=false;
  g.fillStyle='#1c4a74';g.fillRect(0,0,VW,VH);
  const shx=cam.shake?rnd(-cam.shake,cam.shake):0,shy=cam.shake?rnd(-cam.shake,cam.shake):0;cam.shake=Math.max(0,cam.shake-dt*20);
  const ox=Math.round((cam.x-VW/2/z)*z)/z-shx,oy=Math.round((cam.y-VH/2/z)*z)/z-shy;
  g.setTransform(DPR*z,0,0,DPR*z,-ox*z*DPR,-oy*z*DPR);
  const vx0=ox,vy0=oy,vx1=ox+VW/z,vy1=oy+VH/z;
  g.drawImage(world.terrain,Math.max(0,vx0|0),Math.max(0,vy0|0),Math.min(W*TS,vx1+1|0)-Math.max(0,vx0|0),Math.min(H*TS,vy1+1|0)-Math.max(0,vy0|0),Math.max(0,vx0|0),Math.max(0,vy0|0),Math.min(W*TS,vx1+1|0)-Math.max(0,vx0|0),Math.min(H*TS,vy1+1|0)-Math.max(0,vy0|0));
  const tx0=Math.max(0,vx0/TS|0),ty0=Math.max(0,vy0/TS|0),tx1=Math.min(W,vx1/TS+1|0),ty1=Math.min(H,vy1/TS+2|0);
  // water shimmer + shore foam
  g.fillStyle='rgba(200,230,255,.28)';
  for(let y=ty0;y<ty1;y++)for(let x=tx0;x<tx1;x++){if(world.tiles[idx(x,y)]!==T.WATER)continue;const h=hash2(x,y,3);
    const px=x*TS+((clock*3+h*16)%16),py=y*TS+(h*13|0)+1;if(Math.sin(clock*1.3+h*20)>.2)g.fillRect(px|0,py,3,1)}
  for(const s of world.shore){if(s.x<tx0-1||s.x>tx1||s.y<ty0-1||s.y>ty1)continue;const a=.3+Math.sin(clock*2+s.x*.7+s.y*.3)*.2;g.fillStyle=`rgba(235,245,255,${a})`;
    const x=s.x*TS,y=s.y*TS,o=Math.round(1+Math.sin(clock*2+s.x+s.y));
    if(s.m&1)g.fillRect(x,y+o,TS,1);if(s.m&4)g.fillRect(x,y+TS-1-o,TS,1);if(s.m&8)g.fillRect(x+o,y,1,TS);if(s.m&2)g.fillRect(x+TS-1-o,y,1,TS)}
  // crops
  const wind=S.wind;
  if(!world.fieldIdx){world.fieldIdx=new Int32Array(W*H).fill(-1);world.fields.forEach((i,j)=>world.fieldIdx[i]=j)}
  for(let y=ty0;y<ty1;y++)for(let x=tx0;x<tx1;x++){const j=world.fieldIdx[idx(x,y)];if(j<0)continue;const gr=S.crops?Math.min(1,S.crops[j]):1,ripe=S.crops&&S.crops[j]>=1;
    const hgt=gr<.12?1:1+Math.round(gr*3),c1=ripe?'#d8b83a':gr<.12?'#8a7a4a':shadeC('#6a9a3a',gr*.3),c2=ripe?'#f0d45a':'#8ab84a';
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){const sx=x*TS+c*4+1,sy=y*TS+r*4+3,o=gr>.3?Math.round(Math.sin(clock*1.6+sx*.08+wind)*1):0;g.fillStyle=c1;g.fillRect(sx+o,sy-hgt,1,hgt);if(gr>.5){g.fillStyle=c2;g.fillRect(sx+o,sy-hgt-1,1,1)}}}
  for(const h of GROUND_HOOKS)h(g,tx0,ty0,tx1,ty1);
  // ownership overlay
  if(UI.overlay){for(const p of S.plots){const x=p.px*PS*TS,y=p.py*PS*TS,s=PS*TS;if(x>vx1||y>vy1||x+s<vx0||y+s<vy0)continue;
    if(p.owner!=='crown'){g.fillStyle=hexA(ownerColor(p.owner),.18);g.fillRect(x,y,s,s)}g.strokeStyle=p.owner==='crown'?'rgba(255,255,255,.15)':hexA(ownerColor(p.owner),.8);g.lineWidth=1/z*2;g.strokeRect(x+.5,y+.5,s-1,s-1);
    if(p.lease&&p.lease.until>S.time){g.setLineDash([3,3]);g.strokeStyle='rgba(255,255,255,.7)';g.strokeRect(x+3,y+3,s-6,s-6);g.setLineDash([])}}}
  // y-sorted world
  const list=[];
  for(let i=0;i<world.trees.length;i++){const t=world.trees[i];if(t.x<vx0-20||t.x>vx1+20||t.y<vy0-4||t.y>vy1+34)continue;if(S.cut&&S.cut[i]>S.time){list.push({y:t.y,k:6,o:t});continue}list.push({y:t.y,k:0,o:t})}
  if(S.lots)for(const l of S.lots){if(l.biz)continue;const L=world.lots[l.i];list.push({y:(L.y+L.h)*TS,k:7,o:{l,L}})}
  for(const b of world.buildings){const x=b.x*TS,y=(b.y+b.h)*TS;if(x>vx1||x+b.w*TS<vx0||y<vy0||y-b.h*TS-40>vy1)continue;list.push({y,k:1,o:b})}
  for(const d of S.deposits){const x=d.x*TS,y=d.y*TS;if(x<vx0-24||x>vx1+8||y<vy0-24||y>vy1+8)continue;list.push({y:y+12,k:2,o:d})}
  for(const o of world.decor){const x=o.x*TS,y=o.y*TS;if(x<vx0-20||x>vx1+20||y<vy0||y>vy1+24)continue;list.push({y,k:3,o})}
  for(const l of world.lamps){const x=l.x*TS,y=l.y*TS;if(x<vx0-10||x>vx1+10||y<vy0||y>vy1+24)continue;list.push({y,k:3,o:{k:'lamp',x:l.x,y:l.y}})}
  for(const n of S.npcs){if(n.sleeping)continue;const x=n.x*TS,y=n.y*TS;if(x<vx0-10||x>vx1+10||y<vy0||y>vy1+20)continue;list.push({y,k:4,o:n})}
  if(!S.demo)list.push({y:S.player.y*TS,k:5,o:S.player});
  for(const e of S.ents){const x=e.x*TS,y=e.y*TS;if(x<vx0-20||x>vx1+20||y<vy0-10||y>vy1+30)continue;list.push({y,k:8,o:e})}
  if(world.caves)for(const c of world.caves){const x=c.x*TS,y=c.y*TS;if(x<vx0-30||x>vx1+30||y<vy0-30||y>vy1+30)continue;list.push({y:y+16,k:9,o:c})}
  for(const h of DRAW_HOOKS)h(list,vx0,vy0,vx1,vy1);
  list.sort((a,b)=>a.y-b.y);
  for(const e of list){const o=e.o;switch(e.k){
    case 0:{const sw=Math.round(Math.sin(clock*1.3+o.ph+wind*.3)*(S.weather==='storm'?1.6:1));const s=treeSprite(o.k,o.v,clamp(sw,-1,1));const sc=o.small?.75:1;
      g.drawImage(s,Math.round(o.x-s.width*sc/2),Math.round(o.y-s.height*sc+2),s.width*sc,s.height*sc);break}
    case 1:drawBuilding(g,o);break;
    case 2:drawDeposit(g,o);break;
    case 3:drawDecor(g,o);break;
    case 6:g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(o.x,o.y,4,1.5,0,0,7);g.fill();g.fillStyle='#6a4428';g.fillRect(o.x-2,o.y-3,4,3);g.fillStyle='#c8a070';g.fillRect(o.x-2,o.y-3,4,1);break;
    case 7:drawLot(g,o.l,o.L);break;
    case 4:{const n=o;if(n.cls==='peddler')drawDecor(g,{k:'wagon',x:n.x+1.4,y:n.y+.2});const tk=n.hostile?(n.cls==='sheriff'||n.cls==='deputy'?'revolver':'knife'):n.cls==='smith'?'hammer':n.cls==='woodcutter'?'axe':n.cls==='farmer'?'sickle':n.cls==='hauler'?'can':n.pick===2?'drill':'pick';
      drawChar2(g,n.x*TS,n.y*TS,lookOf(n),{face:n.face||'side',dir:n.dir,walk:n.walk,moving:n.moving,swing:n.swing,hurt:n.hurt||0,weapon:(n.swing>0||n.hostile)?tk:null,aim:n.hostile?Math.atan2(S.player.y-n.y,S.player.x-n.x):null,gun:n.hostile&&tk==='revolver',show:!!n.hostile,carry:load(n)>0,lamp:n.cls==='miner'&&isNight()});
      if(UI.hoverNpc===n){g.strokeStyle='rgba(255,230,150,.9)';g.lineWidth=1/z*1.5;g.beginPath();g.ellipse(n.x*TS,n.y*TS,6,2.5,0,0,7);g.stroke()}break}
    case 5:drawPlayer(g);break;
    case 8:drawEnt(g,o);break;
    case 9:drawCaveMouth(g,o);break;
    case 10:o.f();break;
  }}
  // rumour pins
  for(const pin of S.player.pins){const d=S.deposits[pin.id];if(!d||d.amount<1)continue;const x=d.x*TS+8,y=d.y*TS-6+Math.sin(clock*3+pin.id)*2;
    g.fillStyle='#e8402a';g.beginPath();g.arc(x,y-4,3,0,7);g.fill();g.fillRect(x-.5,y-2,1,4);g.fillStyle='#fff';g.fillRect(x-1,y-5,1,1)}
  // particles and projectiles
  for(const pr of PROJ)drawProj(g,pr);drawParticles(g,z);
  if(S.player.tmaps)for(const m of S.player.tmaps){if(m.found||dist(m.x,m.y,S.player.x,S.player.y)>5)continue;g.strokeStyle='rgba(200,40,30,.8)';g.lineWidth=1;g.beginPath();g.moveTo(m.x*TS-3,m.y*TS-3);g.lineTo(m.x*TS+3,m.y*TS+3);g.moveTo(m.x*TS+3,m.y*TS-3);g.lineTo(m.x*TS-3,m.y*TS+3);g.stroke()}
  // cloud shadows
  const L=lightLevel();
  if(L.dark<.5){for(const c of S.clouds){g.fillStyle=`rgba(10,20,30,${(S.weather==='clear'?.07:.12)*(1-L.dark*2)})`;g.beginPath();g.ellipse(c.x,c.y,c.r,c.r*.6,0,0,7);g.ellipse(c.x+c.r*.6,c.y+c.r*.2,c.r*.7,c.r*.45,0,0,7);g.fill()}}
  // ---- screen space ----
  g.setTransform(DPR,0,0,DPR,0,0);
  // rain
  if(S.weather==='rain'||S.weather==='storm'){g.strokeStyle='rgba(185,210,240,.6)';g.lineWidth=1.3;g.beginPath();const sl=S.wind*4+2;
    for(const r of rain){r.y+=dt*r.s*1.4;r.x+=dt*S.wind*.05;if(r.y>1){r.y-=1;r.x=Math.random()}const x=((r.x%1)+1)%1*VW,y=r.y*VH;g.moveTo(x,y);g.lineTo(x-sl,y+r.l)}g.stroke();
    if(S.weather==='storm'){if(Math.random()<dt*.08)flash=1}}
  // lighting
  lighting(L);
  if(flash>0){g.fillStyle=`rgba(230,240,255,${flash*.55})`;g.fillRect(0,0,VW,VH);flash=Math.max(0,flash-dt*2.5)}
  if(L.warm>0){g.fillStyle=`rgba(255,140,60,${L.warm*.13})`;g.fillRect(0,0,VW,VH)}
  // labels, prompts, bubbles, floating text
  if(!S.demo)drawLabels(g);
  for(const n of S.npcs){if(n.sleeping||!n.bubble)continue;const s=toScreen(n.x,n.y);if(s.x<-100||s.x>VW+100||s.y<-50||s.y>VH+80)continue;bubble(g,s.x,s.y-17*z-6,n.bubble)}
  if(S.player.bubble){const s=toScreen(S.player.x,S.player.y);bubble(g,s.x,s.y-17*z-6,S.player.bubble)}
  if(!S.demo)for(const n of S.npcs){if(n.sleeping||n.bubble||n.cls==='peddler')continue;if(Math.abs(n.x-S.player.x)>14||Math.abs(n.y-S.player.y)>10)continue;const ns=npcNeeds(n);if(!ns.length)continue;const s=toScreen(n.x,n.y);needBadge(g,s.x,s.y-17*z-8+Math.sin(clock*3+n.x)*2,ns[0].k,S.player.inv[ns[0].k]>0)}
  drawEntBubbles(g);if(!S.demo&&typeof drawQuestMarkers==='function')drawQuestMarkers(g);drawTexts(g);if(!S.demo&&typeof drawQuestArrow==='function')drawQuestArrow(g);
  // vignette
  const vg=g.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*.45,VW/2,VH/2,Math.max(VW,VH)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.38)');g.fillStyle=vg;g.fillRect(0,0,VW,VH);
}
function ownerColor(o){if(o==='player')return'#fff0b0';if(o==='town')return'#6fa8dc';if(o==='crown')return'#888888';const n=S.npcs.find(n=>n.id===o);
  if(!n)return'#aaaaaa';const h=(parseInt(n.id.slice(1))*67)%360;return hslHex(h,.65,.6)}
function hslHex(h,s,l){const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0')};return'#'+f(0)+f(8)+f(4)}

function lighting(L){if(L.dark<.02)return;const g=lctx,z=cam.zoom;g.setTransform(DPR,0,0,DPR,0,0);g.globalCompositeOperation='source-over';g.clearRect(0,0,VW,VH);
  g.fillStyle=`rgba(8,14,40,${L.dark})`;g.fillRect(0,0,VW,VH);g.globalCompositeOperation='destination-out';
  const lights=[];const night=L.dark>.25;
  const add=(x,y,r,col,fl=0)=>{const s=toScreen(x,y);const R=r*TS*z*(1+(fl?Math.sin(clock*12+x)*.04*fl+Math.random()*.03*fl:0));if(s.x<-R||s.y<-R||s.x>VW+R||s.y>VH+R)return;lights.push({x:s.x,y:s.y,R,col})};
  const p=S.player;if(!S.demo)add(p.x,p.y-.5,p.cmb&&p.cmb.light>0?6.5:p.equip.hand?6:2.4,'#ffd890',1);
  if(night){for(const l of world.lamps)add(l.x,l.y-1.2,3.4,'#ffcf7a',1);
    for(const b of world.buildings){const s=b.spr;if(!s)continue;const bx=b.x,by=b.y+b.h-s.height/TS;for(const w of b.windows||[])add(bx+w.x/TS,by+w.y/TS,1.5,'#ffc070');}
    for(const n of S.npcs)if(!n.sleeping&&n.cls==='miner')add(n.x,n.y-.8,1.7,'#ffe0a0',1);
    for(const d of S.deposits)if(d.vein&&d.amount>0)add(d.x+.5,d.y+.5,1.6,GOODS[d.type].col);
    for(const f of S.fireflies)add(f.x,f.y,.45,'#d8ff80')}
  for(const b of world.buildings){if(!b.glow)continue;const s=b.spr;if(!s)continue;const by=b.y+b.h-s.height/TS;add(b.x+b.glow.x/TS,by+b.glow.y/TS,b.glow.r*(night?1:.4),b.glow.col,2)}
  for(const q of fx.parts)if(q.k==='spark')add(q.x,q.y-q.z,.35,'#ffb040');else if(q.k==='fw'&&Math.random()<.3)add(q.x,q.y-q.z,.8,q.col);
  for(const l of lights){const gr=g.createRadialGradient(l.x,l.y,0,l.x,l.y,l.R);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.55,'rgba(0,0,0,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.arc(l.x,l.y,l.R,0,7);g.fill()}
  g.globalCompositeOperation='source-over';ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(lc,0,0);ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.globalCompositeOperation='lighter';
  for(const l of lights){const gr=ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.R*.8);gr.addColorStop(0,hexA(l.col,.28*L.dark));gr.addColorStop(1,hexA(l.col,0));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(l.x,l.y,l.R*.8,0,7);ctx.fill()}
  ctx.globalCompositeOperation='source-over'}

function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function wrapText(g,txt,max){const words=txt.split(' '),out=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(g.measureText(t).width>max&&cur){out.push(cur);cur=w}else cur=t}if(cur)out.push(cur);return out}
function bubble(g,x,y,b){const t=b.t,k=t<.18?easeBack(t/.18):1,fade=t>b.dur-.3?(b.dur-t)/.3:1;g.save();g.globalAlpha=clamp(fade,0,1);g.translate(x,y);g.scale(k,k);
  g.font='600 12px Inter,system-ui,sans-serif';const lines=wrapText(g,b.text,170),w=Math.max(...lines.map(l=>g.measureText(l).width))+14,h=lines.length*15+9;
  g.fillStyle='rgba(0,0,0,.25)';rrect(g,-w/2+2,-h+2,w,h,7);g.fill();
  g.fillStyle='#fbf4e4';rrect(g,-w/2,-h,w,h,7);g.fill();g.beginPath();g.moveTo(-5,-1);g.lineTo(0,7);g.lineTo(5,-1);g.fill();
  g.strokeStyle='#4a3a28';g.lineWidth=1.2;rrect(g,-w/2,-h,w,h,7);g.stroke();
  g.fillStyle='#2a2018';g.textAlign='center';lines.forEach((l,i)=>g.fillText(l,0,-h+16+i*15));g.restore()}
const easeBack=t=>{const c=1.7;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
function drawLabels(g){const p=S.player,z=cam.zoom;
  g.font='700 12px Cinzel,Georgia,serif';g.textAlign='center';
  for(const b of world.buildings){const d=dist(p.x,p.y,b.door.x+.5,b.door.y+.5);if(d>6)continue;const s=toScreen(b.x+b.w/2,b.y-(BEXTRA[b.kind]||10)/TS-.2);
    const z=bizOfBld(b),nm=b.name+(z?(z.owner==='player'?' · yours':z.closedUntil>S.time?' · closed':''):'');
    const a=clamp((6-d)/2,0,1);g.globalAlpha=a;const w=g.measureText(nm).width+16;g.fillStyle='rgba(20,14,8,.78)';rrect(g,s.x-w/2,s.y-16,w,20,4);g.fill();g.strokeStyle='rgba(212,165,74,.7)';g.stroke();g.fillStyle='#f3e3c0';g.fillText(nm,s.x,s.y-2)}
  if(S.lots)for(const l of S.lots){if(l.biz)continue;const L=world.lots[l.i],d=dist(p.x,p.y,L.door.x+.5,L.door.y);if(d>5)continue;const s=toScreen(L.x+L.w/2,L.y);
    const nm=l.build?`Building: ${BIZ_TYPES[l.build.type].n}`:l.owner==='player'?`Lot ${l.i+1} · yours, ready to build`:`Lot ${l.i+1} · for sale ${money(lotPrice())}`;g.globalAlpha=clamp((5-d)/2,0,1);const w=g.measureText(nm).width+16;
    g.fillStyle='rgba(20,14,8,.78)';rrect(g,s.x-w/2,s.y-16,w,20,4);g.fill();g.strokeStyle='rgba(212,165,74,.7)';g.stroke();g.fillStyle='#f3e3c0';g.fillText(nm,s.x,s.y-2)}
  g.globalAlpha=1;
  if(UI.hoverNpc){const n=UI.hoverNpc,s=toScreen(n.x,n.y);g.font='600 11px Inter,system-ui,sans-serif';const txt=`${n.name} · ${CLASSES[n.cls].n}`,w=g.measureText(txt).width+12;
    g.fillStyle='rgba(20,14,8,.85)';rrect(g,s.x-w/2,s.y+6,w,18,4);g.fill();g.fillStyle=CLASSES[n.cls].col;g.fillText(txt,s.x,s.y+19)}
  if(UI.overlay){g.font='600 11px Inter,system-ui,sans-serif';for(const q of S.plots){if(q.owner==='crown'&&!plotDeposits(q).length)continue;const s=toScreen(q.px*PS+PS/2,q.py*PS+PS/2);if(s.x<-80||s.y<-30||s.x>VW+80||s.y>VH+30)continue;
    const t=ownerName(q.owner),v=money(plotValue(q));g.fillStyle='rgba(15,10,6,.75)';const w=Math.max(g.measureText(t).width,g.measureText(v).width)+12;rrect(g,s.x-w/2,s.y-16,w,32,5);g.fill();
    g.fillStyle=ownerColor(q.owner);g.fillText(t,s.x,s.y-3);g.fillStyle='#cdbf9f';g.fillText(v,s.x,s.y+11)}}
  drawTargetPrompt(g);
}
function drawTargetPrompt(g){const it=UI.target;if(it){g.textAlign='center';let s,txt=it.label;if(it.at)s=toScreen(it.at.x,it.at.y);else if(it.kind==='dep'){s=toScreen(it.o.x+.5,it.o.y-.2)}else if(it.kind==='npc'){s=toScreen(it.o.x,it.o.y-1.3)}else s=toScreen(it.o.door.x+.5,it.o.door.y-.1);
    const bob=Math.sin(clock*5)*2;g.font='600 12px Inter,system-ui,sans-serif';const w=g.measureText(txt).width+34;g.fillStyle='rgba(15,10,6,.86)';rrect(g,s.x-w/2,s.y-34+bob,w,22,6);g.fill();
    g.strokeStyle=it.bad?'#e0604f':'#d4a54a';g.lineWidth=1.2;g.stroke();g.fillStyle=it.bad?'#e0604f':'#d4a54a';rrect(g,s.x-w/2+4,s.y-30+bob,16,14,3);g.fill();g.fillStyle='#1a120a';g.font='800 10px Inter,system-ui';g.fillText('E',s.x-w/2+12,s.y-19+bob);
    g.font='600 12px Inter,system-ui,sans-serif';g.fillStyle='#f3e3c0';g.textAlign='left';g.fillText(txt,s.x-w/2+25,s.y-19+bob);g.textAlign='center'}}

// ---------- minimap ----------
function drawMinimap(mc){if(S.where&&CAVE)return drawCaveMinimap(mc);const g=mc.getContext('2d'),sw=mc.width/W,sh=mc.height/H;g.imageSmoothingEnabled=false;g.drawImage(world.mini,0,0,mc.width,mc.height);
  for(const q of S.plots){if(q.owner==='crown')continue;if(!UI.overlay&&q.owner!=='player')continue;g.fillStyle=hexA(ownerColor(q.owner),q.owner==='player'?.45:.25);g.fillRect(q.px*PS*sw,q.py*PS*sh,PS*sw,PS*sh)}
  for(const b of world.buildings){g.fillStyle='#e8d0a0';g.fillRect(b.x*sw,b.y*sh,b.w*sw,b.h*sh)}
  if(projectDone('assay'))for(const d of S.deposits){if(d.amount<1)continue;g.fillStyle=GOODS[d.type].col;g.fillRect(d.x*sw-1,d.y*sh-1,d.vein?3:2,d.vein?3:2)}
  for(const pin of S.player.pins){const d=S.deposits[pin.id];if(!d||d.amount<1)continue;g.fillStyle='#ff4a30';g.fillRect(d.x*sw-1.5,d.y*sh-1.5,3,3)}
  for(const n of S.npcs){if(n.sleeping)continue;g.fillStyle=CLASSES[n.cls].col;g.fillRect(n.x*sw-1,n.y*sh-1,2,2)}
  if(world.caves)for(const c of world.caves){g.fillStyle=c.story?'#ffd23f':'#1a1210';g.fillRect(c.x*sw-2,c.y*sh-2,4,4);g.strokeStyle='#e8d8b0';g.strokeRect(c.x*sw-2,c.y*sh-2,4,4)}
  if(S.player.tmaps)for(const m of S.player.tmaps)if(!m.found){g.strokeStyle='#ff3a20';g.lineWidth=1.5;g.beginPath();g.moveTo(m.x*sw-3,m.y*sh-3);g.lineTo(m.x*sw+3,m.y*sh+3);g.moveTo(m.x*sw+3,m.y*sh-3);g.lineTo(m.x*sw-3,m.y*sh+3);g.stroke()}
  if(typeof questMinimap==='function')questMinimap(g,sw,sh);
  const p=S.player;g.fillStyle=Math.sin(clock*6)>0?'#ffffff':'#ffd86b';g.fillRect(p.x*sw-2,p.y*sh-2,4,4);
  g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1;const vw=VW/cam.zoom/TS,vh=VH/cam.zoom/TS;g.strokeRect((cam.x/TS-vw/2)*sw,(cam.y/TS-vh/2)*sh,vw*sw,vh*sh)}

// ---------- icons and portraits ----------
function iconOf(k){if(SPR.icons[k])return SPR.icons[k];const c=mk(16,16),g=c.getContext('2d');const F=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};const G=GOODS[k];const col=G?G.col:'#fff';
  if(G&&G.cat==='Ore'&&k!=='oil'&&k!=='coal'){pcirc(g,8,9,5,'#6a645c');pcirc(g,7,8,4,'#8a837a');F(4,6,2,1,'#aaa298');[[6,8],[9,7],[8,11],[11,10]].forEach(([x,y])=>{F(x-1,y,3,1,shadeC(col,-.3));F(x,y-1,1,3,shadeC(col,-.3));F(x,y,1,1,col)})}
  else if(k==='coal'){pcirc(g,8,9,5,'#1e1e22');pcirc(g,7,8,3,'#34343a');F(5,6,2,1,'#6a6a74');F(9,9,1,1,'#6a6a74')}
  else if(k==='oil'){F(4,3,8,11,'#3a3a40');F(4,5,8,1,'#5a5a64');F(4,11,8,1,'#5a5a64');F(5,3,2,11,'#4a4a52');F(6,1,4,2,'#7a4bd0');F(7,14,2,2,'#7a4bd0')}
  else if(G&&G.cat==='Metal'&&k!=='fuel'){for(let y=0;y<5;y++)F(3+(4-y)*.5|0,6+y,10-((4-y)*.5|0)*2+ (y>2?2:0),1,shadeC(col,-.1-y*.05));F(5,6,6,1,shadeC(col,.45));F(3,11,11,1,shadeC(col,-.45))}
  else if(k==='fuel'){F(5,5,6,9,'#6a3aa8');F(6,6,2,7,'#9a66e0');F(6,2,4,3,'#4a4a50');F(7,1,2,1,'#2a2a2e')}
  else if(k==='bread'){pcirc(g,8,9,5,'#a8682a');F(3,9,11,4,'#a8682a');pcirc(g,8,8,4,'#d9a55b');F(5,6,1,3,'#f0c880');F(8,6,1,3,'#f0c880');F(11,7,1,3,'#f0c880')}
  else if(k==='pickaxe'||k==='drill'){for(let i=0;i<10;i++)F(4+i,13-i,1,1,'#7a5230');for(let i=0;i<9;i++)F(4+i,2+(i<4?3-i:i-5)*0+Math.abs(i-4)*.6|0,1,2,k==='drill'?'#8ab0d0':'#b8bcc4')}
  else if(k==='axe'){for(let i=0;i<10;i++)F(4+i,13-i,1,1,'#7a5230');F(9,2,5,5,'#b8bcc4');F(13,3,1,3,'#e8ecf0');F(8,3,1,3,'#8a8e96')}
  else if(k==='wheat'){for(let i=0;i<5;i++){F(4+i*2,4,1,10,'#c8a83a');F(3+i*2,2+(i%2),3,3,'#f0d45a')}F(3,9,11,2,'#8a5a2a')}
  else if(k==='wood'){for(const[x,y]of[[2,8],[7,8],[4.5,3]]){F(x,y,7,5,'#8a5a30');F(x,y,7,1,'#a8784a');pcirc(g,x+1,y+2,2,'#d8b078');F(x+1,y+2,1,1,'#8a5a30')}}
  else if(k==='boots'){F(4,3,5,9,'#7a4a2a');F(4,11,9,3,'#5a3420');F(5,4,2,7,'#9a6a3a');F(4,13,10,1,'#2a1a10')}
  else if(k==='backpack'){F(3,4,10,10,'#8a6a3a');F(4,3,8,2,'#6a4a2a');F(5,7,6,4,'#a8884a');F(7,8,2,1,'#e0c060')}
  else if(k==='cart'){F(2,5,12,6,'#6a4a2a');F(3,4,10,2,'#8a8278');pcirc(g,4,12,2,'#2a2a2e');pcirc(g,11,12,2,'#2a2a2e');F(4,5,2,2,'#b5653d');F(8,5,2,2,'#ffd23f')}
  else if(k==='lantern'){F(7,1,2,2,'#3a3a40');F(5,3,6,1,'#3a3a40');F(5,4,6,8,'#f0b040');F(6,5,4,6,'#fff0a0');F(5,12,6,2,'#3a3a40')}
  else if(k==='ring'){g.strokeStyle='#f5c542';g.lineWidth=2;g.beginPath();g.arc(8,9,4,0,7);g.stroke();F(7,3,3,3,'#9ae0ff');F(8,3,1,1,'#fff')}
  else if(k==='silver'||k==='gold'){const c1=k==='gold'?'#f5c542':'#d8dde4',c2=k==='gold'?'#b8862a':'#8a9098';pcirc(g,8,8,6,c2);pcirc(g,8,8,5,c1);pcirc(g,8,8,3,c2);pcirc(g,8,8,2,c1);F(5,5,2,1,'#fff')}
  else if(k==='notes'){F(1,4,14,8,'#3a6a3a');F(2,5,12,6,'#7ab07a');pcirc(g,8,8,2,'#3a6a3a');F(3,6,2,1,'#3a6a3a');F(11,9,2,1,'#3a6a3a')}
  else drawIcon2(g,F,k,G,col);
  SPR.icons[k]=c.toDataURL();return SPR.icons[k]}
const ico=(k,cls='ico')=>`<img class="${cls}" src="${iconOf(k)}" alt="">`;
const EXTRA_LOOKS={merchant:{shirt:'#6a3a5a',pants:'#2a2a3a',hat:'bowler',hatCol:'#3a2a1a',vest:'#c8a040'},mayor:{shirt:'#1e1e2a',pants:'#1e1e26',hat:'tophat',hatCol:'#101014',vest:'#8a2a2a'},
  innkeeper:{shirt:'#8a5a3a',pants:'#3a2e26',hat:'none',apron:'#e8e0cf'}};
const PAINTED={};
function portrait(key,n){const ck=key+(n?n.id:'')+(key==='player'&&S?S.player.skin+S.player.hair+S.player.female:'');if(SPR.portraits[ck])return SPR.portraits[ck];
  const cls=n?n.cls:key;if(PAINTED[cls])return PAINTED[cls];
  let L;if(n)L=lookOf(n);else if(key==='player')L=playerLook();else if(CLASSES[key])L={...CLASSES[key],skin:SKINS[(key.length*3)%SKINS.length],hair:HAIRS[key.length%HAIRS.length]};else L={...EXTRA_LOOKS[key],skin:SKINS[key.length%SKINS.length],hair:HAIRS[(key.length*2)%HAIRS.length]};
  const c=mk(40,40),g=c.getContext('2d');const F=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
  const bg=g.createRadialGradient(20,16,2,20,20,28);bg.addColorStop(0,'#5a4430');bg.addColorStop(1,'#1e150e');g.fillStyle=bg;g.fillRect(0,0,40,40);
  // shoulders
  for(let y=30;y<40;y++){const w=12+(y-30)*1.6;F(20-w,y,w*2,1,y<32?shadeC(L.shirt,.1):L.shirt)}F(26,31,8,9,shadeC(L.shirt,-.2));
  if(L.apron)F(14,33,12,7,L.apron);if(L.vest){F(10,32,6,8,L.vest);F(24,32,6,8,L.vest)}if(L.star){pcirc(g,26,35,2,'#ffd23f')}
  if(PLAYER_LOOK===L||L.bandana)F(15,29,10,3,L.bandana||'#d8b040');
  F(17,25,6,6,shadeC(L.skin,-.15));
  // head
  for(let y=0;y<16;y++){const w=y<2?4:y<12?6:6-(y-11);F(20-w,9+y,w*2,1,L.skin)}F(24,11,2,12,shadeC(L.skin,-.1));
  F(15,16,3,1,'#fff');F(22,16,3,1,'#fff');F(16,16,2,1,'#2a1a10');F(23,16,2,1,'#2a1a10');F(15,14,4,1,L.hair);F(21,14,4,1,L.hair);
  F(19,17,2,4,shadeC(L.skin,-.18));F(17,22,6,1,shadeC(L.skin,-.35));F(14,19,2,2,hexA('#e06060',.25));F(24,19,2,2,hexA('#e06060',.25));
  if(L.beard){F(15,20,10,5,L.hair);F(17,22,6,1,shadeC(L.hair,.2))}
  F(14,9,12,3,L.hair);F(13,10,2,8,L.hair);F(25,10,2,6,L.hair);if(L.female){F(12,12,3,15,L.hair);F(25,12,3,14,L.hair)}
  switch(L.hat){case'helmet':F(12,6,16,5,L.hatCol);F(14,4,12,2,L.hatCol);F(10,10,20,2,shadeC(L.hatCol,-.25));F(18,5,4,3,'#fff3a0');break;
    case'stetson':case'wide':F(7,10,26,2,shadeC(L.hatCol,-.2));F(13,3,14,8,L.hatCol);F(13,8,14,2,L.hat==='wide'?'#c8a040':'#5a3a22');break;
    case'cap':F(13,6,14,5,L.hatCol);F(25,10,7,2,shadeC(L.hatCol,-.3));break;
    case'toque':F(13,1,14,10,'#fff');F(12,8,16,3,'#e8e8e8');break;
    case'bowler':F(10,10,20,2,L.hatCol);F(13,4,14,7,L.hatCol);break;
    case'tophat':F(10,10,20,2,L.hatCol);F(13,0,14,11,L.hatCol);F(13,8,14,2,'#6a2a3a');break;
    case'bandana':F(13,8,14,4,L.hatCol);F(26,10,3,4,L.hatCol);break;
    case'straw':F(6,9,28,3,shadeC(L.hatCol,-.15));F(13,3,14,7,L.hatCol);F(13,8,14,2,'#a83a2a');break;
    case'goggles':F(13,11,14,2,'#3a2a1a');pcirc(g,16,12,2,'#c89a40');pcirc(g,24,12,2,'#c89a40');F(15,11,1,1,'#fff');F(23,11,1,1,'#fff');break;}
  const big=mk(160,160),bg2=big.getContext('2d');bg2.imageSmoothingEnabled=false;bg2.drawImage(c,0,0,160,160);
  const url=big.toDataURL();SPR.portraits[ck]=url;return url}
function loadPainted(){for(const k of['miner','refiner','smith','baker','hauler','sheriff','clerk','player']){const im=new Image();im.onload=()=>{PAINTED[k]='assets/img/'+k+'.jpg'};im.src='assets/img/'+k+'.jpg'}}

function drawLot(g,l,L){const x=L.x*TS,y=L.y*TS,w=L.w*TS,h=L.h*TS;
  if(l.build){const dur=(l.build.owner==='player'?1:2)*1440,pr=clamp(1-(l.build.until-S.time)/dur,0,1),top=y+h-22-pr*8;
    g.fillStyle='rgba(60,40,20,.35)';g.fillRect(x+2,y+4,w-4,h-4);g.fillStyle='#b08850';const wh=Math.round(18*pr);g.fillRect(x+4,y+h-2-wh,w-8,wh);
    g.fillStyle='#6a4a2a';for(let i=0;i<wh;i+=3)g.fillRect(x+4,y+h-2-i,w-8,1);
    g.fillStyle='#8a6a3a';for(let i=0;i<=L.w;i++)g.fillRect(Math.round(x+2+i*(w-6)/L.w),top,2,y+h-top);g.fillRect(x+2,top,w-4,2);g.fillRect(x+2,y+h-12,w-4,1);
    g.fillStyle='#9a6a3a';g.fillRect(x+w-14,y+h+1,10,3);g.fillStyle='#c8a070';g.fillRect(x+w-14,y+h+1,10,1);
    if(Math.random()<.03&&onScreen(L.x,L.y))fx.debris(L.x+L.w/2,L.y+L.h,'#c8a070',2)}
  else{g.strokeStyle='rgba(230,210,160,.55)';g.lineWidth=.8;g.setLineDash([2,2]);g.strokeRect(x+3,y+5,w-6,h-6);g.setLineDash([]);
    g.fillStyle='#6a4a2a';for(const[px,py]of[[x+3,y+5],[x+w-4,y+5],[x+3,y+h-1],[x+w-4,y+h-1]])g.fillRect(px,py-3,1,4);
    const sx=Math.round(x+w/2),sy=y+h-1;g.fillStyle='#5a3a22';g.fillRect(sx,sy-11,1,11);g.fillStyle='#e8d8b0';g.fillRect(sx-6,sy-16,13,7);
    g.fillStyle=l.owner==='player'?'#3a8a3a':'#a83a2a';g.fillRect(sx-4,sy-14,9,1);g.fillRect(sx-4,sy-12,6,1)}}

const ICON_IMG={};function iconImg(k){if(!ICON_IMG[k]){const im=new Image();im.src=iconOf(k);ICON_IMG[k]=im}return ICON_IMG[k]}
function needBadge(g,x,y,k,have){g.save();g.fillStyle=have?'rgba(60,40,10,.92)':'rgba(20,14,8,.8)';g.beginPath();g.arc(x,y-14,14,0,7);g.fill();g.lineWidth=have?2.5:1.2;g.strokeStyle=have?'#ffd23f':'rgba(212,165,74,.6)';g.stroke();
  g.beginPath();g.moveTo(x-4,y-1);g.lineTo(x,y+5);g.lineTo(x+4,y-1);g.fillStyle=have?'rgba(60,40,10,.92)':'rgba(20,14,8,.8)';g.fill();const im=iconImg(k);if(im.complete){g.imageSmoothingEnabled=false;g.drawImage(im,x-10,y-24,20,20)}
  if(have){g.fillStyle='#ffd23f';g.font='800 10px Inter,system-ui';g.textAlign='center';g.fillText('$',x+11,y-22)}g.restore()}

function drawCaveMinimap(mc){const g=mc.getContext('2d'),L=CAVE,sw=mc.width/CW,sh=mc.height/CH;g.fillStyle='#0a0806';g.fillRect(0,0,mc.width,mc.height);
  const seen=S.caves[L.key].seen=S.caves[L.key].seen||{};const p=S.player;for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++)seen[idx((p.x|0)+dx,(p.y|0)+dy)]=1;
  for(const k in seen){const i=+k,t=L.tiles[i];if(t===CT.WALL)continue;g.fillStyle=t===CT.WATER?'#1e4c78':t===CT.CRACK?'#8a6a3a':'#5a524a';g.fillRect((i%W)*sw,(i/W|0)*sh,sw+.5,sh+.5)}
  const lad=(i,c)=>{if(seen[i]){g.fillStyle=c;g.fillRect((i%W)*sw-2,(i/W|0)*sh-2,5,5)}};lad(L.up,'#9ad672');if(L.down>=0)lad(L.down,'#e8705e');
  for(const e of L.ents)if(e.kind==='mob'&&!e.dead&&seen[idx(e.x|0,e.y|0)]){g.fillStyle='#ff4a3a';g.fillRect(e.x*sw-1,e.y*sh-1,2,2)}
  g.fillStyle=Math.sin(clock*6)>0?'#ffffff':'#ffd86b';g.fillRect(p.x*sw-2,p.y*sh-2,4,4);g.fillStyle='#f3cc6e';g.font='600 11px Inter';g.fillText(L.c.name+' · level '+L.depth,6,14)}
