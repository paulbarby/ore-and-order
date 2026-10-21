'use strict';
// ===== Ore & Order — core: random, noise, helpers, game data =====

function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let R=Math.random;
function seedRng(s){R=mulberry(s)}
const ri=(a,b)=>a+Math.floor(R()*(b-a+1));
const pick=a=>a[Math.floor(R()*a.length)];
const chance=p=>R()<p;
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);

function hash2(x,y,s){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041)|0;
  h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi,s),b=hash2(xi+1,yi,s),c=hash2(xi,yi+1,s),d=hash2(xi+1,yi+1,s);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,s,o=4){let v=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){v+=a*vnoise(x*f,y*f,s+i*101);n+=a;a/=2;f*=2}return v/n}

const an=w=>w==='bread'?'a loaf of bread':(/^[aeiou]/i.test(w)?'an ':'a ')+w;
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const pad2=n=>String(n).padStart(2,'0');
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
function shadeC(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16&255,g=n>>8&255,b=n&255;
  if(f<0){r*=1+f;g*=1+f;b*=1+f}else{r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f}
  return`rgb(${r|0},${g|0},${b|0})`}

// ---------- goods ----------
const GOODS={
  iron_ore:{n:'Iron ore',p:8,cat:'Ore',col:'#b5653d'},
  copper_ore:{n:'Copper ore',p:10,cat:'Ore',col:'#3fb8a0'},
  silver_ore:{n:'Silver ore',p:18,cat:'Ore',col:'#c9d4e0'},
  gold_ore:{n:'Gold ore',p:40,cat:'Ore',col:'#ffd23f'},
  coal:{n:'Coal',p:5,cat:'Ore',col:'#34343a'},
  oil:{n:'Crude oil',p:12,cat:'Ore',col:'#7a4bd0'},
  iron_ingot:{n:'Iron ingot',p:30,cat:'Metal',col:'#a2a6ad'},
  copper_ingot:{n:'Copper ingot',p:34,cat:'Metal',col:'#d27c45'},
  silver_ingot:{n:'Silver ingot',p:60,cat:'Metal',col:'#e6ebf1'},
  gold_ingot:{n:'Gold ingot',p:120,cat:'Metal',col:'#f5c542'},
  fuel:{n:'Lamp fuel',p:30,cat:'Metal',col:'#9a66e0'},
  wheat:{n:'Wheat',p:3,cat:'Farm',col:'#e0c050'},
  wood:{n:'Timber',p:4,cat:'Farm',col:'#9a6a3a'},
  bread:{n:'Bread',p:6,cat:'Food',col:'#d9a55b',food:35},
  pickaxe:{n:'Iron pickaxe',p:90,cat:'Tool',col:'#a2a6ad',item:{slot:'tool',stat:'mine',v:1,dur:250,d:'+1 ore for each strike'}},
  drill:{n:'Steel drill',p:210,cat:'Tool',col:'#7fa0c0',item:{slot:'tool',stat:'mine',v:2,dur:400,d:'+2 ore for each strike'}},
  boots:{n:'Work boots',p:70,cat:'Tool',col:'#7a4a2a',item:{slot:'feet',stat:'speed',v:.35,dur:700,d:'+35% walk speed'}},
  backpack:{n:'Backpack',p:80,cat:'Tool',col:'#8a6a3a',item:{slot:'back',stat:'cap',v:30,dur:99999,d:'+30 carry capacity'}},
  cart:{n:'Ore cart',p:160,cat:'Tool',col:'#6a5040',item:{slot:'back',stat:'cap',v:70,dur:99999,d:'+70 carry capacity'}},
  lantern:{n:'Lantern',p:60,cat:'Tool',col:'#f0b040',item:{slot:'hand',stat:'night',v:1,dur:500,d:'Full mining rate at night. Wide light.'}},
  axe:{n:'Axe',p:55,cat:'Tool',col:'#b8bcc4',item:{slot:'axe',stat:'chop',v:1,dur:220,d:'Cut timber from trees'}},
  ring:{n:'Gold ring',p:300,cat:'Tool',col:'#f5c542',item:{slot:'ring',stat:'trade',v:.1,dur:99999,d:'+10% sell price, -10% buy price'}},
};
const RAW=['iron_ore','copper_ore','silver_ore','gold_ore','coal','oil','wheat','wood'];
// shop goods (sold in shops) and market goods (traded at the Market Hall). Quest items are neither.
const SHOP_CATS=new Set(['Food','Tool','Weapon','Armor','Supply','Seed','Animal']);
const isFinished=k=>SHOP_CATS.has(GOODS[k].cat);
const isMarketGood=k=>!isFinished(k)&&GOODS[k].cat!=='Quest';
const FINISHED=[],COMMOD=[];function rebuildGoodLists(){FINISHED.length=0;COMMOD.length=0;for(const k in GOODS){if(isFinished(k))FINISHED.push(k);else if(isMarketGood(k))COMMOD.push(k)}}rebuildGoodLists();
const SILVER_PER_INGOT=10, GOLD_PER_INGOT=4;

// recipes by work station. n = units made by one batch, t = labour hours
const RECIPES={
  furnace:[{out:'iron_ingot',in:{iron_ore:2,coal:1},t:2.5},{out:'copper_ingot',in:{copper_ore:2,coal:1},t:2.5},
    {out:'silver_ingot',in:{silver_ore:2,coal:1},t:3},{out:'gold_ingot',in:{gold_ore:2,coal:1},t:3.5},{out:'fuel',in:{oil:2},t:1.5}],
  anvil:[{out:'pickaxe',in:{iron_ingot:2,wood:1},t:6},{out:'axe',in:{iron_ingot:1,wood:1},t:4},{out:'drill',in:{iron_ingot:3,fuel:1},t:12},{out:'boots',in:{iron_ingot:1,copper_ingot:1},t:7},
    {out:'backpack',in:{copper_ingot:2},t:7},{out:'cart',in:{iron_ingot:2,copper_ingot:1,wood:3},t:11},
    {out:'lantern',in:{copper_ingot:1,fuel:1},t:6},{out:'ring',in:{gold_ingot:1},t:10}],
  oven:[{out:'bread',in:{wheat:2},n:3,t:1.5}],
};
const STATION_NAME={furnace:'Furnace',anvil:'Anvil',oven:'Oven'};
// business types. base = value of the building in silver dollars
const BIZ_TYPES={
  refinery:{n:'Refinery',station:'furnace',retail:false,cls:'refiner',base:900,wage:8},
  smithy:{n:'Smithy',station:'anvil',retail:true,cls:'smith',base:800,wage:9},
  bakery:{n:'Bakery',station:'oven',retail:true,cls:'baker',base:500,wage:5},
  store:{n:'General Store',station:null,retail:true,cls:null,base:600,wage:0,roof:'#2a4a6a',wall:'#c8b48a'},
  forge:{n:'Forge',station:'anvil',retail:true,cls:'smith',base:450,wage:9,shop:true,roof:'#4a3a34',wall:'#9a8a78'},
  bakehouse:{n:'Bakehouse',station:'oven',retail:true,cls:'baker',base:350,wage:5,shop:true,roof:'#a8703a',wall:'#e8d8b0'},
  smelter:{n:'Smelter',station:'furnace',retail:false,cls:'refiner',base:500,wage:8,shop:true,roof:'#44444c',wall:'#9a6a54'},
  post:{n:'Trading Post',station:null,retail:true,cls:null,base:350,wage:0,shop:true,roof:'#5a2a4a',wall:'#c8a07a'},
  peddler:{n:"Peddler's Wagon",station:null,retail:true,cls:null,base:0,wage:0},
};
const BUILD_COST={wood:16,iron_ingot:4,cash:150};
// town demand: units each day for each 100 townsfolk
const DEMAND={bread:42,fuel:5,lantern:.8,boots:1.1,backpack:.6,axe:.7,pickaxe:.9,drill:.25,cart:.3,ring:.3};
const BASE_WAGE={refinery:8,smithy:9,bakery:5,townhall:7};

// ---------- people ----------
const CLASSES={
  miner:{n:'Miner',count:10,shirt:'#8a6440',pants:'#3d3a4a',hat:'helmet',hatCol:'#c9a23a',tool:'pick',col:'#e0a93b'},
  refiner:{n:'Refiner',count:5,shirt:'#5d6470',pants:'#2e2e36',hat:'goggles',hatCol:'#4a3a2a',col:'#9aa6b8'},
  smith:{n:'Smith',count:4,shirt:'#8a3a2a',pants:'#3a2e26',hat:'bandana',hatCol:'#6a1e1e',apron:'#4a3424',tool:'hammer',col:'#e0624f'},
  baker:{n:'Baker',count:3,shirt:'#ece4d2',pants:'#6a6058',hat:'toque',hatCol:'#ffffff',col:'#f2e3b0'},
  hauler:{n:'Oil hauler',count:4,shirt:'#4a6a8a',pants:'#2a3440',hat:'cap',hatCol:'#38404a',tool:'can',col:'#6fa8dc'},
  sheriff:{n:'Sheriff',count:1,shirt:'#6a543c',pants:'#2a2420',hat:'stetson',hatCol:'#2a1e14',star:true,col:'#f5c542'},
  clerk:{n:'Land clerk',count:1,shirt:'#3a4a3a',pants:'#2a2a2a',hat:'bowler',hatCol:'#1e1e1e',col:'#8fc28a',vest:'#6a4a2a'},
  banker:{n:'Banker',count:1,shirt:'#2a2a3a',pants:'#1e1e26',hat:'tophat',hatCol:'#141418',col:'#c8b8ff',vest:'#5a2a3a'},
  farmer:{n:'Farmer',count:3,shirt:'#7a8a3a',pants:'#5a4a30',hat:'straw',hatCol:'#e0c878',col:'#b8d070'},
  woodcutter:{n:'Woodcutter',count:3,shirt:'#a83a2a',pants:'#3a3a4a',hat:'cap',hatCol:'#3a5a3a',tool:'axe',col:'#c08040'},
  merchant:{n:'Merchant',count:2,shirt:'#6a3a5a',pants:'#2a2a3a',hat:'bowler',hatCol:'#3a2a1a',vest:'#c8a040',col:'#d8a0d8'},
  mayor:{n:'Mayor',count:1,shirt:'#1e1e2a',pants:'#1e1e26',hat:'tophat',hatCol:'#101014',vest:'#8a2a2a',star:false,col:'#ffb0e0'},
  peddler:{n:'Peddler',count:0,shirt:'#5a3a6a',pants:'#3a2a20',hat:'wide',hatCol:'#4a2a5a',col:'#e070ff'},
};
const PLAYER_LOOK={shirt:'#a8402e',pants:'#3a3550',hat:'wide',hatCol:'#7a5230',bandana:'#d8b040'};
const SKINS=['#f1c9a5','#e0ac80','#c68a5e','#9c6640','#6e4428','#f5d6bc'];
const HAIRS=['#2a1a10','#5a3a1e','#8a5a2a','#c8a060','#1a1a1a','#a0a0a0','#7a2a14'];
const NAMES=('Ada Bram Cora Dov Edda Finn Gwen Hal Ivo Juno Kai Lev Mae Nils Ora Pim Quin Rua Sol Tova Ulf Vey Wren Yara Zed Ash Bo Cal Dee Eli '+
  'Fay Gus Hepzi Ike Jess Kit Lou Moss Nan Otto Peg Roy Sal Tam Una Vic Will Zoe').split(' ');
const SURNAMES='Ashby Brook Cole Dunn Earl Frost Grey Hale Irons Judd Kemp Lark Marsh Nash Oakes Penn Quarry Reed Stone Thorne Vale Webb York'.split(' ');

const BACKGROUNDS={
  prospector:{n:'Prospector',d:'You know rock. You start with a pickaxe and some silver.',cash:130,silver:10,gold:0,equip:['pickaxe'],xp:{mining:60},rep:0},
  labourer:{n:'Labourer',d:'Strong back, good name. Boots, a better wage and the trust of the town.',cash:70,silver:5,gold:0,equip:['boots'],xp:{labour:80},rep:15},
  trader:{n:'Trader',d:'You know a bargain. More money and better prices, but no tools.',cash:200,silver:0,gold:3,equip:[],xp:{trade:90},rep:0},
};

const RANKS=[[0,'Drifter'],[300,'Prospector'],[800,'Claim-holder'],[2000,'Landowner'],[5000,'Mine Owner'],[12000,'Baron'],[30000,'Tycoon of the Valley']];

// ---------- speech ----------
const LINES={
  mine:['Good seam today.','This rock fights back.','Steady now...','Ore enough for bread.','Hear that ring? Good iron.','One more cart.'],
  mineVein:['This vein goes on forever!','Richest rock in the valley.','I could dig here for years.'],
  sellGood:['Ore fetches {p} today!','Good price at the market.','The buyers are hungry today.'],
  sellBad:['Prices are poor.','They pay less every week.','The market is full of my ore.'],
  hungry:['I need some bread.','My stomach growls.','Lunch, then back to work.'],
  labour:['Another shift.','The furnace never sleeps.','Wages are wages.','Hot work today.'],
  smith:['Mind the sparks!','Good iron sings.','Steady hammer.'],
  baker:['Fresh bread!','The dough is up.','Hot loaves at the market.'],
  haul:['Black gold!','This well is slow today.','Mind the fumes.'],
  night:['Time for bed.','Long day.','See you at sunrise.'],
  morning:['Morning!','Sun is up. Back to work.','Another day, another dollar.'],
  claim:['This plot is mine now!','The deed is signed.','My own claim at last.'],
  inflation:['Notes buy less every day!','I keep my silver, thank you.','Bread cost half that last week!','The printers are busy at Town Hall.'],
  run:['I want my silver!','Open the vault!','Paper is paper. Give me coin!'],
  rain:['Wet day.','Rain in the shafts again.','Mud everywhere.'],
  rich:['Business is good.','I might buy more land.'],
  poor:['Times are hard.','I can barely pay for bread.'],
  greetGood:['Morning, {n}!','Good to see you, {n}.','Hello, {n}! Fine weather.','{n}! How are the claims?'],
  greetMid:['Hello.','Afternoon.','{n}.'],
  greetBad:['Keep your hands off my claim.','Hmph. Claim jumper.','The sheriff has an eye on you.'],
  trespass:['Get off my claim!','That ore is mine!','Sheriff! Claim jumper!'],
  sheriff:['Keep the peace.','Claim jumping costs {f}.','Law is law.','Town is quiet. Good.'],
  fined:['That will be {f}, friend.','Pay the fine. Law is law.'],
  rumourNone:['I know nothing new.','Ask me tomorrow.'],
  farm:['Good wheat this year.','The rows are ripe.','Rain, please.','Sheaf after sheaf.'],
  chop:['Timber!','Good straight wood.','Mind your feet!'],
  shortage:['The shelves are empty!','No {g} in the whole town!','Somebody make more {g}!'],
  shopper:['Prices are up again.','I got the last one!','A fair price today.'],
  vote:['I vote for {c}.','{c} has my vote.','We need a new mayor.'],
  merchant:['Buy cheap, sell dear.','The store needs stock.','Good trade today.'],
  mayor:['The town is in good hands.','Taxes pay for roads.','Vote for me next week!'],
  campaign:['Vote for {n}!','{n} speaks for the miners!','I like what {n} says.'],
  festival:['What a party!','Music in the plaza!','Happy festival!'],
};
function line(key,vars={}){let s=pick(LINES[key]||['...']);for(const k in vars)s=s.split('{'+k+'}').join(vars[k]);return s}

// ---------- achievements ----------
const ACH=[
  {id:'ore',n:'First Strike',d:'Mine your first ore.'},
  {id:'sale',n:'Open for Business',d:'Sell goods at the Market.'},
  {id:'claim',n:'Staked',d:'Own a plot of land.'},
  {id:'vein',n:'Mother Lode',d:'Own a plot that holds a vein.'},
  {id:'baron',n:'Land Baron',d:'Own 5 plots.'},
  {id:'k1',n:'Four Figures',d:'Reach a net worth of $1,000.'},
  {id:'k10',n:'Tycoon',d:'Reach a net worth of $10,000.'},
  {id:'shift',n:'Honest Work',d:'Work 10 shifts.'},
  {id:'silver',n:'Hard Money',d:'Hold 100 silver coins.'},
  {id:'gold',n:'Gold Bug',d:'Hold 20 gold coins.'},
  {id:'loan',n:'Good Credit',d:'Repay a bank loan.'},
  {id:'outlaw',n:'Claim Jumper',d:'Be fined 3 times.'},
  {id:'rumour',n:'Ear to the Ground',d:'Hear 5 rumours.'},
  {id:'kit',n:'Well Equipped',d:'Equip 4 items at once.'},
  {id:'saver',n:'Saver',d:'Keep $1,000 in the bank.'},
  {id:'mint',n:'Coin of the Realm',d:'Sell an ingot to the Mint.'},
  {id:'craft',n:'Maker',d:'Craft an item.'},
  {id:'order',n:'Supplier',d:'Fill an order on the notice board.'},
  {id:'biz',n:'Proprietor',d:'Own a business.'},
  {id:'chain',n:'Business Empire',d:'Own 3 businesses.'},
  {id:'mayor',n:'Mayor',d:'Win a town election.'},
  {id:'project',n:'Builder',d:'Finish a town project as mayor.'},
  {id:'week',n:'Champion',d:'Win a category on the weekly leaderboard.'},
  {id:'wood',n:'Lumberjack',d:'Cut 50 timber.'},
  {id:'harvest',n:'Harvester',d:'Harvest 30 wheat.'},
];
