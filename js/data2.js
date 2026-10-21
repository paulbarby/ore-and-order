'use strict';
// ===== expansion data: weapons, armour, supplies, gems, farm, animals, monsters, quest items =====
Object.assign(GOODS,{
  // gems and rare ore (Market Hall)
  amethyst:{n:'Amethyst',p:60,cat:'Gem',col:'#b070e0',mstock:5},emerald:{n:'Emerald',p:110,cat:'Gem',col:'#40d080',mstock:3},
  ruby:{n:'Ruby',p:160,cat:'Gem',col:'#e8304a',mstock:2},diamond:{n:'Diamond',p:300,cat:'Gem',col:'#c8f0ff',mstock:1},
  starsteel_ore:{n:'Starsteel ore',p:90,cat:'Ore',col:'#7ad8ff',mstock:0},starsteel:{n:'Starsteel ingot',p:280,cat:'Metal',col:'#9ae8ff',mstock:0},
  // monster parts (Market Hall)
  bat_wing:{n:'Bat wing',p:8,cat:'Part',col:'#6a5a7a',mstock:6},spider_silk:{n:'Spider silk',p:14,cat:'Part',col:'#e8e8f0',mstock:6},
  slime:{n:'Crawler slime',p:6,cat:'Part',col:'#8ad040',mstock:6},golem_core:{n:'Golem core',p:120,cat:'Part',col:'#ff9a40',mstock:1},
  ectoplasm:{n:'Ectoplasm',p:40,cat:'Part',col:'#9af0e0',mstock:2},hide:{n:'Hide',p:12,cat:'Part',col:'#9a6a40',mstock:8},
  // farm goods (Market Hall)
  corn:{n:'Corn',p:4,cat:'Farm',col:'#f0d040'},potato:{n:'Potato',p:3,cat:'Farm',col:'#c8a060'},cotton:{n:'Cotton',p:5,cat:'Farm',col:'#f4f4f4'},
  egg:{n:'Egg',p:3,cat:'Farm',col:'#f4ead0',mstock:20},milk:{n:'Milk',p:5,cat:'Farm',col:'#ffffff',mstock:12},wool:{n:'Wool',p:9,cat:'Farm',col:'#e8e0d0',mstock:10},meat:{n:'Meat',p:8,cat:'Farm',col:'#c04a3a',mstock:16},
  // food (shops)
  pie:{n:'Egg pie',p:14,cat:'Food',col:'#e0a050',food:60,buff:'sta'},stew:{n:'Hearty stew',p:16,cat:'Food',col:'#a0603a',food:70,buff:'hp'},
  jerky:{n:'Jerky',p:5,cat:'Food',col:'#8a3a2a',food:22},cornbread:{n:'Cornbread',p:5,cat:'Food',col:'#f0c050',food:30},
  // weapons
  knife:{n:'Hunting knife',p:35,cat:'Weapon',col:'#c8ccd4',item:{slot:'weapon',dur:400,d:'Fast. 8 damage.'},w:{dmg:8,spd:.26,range:1.05,arc:1.5,combo:3,kb:.25}},
  saber:{n:'Cavalry saber',p:110,cat:'Weapon',col:'#e0e4ec',item:{slot:'weapon',dur:600,d:'Balanced. 14 damage, wide swing.'},w:{dmg:14,spd:.36,range:1.35,arc:1.9,combo:3,kb:.35}},
  spear:{n:'Boar spear',p:80,cat:'Weapon',col:'#b8a070',item:{slot:'weapon',dur:500,d:'Long reach. 15 damage, strong push.'},w:{dmg:15,spd:.48,range:1.95,arc:.7,combo:2,kb:.75}},
  revolver:{n:'Revolver',p:180,cat:'Weapon',col:'#6a6e78',item:{slot:'weapon',dur:800,d:'6 shots, 22 damage. Uses cartridges.'},w:{gun:true,dmg:22,spd:.42,mag:6,reload:1.4,range:9,spread:.07}},
  rifle:{n:'Repeating rifle',p:260,cat:'Weapon',col:'#7a5a3a',item:{slot:'weapon',dur:800,d:'42 damage, long range, pierces. Uses cartridges.'},w:{gun:true,dmg:42,spd:.85,mag:4,reload:1.8,range:14,spread:.015,pierce:1}},
  starblade:{n:'Starsteel blade',p:900,cat:'Weapon',col:'#7ad8ff',item:{slot:'weapon',dur:99999,d:'32 damage, 4-hit combo. A charged blow sends out a shock wave.'},w:{dmg:32,spd:.3,range:1.55,arc:2.1,combo:4,kb:.5,glow:'#7ad8ff',wave:true}},
  // armour
  coat:{n:'Leather duster',p:70,cat:'Armor',col:'#8a5a30',item:{slot:'armor',dur:600,d:'Blocks 15% of damage.'},def:.15},
  vest:{n:'Steel vest',p:160,cat:'Armor',col:'#8a8e98',item:{slot:'armor',dur:900,d:'Blocks 30% of damage. 8% slower.'},def:.3,slow:.08},
  golem_plate:{n:'Golem plate',p:600,cat:'Armor',col:'#c8783a',item:{slot:'armor',dur:1500,d:'Blocks 45% of damage.'},def:.45,slow:.04},
  // supplies (shops; use from the quick bar)
  bandage:{n:'Bandage',p:8,cat:'Supply',col:'#f0e8e0',use:{heal:30}},tonic:{n:'Tonic',p:30,cat:'Supply',col:'#60d0a0',use:{heal:60,cure:true}},
  torch:{n:'Torch',p:4,cat:'Supply',col:'#ff9a30',use:{light:180}},dynamite:{n:'Dynamite',p:25,cat:'Supply',col:'#d83a2a',use:{throw:true}},
  cartridge:{n:'Cartridges',p:2,cat:'Supply',col:'#d8b040',ammo:true},rope:{n:'Rope',p:12,cat:'Supply',col:'#c8a870',use:{escape:true}},
  shovel:{n:'Shovel',p:30,cat:'Supply',col:'#a0a4ac',tool:'dig'},hoe:{n:'Hoe',p:25,cat:'Supply',col:'#a08a5a',tool:'till'},can:{n:'Watering can',p:20,cat:'Supply',col:'#6a9ac8',tool:'water'},
  // seeds and animals (Ranch)
  seed_wheat:{n:'Wheat seed',p:2,cat:'Seed',col:'#e0c050',crop:'wheat'},seed_corn:{n:'Corn seed',p:3,cat:'Seed',col:'#f0d040',crop:'corn'},
  seed_potato:{n:'Seed potato',p:3,cat:'Seed',col:'#c8a060',crop:'potato'},seed_cotton:{n:'Cotton seed',p:4,cat:'Seed',col:'#f4f4f4',crop:'cotton'},
  chicken:{n:'Chicken',p:40,cat:'Animal',col:'#f4f0e0',animal:'chicken'},sheep:{n:'Sheep',p:120,cat:'Animal',col:'#e8e0d0',animal:'sheep'},
  cow:{n:'Cow',p:200,cat:'Animal',col:'#5a3a2a',animal:'cow'},pig:{n:'Pig',p:90,cat:'Animal',col:'#f0a8a8',animal:'pig'},
  // quest items (never traded)
  lost_ring:{n:"Mae's silver ring",p:0,cat:'Quest',col:'#d8e0f0'},tobias_lamp:{n:"Tobias's lamp",p:0,cat:'Quest',col:'#f0b040'},
  thorne_journal:{n:"Thorne's journal",p:0,cat:'Quest',col:'#8a5a30'},maw_heart:{n:'Heart of the Maw',p:0,cat:'Quest',col:'#ff4a8a'},
  outlaw_badge:{n:'Outlaw badge',p:0,cat:'Quest',col:'#c8a040'},beast_trophy:{n:'Beast trophy',p:0,cat:'Quest',col:'#d8c8a0'},
  treasure_map:{n:'Treasure map',p:0,cat:'Quest',col:'#e8d8a8'},cowbell:{n:'Cowbell',p:0,cat:'Quest',col:'#c8a040'},
});
for(const[k,w]of Object.entries({cartridge:.05,bandage:.2,torch:.2,dynamite:.3,tonic:.3,rope:.5,amethyst:.25,emerald:.25,ruby:.25,diamond:.25,egg:.25,
  bat_wing:.25,spider_silk:.25,slime:.3,ectoplasm:.3,jerky:.3}))GOODS[k].wt=w;
for(const k in GOODS){const c=GOODS[k].cat;if(c==='Quest')GOODS[k].wt=0;if(c==='Seed')GOODS[k].wt=.1;if(c==='Animal')GOODS[k].wt=0}
rebuildGoodLists();
Object.assign(STATION_NAME,{bench:'Workbench'});
RECIPES.anvil.push({out:'knife',in:{iron_ingot:1,wood:1},t:3},{out:'saber',in:{iron_ingot:2,copper_ingot:1},t:6},{out:'spear',in:{iron_ingot:1,wood:2},t:4},
  {out:'vest',in:{iron_ingot:4},t:8},{out:'shovel',in:{iron_ingot:1,wood:1},t:3},{out:'hoe',in:{iron_ingot:1,wood:1},t:3},{out:'can',in:{copper_ingot:1},t:2},
  {out:'starblade',in:{starsteel:2,ruby:1,diamond:1,golem_core:1},t:14,flag:'starblade'});
RECIPES.bench=[{out:'bandage',in:{cotton:1},n:2,t:1},{out:'tonic',in:{slime:1,bat_wing:1},t:1.5},{out:'torch',in:{wood:1,fuel:1},n:4,t:1},{out:'rope',in:{cotton:2},t:1},
  {out:'dynamite',in:{coal:2,fuel:1},n:2,t:2},{out:'cartridge',in:{copper_ingot:1,coal:1},n:12,t:2},{out:'coat',in:{hide:3},t:4},
  {out:'revolver',in:{iron_ingot:3,wood:1},t:9},{out:'rifle',in:{iron_ingot:4,wood:2},t:12},{out:'golem_plate',in:{golem_core:2,iron_ingot:3},t:10}];
RECIPES.oven.push({out:'pie',in:{wheat:1,egg:2,milk:1},n:2,t:1.5},{out:'stew',in:{meat:1,potato:2},n:2,t:1.5},{out:'jerky',in:{meat:1},n:3,t:1},{out:'cornbread',in:{corn:2},n:3,t:1});
RECIPES.furnace.push({out:'starsteel',in:{starsteel_ore:2,coal:2},t:5});
Object.assign(BIZ_TYPES,{
  outfitter:{n:'Outfitter & Gunsmith',station:'bench',retail:true,cls:'smith',base:700,wage:9,roof:'#3a3a2a',wall:'#a08a6a'},
  ranch:{n:'Ranch Supply',station:null,retail:true,cls:null,base:500,wage:0,roof:'#7a3a2a',wall:'#c8a878',imports:true},
});
Object.assign(DEMAND,{bandage:1.4,torch:2,cartridge:9,jerky:2.2,pie:1.6,stew:1.6,cornbread:2,knife:.2,saber:.12,revolver:.08,coat:.25,shovel:.1,hoe:.12,seed_wheat:1,chicken:.1});
Object.assign(CLASSES,{
  rancher:{n:'Rancher',count:1,shirt:'#6a8a5a',pants:'#4a3a2a',hat:'stetson',hatCol:'#8a6a3a',col:'#a8d880'},
  outlaw:{n:'Outlaw',count:0,shirt:'#3a2a2a',pants:'#2a2a2a',hat:'stetson',hatCol:'#1a1a1a',bandana:'#8a1a1a',col:'#e04040'},
  deputy:{n:'Deputy',count:0,shirt:'#6a543c',pants:'#2a2420',hat:'stetson',hatCol:'#4a3a2a',star:true,col:'#f5c542'},
});
// monsters and wild animals. ai: flyer, lunger, blob, brute, phaser, pack, gunman, grazer, boss
const MOBS={
  bat:{n:'Cave bat',hp:16,dmg:6,spd:4.2,r:.32,ai:'flyer',xp:4,loot:[['bat_wing',.6,1]],cash:0},
  spider:{n:'Giant spider',hp:38,dmg:10,spd:2.8,r:.42,ai:'lunger',poison:true,xp:8,loot:[['spider_silk',.75,1]]},
  crawler:{n:'Cave crawler',hp:30,dmg:8,spd:1.5,r:.42,ai:'blob',split:true,xp:6,loot:[['slime',.6,1]]},
  minicrawler:{n:'Small crawler',hp:10,dmg:4,spd:2.2,r:.28,ai:'blob',xp:2,loot:[['slime',.3,1]]},
  golem:{n:'Rock golem',hp:130,dmg:24,spd:1.15,r:.6,ai:'brute',armor:.3,xp:25,loot:[['golem_core',.4,1],['iron_ore',1,3],['amethyst',.3,1]]},
  ghost:{n:'Ghost miner',hp:60,dmg:14,spd:2.3,r:.4,ai:'phaser',xp:16,loot:[['ectoplasm',.7,1]]},
  wolf:{n:'Wolf',hp:30,dmg:9,spd:3.7,r:.42,ai:'pack',xp:7,loot:[['hide',.7,1],['meat',.8,1]]},
  alpha:{n:'The Ridge Wolf',hp:140,dmg:18,spd:3.9,r:.55,ai:'pack',xp:40,boss:1,loot:[['beast_trophy',1,1],['hide',1,2]]},
  bear:{n:'Old Grizzly',hp:220,dmg:28,spd:2.6,r:.7,ai:'brute',xp:50,boss:1,loot:[['beast_trophy',1,1],['hide',1,4],['meat',1,4]]},
  bandit:{n:'Bandit',hp:50,dmg:11,spd:2.6,r:.4,ai:'gunman',human:true,xp:12,loot:[['cartridge',.8,4]],cash:[5,30]},
  maw:{n:'The Deep Maw',hp:1100,dmg:30,spd:1.6,r:1.4,ai:'boss',boss:1,xp:300,loot:[['maw_heart',1,1],['diamond',1,2],['ruby',1,2]]},
};
const ANIMALS={
  chicken:{n:'Chicken',hp:6,spd:1.6,r:.25,produce:'egg',every:1,col:'#f4f0e0'},sheep:{n:'Sheep',hp:20,spd:1.2,r:.4,produce:'wool',every:2,col:'#e8e0d0'},
  cow:{n:'Cow',hp:40,spd:1,r:.55,produce:'milk',every:1,col:'#f0ece4'},pig:{n:'Pig',hp:25,spd:1.3,r:.42,produce:null,butcher:4,col:'#f0a8a8'},
  deer:{n:'Deer',hp:24,spd:4,r:.45,wild:true,loot:[['meat',1,2],['hide',1,1]],col:'#a8784a'},rabbit:{n:'Rabbit',hp:6,spd:4.4,r:.22,wild:true,loot:[['meat',1,1]],col:'#b8a088'},
};
ACH.push(
  {id:'blood',n:'First Blood',d:'Defeat a monster.'},{id:'slayer',n:'Monster Slayer',d:'Defeat 50 monsters.'},{id:'gem',n:'Gem Hunter',d:'Find a gem.'},
  {id:'treasure',n:'Treasure Hunter',d:'Open a hidden treasure.'},{id:'deep',n:'Into the Deep',d:'Reach the third level of a cave.'},{id:'hero',n:'Hero of the Valley',d:'Defeat the Deep Maw.'},
  {id:'bounty',n:'Bounty Hunter',d:'Collect a bounty.'},{id:'alive',n:'Due Process',d:'Bring an outlaw in alive.'},{id:'grower',n:'Green Thumb',d:'Harvest a crop you planted.'},
  {id:'herd',n:'Rancher',d:'Own 4 animals.'},{id:'quests',n:'Helping Hand',d:'Finish 5 side quests.'},{id:'murder',n:'Blood on Your Hands',d:'Kill a townsperson. Their friends will not forget.'});
// goals for the new content, placed before the last goals
GOALS.splice(5,0,{n:'Into the dark',d:'Enter a cave. Look for cave mouths in the mountains.',prog:()=>[S.player.stats.caves||0,1],reward:{cash:40}},
  {n:'Lend a hand',d:'Finish a side quest. Look for a ! over a person.',prog:()=>[S.player.stats.sideDone||0,1],reward:{cash:60,rep:3}});
GOALS.splice(GOALS.length-1,0,{n:'Wanted',d:'Collect a bounty from the Sheriff.',prog:()=>[S.player.stats.bounties||0,1],reward:{cash:150}},
  {n:'The Deep Maw',d:'Finish the main story.',prog:()=>[S.flags&&S.flags.story_done?1:0,1],reward:{cash:1000,rep:20}});
// market stock targets for the new market goods
for(const k of['amethyst','emerald','ruby','diamond'])GOODS[k].tgt=4;
for(const k of['bat_wing','spider_silk','slime','hide','ectoplasm','golem_core'])GOODS[k].tgt=10;
for(const k of['corn','potato','cotton','egg','milk','wool','meat'])GOODS[k].tgt=30;
GOODS.starsteel_ore.tgt=10;GOODS.starsteel.tgt=4;
