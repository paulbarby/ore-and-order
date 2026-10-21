'use strict';
// ===== staff for the player's workshops: hiring, firing, pay, morale, performance reviews, managers =====
const NO_HIRE=new Set(['sheriff','mayor','clerk','banker','peddler','deputy','outlaw']);
const REVIEW_DAYS=7,MGR_CUT=.15,MAX_STAFF=6,STANDBY=.2,TRAINED=1.15,AVG_OWN=.9;
// hidden traits; the reviews show what they are worth
function traitsOf(n){if(!n.traits){const r=mulberry(hashStr(n.id+n.name));n.traits={skill:.7+r()*.6,dil:.6+r()*.7,rel:.76+r()*.23,acu:.3+r()*.7,noise:r()*2-1}}return n.traits}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function usesStaff(z){return!!z&&z.owner==='player'&&!!BIZ_TYPES[z.type].station}
function staffOf(z){if(!z.staff){z.staff=[];if(z.owner==='player')for(const n of S.npcs)if(n.state==='labour'&&n.work===z.id&&z.staff.length<3&&canHire(n,z))hireNpc(z,n,Math.max(1,z.wage),true)}return z.staff}
function empOf(z,id){return(z.staff||[]).find(e=>e.id===id)}
function canHire(n,z){return!n.dead&&!n.story&&!n.grudge&&!n.employer&&!n.mgrOf&&!NO_HIRE.has(n.cls)&&!S.biz.some(b=>b.owner===n.id)&&(n.opinion+S.player.rep)>-30}
// the going rate in the same trade (an oven, an anvil, a furnace or a bench)
function marketWage(z){const st=BIZ_TYPES[z.type].station,o=S.biz.filter(x=>x!==z&&x.owner!=='player'&&BIZ_TYPES[x.type].station===st&&x.wage>0);return Math.max(1,o.length?o.reduce((a,x)=>a+x.wage,0)/o.length:BIZ_TYPES[z.type].wage*S.money.P)}
function askWage(z,n){const t=traitsOf(n),cls=BIZ_TYPES[z.type].cls===n.cls?1.1:1,dislike=(n.opinion+S.player.rep)<0?1.15:1;return Math.max(1,Math.round(marketWage(z)*(.6+.2*t.skill+.1*t.dil)*cls*dislike))}
function starsOf(v){v=clamp(Math.round(v),0,5);return'★'.repeat(v)+'☆'.repeat(5-v)}
// what an interview shows: close to the truth, never exact
function interview(n){const t=traitsOf(n);return{skill:clamp(Math.round((t.skill-.7)/.6*4+1+t.noise*.6),1,5),dil:clamp(Math.round((t.dil-.6)/.7*4+1-t.noise*.6),1,5),acu:clamp(Math.round((t.acu-.3)/.7*4+1+t.noise*.5),1,5)}}
function applicants(z,k=6){const T=BIZ_TYPES[z.type];return S.npcs.filter(n=>canHire(n,z)).map(n=>{const iv=interview(n);return{n,iv,ask:askWage(z,n),trade:T.cls===n.cls,score:iv.skill+iv.dil+(T.cls===n.cls?2.5:0)}}).sort((a,b)=>b.score-a.score).slice(0,k)}
// the two best managers and one cheaper, average one
function mgrCandidates(z){const l=S.npcs.filter(n=>canHire(n,z)).map(n=>({n,iv:interview(n),pay:mgrSalary(n)})).sort((a,b)=>b.n.traits.acu-a.n.traits.acu);return l.length<=3?l:[l[0],l[1],l[Math.floor(l.length/2)]]}
function mgrSalary(n){return Math.round((10+15*traitsOf(n).acu)*S.money.P)}
function mgrBoost(z){if(!z.manager)return 0;const n=npcById(z.manager.id);return n?.08+.17*traitsOf(n).acu:0}

// ---------- hire, fire, pay ----------
function hireNpc(z,n,wage,quiet){if(!canHire(n,z)&&!quiet)return false;z.staff=z.staff||[];if(z.staff.length>=MAX_STAFF){if(!quiet)toast(`The ${z.name} has room for ${MAX_STAFF} workers.`,'bad');return false}
  n.employer=z.id;z.staff.push({id:n.id,since:day(),wage:Math.round(wage),morale:.75,hours:0,lab:0,wk:{hours:0,lab:0,abs:0,days:0},abs:0,unpaid:0,reviews:[],last:day()});
  n.opinion+=5;if(!quiet){say(n,pick(['I start tomorrow morning!','You will not regret it, boss.','Thank you for the work!']));toast(`You hired ${n.name} at ${money(wage)} an hour.`,'good');jlog('econ',`You hired ${n.name} (${CLASSES[n.cls].n}) at the ${z.name}.`)}
  return true}
function pHire(zid,nid){const z=bizById(zid),n=npcById(nid);if(!usesStaff(z)||!n)return;hireNpc(z,n,askWage(z,n));renderWin()}
function fireNpc(z,nid,why,by){const e=empOf(z,nid),n=npcById(nid);z.staff=z.staff.filter(x=>x.id!==nid);if(!n)return;n.employer=null;if(n.state==='labour'&&n.work===z.id){n.state='idle';n.spot=null}
  const r=e&&e.reviews.at(-1),fair=r&&r.stars<=2;n.opinion-=fair?4:12;for(const o of S.npcs)if(o.rel&&o.rel[n.id]>=.8)o.opinion-=fair?1:4;
  say(n,fair?pick(['Fair enough. I was slow.','I will do better somewhere else.']):pick(['After all my work?','You will be sorry!','Fine. Keep your job.']));
  jlog('econ',`${by||'You'} let ${n.name} go from the ${z.name}${why?' ('+why+')':''}.`,{toast:by?'info':undefined})}
function pFire(zid,nid){const z=bizById(zid),n=npcById(nid);if(!usesStaff(z)||!n)return;if(!confirm(`Let ${n.name} go? People who like ${n.name.split(' ')[0]} will like you less.`))return;fireNpc(z,nid);renderWin()}
function pWage(zid,nid,d){const z=bizById(zid),e=z&&empOf(z,nid);if(!e)return;const step=Math.max(1,Math.round(S.money.P));e.wage=Math.max(1,e.wage+d*step);if(d>0)e.morale=Math.min(1.2,e.morale+.08);else e.morale=Math.max(.05,e.morale-.1);renderWin()}

// ---------- one hour of work by a member of staff (called from labourTick) ----------
// full pay for an hour of work; a quarter of the pay for an hour on standby with nothing to make
function staffHour(z,n){const e=empOf(z,n.id);if(!e){n.employer=null;return}const work=!!z.job||z.labour<3,pay=work?e.wage:Math.max(1,Math.round(e.wage*STANDBY));
  if(z.cash>=pay){z.cash-=pay;z.today.wages+=pay;n.cash+=pay;e.unpaid=0}else{e.unpaid++;if(!n.bubble)say(n,'Where is my pay?');}
  z.st=z.st||{work:0,idle:0};if(!work){z.st.idle=(z.st.idle||0)+1;e.idle=(e.idle||0)+1;e.wk.idle=(e.wk.idle||0)+1;return}
  // own effort (rated in reviews) × trade × trained staff × manager
  const t=traitsOf(n),cls=BIZ_TYPES[z.type].cls===n.cls?1.5:1,own=t.skill*t.dil*(.7+.3*Math.min(1,e.morale))*(e.unpaid>2?.4:1),lab=own*cls*TRAINED*(1+mgrBoost(z));
  z.labour+=lab;z.st.work=(z.st.work||0)+1;e.hours++;e.lab+=own;e.wk.hours++;e.wk.lab+=own;n.shifts++}

// ---------- reviews ----------
function reviewEmp(z,e,by){const n=npcById(e.id);if(!n)return null;const w=e.wk,hours=Math.max(1,w.hours),perf=w.lab/hours,days=Math.max(1,w.days),att=1-Math.min(1,w.abs/days);
  const stars=clamp(Math.round((perf-.45)/.8*4+1+(att-.85)*5+(e.morale<.4?-.5:0)),1,5);const t=[];
  t.push(perf>1.15?'Very productive.':perf>.85?'Steady, good output.':perf>.6?'Works slowly.':'Gets little done.');
  if(w.abs)t.push(`Missed ${w.abs} day${w.abs>1?'s':''}.`);else if(days>=3)t.push('Never missed a day.');
  t.push(e.morale>.9?'Happy here.':e.morale>.6?'Content.':e.morale>.4?'Unhappy with the pay.':'Ready to quit.');
  if(BIZ_TYPES[z.type].cls===n.cls)t.push(`Knows the trade (${CLASSES[n.cls].n.toLowerCase()}).`);
  const r={day:day(),stars,perf:+perf.toFixed(2),att:Math.round(att*100),hours:w.hours,morale:Math.round(e.morale*100),text:t.join(' '),by:by||'You'};
  e.reviews.push(r);if(e.reviews.length>8)e.reviews.shift();e.wk={hours:0,lab:0,abs:0,days:0,idle:0};e.last=day();return r}
function pReview(zid,nid){const z=bizById(zid),e=z&&empOf(z,nid);if(!e)return;if(e.wk.hours<4){toast('Too soon: they have worked fewer than 4 hours since the last review.','bad');return}
  const r=reviewEmp(z,e);toast(`Review of ${npcById(nid).name}: ${starsOf(r.stars)}. ${r.text}`,'info');UI.staffOpen=nid;renderWin()}

// ---------- each day: attendance, morale, quitting, weekly reviews, the manager's work ----------
function staffDaily(){for(const z of S.biz){if(!usesStaff(z)){if(z.staff&&z.owner!=='player'){for(const e of z.staff){const n=npcById(e.id);if(n)n.employer=null}z.staff=[];releaseManager(z)}continue}
  const st=staffOf(z),mw=marketWage(z),boost=mgrBoost(z),weekly=[];const wk=z.st?(z.st.work||0)+(z.st.idle||0):0;z.util=wk>0?(z.st.work||0)/wk:null;z.st={work:0,idle:0};
  for(const e of[...st]){const n=npcById(e.id);if(!n){z.staff=z.staff.filter(x=>x!==e);continue}const t=traitsOf(n);
    const target=clamp(.65+(e.wage/Math.max(1,mw)-1)*1.5+(z.manager?.08:0)-e.unpaid*.08,.05,1.2);e.morale+=(target-e.morale)*.4;e.wk.days++;
    if(e.morale<.3&&Math.random()<.35){z.staff=z.staff.filter(x=>x!==e);n.employer=null;jlog('econ',`${n.name} quit the ${z.name}. The pay was too low.`,{toast:'bad'});continue}
    n.absentDay=Math.random()<(1-t.rel)*(1.6-Math.min(1,e.morale))*(z.manager?.5:1)?day():null;if(n.absentDay===day())e.wk.abs++,e.abs++;
    if(day()-e.last>=REVIEW_DAYS&&e.wk.hours>=4){const r=reviewEmp(z,e,z.manager?'Manager':null);if(r)weekly.push(`${n.name.split(' ')[0]} ${starsOf(r.stars)}`)}}
  if(weekly.length)jlog('econ',`Weekly reviews at the ${z.name}: ${weekly.join(', ')}.`,{toast:'info'});
  if(z.manager)managerDay(z)}}
// the manager: pay, hire, fire, raises, production plan
function managerDay(z){const m=z.manager,mn=npcById(m.id);if(!mn){releaseManager(z);return}
  const prof=z.hist.profit.at(-1)||0,pay=m.salary+Math.round(Math.max(0,prof)*MGR_CUT);if(z.cash>=pay){z.cash-=pay;z.today.wages+=pay;mn.cash+=pay;m.unpaid=0;m.paid=(m.paid||0)+pay}
  else{m.unpaid=(m.unpaid||0)+1;if(m.unpaid>=2){jlog('econ',`${mn.name} quit as manager of the ${z.name}: no pay for two days.`,{toast:'bad'});releaseManager(z);return}}
  const log=[],staff=staffOf(z),profit=z.hist.profit.at(-1)||0;
  // let go of the weakest after a bad review
  for(const e of[...staff]){const r=e.reviews.at(-1);if(r&&r.stars<=2&&r.day>=day()-1){const n=npcById(e.id);fireNpc(z,e.id,`${r.stars}★ review`,mn.name.split(' ')[0]);log.push(`let ${n?n.name.split(' ')[0]:'a worker'} go (${r.stars}★)`)}}
  // raises when people are unhappy and the till can pay
  for(const e of z.staff)if(e.morale<.55&&profit>0&&p3x(z)>0&&z.cash>e.wage*40){e.wage+=Math.max(1,Math.round(S.money.P));e.morale+=.05;log.push(`gave ${npcById(e.id).name.split(' ')[0]} a raise`)}
  // staff size follows the work
  const u=z.util,bill=z.staff.reduce((a,e)=>a+e.wage,0)*11,h3=z.hist.profit.slice(-3),p3=h3.length?h3.reduce((a,b)=>a+b,0)/h3.length:0;
  // losing money: fewer hands first, then pay back towards the town rate
  const settled=day()-m.since>=3;// a new manager learns the business for 3 days before cutting
  if(settled&&p3<0&&h3.length>=2&&z.staff.length>1&&day()>=(m.coolFire||0)){const worst=[...z.staff].sort((a,b)=>(a.lab/Math.max(1,a.hours))/a.wage-(b.lab/Math.max(1,b.hours))/b.wage)[0];fireNpc(z,worst.id,'cutting costs',mn.name.split(' ')[0]);m.coolHire=day()+4;log.push(`let ${npcById(worst.id)?.name.split(' ')[0]||'a worker'} go to cut costs`)}
  else if(settled&&p3<0&&h3.length>=2&&z.staff.length){for(const e of z.staff)if(e.wage>marketWage(z)*1.15){e.wage-=Math.max(1,Math.round(S.money.P));log.push(`cut the pay of ${npcById(e.id).name.split(' ')[0]}`)}}
  else if(z.staff.length===0||(u!=null&&u>.9&&day()>=(m.coolHire||0)&&z.staff.length<MAX_STAFF&&z.cash>bill+m.salary&&p3>(applicants(z,1)[0]?.ask||0)*11*1.5)){const a=applicants(z,1)[0];if(a&&hireNpc(z,a.n,a.ask,true)){m.coolFire=day()+4;m.coolHire=day()+3;log.push(`hired ${a.n.name.split(' ')[0]}`)}}
  else if(u!=null&&u<.4&&z.staff.length>1){const worst=[...z.staff].sort((a,b)=>(a.lab/Math.max(1,a.hours))-(b.lab/Math.max(1,b.hours)))[0];fireNpc(z,worst.id,'not enough work',mn.name.split(' ')[0]);log.push(`let ${npcById(worst.id)?.name.split(' ')[0]||'a worker'} go (not enough work)`)}
  // prices: charge more for what sells out while the town is short of it
  if(BIZ_TYPES[z.type].retail)for(const k in z.make){if(!z.make[k]||!S.dem[k])continue;const sh=S.dem[k].ema,st=z.inv[k]||0;
    if(sh>.3&&st<=1){const np=Math.round(refPrice(k)*Math.min(1.7,1.25+.6*sh));if(z.prices[k]==null||np>z.prices[k]){z.prices[k]=np;log.push(`priced ${GOODS[k].n.toLowerCase()} at ${money(np)}`)}}
    else if(z.prices[k]!=null&&(sh<.15||st>z.make[k]+1)){delete z.prices[k];log.push(`put ${GOODS[k].n.toLowerCase()} back on the town price`)}}
  // production plan: make what pays
  const T=BIZ_TYPES[z.type];if(T.station){for(const r of RECIPES[T.station]){if(r.flag&&!S.flags[r.flag])continue;let cost=0;for(const k in r.in)cost+=price(k)*r.in[k];const k=r.out,val=(T.retail?shopPrice(z,k)*.9:price(k)*.9)*(r.n||1),margin=val-cost-avgStaffWage(z)*r.t/2;
    const off=margin<-.05*val,on=margin>0;if(T.retail){const base=defaultMake(z.type)[k]||0,d=S.dem[k];if(on&&(base||z.make[k]))z.make[k]=Math.max(1,Math.round((base||2)*(1+(d?d.ema:0))));else if(off)z.make[k]=0}else{if(on)z.make[k]=true;else if(off)z.make[k]=false}}
    if(!Object.values(z.make).some(v=>v))z.make[RECIPES[T.station][0].out]=T.retail?2:true}
  m.log=(m.log||[]).concat(log.map(t=>({day:day(),t}))).slice(-8);if(log.length)jlog('econ',`${mn.name.split(' ')[0]}, manager of the ${z.name}: ${log.join(', ')}.`)}
function p3x(z){const h=z.hist.profit.slice(-3);return h.length?h.reduce((a,b)=>a+b,0)/h.length:0}
function avgStaffWage(z){return z.staff&&z.staff.length?z.staff.reduce((a,e)=>a+e.wage,0)/z.staff.length:z.wage}
function pHireManager(zid,nid){const z=bizById(zid),n=npcById(nid);if(!usesStaff(z)||!n||z.manager||!canHire(n,z))return;
  z.manager={id:n.id,since:day(),salary:mgrSalary(n),unpaid:0,log:[],profitBefore:avgProfit(z)};n.mgrOf=z.id;n.opinion+=8;say(n,'I will make this place run like a clock.');
  toast(`${n.name} manages the ${z.name}: ${money(z.manager.salary)} a day plus ${MGR_CUT*100}% of the profit.`,'good');jlog('econ',`You hired ${n.name} to manage the ${z.name}.`);renderWin()}
function releaseManager(z){if(!z.manager)return;const n=npcById(z.manager.id);if(n){n.mgrOf=null;if(n.state==='post')n.state='idle'}z.manager=null}
function pDismissManager(zid){const z=bizById(zid);if(!z||!z.manager)return;const n=npcById(z.manager.id);if(!confirm(`Dismiss ${n?n.name:'the manager'}? You hire and fire again yourself.`))return;
  if(n){n.opinion-=8;say(n,'Good luck without me.')}jlog('econ',`You dismissed the manager of the ${z.name}.`);releaseManager(z);renderWin()}
function avgProfit(z){const h=z.hist.profit.slice(-7);return h.length?Math.round(h.reduce((a,b)=>a+b,0)/h.length):0}
function staffDecide(n,h){if(!n.employer)return false;const z=bizById(n.employer);if(!usesStaff(z)||!empOf(z,n.id)){n.employer=null;return false}
  if(h>=7&&h<18&&n.absentDay!==day()&&!(z.closedUntil>S.time)){n.state='labour';n.work=z.id;n.goal=null;n.spot=null;return true}return false}
function staffHourly(){for(const z of S.biz)if(usesStaff(z))staffOf(z)}

// ---------- the Staff tab ----------
function bizStaff(z){const st=staffOf(z),P=S.money.P,mw=Math.round(marketWage(z)),bill=st.reduce((a,e)=>a+e.wage,0)*11,m=z.manager,mn=m&&npcById(m.id);
  let h=`<div class="stats4"><div><small>Staff</small><b>${st.length} / ${MAX_STAFF}</b></div><div><small>Wages a day (11 h)</small><b>${money(bill)}</b></div><div><small>Work used yesterday</small><b class="${z.util==null?'':z.util>.85?'warn':z.util<.4?'bad':'good'}">${z.util==null?'—':Math.round(z.util*100)+'%'}</b></div><div><small>Manager</small><b style="font-size:12px">${mn?mn.name:'none'}</b></div></div>`;
  if(!st.length)h+=`<div class="banner bad">Nobody works here, so nothing gets made. Hire staff below, or hire a manager to do it for you.</div>`;
  h+=`<p class="dim">Staff work 07:00–18:00. The till pays the full wage for each hour of work and a fifth of it for each hour on standby, when there is nothing to make. Other businesses in this trade pay about ${money(mw)} an hour. Low pay makes people unhappy: they miss work, work slower and quit. Each worker gets a review every ${REVIEW_DAYS} days. "Work used" is the share of paid hours with real work. Under 40% means people stand around; over 85% means you need more hands.</p>`;
  if(st.length){h+=`<h4>Your staff</h4><table class="prices staff"><tr><th>Worker</th><th>Pay / hour</th><th>Mood</th><th>Last review</th><th>This week</th><th></th></tr>`;
    for(const e of st){const n=npcById(e.id);if(!n)continue;const r=e.reviews.at(-1),trade=BIZ_TYPES[z.type].cls===n.cls,open=UI.staffOpen===e.id;
      h+=`<tr><td><b class="lnk" onclick="UI.staffOpen=UI.staffOpen==='${e.id}'?null:'${e.id}';renderWin()">${n.name}</b><br><small class="dim">${CLASSES[n.cls].n}${trade?' · knows the trade':''} · since day ${e.since}${n.absentDay===day()?' · <span class="warn">absent today</span>':''}</small></td>
        <td class="btns"><button onclick="pWage('${z.id}','${e.id}',-1)">−</button><b>${money(e.wage)}</b><button onclick="pWage('${z.id}','${e.id}',1)">+</button></td>
        <td><div class="mood"><i style="width:${Math.min(100,e.morale/1.2*100)}%;background:${e.morale>.75?'var(--green)':e.morale>.45?'var(--warn)':'var(--red)'}"></i></div>${e.unpaid?'<small class="bad">unpaid</small>':''}</td>
        <td>${r?`<span class="stars">${starsOf(r.stars)}</span><br><small class="dim">day ${r.day}</small>`:'<small class="dim">none yet</small>'}</td><td><small>${e.wk.hours} h work · ${e.wk.idle||0} h standby · ${e.wk.abs} absent</small></td>
        <td class="btns"><button onclick="pReview('${z.id}','${e.id}')">Review</button><button onclick="pFire('${z.id}','${e.id}')">Let go</button></td></tr>`;
      if(open||r)h+=`<tr class="rv"><td colspan="6">${(open?[...e.reviews].reverse():r?[r]:[]).map(r=>`<div><span class="stars">${starsOf(r.stars)}</span> <small class="dim">day ${r.day} · by ${r.by} · output ${Math.round(r.perf/AVG_OWN*100)}% of an average worker · attendance ${r.att}% · mood ${r.morale}% · ${r.hours} h</small><br>${r.text}</div>`).join('')}${!open&&e.reviews.length>1?`<small class="lnk" onclick="UI.staffOpen='${e.id}';renderWin()">All ${e.reviews.length} reviews</small>`:''}</td></tr>`}
    h+='</table>'}
  if(st.length<MAX_STAFF){const ap=applicants(z);h+=`<h4>People looking for work</h4><p class="dim">Interview impressions. They are close to the truth; reviews show what each worker is really worth.</p><table class="prices"><tr><th>Name</th><th>Skill</th><th>Work ethic</th><th>Asks</th><th></th></tr>`;
    for(const a of ap)h+=`<tr><td>${a.n.name}<br><small class="dim">${CLASSES[a.n.cls].n}${a.trade?' · <span class="good">knows the trade</span>':''}</small></td><td class="stars">${starsOf(a.iv.skill)}</td><td class="stars">${starsOf(a.iv.dil)}</td><td>${money(a.ask)} / h</td><td><button class="gold" onclick="pHire('${z.id}','${a.n.id}')">Hire</button></td></tr>`;
    h+='</table>';if(!ap.length)h+='<p class="dim">Nobody is looking for work.</p>'}
  h+='<h4>Manager</h4>';
  if(m&&mn){const pct=Math.round(mgrBoost(z)*100),now=avgProfit(z);h+=`<div class="deed"><b>${mn.name}</b> manages the business since day ${m.since}. Pay ${money(m.salary)} a day plus ${MGR_CUT*100}% of each day's profit (${money(m.paid||0)} paid so far).<br>
      Staff work <b class="good">${pct}% faster</b> and miss half as many days. The manager hires, lets people go after a bad review, gives raises and plans production each morning.<br>
      Average profit a day: before the manager ${money(m.profitBefore)} · last 7 days ${money(now)}.
      ${(m.log||[]).length?'<div class="mlog">'+[...m.log].reverse().map(l=>`<small>Day ${l.day}: ${l.t}</small>`).join('<br>')+'</div>':''}
      <div><button onclick="pDismissManager('${z.id}')">Dismiss the manager</button></div></div>`}
  else{h+=`<p>A manager runs the staff for you and makes the work faster, but the salary comes out of your profit. Hire one when the business earns more than the salary.</p><table class="prices"><tr><th>Name</th><th>Management</th><th>Cost</th><th></th></tr>`;
    for(const c of mgrCandidates(z))h+=`<tr><td>${c.n.name}<br><small class="dim">${CLASSES[c.n.cls].n}</small></td><td class="stars">${starsOf(c.iv.acu)}</td><td>${money(c.pay)} a day + ${MGR_CUT*100}% of profit</td><td><button class="gold" onclick="pHireManager('${z.id}','${c.n.id}')">Hire manager</button></td></tr>`;
    h+=`</table><p class="dim">Average profit a day now: ${money(avgProfit(z))}.</p>`}
  return h}
