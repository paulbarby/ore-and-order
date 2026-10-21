# Ore & Order

A browser life simulation in a frontier mining valley. You are one person in a procedural world. Every NPC has a class and a daily routine. Land, law, wages, shops, supply and demand, money and town government are simulated.

## Play online

https://paulbarby.github.io/ore-and-order/ (GitHub Pages, branch `main`, folder `/`). A push to `main` publishes the new version in about a minute. Change the `?v=N` tags in `index.html` with each release, so browsers fetch the new scripts.

Saves stay in each player's own browser (localStorage). The online game and a local copy keep separate saves.

## Run it

```
python -m http.server 5812 --directory C:/Users/paulb/Claude/lifesim
```

Open `http://localhost:5812`. The page needs a server, because the sounds load with `fetch`. In the Claude desktop app, the preview name is `ore-and-order` (in `C:\Users\paulb\Claude\.claude\launch.json`).

`v1-prototype.html` is the first single-file version. The game does not use it. A copy of the code before the business update is in `C:\Users\paulb\Claude\.lifesim-backup\`. A copy before the caves-and-quests expansion is in `C:\Users\paulb\Claude\.lifesim-backup-v3\`.

## Files

| File | Contents |
|---|---|
| `index.html` | Screens, HUD, panels, script tags. Change the `?v=N` tags after an edit to stop the browser cache. |
| `css/style.css` | All styles. |
| `js/core.js` | Random numbers, noise, goods, items, recipes by work station, business types, town demand rates, classes, speech lines, achievements. |
| `js/world.js` | Terrain, town layout, 8 building lots, fields, deposits, plots, A* path finding, minimap base. |
| `js/econ.js` | Market Hall, money, bank, laws, hourly and daily ticks, NPC council. |
| `js/biz.js` | Businesses, production, shops, retail prices, town demand, population, orders, lots and building, value and sale, owner controls, crafting. |
| `js/events.js` | World events, goals, weekly challenges, leaderboard, Hall of Records, mayor policies, town projects, elections. |
| `js/npc.js` | NPC creation, routine, mining, timber, harvest, labour market, shopping, speech, rumours. |
| `js/fx.js` | Particles, fireworks, floating text, audio. |
| `js/render.js` | Terrain painter, sprites, building designs, lots, crops, characters, lighting, weather, bubbles, minimap, icons, portraits. |
| `js/ui.js` | HUD, slide-over panels, Market, Bank, Town Hall, Land Office, Sheriff, Inn, dialogue, charts. |
| `js/minigames.js` | Work mini-games: forge (anvil), smelt (furnace), bake (oven), serve (shop counter). Work orders, piece pay, results. |
| `js/ui2.js` | Business windows, notice board, lots, Mayor's office, elections, Craft, Goals, Leaderboard and Business panels. |
| `js/data2.js` | Expansion data: gems, monster parts, farm goods, weapons with combat stats, armour, supplies, seeds, animals, quest items. Workbench recipes, Outfitter and Ranch business types, Rancher, Outlaw and Deputy classes, monsters (`MOBS`), animals (`ANIMALS`), new achievements and goals. |
| `js/icons2.js` | 16 × 16 pixel icons for the expansion goods. |
| `js/sprites2.js` | Character sprites in 4 directions (walk, roll, kneel, tied, hurt flash), weapons and swing trails, monsters, animals, drops, chests, projectiles, shared overlay (prompts, bubbles, quest arrow, knocked-out screen). `DRAW_HOOKS` and `GROUND_HOOKS` let other files add drawings. |
| `js/ents.js` | Entities: monsters, animals, outlaws, ground items, chests, projectiles. Damage, loot, monster AI (flyer, lunger, blob, brute, phaser, pack, gunman, boss), animal AI, wild spawns at night. |
| `js/combat.js` | Player health and stamina, melee combos, heavy blows, dodge roll and perfect dodge, guns and reloads, quick bar, death and recovery at the inn. |
| `js/caves.js` | 7 cave mouths, cave level generator (cellular automata), gem and ore veins, chests, cracked walls with hidden rooms, ladders, treasure maps, the Deep Maw boss, cave renderer with darkness and lights. |
| `js/quests.js` | Quest script parser and checker, quest state, goals, actions, quest markers and the quest arrow. |
| `js/social.js` | Families and friends, crime, the sheriff, posse, surrender, bounties (alive, dead or either), outlaw camps. |
| `js/farm.js` | Tilling, planting, watering, crop growth, harvest, farm animals and their produce, the lost cow. |
| `js/questdata.js` | The main story (5 chapters), 11 side quests, townsfolk requests made at run time, Workshop quests from browser storage. |
| `js/ui3.js` | Health and stamina bars, quick bar, wanted stars, quest tracker, Quests panel, Sheriff bounty board, Quest Workshop. |
| `js/main.js` | State, player actions, input, save and load, game loop. |
| `assets/audio/` | 25 MP3 files from ElevenLabs: 20 effects, 3 ambience loops, 2 music tracks. |
| `assets/img/` | Empty. If `miner.jpg`, `refiner.jpg`, `smith.jpg`, `baker.jpg`, `hauler.jpg`, `sheriff.jpg`, `clerk.jpg` or `player.jpg` exist, the game uses them in place of the pixel portraits. |

## Keys

WASD or arrows: walk. E or Space: act (hold to mine or cut timber). F: eat a loaf of bread (or click Eat under the energy and hunger bars). I Pack · C Character · L Land · J Journal · T Town · K Craft · P Business · Q Quests · G Goals · B Leaderboard · M ownership map · Esc menu.

Fight: left click attacks at the mouse pointer (in a cave, near enemies, or with a weapon within 3 tiles; elsewhere a click walks). Hold the click 0.45 s for a heavy blow. X also attacks. Shift or right click: roll. R: reload. 1 bandage · 2 tonic · 3 dynamite (thrown at the pointer) · 4 torch · 5 best food.

## Supply chain

| Raw good | Who supplies it | Used for |
|---|---|---|
| Ore, coal | Miners on their own or leased plots | Furnace: ingots |
| Crude oil | Oil haulers at wells (wells regrow) | Furnace: lamp fuel |
| Wheat | Farmers and the player, from fields south of town (fields regrow in 1.6 days) | Oven: bread |
| Timber | Woodcutters and the player with an axe (trees regrow in 4 days) | Anvil: pickaxe, axe, cart; new buildings; town projects |

Work stations: **furnace** (Refinery, Smelters), **anvil** (Smithy, Forges), **oven** (Bakery, Bakehouses). The Market Hall trades only ore, farm goods and metal. Shops sell bread and tools.

## Town demand and population

- Townsfolk buy goods each hour. Units each day = population / 100 × rate. Rates: bread 42, fuel 5, pickaxe 0.9, boots 1.1, axe 0.7, lantern 0.8, backpack 0.6, cart 0.3, ring 0.3, drill 0.25.
- Demand falls when the price is above the fair price: demand × clamp((fair / average shop price)^0.6, 0.35, 1.5). Nobody buys above 2.4 × the fair price.
- Townsfolk buy from the cheapest shop with stock. A unit nobody can sell is a shortage.
- Shortage figure = 0.55 × bread shortage + 0.45 × average shortage of the other goods (each a moving average).
- Population each day: grows 3.5% when the shortage is below 10%, 1.8% below 20%, 0.4% below 32%, and falls 2% above that. The school project adds 0.6%. Approval above 70% adds 0.4%.
- Result: when the shops keep up, more settlers come, so demand grows past supply again. The gap stays open. The player can fill it.

## Businesses

- Fair price = max(0.6 × base × P, unit cost × 1.25). Unit cost = inputs at market price + 9 × P × labour hours / 3, for one unit.
- Auto shelf price = fair price × (1.1 + 0.3 × shortage − 0.18 × overstock, + 0.06 when empty).
- A shop pays a supplier 62% of its shelf price (wholesale).
- Producers choose the job with the best (stock gap × margin). NPC owners make nothing at a loss. A player owner makes what the player sets.
- Workers go to the job with the best wage × skill (1.6 for the right trade) / (1 + 0.35 × workers already there). A worker adds 1.5 labour hours per hour in the right trade, 1 otherwise.
- NPC owners raise wages with the shortage of their goods (wholesale businesses: with the scarcity of their metal at the Market Hall). They keep 1,200 × P in the till and pay 40% of the rest to the owner.
- Value = building base × P + till cash + 60% of stock + 8 × average daily profit (last 7 days). Asking price: Town 115%, NPC owners 115% to 180% by opinion and reputation. Selling to the Town returns 80% of value.
- Owner controls: shelf prices (fixed or auto), stock targets or what to make, wage, till cash in and out.

## Eating

- Bread restores 35 hunger. Press F, click Eat on the HUD, or click Eat in the Pack.
- Buy bread at the Bakery, a Bakehouse or a store. Stew at the Inn fills hunger to 100.
- Hunger falls about 46 points a day. At 0 hunger, energy falls. At 0 energy you collapse, and the doctor takes 15% of your notes.

## Work mini-games

- The Work tab of a business lists its **work orders**: shelf gaps (stock below the owner's target), notice-board orders from other businesses or town projects for that product, and market gaps for a furnace.
- Each order shows the materials. The business takes them from its stock or buys them at the market with its own cash. If it cannot, the order is greyed out.
- Pick an order and play the game for that work station. Quality q runs from 0 to 1. Grades: Excellent ≥ 0.9, Good ≥ 0.7, Fair ≥ 0.45, Poor ≥ 0.25, Failed below 0.25.

| Station | Game | Output |
|---|---|---|
| Anvil | 5 to 12 hammer strikes (4 + 0.7 × labour hours). Green zone 1.0, yellow 0.6, miss 0.12. Below 35% heat a strike counts × 0.35. R reheats (1.1 s). | 1 tool. Failed: the metal cracks and the materials are lost. |
| Furnace | Hold the bellows to keep the heat in a moving band until the melt bar fills. Too hot adds slag. Then hold to pour, and let go between 90% and 100%. q = 0.6 × (1 − slag) + 0.4 × pour accuracy. | 1 ingot or fuel. Failed: slag. |
| Oven | 6 knead beats, then pull each loaf when golden (62% to 95% baked). q = 0.7 × good loaves / 3 + 0.3 × knead score. | The good loaves only. A 4th loaf when all 3 are good and the knead score is 0.85 or more. |
| Counter | Serve 8 customers. Pick the item each one asks for, or Sold out when the shelf is empty. 7 s patience. A wrong pick costs 2 s. | Real sales from the shelf to the townsfolk. Tip of 8% when served fast. |

- Output goes first to notice-board orders for that product (the order price goes to the business), then to the shelf or store pile.
- Piece pay = wage × labour hours × 0.6 × (0.25 + q), paid by the business. Counter pay = 1.5 × wage × (0.5 + q) + 6% of sales, plus tips. No wage in your own business.
- Time: labour hours × 20 minutes (counter: 1 hour). Energy: the larger of 3 and labour hours × 1.6 (counter: 6).
- Craft for yourself with the same games (Craft tab), or press Quick for a plain result. "Do it the plain way" gives a Fair result (q = 0.55) without the game.

## Where to sell what you make

| Goods | Buyers |
|---|---|
| Ore, wheat, timber, ingots, lamp fuel | Market Hall (90% of its price). |
| Tools and bread | Shops that stock them (Shop tab, "Sell to this shop", at 62% of the shelf price, while the shop has room and cash). Notice-board orders. People who need them. |
| Any tool or bread | The export trader at the Market Hall, at 55% of the fair price. This buyer always buys while the market has cash. |

- People show an icon over their head when they need something: a miner with no pick, a woodcutter with no axe, a hungry worker (hunger below 60), or a rich person who wants a boot, lantern, backpack, ring or cart. A gold ring and a $ sign mean you carry that item.
- Talk to them and choose the gold "Sell …" option. Price = fair price × need factor (1.25 for a missing tool, 1.3 for bread when hungry, 1.05 for a wish) × (1 + opinion and reputation / 250), up to the cash they have.
- Craft cards name each material and list what is missing. "Buy missing" buys the shortfall at the Market Hall price, if the market has it, you have the notes, and your pack has room.

## Lots, building and entrepreneurs

- 8 town lots. A lot costs 260 × P. A building needs 16 timber, 4 iron ingots, 150 × P for builders and a starting till. The player's building takes 1 day; an NPC's takes 2.
- Types: Forge (anvil, tools), Bakehouse (oven, bread), Smelter (furnace, ingots for the Market Hall), Trading Post (buys from makers, sells to the town).
- Each day an NPC with enough cash may build a business for the most short good (55% chance when a lot is free and a shortage is above 20%).

## Orders

- A business posts an order when it cannot buy an input at the market, or when its shelves are empty while the town is short. It posts only if it can pay for the order.
- Input orders pay 1.35 × market price. Shelf orders pay 1.15 × wholesale. Town project orders pay 1.3 × market price.
- Deliver at the notice board in the plaza. Payment is immediate.

## Events

A daily 45% chance, from day 2: gold rush (new gold vein, 3 miners arrive), drought (crops ×0.25, ×0.6 with a granary), bumper harvest (crops ×2.2), Eastern buyers (one good's market target ×2.4, export limit ×2), mine collapse (one deposit loses 40%, closed 1 day), fire (a business loses half its stock, closed 1 day), travelling peddler (rare goods at 82% of fair price), settlers (+22 townsfolk, 2 new NPCs), craze (demand ×3 for one tool), festival (demand ×1.3, fireworks), bank panic, bandits (night robbery of 30% of notes outside town; 12% each hour, 6% with a lantern), cold snap (fuel demand ×3).

## Goals, challenges, leaderboard

- 12 goals in order, from the first sale to a net worth of $25,000. Each pays cash, reputation or both.
- 3 weekly challenges, scaled by the week number. Reward: 60 × week × P.
- Weekly leaderboard: Richest, Most ore mined, Most goods made, Most trade. The player and all NPCs compete. Prizes for the player: 150, 75 and 35 × week × P for places 1 to 3.
- Hall of Records: best results from every game in this browser (`localStorage` key `oreorder.records`).

## Mayor and elections

- Elections every 7 days at 12:00. Stand at Town Hall for 50 × P (reputation −10 or more).
- Named NPCs score each candidate. Player: opinion × 0.6 + reputation × 0.35 + campaign × 0.3 + 6 for each promise the voter likes. Mayor: (approval − 50) × 0.6 + 22. Named votes count 3 each.
- Townsfolk votes = population / 4, shared by appeal. Mayor: approval. Player: 20 + reputation × 0.35 + campaign × 0.5 + 3 for each promise.
- Campaign: one plaza speech a day (+6 support, +3 opinion for people within 10 tiles). Up to 2 promises. An unkept promise costs 8 approval each week.
- Mayor's powers: land tax, sales tax, import tariff, claim-jumping fine, new notes each day, bread price cap, bank reserve rule, mayor's salary, road crew pay, bank silver payments on or off, town projects.
- Approval target = 62 − (tax − 1%) × 900 − sales tax × 120 − (1 − v) × 90 − shortage × 45 + 6 for a fair bread cap − salary over 40 × 0.15 + 3 for each project + 8 in a festival − 8 when silver payments stop + road pay bonus. Approval moves 30% of the way each day. Below 22% for 2 days, the people call a recall election.
- Projects: Railway spur, Assay office, Sheriff deputies, Granary, School, Road lamps. Each costs treasury cash plus materials from the market and the notice board.

## Money model

The game has three kinds of money: bank notes (paper), silver coins and gold coins.

- **Coin value** (in silver dollars): silver coin = (0.6 × 60 + 0.4 × silver ingot price) / 10. Gold coin = (0.6 × 120 + 0.4 × gold ingot price) / 4.
- **Reserves R** = vault silver × silver coin value + vault gold × gold coin value.
- **Money supply M** = notes held by all people, businesses, the market, the town and the townsfolk, plus bank deposits.
- **Backing** = R / M. The bank needs the reserve rule (30% at the start; the mayor can change it).
- **Note value v**: target = 1 when backing ≥ the rule, otherwise backing / rule (minimum 0.12). Each hour, v moves 6% of the way to the target.
- **Price level P** = 1 / v. Every note price is the real price × P.
- **Suspension**: the bank stops changing notes for coin when backing < 72% of the rule, or when silver < 15 and gold < 8. It changes notes for coin again when silver + 5 × gold > 150 and backing > 105% of the rule. A mayor's order overrides both.

Money enters the valley: exports (at most 6 units per good per hour, 18 with the railway; the market gets 65% of the real price; 50% of that value arrives as coin, 42% silver and 8% gold), the Mint (1 silver and 1 gold ingot per hour), Town Hall printing, and bank credit to the market (1,500 × P when its cash is below 400 × P, until the market owes 6,000 × P).

Money leaves the valley: imports (2 units at 140% of base × (1 + tariff), 210% while suspended), NPC night spending (2 × P lodging; 20% of cash above 80 × P, of which 75% goes to the townsfolk and 25% leaves the valley), and townsfolk imports (4% of their cash each day).

## Market Hall

- Target stock: ore and farm goods 60, metal 14.
- Price = base × clamp(√(target / (stock + 1)), 0.35, 3) × P.
- The market buys at 90% of its price. It refuses ore and farm goods at 3 × target, metal at 5 × target.

## Land and law

- Plots are 10 × 10 tiles, which gives 12 × 9 plots.
- Plot value (real) = 50 + 160 for each oil well + min(amount, 4000) × base price × 0.035 for each ore deposit.
- To claim a Crown plot, pay its value. To buy an owned plot, pay 115% to 180% of the value. A 3-day lease costs 25%. A plot sold back to the Crown returns 70%.
- Claim jumping and cutting timber on land that is not yours: each strike has a 25% chance of a fine (45% with deputies). The fine goes to the plot owner.
- Land tax is 1% of the plot value each day at the start. After 3 unpaid days, the Crown takes the plot.
- Loans: the limit is 100 × P + 50% of your plot value. Interest is 2% each day. A loan is due in 10 days. If you do not repay it, the bank takes plots, most valuable first.

## Test results (2026-10-22)

- Headless runs of 22, 27 and 28 game days on seeds 12345, 4242 and 31337: no errors.
- Seed 4242, 28 days: population 130 → 309, bread shortage 0% to 40% with events, 5 new businesses built by NPCs, projects finished, 3 weekly leaderboards.
- Save and load: identical state after reload (businesses, lots, buildings, orders).

## Combat

- Health 100, stamina 100. Stamina refills at 28 a second after 0.7 s. Health comes back at 1.2 a second when no enemy is near for 30 game minutes.
- Light attack: 6 stamina. Combo multipliers 1 · 1.15 · 1.4 · 1.7 (the weapon sets the combo length). The last hit of a combo pushes 1.6 × harder.
- Heavy attack: hold for 0.45 s, 25 stamina, 2.2 × damage, 1.25 × reach, stuns for 0.5 s. The Starsteel blade sends a shock wave.
- Roll: 22 stamina, 0.3 s of no damage. A hit inside the first 230 ms of a roll is a perfect dodge: time runs at 35% for 0.7 s and the next hit is critical (2 ×).
- Critical chance 8%. Combat level adds 4% damage for each level.
- Armour removes 15% (duster), 30% (steel vest, 8% slower) or 45% (golem plate) of each hit.
- Hit stop (0.05 s, 0.09 s on a heavy blow) and screen shake on every hit.
- At 0 health you wake at the inn 6 hours later with 60% health. The doctor takes 25% of your notes.

| Weapon | Damage | Notes |
|---|---|---|
| Fists | 4 | 3-hit combo |
| Hunting knife | 8 | fast |
| Cavalry saber | 14 | wide swing |
| Boar spear | 15 | long reach, strong push |
| Revolver | 22 | 6 shots, reload 1.4 s, cartridges |
| Repeating rifle | 42 | 4 shots, pierces one target |
| Starsteel blade | 32 | 4-hit combo, shock wave (story reward) |

## Monsters

| Monster | Where | Behaviour |
|---|---|---|
| Cave bat | caves | circles, then dives |
| Giant spider | caves | winds up, lunges, poisons (a tonic cures) |
| Cave crawler | caves | slow; splits into 2 small crawlers |
| Rock golem | deep levels | slams the ground after a long wind-up; drops golem cores |
| Ghost miner | deep levels | fades out and appears behind you |
| Wolf | forest at night | hunts in packs, circles, runs at low health |
| Bandit | roads at night, outlaw camps | keeps distance and shoots |
| Grizzly, alpha wolf | bounties | strong beasts |
| The Deep Maw | Old Shaft level 3 | boss: burrows, spits acid in a fan, sweeps, calls crawlers at 60% and 30% health |

## Caves

- 7 caves in the hills. The Old Shaft (gold mark on the map) is the story cave. Caves have 1 to 3 levels. Ladders lead up and down.
- Each level is the same each time (made from the world seed). Mined veins, opened chests and broken walls stay that way. Monsters come back after 2 days.
- Gem veins (amethyst, emerald, ruby, diamond) break after 4 to 6 strikes and drop 1 or 2 gems. Ore veins give ore for each strike. You need a pickaxe.
- Cracked walls hide rooms with rare chests. Dynamite opens them.
- Chests hold notes, coin, cartridges, bandages, torches, gems and treasure maps. A treasure map marks a red X in the valley. Dig there 3 times with a shovel.
- Light: 4.2 tiles alone, 6.5 with a lantern, 8 with a torch.
- Rope takes you out of a cave at once.

## Quests and the quest script

- A yellow ! over a person: they offer a quest. A ? : they wait for you on an active quest. Orange marks belong to the main story. The tracked quest shows on the right and an arrow points to its target.
- Main story: Strangers in the Valley → Tremors → The Surveyor's Journal → Starsteel → The Deep Maw. Killing the Maw starts a festival and opens a starsteel vein near the Old Shaft.
- Side quests: The Lost Ring, Wolves at the Door, The Baker's Secret, The Gem Collector, The Haunted Drift, The Missing Cow, Silk for the Store, The Old Map, Dynamite Debt, Old Grizzly, Black Jack Hale. Townsfolk also post small fetch and hunt requests each day (at most 3 open).
- Quest Workshop (Menu → Quest Workshop): write quests in the script, Check them, and Load them into the game. They stay in this browser (localStorage key `oreorder.mods`) and load in every new game.

Script reference (one command on each line, text in double quotes, # starts a note):

```
character <id> "<Name>" class <cls> [female] [home inn|townhall]
quest <id> "<Title>"   ... end
  type main|side   chapter <n>   giver <ref>   needs <cond>
  offer "<text>"   accept "<text>"   do <action>     (runs on accept)
  stage <id> "<objective>"
    do <action>   goal <goal>   say "<text>"   then <action>
  reward cash <n> | item <good> <n> | rep <n> | xp <skill> <n> | flag <name>
refs:    npc:<characterId>  role:mayor|sheriff|banker|clerk  class:<cls>  id:<npcId>  any  giver
conds:   day>=N  flag:X  !flag:X  done:<questId>  rep>=N  kills>=N
goals:   have <good> <n> | kill <monster> <n> | talk <ref> | deliver <ref> <good> <n>
         go cave <i> depth <d> | craft <good> <n> | flag <X> | friend <id> | stat <stat> <n> [money]
         land | bounty <id> | bring <ref>
actions: give/take <good> <n>, cash <n>, rep <n>, flag/unflag <X>, toast "<t>", journal "<t>",
         event <key>, start <questId>, map, unlock <flag>,
         spawn item <good> cave <i> depth <d> [hidden], spawn friend <id> "<Name>" cave <i> depth <d>,
         spawn mob <type> <n> near player|cave <i>, spawn animal <type> far,
         bounty <id> "<Name>" alive|dead|either <reward> [outlaw|beast]
```

Check reports the line of each mistake, and unknown classes, roles, goods and monsters.

## People, crime and bounties

- About a third of the townsfolk share a family name with someone. Family links are 0.9, friends 0.5. The dialogue shows them.
- A blow only hurts a peaceful person when you aim straight at them and no enemy is in reach. Hitting someone who attacks you is self-defence.
- Attack a person: wanted +1, reputation −8, witnesses think less of you. Fighters hit back, others run.
- Kill a person: wanted +3, reputation −30, a price on your head of 250 × P. Their family swears revenge and hunts you for good. Their land and business go to the family. If the mayor dies, an election is held the next day.
- A second killing: a posse of 4 or more deputies and the sheriff ride out.
- Talk to the sheriff to surrender: pay 80 × wanted × P plus your bounty, or go to jail for 1 day for each star. Wanted drops by 1 each day (not while a bounty for murder stands). Families never forgive.
- Bounties at the Sheriff's office: ALIVE ONLY (pays 1.5 ×), DEAD ONLY, or DEAD OR ALIVE. Outlaws on an ALIVE or DEAD OR ALIVE bounty give up at 25% health. Press E to tie them and walk them to the sheriff. They can break free on the way. For a dead target, bring the badge or trophy.

## Farming and animals

- Own a plot. Till grass with a hoe, plant seeds, water with a watering can (rain waters too). Watered crops grow 1.6 × faster.
- Wheat 2 days, corn 2.6, potatoes 2.2, cotton 2.8. A harvest gives 3 to 5 and, half of the time, a seed.
- The Ranch sells chickens (an egg each day), sheep (wool every 2 days), cows (milk every day) and pigs (meat). Animals go to your first plot. Press E to collect, lead, or butcher a pig.
- Cotton makes bandages and rope at the workbench. At the oven: wheat, eggs and milk make pies; meat and potatoes make stew; meat makes jerky; corn makes cornbread.

## Shops for weapons and survival

- Outfitter & Gunsmith (workbench): bandages, tonics, torches, dynamite, cartridges, rope, dusters, revolvers, rifles, golem plate. The smithy adds knives, sabers, spears, steel vests, shovels, hoes and watering cans.
- Ranch Supply: seeds, animals, hoes, watering cans.
- Light goods weigh less in the pack: cartridges 0.05, bandages and torches 0.2, gems and eggs 0.25, seeds 0.1, quest items and animals 0.

## Test results (expansion, 2026-10-22)

- Headless runs of 10 and 22 game days (seeds 31337, 777001, 424242): no script errors. 0.7 s of real time for 10 game days.
- Story chapters 1–5 played through in code: quests offered, accepted, items found behind a blasted wall, friend found, starsteel blade made, Deep Maw killed, starsteel vein opened.
- Cave fight on Old Shaft level 1: 18 kills, 2 tonics used. Boss fight with the Starsteel blade: won with 66 health left.
- Bounty alive: outlaw gave up at 25%, tied, handed over, paid. Murder: kin swore revenge; second killing called a posse of 4; surrender cleared wanted.
- Farming: till, plant, water, harvest. Chickens produce eggs.
- Save and load in a cave: quests, owned animals, weapon, relations, bounties and requests identical; the player comes back at the cave mouth.
- Quest Workshop: the sample quest loads; a broken script reports its line and unknown names.
- Old save (fix after first release): a day-4 save made by the code from before the expansion loads. The load adds the market stock and town demand rows for the new goods, the Rancher, the Outfitter & Gunsmith (on the first free lot) and the Ranch Supply. The new smithy items are added to NPC-owned shops. 3 more game days ran with no errors. Before this fix, the first game hour stopped the game with `Cannot read properties of undefined (reading 'want')` in `folkHour`.
- All tests ran with sound off.

## Known limits

- Higgsfield had 0 credits, so all art is drawn in code.
- NPCs do not use the bank for deposits or loans.
- With an NPC mayor, the note value stays near 100¢ in tests. Inflation appears when a mayor prints many notes or the bank lends to its limit.
- Saves from before the business update do not load. Saves from before the expansion load and get the new systems.
- Market cash runs low after about day 20 (the bank credit reaches its 6000 × P cap and NPCs hold most notes). The copy before the expansion shows the same. When the market has no cash, it cannot buy gems or ore from you.
- The cave you are in is not saved. A game saved in a cave loads at the cave mouth.
