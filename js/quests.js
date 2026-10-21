'use strict';
// ===== quest engine: a small script language, quest state, goals, actions, markers =====
/* Script language (one command for each line; text in double quotes):
   character <id> "<Name>" class <cls> [female] [home inn|townhall]      story person who lives in town
   quest <id> "<Title>"                                                   start a quest
     type main|side            chapter <n>          giver <ref>           needs <cond> (more than one line allowed)
     offer "<text>"            accept "<text>"      do <action>  (before the first stage: runs on accept)
     stage <id> "<objective>"  then a list of:
       do <action>     runs when the stage starts
       goal <goal>     what completes the stage
       say "<text>"    what the target person says when you finish a talk or deliver stage
       then <action>   runs when the stage ends
     reward cash <n> | item <good> <n> | rep <n> | xp <skill> <n> | flag <name>
   end
   <ref>: npc:<characterId> | role:mayor|sheriff|banker|clerk | class:<cls> | id:<npcId> | any
   <cond>: day>=N | flag:X | !flag:X | done:<questId> | rep>=N | kills>=N
   goals: have <good> <n> | kill <monster> <n> | talk <ref> | deliver <ref> <good> <n> | go cave <i> depth <d> | craft <good> <n> | flag <X> | friend <id>
   actions: give <good> <n> | take <good> <n> | cash <n> | rep <n> | flag <X> | unflag <X> | toast "<text>" | journal "<text>" | event <key>
            spawn item <good> cave <i> depth <d> [hidden] | spawn friend <id> "<Name>" cave <i> depth <d> | spawn mob <type> <n> near player|cave <i>
            start <questId> | map | unlock <recipeFlag>                                                        */
const QUESTS={},CHARS={};
function parseQuests(text,src='script'){const errs=[],out=[];let q=null,st=null;const lines=text.split('\n');
  const tok=l=>{const r=[];const re=/"([^"]*)"|(\S+)/g;let m;while((m=re.exec(l)))r.push(m[1]!==undefined?{s:m[1]}:m[2]);return r};
  lines.forEach((raw,ln)=>{const l=raw.replace(/#.*$/,'').trim();if(!l)return;const t=tok(l),c=t[0],err=m=>errs.push(`${src} line ${ln+1}: ${m}`),str=i=>t[i]&&t[i].s!==undefined?t[i].s:null;
    try{switch(c){
      case'character':{if(!t[1]||!str(2))return err('character needs an id and a "Name"');const o={id:t[1],name:str(2),cls:'miner',home:'inn',female:false};
        for(let i=3;i<t.length;i++){if(t[i]==='class')o.cls=t[++i];else if(t[i]==='female')o.female=true;else if(t[i]==='home')o.home=t[++i]}if(!CLASSES[o.cls])return err('unknown class '+o.cls);CHARS[o.id]=o;break}
      case'quest':if(q)err('missing end before quest');if(!t[1]||!str(2))return err('quest needs an id and a "Title"');q={id:t[1],title:str(2),type:'side',chapter:0,giver:'any',needs:[],offer:'',accept:'',onAccept:[],stages:[],reward:[],src};st=null;break;
      case'end':if(!q)return err('end without quest');if(!q.stages.length)err(`quest ${q.id} has no stage`);out.push(q);q=null;st=null;break;
      case'type':q.type=t[1];break;case'chapter':q.chapter=+t[1];break;case'giver':q.giver=t[1];break;case'needs':q.needs.push(t[1]);break;
      case'offer':q.offer=str(1)||'';break;case'accept':q.accept=str(1)||'';break;
      case'stage':if(!q)return err('stage outside quest');st={id:t[1],text:str(2)||t[1],do:[],goal:null,say:'',then:[]};q.stages.push(st);break;
      case'do':{const a=t.slice(1);if(!ACTIONS[a[0]])return err('unknown action '+a[0]);(st?st.do:q.onAccept).push(a);break}
      case'then':{const a=t.slice(1);if(!ACTIONS[a[0]])return err('unknown action '+a[0]);if(!st)return err('then outside stage');st.then.push(a);break}
      case'goal':{if(!st)return err('goal outside stage');const g=t.slice(1);if(!GOALCHK[g[0]])return err('unknown goal '+g[0]);st.goal=g;break}
      case'say':if(!st)return err('say outside stage');st.say=str(1)||'';break;
      case'reward':q.reward.push(t.slice(1));break;
      default:err('unknown command '+c)}}catch(e){err(e.message)}});
  if(q)errs.push(`${src}: quest ${q.id} has no end`);
  for(const qq of out){for(const s of qq.stages)if(!s.goal)errs.push(`${src}: quest ${qq.id} stage ${s.id} has no goal`);validateQuest(qq,errs,src)}
  return{quests:out,errs}}
// names in a script must exist in the game: classes, roles, goods, monsters
function validateQuest(q,errs,src){const e=m=>errs.push(`${src}: quest ${q.id}: ${m}`);
  const ref=r=>{if(!r||r==='any'||r==='giver')return;const[k,v]=r.split(':');if(k==='class'&&!CLASSES[v])e(`unknown class "${v}"`);else if(k==='role'&&!['mayor','sheriff','banker','clerk'].includes(v))e(`unknown role "${v}"`);else if(!['class','role','npc','id'].includes(k))e(`unknown person "${r}"`)};
  const good=k=>{if(k&&!GOODS[k])e(`unknown good "${k}"`)};ref(q.giver);
  for(const s of q.stages){const g=s.goal||[];if(['have','craft'].includes(g[0]))good(g[1]);if(g[0]==='deliver'){ref(g[1]);good(g[2])}if(g[0]==='talk'||g[0]==='bring')ref(g[1]);
    if(g[0]==='kill'&&g[1]!=='any'&&!MOBS[g[1]]&&!ANIMALS[g[1]])e(`unknown monster "${g[1]}"`);
    for(const a of[...s.do,...s.then])if(['give','take'].includes(a[0])||a[0]==='spawn'&&a[1]==='item')good(a[0]==='spawn'?a[2]:a[1])}
  for(const a of q.onAccept)if(['give','take'].includes(a[0]))good(a[1]);for(const r of q.reward)if(r[0]==='item')good(r[1])}
function registerQuests(text,src){const r=parseQuests(text,src);for(const q of r.quests)QUESTS[q.id]=q;return r}
const sv=v=>v&&v.s!==undefined?v.s:v;

// ---------- references ----------
function resolveRef(ref,qs){if(!ref)return null;if(ref==='giver')return qs&&qs.giverId?npcById(qs.giverId):null;
  const[k,v]=ref.split(':');
  if(k==='npc'){const id=S.storyNpcs[v];return id?npcById(id):null}
  if(k==='id')return npcById(v);
  if(k==='role'){if(v==='mayor')return S.town.mayor==='player'?S.npcs.find(n=>n.cls==='sheriff'):npcById(S.town.mayor);return S.npcs.find(n=>n.cls===v&&!n.dead)}
  if(k==='class')return S.npcs.find(n=>n.cls===v&&!n.dead&&!n.questBusy);
  if(ref==='any')return pick(S.npcs.filter(n=>!n.dead&&!n.questBusy&&!['peddler','outlaw'].includes(n.cls)));return null}
function npcById(id){return S.npcs.find(n=>n.id===id&&!n.dead)}
function refName(ref,qs){if(ref&&ref.startsWith('friend:')){const f=S.friends&&S.friends[ref.slice(7)];return f?f.name:'someone'}const n=resolveRef(ref,qs);return n?n.name:'someone'}
function fill(txt,qs){return(txt||'').replace(/\{player\}/g,S.player.name.split(' ')[0]).replace(/\{giver\}/g,qs&&qs.giverId?(npcById(qs.giverId)||{name:'?'}).name.split(' ')[0]:'?')}

// ---------- characters ----------
function ensureCharacters(){S.storyNpcs=S.storyNpcs||{};for(const id in CHARS){if(S.storyNpcs[id]&&npcById(S.storyNpcs[id]))continue;const c=CHARS[id],n=makeNpc(c.cls);
  n.name=c.name;n.female=c.female;n.story=id;n.opinion=10;const b=bOf(c.home)||bOf('inn');n.x=b.door.x+.5;n.y=b.door.y+.8;S.npcs.push(n);S.storyNpcs[id]=n.id}}

// ---------- state ----------
function qState(id){return S.quests[id]}
function condOK(c){let m;if((m=/^day>=(\d+)$/.exec(c)))return day()>=+m[1];if((m=/^rep>=(-?\d+)$/.exec(c)))return S.player.rep>=+m[1];if((m=/^kills>=(\d+)$/.exec(c)))return(S.player.stats.kills||0)>=+m[1];
  if(c.startsWith('!flag:'))return!S.flags[c.slice(6)];if(c.startsWith('flag:'))return!!S.flags[c.slice(5)];if(c.startsWith('done:'))return S.quests[c.slice(5)]&&S.quests[c.slice(5)].state==='done';return false}
function questScheduler(){if(S.demo)return;for(const id in QUESTS){const q=QUESTS[id];if(S.quests[id])continue;if(!q.needs.every(condOK))continue;
  const offered=Object.values(S.quests).filter(s=>s.state==='offered'&&QUESTS[s.id]&&QUESTS[s.id].type==='side').length;if(q.type!=='main'&&offered>=4)continue;
  const n=resolveRef(q.giver);if(!n)continue;S.quests[id]={id,state:'offered',stage:0,prog:{},giverId:n.id,day:day()};n.questBusy=true;
  if(q.type==='main')toast(`<b>${q.title}</b>: ${n.name.split(' ')[0]} wants to talk to you. Look for the ! mark.`,'event')}}
function offersFrom(n){return Object.values(S.quests).filter(s=>s.state==='offered'&&s.giverId===n.id&&QUESTS[s.id])}
function acceptQuest(id){const s=S.quests[id],q=QUESTS[id];if(!s||s.state!=='offered')return;s.state='active';s.stage=0;s.prog={};
  for(const a of q.onAccept)runAction(a,s);startStage(s);jlog('you',`Quest accepted: ${q.title}.`,{toast:'event'});sfx('stamp');S.track=id}
function declineQuest(id){const s=S.quests[id];if(!s)return;const n=npcById(s.giverId);if(n)n.questBusy=false;if(QUESTS[id].type==='main'){s.state='offered';return}delete S.quests[id];S.declined=S.declined||{};S.declined[id]=day()}
function curStage(s){return QUESTS[s.id].stages[s.stage]}
function startStage(s){const st=curStage(s);if(!st)return;for(const a of st.do)runAction(a,s);if(st.goal[0]==='have'||st.goal[0]==='flag')setTimeout(()=>checkQuestGoals(),50)}
function advance(s){const q=QUESTS[s.id],st=curStage(s);for(const a of st.then)runAction(a,s);s.stage++;s.prog={};
  if(s.stage>=q.stages.length){completeQuest(s);return}toast(`<b>${q.title}</b>: ${fill(curStage(s).text,s)}`,'event');sfx('ui_open');startStage(s)}
function completeQuest(s){const q=QUESTS[s.id],p=S.player;s.state='done';s.doneDay=day();const n=npcById(s.giverId);if(n){n.questBusy=false;n.opinion+=15}const got=[];
  for(const r of q.reward){const[k,a,b]=r;if(k==='cash'){const c=Math.round(+a*S.money.P);p.cash+=c;got.push(money(c))}else if(k==='item'){p.inv[a]=(p.inv[a]||0)+(+b||1);got.push(`${+b||1} ${GOODS[a].n}`)}
    else if(k==='rep'){p.rep=Math.min(100,p.rep+(+a));got.push(`+${a} reputation`)}else if(k==='xp'){addXp(a,+b);got.push(`${a} experience`)}else if(k==='flag')S.flags[a]=true}
  if(q.type==='side'){p.stats.sideDone=(p.stats.sideDone||0)+1;if(p.stats.sideDone>=5)award('quests')}
  toast(`<b>Quest complete: ${q.title}</b>${got.length?' · '+got.join(', '):''}`,'ach');sfx('achievement');fx.ring(p.x,p.y,'#ffd23f');fx.coins(p.x,p.y-.5,10);jlog('you',`Quest complete: ${q.title}.`);
  if(S.track===s.id)S.track=null;checkGoals();questScheduler()}
function failQuest(id,why){const s=S.quests[id];if(!s||s.state!=='active')return;s.state='failed';const n=npcById(s.giverId);if(n)n.questBusy=false;toast(`Quest failed: ${QUESTS[id].title}. ${why||''}`,'bad')}

// ---------- goals ----------
const GOALCHK={
  have:(g,s)=>(S.player.inv[g[1]]||0)>=(+g[2]||1),
  kill:(g,s)=>(s.prog.n||0)>=(+g[2]||1),
  talk:()=>false,deliver:()=>false,friend:()=>false,
  go:(g,s)=>!!s.prog.done,
  craft:(g,s)=>(s.prog.n||0)>=(+g[2]||1),
  flag:(g)=>!!S.flags[g[1]],
};
function checkQuestGoals(){for(const id in S.quests){const s=S.quests[id];for(let k=0;k<6;k++){if(s.state!=='active'||!QUESTS[id])break;const st=curStage(s);if(st&&GOALCHK[st.goal[0]](st.goal,s))advance(s);else break}}}
function questEvent(type,arg,extra){if(!S||S.demo||!S.quests)return;
  for(const id in S.quests){const s=S.quests[id];if(s.state!=='active'||!QUESTS[id])continue;const st=curStage(s);if(!st)continue;const g=st.goal;
    if(type==='kill'&&g[0]==='kill'&&(g[1]===arg||g[1]==='any'&&extra&&extra.kind==='mob')){s.prog.n=(s.prog.n||0)+1;fx.text(S.player.x,S.player.y-1.8,`${GOODS[g[1]]?'':MOBS[g[1]]?MOBS[g[1]].n:g[1]} ${s.prog.n}/${g[2]||1}`,'#ffd86b')}
    if(type==='craft'&&g[0]==='craft'&&g[1]===arg)s.prog.n=(s.prog.n||0)+(extra||1);
    if(type==='go'&&g[0]==='go'&&g[1]==='cave'&&arg===`c${g[2]}:${g[4]}`)s.prog.done=true}
  checkQuestGoals()}
// talking: options for the dialogue window
function questTalkOptions(n){const out=[];
  for(const s of offersFrom(n))out.push({k:'qoffer:'+s.id,t:`! ${QUESTS[s.id].title}`});
  for(const id in S.quests){const s=S.quests[id];if(s.state!=='active'||!QUESTS[id])continue;const st=curStage(s),g=st.goal;
    if(g[0]==='talk'&&resolveRef(g[1],s)===n)out.push({k:'qtalk:'+id,t:`? ${QUESTS[id].title}`});
    if(g[0]==='deliver'&&resolveRef(g[1],s)===n){const have=S.player.inv[g[2]]||0,need=+g[3]||1;out.push({k:'qgive:'+id,t:`? Give ${need} ${GOODS[g[2]].n.toLowerCase()} (you have ${have})`,off:have<need})}}
  return out}
function questDialog(k,n){const[kind,id]=k.split(':'),s=S.quests[id],q=QUESTS[id],d=UI.dialog;if(!s||!q)return;
  if(kind==='qoffer'){d.text=fill(q.offer,s);d.offer=id;renderDialog();return}
  if(kind==='qtalk'){const st=curStage(s);d.text=fill(st.say||'Thank you.',s);advance(s);renderDialog();return}
  if(kind==='qgive'){const st=curStage(s),g=st.goal,need=+g[3]||1;if((S.player.inv[g[2]]||0)<need){d.text=`Bring me ${need} ${GOODS[g[2]].n.toLowerCase()}.`;renderDialog();return}
    S.player.inv[g[2]]-=need;if(!S.player.inv[g[2]])delete S.player.inv[g[2]];d.text=fill(st.say||'Thank you!',s);advance(s);renderDialog()}}
function friendTalk(fid){for(const id in S.quests){const s=S.quests[id];if(s.state!=='active'||!QUESTS[id])continue;const st=curStage(s);
  if(st.goal[0]==='friend'&&st.goal[1]===fid){const f=S.friends[fid];toast(`<b>${f.name}</b>: “${fill(st.say||'Thank you.',s)}”`,'event');advance(s);return true}}return false}

// ---------- actions ----------
const ACTIONS={
  give:(a)=>{const p=S.player;p.inv[a[1]]=(p.inv[a[1]]||0)+(+a[2]||1)},
  take:(a)=>{const p=S.player;p.inv[a[1]]=Math.max(0,(p.inv[a[1]]||0)-(+a[2]||1));if(!p.inv[a[1]])delete p.inv[a[1]]},
  cash:(a)=>{S.player.cash+=Math.round(+a[1]*S.money.P)},rep:(a)=>{S.player.rep=clamp(S.player.rep+(+a[1]),-100,100)},
  flag:(a)=>{S.flags[a[1]]=true},unflag:(a)=>{delete S.flags[a[1]]},unlock:(a)=>{S.flags[a[1]]=true;toast(`New recipe unlocked: ${a[1]}.`,'good')},
  toast:(a,s)=>toast(fill(sv(a[1]),s),'event'),journal:(a,s)=>jlog('you',fill(sv(a[1]),s)),event:(a)=>{if(EVENTS[a[1]]&&!eventActive(a[1]))startEvent(a[1])},
  start:(a)=>{const q=QUESTS[a[1]];if(q&&!S.quests[a[1]]){const n=resolveRef(q.giver);S.quests[a[1]]={id:a[1],state:'offered',stage:0,prog:{},giverId:n?n.id:null,day:day()}}},
  map:()=>newTreasureMap(),
  spawn:(a,s)=>{if(a[1]==='item'){S.caveItems.push({k:a[2],key:`c${a[4]}:${a[6]}`,hidden:a.includes('hidden'),taken:false})}
    else if(a[1]==='friend'){S.friends[a[2]]={id:a[2],name:sv(a[3]),key:`c${a[5]}:${a[7]}`,found:false}}
    else if(a[1]==='mob'){const n=+a[3]||1,p=S.player;for(let i=0;i<n;i++){if(a[5]==='player')spawnMob(a[2],p.x+rnd(-6,6),p.y+rnd(-5,5),{persist:true});else{const c=world.caves[+a[6]||0];const list=S.where?S.ents:S.ents;spawnMob(a[2],c.sx+rnd(-3,3),c.sy+rnd(1,4),{persist:true,list})}}}},
};
function runAction(a,s){try{ACTIONS[a[0]](a,s)}catch(e){console.warn('quest action',a,e)}}

// ---------- markers and arrow ----------
function questTargetOf(s){const st=curStage(s);if(!st)return null;const g=st.goal;
  if(g[0]==='talk'||g[0]==='deliver'){const n=resolveRef(g[1],s);return n&&!n.sleeping?{x:n.x,y:n.y,world:true}:null}
  if(g[0]==='go'&&g[1]==='cave'){const c=world.caves[+g[2]];return c?{x:c.sx,y:c.sy,world:true,cave:`c${g[2]}:${g[4]}`}:null}
  if(g[0]==='friend'){const f=S.friends[g[1]];if(!f)return null;const[c]=f.key.slice(1).split(':');const cv=world.caves[+c];return cv?{x:cv.sx,y:cv.sy,world:true,cave:f.key}:null}
  if(g[0]==='have'){const it=S.caveItems.find(q=>q.k===g[1]&&!q.taken);if(it){const c=world.caves[+it.key.slice(1).split(':')[0]];return c?{x:c.sx,y:c.sy,world:true,cave:it.key}:null}}
  if(g[0]==='kill'&&S.bounties){}
  return null}
function drawQuestMarkers(g){const z=cam.zoom;g.textAlign='center';
  for(const n of S.npcs){if(n.sleeping||n.dead)continue;const off=offersFrom(n).length,tgt=Object.values(S.quests).some(s=>s.state==='active'&&QUESTS[s.id]&&(()=>{const g2=curStage(s)&&curStage(s).goal;return g2&&(g2[0]==='talk'||g2[0]==='deliver')&&resolveRef(g2[1],s)===n})());
    if(!off&&!tgt)continue;const s=toScreen(n.x,n.y);if(s.x<-20||s.x>VW+20||s.y<-40||s.y>VH+40)continue;const y=s.y-22*z-(n.bubble?30:0)+Math.sin(clock*4)*3;
    const main=Object.values(S.quests).some(q=>(q.state==='offered'&&q.giverId===n.id||q.state==='active')&&QUESTS[q.id].type==='main');
    g.font='900 22px Cinzel,Georgia';g.lineWidth=4;g.strokeStyle='#1a120a';const txt=off?'!':'?';g.strokeText(txt,s.x,y);g.fillStyle=main?'#ff9a40':'#ffd23f';g.fillText(txt,s.x,y)}}
function drawQuestArrow(g){const s=S.track&&S.quests[S.track];if(!s||s.state!=='active')return;const t=questTargetOf(s);if(!t)return;
  let tx=t.x,ty=t.y;if(S.where){if(t.cave===S.where)return;const L=CAVE;tx=L.up%W+.5;ty=(L.up/W|0)+.5}
  const sc=toScreen(tx,ty);if(sc.x>40&&sc.x<VW-40&&sc.y>80&&sc.y<VH-80&&!S.where)return;
  const cx=VW/2,cy=VH/2,a=Math.atan2(sc.y-cy,sc.x-cx),r=Math.min(VW,VH)*.42,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
  g.save();g.translate(x,y);g.rotate(a);g.fillStyle='rgba(255,210,63,.9)';g.strokeStyle='#1a120a';g.lineWidth=2;g.beginPath();g.moveTo(14,0);g.lineTo(-8,-9);g.lineTo(-4,0);g.lineTo(-8,9);g.closePath();g.fill();g.stroke();g.restore();
  g.font='600 11px Inter';g.textAlign='center';g.fillStyle='#ffd23f';g.fillText(Math.round(dist(S.player.x,S.player.y,tx,ty))+'m',x,y+22)}
function questMinimap(g,sw,sh){for(const id in S.quests){const s=S.quests[id];if(s.state!=='active')continue;const t=questTargetOf(s);if(!t)continue;
  g.fillStyle=id===S.track?'#ffd23f':'#d8b070';g.beginPath();g.arc(t.x*sw,t.y*sh,id===S.track?4:3,0,7);g.fill();g.strokeStyle='#1a120a';g.stroke()}
  for(const n of S.npcs)if(!n.sleeping&&offersFrom(n).length){g.fillStyle='#ffd23f';g.font='900 11px Inter';g.fillText('!',n.x*sw-2,n.y*sh)}}
