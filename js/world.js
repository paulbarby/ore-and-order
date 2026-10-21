'use strict';
// ===== world: terrain generation, town layout, deposits, plots, path finding =====
const W=120,H=90,TS=16,PS=10,PW=W/PS,PH=H/PS;
const T={WATER:0,SAND:1,GRASS:2,FOREST:3,HILL:4,MOUNT:5,ROAD:6,FIELD:7,PLAZA:8,BUILD:9};
const COST=[0,1.15,1,1.45,1.5,1.9,.65,1.1,.65,0];
let world=null; // static map, rebuilt from the seed
let S=null;     // live game state, saved

const BUILD_DEFS=[
  {kind:'market',name:'Market Hall',x:-15,y:-3,w:5,h:3,roof:'#8a3a2a',wall:'#c9a274',who:'merchant'},
  {kind:'bank',name:'Valley Bank & Mint',x:-9,y:-3,w:5,h:3,roof:'#4a5560',wall:'#d8d2c4',who:'banker'},
  {kind:'townhall',name:'Town Hall',x:-2,y:-4,w:5,h:4,roof:'#5a3a5a',wall:'#e2d6bc',who:'mayor'},
  {kind:'office',name:'Land Office',x:4,y:-3,w:4,h:3,roof:'#3a5a3a',wall:'#c8b08a',who:'clerk'},
  {kind:'sheriff',name:"Sheriff's Office",x:9,y:-3,w:4,h:3,roof:'#5a4030',wall:'#b89a74',who:'sheriff'},
  {kind:'inn',name:"Miner's Rest Inn",x:-15,y:3,w:5,h:4,roof:'#6a3a28',wall:'#b48a5c',who:'innkeeper'},
  {kind:'bakery',name:'Bakery',x:-9,y:4,w:4,h:3,roof:'#a0603a',wall:'#e8d2a8',who:'baker'},
  {kind:'refinery',name:'Refinery',x:3,y:3,w:6,h:4,roof:'#3a3a40',wall:'#8a5a48',who:'refiner'},
  {kind:'smithy',name:'Smithy',x:10,y:4,w:4,h:3,roof:'#4a3a34',wall:'#8a7a6a',who:'smith'},
];

// lots where new businesses can be built (relative to the town centre). Lot 0 holds the General Store.
const LOT_DEFS=[{x:13,y:-3,w:4,h:3},{x:-19,y:-3,w:3,h:3},{x:14,y:4,w:4,h:3},{x:-19,y:4,w:3,h:3},{x:-4,y:9,w:4,h:3},{x:1,y:9,w:4,h:3},{x:-10,y:9,w:4,h:3},{x:6,y:9,w:4,h:3}];
function idx(x,y){return y*W+x}
function inB(x,y){return x>=0&&y>=0&&x<W&&y<H}
function tileAt(x,y){x|=0;y|=0;return inB(x,y)?world.tiles[idx(x,y)]:T.WATER}
function walkable(x,y){x|=0;y|=0;return inB(x,y)&&COST[world.tiles[idx(x,y)]]>0}
function plotAt(x,y){const px=clamp(Math.floor(x/PS),0,PW-1),py=clamp(Math.floor(y/PS),0,PH-1);return S.plots[py*PW+px]}

function genWorld(seed){
  seedRng(seed);
  const s=seed%99991, tiles=new Uint8Array(W*H), elev=new Float32Array(W*H);
  const cx=W>>1, cy=(H>>1)-4;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=(x-cx)/(W*.5),dy=(y-cy)/(H*.5),d=Math.hypot(dx,dy);
    let e=fbm(x/24,y/24,s,5)+.17-.5*d*d;
    const ridge=1-Math.abs(fbm(x/13,y/13,s+7,3)*2-1);
    if(e>.42)e+=(ridge-.55)*.32;
    // flatten the town site
    const tdx=Math.abs(x-cx),tdy=y-cy;
    if(tdx<24&&tdy>-9&&tdy<19){const k=clamp(Math.min(24-tdx,tdy+9,19-tdy)/4,0,1);e=lerp(e,.47+(fbm(x/6,y/6,s+9,2)-.5)*.04,k)}
    elev[idx(x,y)]=e;
    const m=fbm(x/11,y/11,s+3,4);
    let t=e<.31?T.WATER:e<.335?T.SAND:e>.66?T.MOUNT:e>.585?T.HILL:m>.57?T.FOREST:T.GRASS;
    if(tdx<21&&tdy>-7&&tdy<16)t=T.GRASS;
    tiles[idx(x,y)]=t;
  }
  world={seed,tiles,elev,cx,cy,trees:[],shore:[],lamps:[],decor:[],buildings:[]};

  // town: streets, plaza, buildings, lamps, fields
  const setT=(x,y,t)=>{if(inB(x,y))tiles[idx(x,y)]=t};
  for(let x=-18;x<=18;x++){setT(cx+x,cy,T.ROAD);setT(cx+x,cy+7,T.ROAD)}
  for(let y=0;y<=7;y++)setT(cx,cy+y,T.ROAD);
  for(let x=-12;x<=12;x++)setT(cx+x,cy+12,T.ROAD);
  for(let y=1;y<=6;y++)for(let x=-4;x<=2;x++)setT(cx+x,cy+y,T.PLAZA);
  const road=(x,y,dx,dy,n)=>{for(let i=0;i<n;i++){x+=dx;y+=dy;if(!inB(x,y)||tiles[idx(x,y)]===T.WATER)break;
    if(tiles[idx(x,y)]!==T.BUILD)tiles[idx(x,y)]=T.ROAD;if(R()<.18){if(dx)y+=R()<.5?1:-1;else x+=R()<.5?1:-1;if(inB(x,y)&&tiles[idx(x,y)]!==T.WATER)tiles[idx(x,y)]=T.ROAD}}};
  road(cx-18,cy,-1,0,40);road(cx+18,cy,1,0,40);road(cx,cy+7,0,1,30);road(cx-18,cy+7,0,1,20);road(cx+18,cy+7,0,1,20);road(cx-18,cy,0,-1,26);road(cx+18,cy,0,-1,26);
  const field=(x0,x1,y0,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(tiles[idx(cx+x,cy+y)]!==T.ROAD)setT(cx+x,cy+y,T.FIELD)};
  field(-17,-12,9,11);field(11,15,9,11);field(-17,-2,13,16);field(2,15,13,16);
  const blds=[];
  for(const d of BUILD_DEFS){const b={...d,x:cx+d.x,y:cy+d.y};b.door={x:b.x+(b.w>>1),y:b.y+b.h};
    for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)setT(x,y,T.BUILD);
    setT(b.door.x,b.door.y,T.ROAD);blds.push(b)}
  world.buildings=blds;
  world.lots=LOT_DEFS.map((l,i)=>({i,x:cx+l.x,y:cy+l.y,w:l.w,h:l.h,door:{x:cx+l.x+(l.w>>1),y:cy+l.y+l.h}}));
  for(const l of world.lots)setT(l.door.x,l.door.y,T.ROAD);
  world.board={x:cx+1.5,y:cy+2.5};
  for(let x=-17;x<=17;x+=5){world.lamps.push({x:cx+x+.5,y:cy+1.2});world.lamps.push({x:cx+x+.5,y:cy+8.2})}
  world.well={x:cx-1,y:cy+3};
  world.decor.push({k:'well',x:cx-1+.5,y:cy+3+.8});
  world.decor.push({k:'board',x:cx+1.5,y:cy+2.5});
  for(let i=0;i<10;i++)world.decor.push({k:pick(['crate','barrel','barrel','crate','cart']),x:cx+ri(-17,17)+.5,y:cy+(R()<.5?1:8)+.6});

  world.fields=[];for(let i=0;i<W*H;i++)if(tiles[i]===T.FIELD)world.fields.push(i);
  // trees
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const t=tiles[idx(x,y)];
    if(t===T.FOREST){const n=1+(R()<.6);for(let i=0;i<n;i++)world.trees.push({x:(x+.15+R()*.7)*TS,y:(y+.3+R()*.7)*TS,k:R()<.62?'pine':'oak',v:ri(0,2),ph:R()*6})}
    else if(t===T.GRASS&&R()<.035)world.trees.push({x:(x+.5)*TS,y:(y+.8)*TS,k:R()<.5?'bush':'oak',v:ri(0,2),ph:R()*6});
    else if(t===T.HILL&&R()<.05)world.trees.push({x:(x+.5)*TS,y:(y+.8)*TS,k:'pine',v:ri(0,2),ph:R()*6,small:1});
    else if(t===T.SAND&&R()<.02)world.trees.push({x:(x+.5)*TS,y:(y+.8)*TS,k:'reed',v:0,ph:R()*6});
  }
  // shoreline
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(tiles[idx(x,y)]===T.WATER){let m=0;
    if(tileAt(x,y-1)!==T.WATER)m|=1;if(tileAt(x+1,y)!==T.WATER)m|=2;if(tileAt(x,y+1)!==T.WATER)m|=4;if(tileAt(x-1,y)!==T.WATER)m|=8;
    if(m)world.shore.push({x,y,m})}

  // reachability from the town
  world.reach=new Uint8Array(W*H);const q=[idx(cx,cy)];world.reach[q[0]]=1;
  while(q.length){const i=q.pop(),x=i%W,y=i/W|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;
    if(walkable(nx,ny)&&!world.reach[idx(nx,ny)]){world.reach[idx(nx,ny)]=1;q.push(idx(nx,ny))}}}

  // deposits (dynamic, go into the state)
  const deposits=[], types=[['iron_ore',4],['coal',4],['copper_ore',3],['silver_ore',2],['gold_ore',1]];
  const wpick=()=>{let tot=0;for(const t of types)tot+=t[1];let r=R()*tot;for(const t of types){if((r-=t[1])<0)return t[0]}return'iron_ore'};
  for(let i=0;i<9000&&deposits.length<85;i++){
    const x=ri(2,W-3),y=ri(2,H-3),t=tiles[idx(x,y)];
    if(dist(x,y,cx,cy+3)<15||deposits.some(d=>Math.abs(d.x-x)<4&&Math.abs(d.y-y)<4))continue;
    if(!standTile(x,y))continue;
    if(t===T.MOUNT||(t===T.HILL&&R()<.35)){const type=wpick(),vein=R()<.11;
      let max=vein?ri(14000,28000):ri(160,620);if(type==='gold_ore')max=Math.round(max*(vein?.3:.4));if(type==='silver_ore')max=Math.round(max*.7);
      deposits.push({id:deposits.length,x,y,type,amount:max,max,regen:0,vein});}
    else if((t===T.GRASS||t===T.FOREST||t===T.SAND)&&R()<.02&&deposits.filter(d=>d.type==='oil').length<11){
      const max=ri(90,220);deposits.push({id:deposits.length,x,y,type:'oil',amount:max,max,regen:.5,vein:false});}
  }
  for(const d of deposits){const st=standTile(d.x,d.y);d.sx=st.x;d.sy=st.y;d.reach=!!world.reach[idx(st.x,st.y)]}

  const plots=[];
  for(let py=0;py<PH;py++)for(let px=0;px<PW;px++)plots.push({id:py*PW+px,px,py,owner:'crown',lease:null,arrears:0});
  for(const p of plots){const x0=p.px*PS,y0=p.py*PS;if(x0+PS>cx-19&&x0<cx+19&&y0+PS>cy-5&&y0<cy+9)p.owner='town'}

  buildMinimap();
  return {deposits,plots};
}
function standTile(x,y){for(const[dx,dy]of[[0,1],[1,1],[-1,1],[1,0],[-1,0],[0,-1]]){if(walkable(x+dx,y+dy))return{x:x+dx,y:y+dy}}return null}

// ---------- A* path finding ----------
const PF={g:new Float32Array(W*H),f:new Float32Array(W*H),came:new Int32Array(W*H),stamp:new Int32Array(W*H),closed:new Int32Array(W*H),gen:0,heap:[]};
function nearestWalkable(x,y){if(walkable(x,y))return{x,y};for(let r=1;r<6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(walkable(x+dx,y+dy))return{x:x+dx,y:y+dy};return null}
function findPath(sx,sy,tx,ty){
  sx|=0;sy|=0;tx|=0;ty|=0;const t=nearestWalkable(tx,ty);if(!t)return null;tx=t.x;ty=t.y;
  if(!walkable(sx,sy)){const s=nearestWalkable(sx,sy);if(!s)return null;sx=s.x;sy=s.y}
  const gen=++PF.gen,heap=PF.heap;heap.length=0;const start=idx(sx,sy),goal=idx(tx,ty);
  const h=(i)=>{const x=i%W,y=i/W|0,dx=Math.abs(x-tx),dy=Math.abs(y-ty);return(dx+dy+(1.414-2)*Math.min(dx,dy))*.65};
  const push=i=>{heap.push(i);let c=heap.length-1;while(c>0){const p=(c-1)>>1;if(PF.f[heap[p]]<=PF.f[heap[c]])break;[heap[p],heap[c]]=[heap[c],heap[p]];c=p}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let c=0;for(;;){const l=c*2+1,r=l+1;let m=c;
    if(l<heap.length&&PF.f[heap[l]]<PF.f[heap[m]])m=l;if(r<heap.length&&PF.f[heap[r]]<PF.f[heap[m]])m=r;if(m===c)break;[heap[m],heap[c]]=[heap[c],heap[m]];c=m}}return top};
  PF.stamp[start]=gen;PF.g[start]=0;PF.f[start]=h(start);PF.came[start]=-1;push(start);let it=0;
  while(heap.length&&it++<25000){const cur=pop();if(cur===goal)break;if(PF.closed[cur]===gen)continue;PF.closed[cur]=gen;
    const x=cur%W,y=cur/W|0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(!walkable(nx,ny))continue;
      if(dx&&dy&&(!walkable(x+dx,y)||!walkable(x,y+dy)))continue;
      const ni=idx(nx,ny),c=COST[world.tiles[ni]]*(dx&&dy?1.414:1),ng=PF.g[cur]+c;
      if(PF.stamp[ni]!==gen||ng<PF.g[ni]){PF.stamp[ni]=gen;PF.g[ni]=ng;PF.f[ni]=ng+h(ni);PF.came[ni]=cur;push(ni)}}}
  if(PF.stamp[goal]!==gen)return null;
  const path=[];let c=goal;while(c!==start&&c!==-1){path.push({x:c%W+.5,y:(c/W|0)+.5});c=PF.came[c]}
  return path.reverse();
}

// ---------- minimap base ----------
const TILE_MINI=['#2a6496','#d8c48a','#5e9a45','#3a7032','#8a9458','#8a8278','#b09a70','#b8a050','#a8a094','#6a4a3a'];
function buildMinimap(){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');const im=g.createImageData(W,H);
  for(let i=0;i<W*H;i++){let col=TILE_MINI[world.tiles[i]];if(world.tiles[i]===T.WATER&&world.elev[i]<.24)col='#1e4c78';
    if(world.tiles[i]===T.MOUNT&&world.elev[i]>.8)col='#d8dde2';const n=parseInt(col.slice(1),16);
    im.data[i*4]=n>>16&255;im.data[i*4+1]=n>>8&255;im.data[i*4+2]=n&255;im.data[i*4+3]=255}
  g.putImageData(im,0,0);world.mini=c}
