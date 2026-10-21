'use strict';
// ===== UI part 3: health, quick bar, quests, bounties, Quest Workshop =====
PANELS.quests='Quests';
function hud3Update(){const p=S.player;if(!p.cmb)return;
  const bar=(id,v,m)=>{const e=$(id);if(e)e.style.width=clamp(v/m*100,0,100)+'%'};bar('#hHp',p.hp,p.maxHp);bar('#hSta',p.sta,p.maxSta);
  $('#hHpN').textContent=Math.max(0,Math.round(p.hp));$('#hStaN').textContent=Math.round(p.sta);$('#hHp').parentElement.classList.toggle('low',p.hp<30);
  const W=weaponOf(p),c=p.cmb;let q='';QUICK.forEach((k,i)=>{const n=k==='food'?['stew','pie','jerky','cornbread','bread'].reduce((a,x)=>a+(p.inv[x]||0),0):p.inv[k]||0;
    q+=`<div class="qs ${n?'':'empty'}" onclick="useQuick(${i})" data-tip="${k==='food'?'Eat the best food you carry':GOODS[k].n+(GOODS[k].use&&GOODS[k].use.heal?': +'+GOODS[k].use.heal+' health':k==='dynamite'?': throw at the mouse pointer':k==='torch'?': bright light for 3 hours':'')}">${ico(k==='food'?'bread':k)}<b>${n}</b><kbd>${i+1}</kbd></div>`});
  q+=`<div class="qw" data-tip="${W.k?GOODS[W.k].n+': '+GOODS[W.k].item.d:'Fists. Buy a weapon at the Outfitter.'}">${W.k?ico(W.k):'<span class="fist">✊</span>'}<small>${W.gun?`${c.reload>0?'reloading':(c.mag[W.k]||0)+'/'+W.mag} · ${p.inv.cartridge||0}`:W.k?'':'fists'}</small></div>`;
  setHTML($('#quickbar'),q);
  setHTML($('#wantedBar'),p.wanted?`<span class="bad">WANTED</span> ${'★'.repeat(p.wanted)}${p.bountyOnMe?' · bounty '+money(p.bountyOnMe):''}`:'');
  const s=S.track&&S.quests[S.track];setHTML($('#questTrack'),s&&s.state==='active'&&QUESTS[s.id]?`<small>${QUESTS[s.id].type==='main'?'MAIN STORY':'QUEST'}</small><b>${QUESTS[s.id].title}</b><span>${fill(curStage(s).text,s)}${progText(s)}</span>`:'');
  $('#questTrack').classList.toggle('hidden',!(s&&s.state==='active'))}
function useItem(k){const i=QUICK.indexOf(k);if(i>=0){useQuick(i);return}const p=S.player;
  if(k==='rope'){if(!S.where){toast('Rope gets you out of a cave at once. Use it underground.','info');return}p.inv.rope--;if(!p.inv.rope)delete p.inv.rope;leaveCave();toast('You climb the rope to the surface.','good');renderPanel()}}
function progText(s){const g=curStage(s).goal;if(g[0]==='kill')return` (${s.prog.n||0}/${g[2]||1})`;if(g[0]==='have'||g[0]==='deliver'){const k=g[0]==='have'?g[1]:g[2],n=+(g[0]==='have'?g[2]:g[3])||1;return` (${Math.min(S.player.inv[k]||0,n)}/${n})`}return''}
function panelQuests(){const t=UI.tab.quests||'active';let h=tabs('quests',[['active','Active'],['offered','Offered'],['done','Done']],t);
  const list=Object.values(S.quests).filter(s=>QUESTS[s.id]&&(t==='active'?s.state==='active':t==='offered'?s.state==='offered':s.state==='done'||s.state==='failed')).sort((a,b)=>(QUESTS[b.id].type==='main')-(QUESTS[a.id].type==='main'));
  if(!list.length)h+=`<p class="dim">${t==='offered'?'Nobody offers a quest now. Look for a ! over a person.':t==='active'?'No active quests. Talk to people with a ! over their head.':'No finished quests yet.'}</p>`;
  for(const s of list){const q=QUESTS[s.id],n=npcById(s.giverId);h+=`<div class="deed ${S.track===s.id?'offer':''}"><b>${q.type==='main'?'<span class="vein" style="background:#c8602a">MAIN</span> ':''}${q.title}</b>${s.state==='failed'?' <span class="bad">failed</span>':''}<br><small class="dim">${n?'From '+n.name:''}</small>`;
    if(s.state==='active'){q.stages.forEach((st,i)=>{h+=`<div class="${i<s.stage?'dim':i===s.stage?'':'dim'}">${i<s.stage?'✔':i===s.stage?'▶':'·'} ${i<=s.stage?fill(st.text,s)+(i===s.stage?progText(s):''):'…'}</div>`});
      h+=`<div><button onclick="S.track='${s.id}';renderPanel()">${S.track===s.id?'Tracking':'Track'}</button></div>`}
    else if(s.state==='offered')h+=`<div class="dim">${fill(q.offer,s)}</div>`;h+='</div>'}
  return h}
// the sheriff: bounties and the law
function winSheriff2(){const t=UI.winTab.sheriff||'bounties',p=S.player;let h=tabs('w:sheriff',[['bounties','Bounties'],['record','Your record']],t);
  if(t==='record')return h+winSheriff()+(p.wanted?`<h4>Settle with the law</h4><p>Pay ${money(Math.round((80*p.wanted)*S.money.P+(p.bountyOnMe||0)))} or go to jail for ${Math.max(1,p.wanted)} day(s).</p><button class="gold" onclick="closeWin();surrender()">Surrender</button>`:'');
  const cap=captiveNear();if(cap)h+=`<div class="banner" style="background:rgba(154,214,114,.15);border:1px solid var(--green)">You bring in ${cap.name}. <button class="gold" onclick="handOver()">Hand over the prisoner</button></div>`;
  if(p.inv.outlaw_badge||p.inv.beast_trophy)h+=`<div class="row"><button class="gold" onclick="turnInProof()">Turn in proof of a kill</button></div>`;
  h+=`<p class="dim">Alive: beat them down until they give up, press E to tie them, and walk them here. Dead: bring the badge or trophy they drop.</p>`;
  const list=S.bounties.filter(b=>b.state!=='done'&&b.state!=='failed');if(!list.length)h+='<p class="dim">No bounties posted.</p>';
  for(const b of list){const P=S.money.P,mode={alive:'ALIVE ONLY',dead:'DEAD ONLY',either:'DEAD OR ALIVE'}[b.mode];
    h+=`<div class="deed poster"><b>WANTED: ${b.name}</b> · <span class="${b.mode==='alive'?'good':b.mode==='dead'?'bad':'warn'}">${mode}</span> · <b>${money(b.reward*P)}</b><br><small class="dim">${b.kind==='beast'?'A dangerous beast':'An outlaw with a gang'} · last seen ${compass(b.x-S.player.x,b.y-S.player.y)}, ${Math.round(dist(b.x,b.y,S.player.x,S.player.y))} m</small>
      <div>${b.state==='open'?`<button class="gold" onclick="takeBounty('${b.id}')">Take this bounty</button>`:b.state==='killed'?'<span class="warn">Dead. Bring the proof.</span>':'<span class="good">Taken. The camp is on your map.</span>'}</div></div>`}
  return h}
// ---------- Quest Workshop ----------
const WORKSHOP_SAMPLE=`# Write a quest. Lines that start with # are notes.
quest my_first "The Lucky Horseshoe"
  type side
  giver class:smith
  needs day>=1
  offer "I lost my lucky horseshoe in Bat Hollow. Will you find it?"
  accept "Thank you! Watch out for the bats."
  stage find "Find the horseshoe in Bat Hollow (level 1)."
    do spawn item cowbell cave 1 depth 1
    goal have cowbell 1
  stage back "Bring it back to {giver}."
    goal deliver giver cowbell 1
    say "My luck is back!"
  reward cash 100
  reward rep 3
end`;
function openWorkshop(){showScreen('workshop');const ta=$('#wsText');if(!ta.value)ta.value=(()=>{try{return localStorage.getItem('oreorder.mods')||WORKSHOP_SAMPLE}catch(e){return WORKSHOP_SAMPLE}})();wsCheck()}
function wsCheck(){const r=parseQuests($('#wsText').value,'workshop');const out=$('#wsOut');
  out.innerHTML=r.errs.length?`<b class="bad">${r.errs.length} problem(s):</b><br>`+r.errs.map(e=>'• '+e).join('<br>'):`<b class="good">OK.</b> ${r.quests.length} quest(s): ${r.quests.map(q=>q.title).join(', ')}.`;return r}
function wsLoad(){const r=wsCheck();if(r.errs.length)return;for(const q of r.quests){QUESTS[q.id]=q;if(S.quests[q.id]&&S.quests[q.id].state!=='active')delete S.quests[q.id]}
  try{localStorage.setItem('oreorder.mods',$('#wsText').value)}catch(e){}if(!S.demo)questScheduler();toast(`Loaded ${r.quests.length} quest(s). Givers show a ! when the needs are met.`,'good')}
function wsHelp(){$('#wsOut').innerHTML=`<pre class="wshelp">${QUEST_HELP}</pre>`}
const QUEST_HELP=`character <id> "<Name>" class <cls> [female] [home inn|townhall]
quest <id> "<Title>"   ... end
  type main|side     chapter <n>     giver <ref>     needs <cond>
  offer "<text>"     accept "<text>"     do <action>   (runs on accept)
  stage <id> "<objective>"
    do <action>      goal <goal>      say "<text>"      then <action>
  reward cash <n> | item <good> <n> | rep <n> | xp <skill> <n> | flag <name>
refs:   npc:<characterId>  role:mayor|sheriff|banker|clerk  class:<cls>  id:<npcId>  any  giver
conds:  day>=N  flag:X  !flag:X  done:<questId>  rep>=N  kills>=N
goals:  have <good> <n> | kill <monster> <n> | talk <ref> | deliver <ref> <good> <n>
        go cave <i> depth <d> | craft <good> <n> | flag <X> | friend <id> | stat <stat> <n> [money]
        land | bounty <id> | bring <ref>
actions: give/take <good> <n>, cash <n>, rep <n>, flag/unflag <X>, toast "<t>", journal "<t>",
        event <key>, start <questId>, map, unlock <flag>,
        spawn item <good> cave <i> depth <d> [hidden], spawn friend <id> "<Name>" cave <i> depth <d>,
        spawn mob <type> <n> near player|cave <i>, spawn animal <type> far,
        bounty <id> "<Name>" alive|dead|either <reward> [outlaw|beast]
monsters: ${Object.keys(MOBS).join(' ')}
caves: 0 Old Shaft, 1 Bat Hollow, 2 Crystal Grotto, 3 Widow's Den, 4 Echo Mine, 5 Blackrock Drift, 6 Golem Deep`;
