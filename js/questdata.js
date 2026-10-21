'use strict';
// ===== story, side stories and townsfolk requests, written in the quest script language =====
Object.assign(GOALCHK,{
  stat:(g)=>(S.player.stats[g[1]]||0)>=(+g[2])*(g[3]==='money'?S.money.P:1),
  land:()=>S.plots.some(q=>mayMine('player',q)),
});
const STORY=`
character hattie "Old Hattie Prue" class miner female home inn

quest m1 "Strangers in the Valley"
  type main
  chapter 1
  giver role:mayor
  needs day>=1
  offer "Welcome to the valley, {player}. Every newcomer starts the same way: earn your keep and stake your ground. Show me you can stand on your own."
  accept "Good. Make $150 from honest trade and hold a plot of land. Then come back and see me."
  stage earn "Sell goods worth $150 in total."
    goal stat sold 150 money
  stage land "Own or lease a plot of land (Land Office)."
    goal land
  stage back "Report to the mayor at Town Hall."
    goal talk giver
    say "You will do well here. Now go and see Old Hattie at the inn. She asks for somebody with grit."
  reward cash 80
  reward rep 5
end

quest m2 "Tremors"
  type main
  chapter 2
  giver npc:hattie
  needs done:m1
  offer "Feel that? The ground shakes every night now. Tobias went down the Old Shaft three days ago to find out why. He has not come back."
  accept "The Old Shaft is in the hills. It is the cave with the gold sign on your map. Take a light and a weapon. The Outfitter sells both."
  do give torch 2
  do give bandage 2
  stage find "Find Tobias on level 1 of the Old Shaft."
    do spawn friend tobias "Tobias Webb" cave 0 depth 1
    goal friend tobias
    say "Thank God you came! Spiders everywhere... and something deeper. It sings through the rock. Take my lamp to Hattie. She will know what it means."
    then give tobias_lamp 1
  stage report "Bring Tobias's lamp to Old Hattie at the inn."
    goal deliver npc:hattie tobias_lamp 1
    say "A singing deep... Elias Thorne wrote about that. He was a surveyor. He went down there years ago and never came back."
  reward cash 120
  reward xp combat 40
end

quest m3 "The Surveyor's Journal"
  type main
  chapter 3
  giver npc:hattie
  needs done:m2
  offer "Thorne kept a journal. If it survived, it is on the second level of the Old Shaft. He hid his notes behind loose rock, the old fox."
  accept "You need dynamite to open old walls. Throw it with key 3, then stand clear. Look for cracked rock."
  do give dynamite 2
  stage find "Find Thorne's journal on level 2 of the Old Shaft. It lies behind a cracked wall."
    do spawn item thorne_journal cave 0 depth 2 hidden
    goal have thorne_journal 1
  stage read "Bring the journal to Old Hattie."
    goal deliver npc:hattie thorne_journal 1
    say "Listen: 'The Maw sleeps under the valley. It eats the rock and it eats men. Only starsteel cuts its hide.' Starsteel... the smith will know about that."
  reward cash 150
end

quest m4 "Starsteel"
  type main
  chapter 4
  giver class:smith
  needs done:m3
  offer "Starsteel? My grandfather forged it once. Plain iron will not do. Bring me a ruby, a diamond and the core of a rock golem. With those, the old method works."
  accept "Golems live on the deep levels of the caves. You find rubies and diamonds in the gem veins down there. Mine them with a pickaxe."
  stage ruby "Bring a ruby to the smith."
    goal deliver giver ruby 1
    say "A fine stone. Now the diamond."
  stage diamond "Bring a diamond to the smith."
    goal deliver giver diamond 1
    say "Good. Now the golem core. Mind its fists."
  stage core "Bring a golem core to the smith."
    goal deliver giver golem_core 1
    say "Give me a day at the anvil... There. The Starsteel Blade. It hums in the hand. Hold the attack to charge a shock wave."
    then give starblade 1
  reward flag starblade
  reward rep 5
end

quest m5 "The Deep Maw"
  type main
  chapter 5
  giver npc:hattie
  needs done:m4
  offer "The tremors are worse. Walls crack in town. It is now or never, {player}. The Maw lies on the third level of the Old Shaft."
  accept "Take these tonics. Roll away when it rears up, then strike when it tires."
  do give tonic 2
  stage slay "Defeat the Deep Maw on level 3 of the Old Shaft."
    goal kill maw 1
  stage home "Return to Old Hattie."
    goal talk npc:hattie
    say "You did it! The valley is safe. They say a vein of starsteel glows by the Old Shaft now. Stake that plot before somebody else does!"
    then event festival
  reward cash 1000
  reward rep 20
  reward flag story_done
end

quest s_ring "The Lost Ring"
  type side
  giver class:miner
  needs day>=2
  offer "I dropped my mother's silver ring in Bat Hollow when the bats came at me. I cannot go back down there."
  accept "Bless you. It is a small silver ring with a blue stone."
  stage find "Find the silver ring in Bat Hollow (level 1)."
    do spawn item lost_ring cave 1 depth 1
    goal have lost_ring 1
  stage back "Return the ring to {giver}."
    goal deliver giver lost_ring 1
    say "You found it! I will never forget this."
  reward cash 120
  reward rep 5
end

quest s_wolves "Wolves at the Door"
  type side
  giver class:woodcutter
  needs day>=3
  offer "Wolves come out of the forest at night. They took two of my dogs. Somebody has to thin the pack."
  accept "They hunt at night in the woods. Bring a good blade."
  stage hunt "Kill 5 wolves (they hunt at night in the forest)."
    goal kill wolf 5
  stage back "Tell {giver} the wolves are gone."
    goal talk giver
    say "The woods are quiet again. Take this, and my thanks."
  reward cash 150
  reward item jerky 5
end

quest s_baker "The Baker's Secret"
  type side
  giver class:baker
  needs day>=3
  offer "I want to bake my grandmother's egg pie, but the town has no eggs and no milk. Do you keep chickens?"
  accept "Six eggs and two jugs of milk. The Ranch sells chickens and cows if you have land."
  stage eggs "Bring 6 eggs to {giver}."
    goal deliver giver egg 6
    say "Lovely brown eggs. Now the milk."
  stage milk "Bring 2 milk to {giver}."
    goal deliver giver milk 2
    say "Here, the first pies are for you. Now everybody can bake them."
  reward item pie 4
  reward cash 90
end

quest s_gems "The Gem Collector"
  type side
  giver role:banker
  needs day>=5
  offer "Investors in the East pay well for coloured stones. I need one ruby and two emeralds for a shipment."
  accept "The gem veins in the caves glitter in the dark. Mine them with a pickaxe."
  stage ruby "Bring a ruby to {giver}."
    goal deliver giver ruby 1
    say "Splendid. And the emeralds?"
  stage emerald "Bring 2 emeralds to {giver}."
    goal deliver giver emerald 2
    say "A pleasure doing business."
  reward cash 450
end

quest s_ghosts "The Haunted Drift"
  type side
  giver role:clerk
  needs day>=6
  offer "Miners report ghosts in the deep levels. Dead miners, they say, who never got paid. Nobody will register claims down there."
  accept "Ghosts fade and appear behind you. Watch your back."
  stage lay "Lay 3 ghost miners to rest (deep cave levels)."
    goal kill ghost 3
  stage back "Report to {giver} at the Land Office."
    goal talk giver
    say "Claims are coming in again. Thank you."
  reward cash 300
  reward rep 5
end

quest s_cow "The Missing Cow"
  type side
  giver class:farmer
  needs day>=2
  offer "My best cow, Daisy, broke the fence and ran into the hills. She has a brass bell. Can you bring her home?"
  accept "Find her, press E to lead her, and walk her back to me."
  stage find "Find Daisy the cow and lead her back to {giver}."
    do spawn animal cow far
    goal bring giver
    say "Daisy! You silly old girl. Thank you, friend."
  reward cash 100
  reward item milk 3
end

quest s_silk "Silk for the Store"
  type side
  giver class:merchant
  needs day>=3
  offer "Spider silk makes the finest thread. The ladies in the East love it. The giant spiders in the caves are full of it."
  accept "Six bundles. Mind the poison. A tonic cures it."
  stage silk "Bring 6 spider silk to {giver}."
    goal deliver giver spider_silk 6
    say "Beautiful. Here is your pay."
  reward cash 220
end

quest s_map "The Old Map"
  type side
  giver any
  needs day>=4
  offer "I found this old map in my grandfather's things. I am too old to dig. If you find the treasure, bring me a share of the story at least."
  accept "Follow the red X on your map. You need a shovel."
  do map
  stage dig "Dig up the treasure at the red X (you need a shovel)."
    goal flag dug_treasure
  stage back "Tell {giver} what you found."
    goal talk giver
    say "Ha! Grandfather was right all along."
  reward rep 5
  reward cash 60
end

quest s_dyn "Dynamite Debt"
  type side
  giver class:refiner
  needs day>=4
  offer "We need dynamite to clear a blocked flue at the refinery. The Outfitter is out and we cannot wait."
  accept "Three sticks. You can make them at a workbench: coal and lamp fuel."
  stage bring "Bring 3 dynamite to {giver}."
    goal deliver giver dynamite 3
    say "Stand back! ... Ha, the flue is clear. Thank you."
  reward cash 160
end

quest s_bear "Old Grizzly"
  type side
  giver class:farmer
  needs day>=7
  offer "A grizzly as big as a wagon kills our sheep. The sheriff put a price on its head."
  accept "It roams the hills. Take the bounty at the Sheriff's office, then bring back the trophy."
  do bounty grizzly "Old Grizzly" dead 400 beast
  stage hunt "Kill Old Grizzly and hand its trophy to the Sheriff."
    goal bounty grizzly
  reward rep 8
end

quest s_jack "Black Jack Hale"
  type side
  giver role:sheriff
  needs day>=4
  offer "Black Jack Hale robbed the bank stage. I want him alive to stand trial. Dead, he pays nothing."
  accept "His camp is in the wilds. Beat him down until he gives up, press E to tie him, and walk him to my door."
  do bounty jack "Black Jack Hale" alive 500 outlaw
  stage catch "Bring Black Jack Hale to the Sheriff alive."
    goal bounty jack
  reward rep 10
end
`;
registerQuests(STORY,'story');

// ---------- townsfolk requests (written as scripts at run time) ----------
let RSEQ=1;
function genRequests(){if(S.demo)return;const open=Object.values(S.quests).filter(s=>s.id.startsWith('r_')&&s.state!=='done'&&s.state!=='failed').length;if(open>=3)return;
  const n=pick(S.npcs.filter(n=>!n.dead&&!n.questBusy&&!n.story&&!['peddler','outlaw','deputy'].includes(n.cls)));if(!n)return;const id='r_'+(S.rseq=(S.rseq||0)+1);
  const kind=pick(['fetch','fetch','hunt']);let txt;
  if(kind==='fetch'){const k=pick(['amethyst','emerald','spider_silk','bat_wing','golem_core','ectoplasm','hide','egg','milk','wool','corn','potato','cotton','meat']),q=GOODS[k].p>80?1:GOODS[k].p>20?ri(2,3):ri(3,6),pay=Math.round(GOODS[k].p*q*1.7+20);
    txt=`quest ${id} "${GOODS[k].n} for ${n.name.split(' ')[0]}"\n type side\n giver id:${n.id}\n offer "I need ${q} ${GOODS[k].n.toLowerCase()}. I pay ${money(pay*S.money.P)}."\n accept "Thank you. I will wait for you."\n stage bring "Bring ${q} ${GOODS[k].n.toLowerCase()} to {giver}."\n  goal deliver giver ${k} ${q}\n  say "Just what I needed!"\n reward cash ${pay}\n reward rep 2\nend`}
  else{const m=pick(['bat','spider','crawler','wolf','golem']),q=m==='golem'?1:ri(3,6),pay=Math.round(MOBS[m].xp*q*6+30);
    txt=`quest ${id} "${MOBS[m].n} trouble"\n type side\n giver id:${n.id}\n offer "${MOBS[m].n}s scare everyone. Kill ${q} of them and I pay ${money(pay*S.money.P)}."\n accept "Good luck out there."\n stage hunt "Kill ${q} ${MOBS[m].n.toLowerCase()}s."\n  goal kill ${m} ${q}\n stage back "Tell {giver} it is done."\n  goal talk giver\n  say "You are braver than me."\n reward cash ${pay}\n reward xp combat ${q*5}\nend`}
  const r=registerQuests(txt,'request');if(r.errs.length)console.warn(r.errs);else{S.reqs=S.reqs||{};S.reqs[id]=txt;questScheduler()}}
// quests written by the player in the Quest Workshop, kept in this browser
function loadModQuests(){try{const t=localStorage.getItem('oreorder.mods');if(t)return registerQuests(t,'workshop')}catch(e){}return{errs:[],quests:[]}}
