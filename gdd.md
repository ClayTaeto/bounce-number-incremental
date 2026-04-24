# Bouncing Numbers — Game Design Document

## 1. Working Title

**Bouncing Numbers**

Alternate titles:

* **Number Bounce Factory**
* **Bouncer Bucks**
* **Merge Wall Millionaire**
* **1 More Bounce**
* **The Number Wall**

## 2. High Concept

A physics-based incremental game where the player buys bouncing number-balls that ricochet around an arena. Every time a number hits a money wall, it generates cash based on its value, speed, combo state, and upgrades. The player can rapidly add new `1` numbers, merge matching numbers into larger numbers, unlock new wall types, build automation, and eventually prestige into stronger number systems.

The game should feel like:

> **Cookie Clicker + Peggle/Plinko + 2048 + factory automation.**

The fantasy is simple: **fill the screen with stupidly satisfying bouncing numbers, merge them into absurd values, and watch money explode upward.**

This is not a passive idle game. It is an **active incremental physics toy.** The two holdable buttons are the secret sauce: holding **Add 1** feels like feeding the machine; holding **Merge** feels like compressing chaos into power. Every other system should support that fantasy.

## 3. Design Pillars

### 3.1 Immediate Physical Satisfaction

The screen should always be alive. Numbers bounce, squash slightly on wall hits, flash on impact, and create readable money popups. Even when the player is not making strategic choices, watching the arena should feel good.

### 3.2 Simple Inputs, Deep Scaling

The starting actions are intentionally tiny:

* Add a `1`.
* Merge numbers.
* Buy upgrades.

The depth comes from how these actions scale through automation, synergies, prestige currencies, wall modifiers, number types, and build choices.

### 3.3 Player-Controlled Acceleration

The player should feel like holding buttons matters. Holding **Add 1** should rapid-fire new numbers. Holding **Merge** should rapidly combine available numbers. This creates tactile engagement instead of pure idle waiting. **This is the core differentiator. Do not dilute it.**

### 3.4 Visible Exponential Growth

Progression should be obvious on-screen. A player should be able to look at the arena and understand: "I used to have a few 1s, now I have glowing 128s and 512s slamming into gold walls for millions."

### 3.5 Break-the-Game Moments

The game needs intentional moments where the player feels like they found a busted combo. The design should allow wild synergies, then later contain them with new prestige layers instead of over-balancing all fun out of existence.

## 4. Target Platform

**Release target: Steam only. Supported hardware: PC and Steam Deck.**

The game is built with web technology wrapped in NW.js (see §21.1) and ships exclusively on Steam. No separate web release, no itch.io, no mobile.

* **PC** — primary target. Mouse + keyboard. Any resolution.
* **Steam Deck** — secondary target. Controller + trackpad. 1280×800 display. Must achieve at minimum Steam Deck **Playable** rating; target **Verified**.

Mobile is excluded because hold-to-rapid-fire is the core input mechanic — holding buttons on a touchscreen is fatiguing and would require redesigning the entire add/merge loop. Do not scope or promise any other platform.

Recommended price:

* **$4.99** for a tight, polished version
* **$6.99–$7.99** if the game has multiple prestige layers, strong art/audio polish, Steam achievements, cloud saves, and 8–15 hours of content

## 5. Revenue Goal: $10k Scope Framing

The game should be scoped to plausibly earn **$10,000 gross or net**, but this is not guaranteed. The safest target is a small paid Steam game with a strong demo, satisfying trailer, streamer-friendly visuals, and enough content to earn positive reviews.

### 5.1 Sales Math

At **$4.99**:

* Gross revenue per sale: $4.99
* After 30% platform cut: about $3.49 before taxes/refunds
* To reach $10,000 net before taxes/refunds: about **2,865 sales**

At **$6.99**:

* Gross revenue per sale: $6.99
* After 30% platform cut: about $4.89 before taxes/refunds
* To reach $10,000 net before taxes/refunds: about **2,045 sales**

At **$7.99**:

* Gross revenue per sale: $7.99
* After 30% platform cut: about $5.59 before taxes/refunds
* To reach $10,000 net before taxes/refunds: about **1,790 sales**

### 5.2 Design Implication

The game does not need to be huge. It needs to be:

* Immediately understandable in a trailer.
* Visually satisfying within 3 seconds.
* Deep enough for 8–15 hours of progression.
* Cheap enough to be an impulse buy.
* Meme-able enough for short clips.
* Polished enough to avoid "cheap clicker shovelware" perception.

## 6. Core Loop

### 6.1 Moment-to-Moment Loop

1. Player earns money when numbers hit money-generating walls.
2. Player spends money to add more `1` numbers.
3. Player merges matching numbers into larger numbers.
4. Larger numbers generate more money per bounce.
5. Player buys upgrades that increase speed, value, wall payouts, merge rate, and arena capacity.
6. New number behaviors and wall mechanics unlock.
7. Player fills the arena to capacity, unlocking prestige.
8. Prestige currency unlocks permanent multipliers and new systems.

### 6.2 One-Minute Experience

The player starts with one bouncing `1`. It hits the wall and earns `$1`. The player buys another `1`, presses merge, creates a `2`, and sees that `2` earn more per bounce. Soon the arena has several numbers bouncing. The player holds Add to spray in 1s, holds Merge to compress them upward, and watches the screen shift from little white 1s to colorful 8s, 16s, and 32s.

### 6.3 Ten-Minute Experience

The player unlocks:

* Auto-adders.
* Wall multipliers.
* Combo bonuses.
* Number capacity upgrades.
* First prestige preview.

The arena is now busy. The player is making choices: more numbers, bigger numbers, faster numbers, or better wall payouts.

### 6.4 One-Hour Experience

The player has prestiged at least once. They now have permanent upgrades, a larger arena, special walls, and number mutations. Their build might focus on:

* Many small fast numbers.
* A few massive high-value numbers.
* Combo chains.
* Wall crits.
* Merge explosions.
* Light Fragment farming through Lightspeed.

## 7. Core Mechanics

### 7.1 Numbers

Numbers are physics objects that bounce around the arena. Each number has:

* **Value**: 1, 2, 4, 8, 16, 32, etc.
* **Position**
* **Velocity**
* **Size**
* **Tier color**
* **Generation multiplier**
* **Special traits**, unlocked later

#### 7.1.1 Base Number Values

Default merge sequence:

`1 → 2 → 4 → 8 → 16 → 32 → 64 → 128 → 256 → 512 → 1K → 2K → 4K → 8K → 16K → ...`

The game should switch to compact notation once values get large:

* 1K
* 1M
* 1B
* 1T
* 1Qa
* 1Qi
* Scientific notation toggle

Number values will exceed JavaScript's `Number.MAX_SAFE_INTEGER` (~9 quadrillion) in late-game runs. All number values and money totals must use a big-number library (e.g., `decimal.js`, `break_infinity.js`) from day one. Retrofitting this later is very expensive.

#### 7.1.2 Number Size

Numbers should grow slightly with value, but not infinitely. The player should be able to read value without giant objects clogging the arena.

Suggested size rule:

* `1` starts small.
* Size grows every few tiers.
* Size has a max cap.
* High-tier numbers use visual effects, outlines, glow, and color instead of massive scale.

#### 7.1.3 Number Collision

Numbers collide only with:

* Walls.
* Special bumpers.
* Gates.
* Merge zones.

**Numbers pass through each other.** There is no number-to-number physics interaction. This keeps the simulation simple, prevents clumping chaos, and removes the need for anti-clump logic. All merges are triggered by the Merge button only — physical proximity never causes merging.

To prevent numbers from getting stuck:

* Numbers should never get permanently stuck in corners.
* Low-speed numbers receive a tiny nudge after a timeout.
* Arena corners should be rounded or have invisible deflectors.

### 7.2 Money Generation

When a number hits an active money wall, it generates money.

Base formula:

`Money = Number Value × Wall Multiplier × Speed Multiplier × Combo Multiplier × Global Multiplier`

#### 7.2.1 Wall Multiplier

Each wall has its own multiplier. Early game uses basic walls. Later walls can be upgraded separately.

Example:

* Left wall: x1
* Right wall: x1
* Top wall: x2 after unlock
* Bottom wall: x0 early, later becomes a special wall

#### 7.2.2 Speed Multiplier

Faster numbers generate more money. The multiplier is capped well below the Lightspeed threshold so speed upgrades have meaningful benefit without making lightspeed the only optimal strategy.

Example (starting estimate — tune in playtest):

* Slow hit: x1
* Medium hit: x1.25
* Fast hit: x1.75
* Critical speed hit: x2.5 (maximum; approaching Lightspeed threshold)

#### 7.2.3 Combo Multiplier

Repeated wall hits within a short window increase a combo meter.

Example (starting estimate — tune in playtest):

* 5 hits in 3 seconds: x1.1
* 15 hits in 3 seconds: x1.5
* 50 hits in 3 seconds: x3
* 200 hits in 3 seconds: x10

The upper combo tiers require speed upgrades to reach. With 20 starting numbers at base speed, approximately 40–60 hits per 3 seconds is the expected ceiling; 200 hits requires upgraded speed and capacity. Design the upper combo tiers as aspirational targets, not day-one achievable.

Combos should decay quickly enough that high-energy builds feel exciting.

### 7.3 Add 1 Button

The **Add 1** button spends money to create a new `1` number.

#### 7.3.1 Basic Behavior

* Click once: buy one `1`.
* Hold button: buy repeatedly at increasing input rate.
* If insufficient money: button shakes, flashes red, or plays a muted fail tick.
* If arena is at capacity: button is disabled and displays "Arena Full." Merging numbers down or upgrading capacity is required before adding more. Reaching full capacity also unlocks the Prestige option for the first time.

#### 7.3.2 Cost Scaling

Suggested starting formula:

`Cost to Add 1 = Base Cost × Growth ^ Total Numbers Purchased This Prestige`

Initial values (starting estimates — tune in playtest):

* Base cost: `$5`
* Growth: `1.08`

This should be tuned aggressively. The player should add a lot of numbers early, but eventually merging and upgrades should become more important than just spamming 1s.

#### 7.3.3 Hold-to-Rapid-Fire

Holding Add 1 should ramp up (starting estimates — tune in playtest):

* 0.0s–0.5s: 4 purchases/sec
* 0.5s–2.0s: 8 purchases/sec
* 2.0s–5.0s: 15 purchases/sec
* 5.0s+: max based on upgrade level

Add button upgrades:

* **Quick Fingers**: increases hold purchase rate.
* **Bulk Buy**: buys 5, 10, 25, 100 at a time.
* **Auto Printer**: automatically buys 1s when affordable.
* **Smart Printer**: only buys 1s when it will not push the arena over capacity.

### 7.4 Merge Button

The **Merge** button combines two matching numbers into the next tier.

Example:

* `1 + 1 = 2`
* `2 + 2 = 4`
* `4 + 4 = 8`

#### 7.4.1 Basic Behavior

* Click once: merge one available pair.
* Hold button: rapidly merge all available pairs over time.
* Merge priority defaults to lowest value first.

There is no passive auto-merge. Merging is always a deliberate player action — either a click, a hold, or an upgrade that chains during active hold input (see §7.4.4).

#### 7.4.2 Merge Rules

Default merge rule:

* Two numbers with the same value can merge.
* They do not need to be physically close for the button merge.
* When merged, the two old numbers disappear and the new number spawns at their average position.
* The new number inherits a blend of their velocities, plus a small celebratory pop impulse.

#### 7.4.3 Merge Feel

Merging should feel juicy:

* Numbers flash lines toward each other.
* New number pops bigger for 0.15 seconds.
* Money particles burst if upgrade unlocked.
* Audio pitch rises with value tier.

#### 7.4.4 Hold-to-Rapid-Merge

Holding Merge should ramp up similarly to Add 1 (starting estimates — tune in playtest):

* 0.0s–0.5s: 3 merges/sec
* 0.5s–2.0s: 6 merges/sec
* 2.0s–5.0s: 12 merges/sec
* 5.0s+: max based on upgrade level

Merge button upgrades:

* **Greedy Merge**: merge highest values first.
* **Clean Merge**: prioritize merges that reduce arena clutter.
* **Combo Merge**: each merge temporarily boosts wall income.
* **Chain Merge**: if a merge creates another mergeable pair, automatically continue the current hold-merge action.
* **Mass Merge**: merges all possible pairs instantly on cooldown.

### 7.5 Arena

The arena is the main playfield where numbers bounce.

#### 7.5.1 Starting Arena

* Rectangular box.
* Four walls.
* Left and right walls generate money.
* Top and bottom are neutral early.
* Capacity: 20 numbers.

When the arena is at capacity, the Add 1 button disables and shows "Arena Full." The player must merge numbers down or purchase a capacity upgrade before adding more. The first time the arena reaches full capacity, the Prestige option unlocks and a notification appears.

#### 7.5.2 Arena Upgrades

Arena upgrades include:

* Larger arena.
* Higher number capacity.
* Better wall multipliers.
* Special wall slots.
* Bumper slots.
* Wall shapes.
* Corner deflectors.
* Multi-lane arenas.

#### 7.5.3 Arena Shapes

Unlockable arena layouts:

1. **Classic Box**

   * Basic rectangle.
   * Easy to read.

2. **Pinball Table**

   * Angled walls and bumpers.
   * Better for combo builds.

3. **Compression Chamber**

   * Smaller arena.
   * High bounce frequency.
   * Lower capacity.

4. **Long Hallway**

   * Wide horizontal chamber.
   * Better wall slam payouts.

5. **Split Reactor**

   * Two chambers separated by a central gate wall.
   * The gate is directional: numbers pass from the input chamber to the output chamber, not back.
   * Output chamber has higher wall multipliers; input chamber has higher capacity.
   * Gate direction is toggleable with an upgrade.
   * Advanced unlock: gate can filter by value threshold (only numbers above a set value pass through).

6. **Prestige Void**

   * Late-game arena. Walls periodically drain a small percent of current money but carry dramatically higher payout multipliers. High risk, high reward.

### 7.6 Walls

Walls are not just boundaries. They are money machines.

#### 7.6.1 Basic Wall Types

**Cash Wall**

* Generates normal money on hit.

**Multiplier Wall**

* Applies a temporary multiplier to the bouncing number's value for the next 3 seconds.

**Crit Wall**

* Has a chance to pay a critical hit (large random payout multiplier).

**Interest Wall**

* Payout scales with current unspent money. Best when the player is cash-rich.

**Merge Wall**

* When a number bounces off this wall, it is immediately promoted to the top of the merge queue. The next merge event will target this number first, regardless of value or normal priority settings.

**Splitter Wall**

* Destroys a high-tier number on contact and splits it into two half-value numbers. Useful for recycling stuck high-tier numbers into merging fuel. Distinct from the Duplicator Bumper — this destroys rather than clones.

**Lightspeed Wall**

* Instantly accelerates any number that hits it to the Lightspeed threshold, converting it into Light Fragments on impact. Use as a deliberate conversion tool to farm Light Fragments from high-value numbers. Numbers do not bounce — they are consumed on contact.

**Prestige Wall**

* Generates prestige progress toward the next prestige charge instead of money.

**Tax Wall**

* On hit, permanently increases the number's individual payout multiplier by 50%, but deducts 10% of your current cash immediately. Opt-in risk/reward: only worthwhile when you have cash reserves and want long-term payout gains on a specific number.

#### 7.6.2 Wall Slots

Each side of the arena can have wall modules. Early game has one module per side. Later, walls can be divided into multiple segments.

Example:

* Left wall has 3 slots.
* Player installs Cash / Crit / Cash.
* Top wall has Multiplier / Lightspeed / Multiplier.

This creates build variety without needing complex controls.

### 7.7 Bumpers and Objects

Bumpers sit inside the arena and interact with bouncing numbers.

#### 7.7.1 Bumper Types

**Basic Bumper**

* Adds bounce force.
* Small payout.

**Gold Bumper**

* Generates money on hit.

**Magnet Bumper**

* Pulls nearby numbers slightly toward it, changing their trajectory.

**Merge Bumper**

* If two matching numbers hit it within a short window, they merge. This is the only passive merge source in the game — it triggers on physical bumper contact, not on player input.

**Charge Bumper**

* Builds charge, then releases a money burst.

**Duplicator Bumper**

* Creates a low-tier clone (capped at value 4 or lower) of any number that hits it. Distinct from the Splitter Wall: Duplicator adds new numbers without destroying the original, but is rate-limited by a per-bumper cooldown to prevent exponential cloning.

**Void Bumper**

* Deletes numbers below a threshold value on contact and pays out a flat cash bonus per deletion. Useful for clearing low-tier clutter. Does not scale payout with number value.

**Prestige Bumper**

* Converts hit value into prestige charge.

#### 7.7.2 Bumper Placement

The first version can use fixed unlockable bumper slots to avoid building a full editor.

Later version can allow drag-and-drop placement, but this adds scope. Recommended MVP: fixed slots.

### 7.8 Lightspeed

Every number has a **Lightspeed threshold** — a maximum speed it cannot exceed. If a number's velocity reaches this threshold (through bumper hits, speed upgrades, or trait effects), it enters **Lightspeed state**: a brief white flash, a streak effect, and then it is removed from the arena.

When a number goes Lightspeed:

* It is removed from the board.
* It generates **Light Fragments** based on its value and how far over the threshold it travelled.
* A burst effect plays at the removal point.
* The arena capacity immediately frees one slot.

**Design intent:** Lightspeed makes speed upgrades a meaningful risk/reward decision. Going faster earns more per wall hit but brings numbers closer to disappearing. Early game, Lightspeed is a hazard. Mid-to-late game, builds can deliberately farm Light Fragments by cycling cheap numbers through high-speed configurations.

**Lightspeed threshold:** Starts fixed. Can be raised with Light Fragment upgrades, giving numbers more headroom before removal. Raising the cap is the primary Light Fragment sink.

**Interaction with Lightspeed Wall:** The Lightspeed Wall (§7.6.1) is a deliberate conversion tool — it forcibly triggers Lightspeed on contact, consuming the number and yielding Light Fragments without requiring the number to naturally reach the speed cap.

**Light Fragment uses (examples):**

* Raise the Lightspeed threshold.
* Permanent bonus to speed multiplier for wall hits.
* Unlock the Lightspeed Wall.
* Spawn a **Photon Ball** — a fresh `1` that spawns at max speed, designed to be converted immediately for quick Light Fragments.
* Unlock Light Fragment-gated upgrades in the upgrade shop.

**Lightspeed does not reset on prestige.** Light Fragments persist, making them a mid-tier persistent resource that accumulates across runs. Confirm this decision before implementing prestige save logic.

## 8. Progression Systems

### 8.1 Money Upgrades

Money upgrades reset on prestige.

Categories:

#### Add Upgrades

* Add 1 cost reduction.
* Hold speed increase.
* Bulk buy.
* Auto add.
* Number spawn speed.
* Starting value increased from 1 to 2/4/8 after enough progression.

#### Merge Upgrades

* Merge speed.
* Merge all cooldown.
* Chain merge (extends active hold-merge).
* Merge payout bonus.
* Merge explosion.

#### Wall Upgrades

* Wall multiplier.
* Crit chance.
* Crit multiplier.
* Combo duration.
* Speed payout cap.
* Special wall unlocks.

#### Number Upgrades

* Bounce speed (raises toward Lightspeed threshold).
* Value multiplier.
* Number capacity.
* Trait unlocks.
* Anti-stuck force.
* Hit cooldown reduction.

#### Arena Upgrades

* Arena size.
* Bumper slots.
* Wall slots.
* New layouts.

#### Light Fragment Upgrades

* Lightspeed threshold increase.
* Light Fragment payout multiplier.
* Photon Ball cost reduction.
* Lightspeed Wall unlock.

### 8.2 Milestone Unlocks

Milestones give long-term goals.

Example milestones (timing values are targets, tune in playtest):

| Milestone            | Unlock                   |
| -------------------- | ------------------------ |
| First `2`            | Merge button tutorial    |
| First `8`            | Combo meter              |
| First `32`           | Auto-add preview         |
| First `128`          | Wall upgrades            |
| First `$10K`         | Bumpers                  |
| First `$1M`          | Upgrade shop expanded    |
| First `1K` number    | Prestige preview         |
| Arena Full (1st time)| First prestige available |
| Prestige 1           | Permanent tree           |
| Prestige 3           | Number traits            |
| Prestige 5           | Alternate arenas         |
| Prestige 10          | Challenge runs           |

### 8.3 Prestige

Prestige is the main long-term retention system.

Working name: **Reboot the Calculator**

**Prestige unlock condition:** Prestige becomes available the first time the arena reaches full capacity. Once unlocked, the player can prestige at any time from that point forward — they do not need to stay full to trigger it.

On prestige:

* Current money resets.
* Current numbers reset.
* Normal upgrades reset.
* Player earns **Prime Shards** based on highest number value, lifetime money, and wall hits.
* Light Fragments are **not** reset (they persist across prestiges).

Prime Shards are spent on permanent upgrades.

#### 8.3.1 Prestige Currency Formula

Suggested formula (tune in playtest):

`Prime Shards = floor((Lifetime Money / 1B)^0.5 + Highest Number Tier Bonus + Wall Hit Bonus)`

This should be tuned so the first prestige gives enough currency for 2–4 meaningful permanent upgrades.

#### 8.3.2 Permanent Upgrade Tree

Permanent upgrades:

**Starting Capital**

* Start each run with more money.

**Better Ones**

* Spawn `1`s with a permanent payout multiplier.

**Prime Merge**

* Merges generate a burst of money.

**Wall Memory**

* Walls keep a fraction of their upgrades after prestige.

**Automation Memory**

* Auto-add unlocks earlier each run.

**Number Capacity+**

* Permanent number capacity increase.

**Prime Crits**

* Permanent wall crit chance.

**Bigger Beginning**

* Start runs with a `2`, later `4`, later `8`.

**Offline Earnings**

* Earn limited offline progress.

**New Math**

* Unlocks alternate number systems.

### 8.4 Second-Layer Prestige

For a larger $10k-worthy scope, include a second-layer prestige after several normal prestiges.

Working name: **Break Infinity**

Unlock requirement:

* Reach a `1Qa` number or Prestige 10.

This unlocks **Infinity Points**, which change rules more dramatically.

Infinity upgrades:

* Unlock new arena physics.
* Unlock special number families.
* Unlock challenge modes.
* Unlock multiplicative prestige scaling.
* Unlock cosmetic themes.

This should be late-game content, not required for the demo.

## 9. Number Traits

After the player understands the basic loop, numbers can gain traits.

Traits make individual numbers behave differently. Introduce them slowly — too many traits too early will damage readability. Traits should only appear after the first prestige unlock.

Examples:

**Heavy**

* Slower, but higher wall payout.

**Light**

* Faster, lower base payout, better combo scaling.

**Sticky**

* Briefly clings to walls, generating repeated ticks.

**Electric**

* Chains a small payout to nearby numbers on hit.

**Greedy**

* Payout scales with unspent money. Synergizes with Interest Wall but does not stack — use one or the other per build.

**Lucky**

* Higher crit chance.

**Locked**

* Cannot merge. Generates prestige charge on wall hits instead of money. Useful as a deliberate trade-off: sacrifice a high-tier number's merge potential for prestige acceleration.

**Splitter**

* Occasionally splits into two half-value numbers on wall hit.

**Magnetic**

* Drifts slowly toward numbers of the same value, making them easier to merge quickly after a button press.

**Explosive**

* On merge, creates a money burst.

**Photon**

* Spawns at maximum speed and cannot be slowed. Will inevitably be converted to Light Fragments on next wall or bumper contact. Designed for deliberate Light Fragment farming — high reward, no longevity.

## 10. Build Archetypes

The game should support multiple viable strategies.

### 10.1 Swarm Build

Many low-to-mid-tier numbers bouncing quickly.

Strengths:

* High wall hit count.
* Strong combos.
* Good with crit walls.

Weaknesses:

* Harder to stay below Lightspeed threshold with speed upgrades active.
* Lower individual payouts.
* Requires capacity upgrades.

### 10.2 Giant Number Build

Few massive numbers with huge value.

Strengths:

* Huge wall payouts.
* Strong speed multiplier.
* Easier to read.

Weaknesses:

* Lower hit frequency.
* Bad if number gets stuck.
* Needs merge investment.

### 10.3 Merge Explosion Build

Focus on creating money through merges, not just wall hits.

Strengths:

* Satisfying spikes.
* Strong active play.
* Great with hold-to-merge.

Weaknesses:

* Needs constant supply of low numbers.
* Can stall without auto-add.

### 10.4 Wall Casino Build

Focus on crits, chance, multipliers, and rare events.

Strengths:

* Big dopamine spikes.
* Great for clips.
* Fun risk/reward.

Weaknesses:

* High variance.
* Needs UI clarity to avoid feeling random/unfair.

### 10.5 Idle Automation Build

Focus on passive add and stable income. There is no passive auto-merge, so this build maintains a clean arena with wide capacity margins and lets auto-add do the heavy lifting.

Strengths:

* Good for idle players.
* Smooth long sessions.

Weaknesses:

* Less active fun.
* Numbers accumulate without merging — capacity management is manual.
* Needs caps to prevent solved gameplay.

### 10.6 Lightspeed Farm Build

Deliberately cycle cheap numbers through high-speed paths to generate Light Fragments.

Strengths:

* Efficient Light Fragment accumulation.
* Clears arena capacity continuously.
* Strong synergy with Photon Ball and Lightspeed Wall.

Weaknesses:

* Low money income while active.
* Requires significant speed upgrade investment.
* Poor combo potential since numbers don't survive long.

## 11. Player Controls

### Mouse / Keyboard

Primary controls:

* Click Add 1.
* Hold Add 1.
* Click Merge.
* Hold Merge.
* Click upgrades.
* Drag camera/pan if arena becomes large.
* Mouse wheel zoom if needed.

Hotkeys:

* `A`: Add 1
* Hold `A`: rapid add
* `M`: Merge
* Hold `M`: rapid merge
* `U`: Open upgrades
* `P`: Prestige menu
* `Space`: Activate special ability / overdrive
* `Tab`: Cycle panels

### Controller (Steam Deck + Gamepad)

Full controller support is required for Steam Deck Verified status. The game's inputs are simple enough that mapping is straightforward.

Suggested default controller layout:

| Action               | Button            |
| -------------------- | ----------------- |
| Add 1                | A (face button)   |
| Hold Add 1           | Hold A            |
| Merge                | X (face button)   |
| Hold Merge           | Hold X            |
| Open upgrades        | Y                 |
| Prestige menu        | Start / Menu      |
| Navigate upgrades    | D-pad / L stick   |
| Confirm upgrade      | A                 |
| Special / Overdrive  | R trigger         |
| Zoom                 | R stick           |

The trackpad on the Steam Deck can emulate mouse for navigating the upgrade shop if controller navigation feels clunky. Both input modes should work simultaneously.

Hold-to-rapid-fire must work with held face buttons — this is the core feel. Test this thoroughly on real Steam Deck hardware before submission.

## 12. UI Design

### 12.1 Main Screen Layout

Recommended layout:

* Center: bouncing number arena.
* Bottom left: Add 1 button.
* Bottom right: Merge button.
* Top center: money counter.
* Top left: highest number and current income/sec.
* Top right: prestige progress + Light Fragments counter.
* Right panel: upgrades.
* Left panel: stats/build info.

**Steam Deck / 1280×800 considerations:**

* Design the base layout at 1280×800. PC players at higher resolutions get a larger arena, not more UI.
* All text must be readable at 7 inches from ~50cm viewing distance. Minimum readable font size: 14px equivalent at 1280×800. Number values in the arena should be larger.
* Upgrade cards in the right panel must be navigable with a D-pad — use a clear selection highlight and scroll behavior.
* The Add 1 and Merge buttons must be large enough to hit with thumbstick-controlled cursor if the player is not using face buttons.
* No required UI element should appear in the outer 40px edge of the screen (Steam Deck bezel safe zone).

#### 12.1.1 Add Button

Displays:

* `Add 1`
* Cost
* Purchases/sec while holding
* Bulk mode if active
* "Arena Full — Prestige Available" state when capacity reached for the first time
* "Arena Full" on subsequent fills

#### 12.1.2 Merge Button

Displays:

* `Merge`
* Available pairs count
* Merge/sec while holding
* Current merge priority mode

#### 12.1.3 Money Popups

On wall hit:

* Small payout text appears at collision point.
* Text color reflects payout tier.
* Large crits use bigger text and screen shake.
* Too many popups should merge into summarized bursts.

### 12.2 Stats Panel

Stats to show:

* Money
* Money/sec
* Money/click equivalent
* Total numbers
* Capacity
* Highest number
* Wall hits/sec
* Merge/sec
* Combo multiplier
* Crit chance
* Light Fragments
* Prestige shards on reset

### 12.3 Upgrade Shop

Tabs:

1. Add
2. Merge
3. Numbers
4. Walls
5. Arena
6. Lightspeed
7. Prestige

Each upgrade card should show:

* Name
* Current level
* Cost
* Effect
* Next level effect
* Buy 1 / Buy Max

## 13. Game Feel

This game lives or dies on feel.

### 13.1 Visual Juice

Required juice:

* Squash/stretch on wall collision.
* Wall flash on hit.
* Number glow by tier.
* Merge burst.
* Trail on high-speed numbers.
* Speed trail intensifies as number approaches Lightspeed threshold.
* Lightspeed removal: white flash, streak, Light Fragment burst.
* Coin particles on large payouts.
* Crit impact pop.
* Screen shake for huge merges, but keep it subtle.
* Background reacts to prestige level.

### 13.2 Audio Juice

Audio should be musical and scalable:

* Soft tick on wall hit.
* Higher value numbers produce higher pitch or richer sound.
* Merge sound rises by tier.
* Crits have a satisfying bell/chime.
* Lightspeed conversion: sharp whoosh/dissolve sound distinct from merge.
* Prestige has a large reset sound.
* Avoid overwhelming noise when hundreds of hits happen; use grouped audio events.

### 13.3 Haptics / Feedback

For Steam Deck/controller later:

* Small vibration on merge.
* Stronger vibration on huge crit/prestige.
* Sharp pulse on Lightspeed removal.

## 14. Content Scope

### 14.1 Prototype Scope

Goal: prove the toy is fun in 1 week.

Features:

* Bouncing number physics (pass-through numbers).
* Money on wall hit.
* Add 1 button.
* Hold-to-add.
* Merge button.
* Hold-to-merge.
* Lightspeed removal + Light Fragments.
* Basic upgrade shop.
* Save/load.
* Basic prestige (arena-full trigger).

Prototype success criteria:

* Player can play for 15 minutes without explanation.
* Holding Add and Merge feels good.
* Player wants to reach at least `128`.
* Money growth feels readable.

### 14.2 Demo Scope

Goal: Steam Next Fest demo (Steam only).

Features:

* 1 arena.
* 20–30 normal upgrades.
* 8–12 permanent prestige upgrades.
* 5 wall types (including Lightspeed Wall).
* 4 bumper types.
* 1 prestige layer.
* 1–2 hours of content.
* Tutorial prompts.
* Steam wishlist call-to-action.

Demo end:

* Player reaches first prestige or first major second-stage unlock.

### 14.3 Full Launch Scope

Goal: paid $4.99–$7.99 Steam game.

Features:

* 5–6 arena layouts.
* 80–120 normal upgrades.
* 40–60 prestige upgrades.
* 12 wall types.
* 12 bumper/object types.
* 20+ number traits.
* 2 prestige layers.
* 15–25 challenges.
* Steam achievements.
* Cloud save.
* Offline earnings.
* Stats screen.
* Speed controls.
* Accessibility settings.
* 8–15 hours to reach major late-game state.
* Optional endless postgame.

**Scope note:** This feature list represents 10–14 months of work for an experienced solo developer, or 4–6 months for a small team of 2–3. A 3-month estimate is only realistic for a very small core set of these features. Cut scope before cutting quality. Priority order: physics toy → prestige loop → Lightspeed system → wall/bumper variety → traits → challenges → second prestige.

### 14.4 Stretch Scope

Only add if core game is already fun:

* Daily challenge seed.
* Leaderboards.
* Arena editor.
* Cosmetic number skins.
* Workshop support.
* Twitch integration.
* Seasonal events.

## 15. Challenges

Challenges add replayability and give rewards.

Example challenges:

**No Merge Run**

* Cannot manually merge.
* Reward: permanent merge speed boost.

**Tiny Arena**

* Arena is 50% size.
* Reward: permanent wall hit multiplier.

**One Big Number**

* Capacity capped at 3 numbers.
* Reward: giant number payout bonus.

**Swarm Mode**

* High capacity, but merge disabled for first 5 minutes.
* Reward: low-tier number bonus.

**No Walls, Only Bumpers**

* Walls do not generate money.
* Bumpers become main income.
* Reward: bumper multiplier.

**Debt Start**

* Start with negative money.
* Reward: interest wall upgrade.

**Lightspeed Only**

* All numbers have the Photon trait from spawn.
* Requires Lightspeed Wall to generate any income.
* Reward: Light Fragment payout multiplier.

Challenges should be optional, short, and reward permanent upgrades or cosmetics.

## 16. Economy Design

### 16.1 Currency Types

#### Cash

Main run currency. Resets on prestige.

Used for:

* Adding numbers.
* Buying normal upgrades.
* Upgrading walls.
* Upgrading arena.

#### Prime Shards

First prestige currency. Earned at prestige, spent on permanent upgrades.

Used for:

* Permanent upgrades.
* Faster starts.
* Permanent multipliers.
* Unlocking new systems.

#### Light Fragments

Mid-tier persistent resource earned when numbers exceed the Lightspeed threshold (see §7.8). Does not reset on prestige.

Used for:

* Raising the Lightspeed threshold.
* Light Fragment-tier speed upgrades.
* Spawning Photon Balls.
* Unlocking the Lightspeed Wall.

#### Infinity Points

Second prestige currency (late-game only).

Used for:

* Rule-changing upgrades.
* Challenge modifiers.
* Late-game scaling.

### 16.2 Economic Tuning Goals

These are playtesting targets, not final values. Build debug tooling to measure time-to-milestone from the first playable build.

Early game:

* Player buys new `1`s every few seconds.
* First merge happens within 30 seconds.
* First `8` within 2–3 minutes.
* First Lightspeed removal (accidental) within 5–10 minutes.

Mid game:

* Player alternates between buying upgrades and increasing number tiers.
* First auto-add around 10–15 minutes.
* Player deliberately farms Light Fragments for the first time around 20–30 minutes.
* Arena fills to capacity (first prestige unlock) around 45–75 minutes.

Late game:

* Prestiges get faster.
* Build choices matter more.
* Number values become absurd.
* Player chases challenge rewards, Light Fragment upgrades, and second prestige.

## 17. Tutorialization

The tutorial should be extremely light.

### First 5 Minutes

1. Highlight Add 1 button.

   * "Buy another 1."

2. Highlight Merge button once two 1s exist.

   * "Merge matching numbers."

3. Explain wall income.

   * "Numbers earn money when they hit cash walls."

4. Explain upgrades.

   * "Spend money to make the arena stronger."

5. Explain holding buttons.

   * "Hold Add or Merge to rapid-fire."

6. Explain Lightspeed when a number first gets close to the threshold.

   * "Numbers that move too fast break the speed of light — and vanish into Light Fragments."

7. Explain prestige when arena first fills.

   * "Arena is full. You've maxed out this run. Reset for permanent power."

No giant tutorial modal. Use short prompts and highlights.

## 18. Monetization Model

Recommended:

* Premium paid game.
* No ads.
* No microtransactions.
* No gacha.

Possible later DLC:

* Cosmetic arena themes.
* Sound packs.
* Challenge pack.

Avoid making the game feel like a mobile ad farm. The paid Steam audience for incrementals is more likely to reward honesty, polish, and depth.

## 19. Steam Positioning

### 19.1 Tags

Likely tags:

* Incremental
* Clicker
* Idler
* Physics
* Casual
* Automation
* Singleplayer
* Colorful
* Relaxing
* Arcade
* Strategy
* Numbers

### 19.2 Store Page Hook

Short pitch:

> Buy bouncing numbers, merge them into bigger numbers, and turn wall hits into ridiculous amounts of money. Hold buttons to rapid-fire, fill your arena to break the speed of light, prestige for permanent power, and break the calculator.

### 19.3 Trailer Structure

A strong trailer should show:

1. One lonely `1` bouncing into a wall for `$1`.
2. Player buys more `1`s rapidly.
3. Player holds Merge and creates `2`, `4`, `8`, `16`.
4. Wall hit money explodes upward.
5. A number hits the Lightspeed threshold and dissolves into a Light Fragment burst.
6. Upgrades unlock walls, bumpers, and automation.
7. Screen fills with colorful numbers.
8. Prestige reset shows permanent upgrades.
9. End with absurd late-game chaos.

The trailer should communicate the whole loop without narration.

### 19.4 Steam Deck Verified Checklist

Valve's review process checks these. Design against them from the start rather than patching at submission.

| Requirement | Status | Notes |
| --- | --- | --- |
| Launches without keyboard/mouse | Required | All actions mappable to controller (§11) |
| Default controller config provided | Required | Ship a recommended Steam Input layout |
| All UI navigable with controller | Required | D-pad navigation for upgrade shop |
| No text too small to read at 1280×800 | Required | Min 14px equivalent (§12.1) |
| No UI cut off at 1280×800 | Required | 40px safe zone on all edges |
| No Windows-only functionality | Required | Ship native Linux build |
| Steam Overlay functional | Required | Automatic via NW.js + Steamworks init |
| No required launcher before game | Required | NW.js app launches directly |
| Gyro/touchscreen not required | Automatic | Game uses face buttons, not motion |

Submit for Deck review only after all items pass internal testing. A "Playable" rating (yellow) is acceptable at launch if controller navigation in the upgrade shop needs more polish; target Verified (green) within the first post-launch patch.

## 20. Art Direction

### 20.1 Style

Recommended style:

* Clean 2D vector/arcade look.
* Dark background.
* Bright readable numbers.
* Neon wall effects.
* Smooth particles.
* Slight retro calculator/math theme.

Avoid:

* Grainy visuals.
* Overly noisy backgrounds.
* Tiny unreadable numbers.
* Excessive particle clutter.

### 20.2 Number Colors

Values should have clear color tiers.

Example:

* 1: white
* 2: pale blue
* 4: green
* 8: yellow
* 16: orange
* 32: red
* 64: purple
* 128: cyan glow
* 256+: animated gradient
* 1K+: aura ring
* 1M+: trail effect

Numbers near the Lightspeed threshold should have a visible speed-warning effect (brightening trail, edge flicker) so players can read the risk.

### 20.3 Themes

Unlockable themes:

* Calculator
* Casino
* Neon arcade
* Space math
* Office spreadsheet
* Gold vault
* Black hole prestige

## 21. Technical Notes

### 21.1 Engine Recommendation

**Stack: Web technology wrapped in NW.js for Steam.**

Build the game in the browser, ship it as a desktop app via NW.js. NW.js ships a bundled Chromium (guaranteed WebGL 2 support on all platforms), uses a single execution context (no main/renderer process split like Electron), and has a simpler app model well-suited to games. Bundle size is roughly equivalent to Electron but the architecture is less complex.

**Web stack:**

* **Renderer:** PixiJS (WebGL 2D, excellent performance for many moving sprites)
* **Physics:** Matter.js for prototype; consider replacing with a custom lightweight bouncer (axis-aligned walls + circle collision only) for production — the physics here are simple enough that a full engine adds unnecessary overhead
* **BigNumber:** `break_infinity.js` (fast, approximate, purpose-built for incrementals) — swap to `decimal.js` only if precision bugs appear
* **State/save:** plain JSON to `localStorage` in dev; write to disk via NW.js's Node.js `fs` API in production for a reliable save file path

**NW.js + Steam integration:**

* Use `greenworks` (wraps the Steamworks SDK for NW.js/Node.js) for achievements, cloud save, and overlay
* NW.js's bundled Chromium means the Steam overlay injects correctly — test this early
* Ship a Windows build as primary; provide a Linux build for native Steam Deck support (see below)

**Steam Deck deployment:**

NW.js runs natively on Linux (x64). Two options:

1. **Native Linux build** — compile NW.js for Linux, ship as a Steam Linux build. Runs without Proton on Steam Deck. WebGL via Mesa/RADV drivers on the Deck is solid for 2D PixiJS.
2. **Windows build via Proton** — ship Windows only, Steam Deck runs it through Proton. Chromium-based apps have good Proton compatibility. Simpler to maintain one build.

Recommended: **ship both.** Linux build for Deck-native experience and Verified status; Windows build as the primary.

NW.js on Linux may require `--no-sandbox` flag in the launch options on SteamOS — add this to the Steam launch configuration and document it.

**Steam-specific integrations required:**

* Achievements → Steamworks via `greenworks`
* Cloud save → Steam Remote Storage via `greenworks`
* Overlay → automatic with NW.js + Steamworks initialized
* Input → Steam Input API for controller remapping and Steam Deck button prompts (show Deck button icons when a controller is detected)
* DRM → Steam's built-in, no extra work needed

**BigNumber requirement:** All value and money representations must use a big-number library from the start. `Number` loses precision above 2^53 (~9 quadrillion). Choose before writing any economy code — retrofitting is expensive.

### 21.2 Physics Strategy

Numbers do not collide with each other. This is intentional and significantly reduces physics complexity — each number only needs to resolve collisions with static walls and bumpers, never with other moving objects.

Recommended approach:

* Use real physics for prototype.
* Add performance caps.
* Batch money popup calculations.
* Pool all number objects and particles.
* Cap visible popups.
* Group audio events.

**Energy model decision (required before physics implementation):** Numbers must not lose energy on standard wall bounces or the arena will eventually go silent. Use fully elastic bounces (coefficient of restitution = 1.0) for wall collisions. Bumpers that "add bounce force" should apply a fixed speed delta, not a multiplier, to prevent runaway acceleration. The Lightspeed threshold acts as the de-facto speed ceiling — numbers that exceed it are removed, not clamped. Decide all of this before implementing any bumper or wall type that affects velocity.

#### 21.2.1 Performance Targets

Minimum:

* 60 FPS with 100 active numbers.

Good:

* 60 FPS with 250 active numbers.

Late-game illusion:

* If there are more than 250 logical numbers, visually compress or represent groups.

### 21.3 Save Data

Save:

* Current money.
* Current numbers and values.
* Upgrade levels.
* Prestige currencies (including Light Fragments).
* Arena layout.
* Wall modules.
* Bumper modules.
* Statistics.
* Options.
* Last save timestamp for offline progress.

Autosave:

* Every 10–30 seconds.
* On upgrade purchase.
* On prestige.
* On exit.

**Save integrity:** Incremental game economies are trivially broken by save editing. Use a lightweight checksum or hash of the save file to detect manual modification. This does not need to be unbreakable — just enough to prevent accidental corruption and flag obvious tampering. Do not use server-side save validation unless you plan to maintain a backend.

### 21.4 Offline Progress

Offline progress should be limited, not full simulation.

Formula:

* Estimate current money/sec.
* Apply offline efficiency multiplier.
* Cap at 8–12 hours by default.
* Prestige upgrades can raise cap.

Offline earnings never include merges or Lightspeed conversions. Only passive wall income is calculated.

## 22. Accessibility

Settings:

* Reduce screen shake.
* Reduce flashing.
* Reduce particles.
* Disable Lightspeed flash effect (replace with simple fade).
* Colorblind-friendly number palettes.
* Scientific notation options.
* Popup density slider.
* Audio event density slider.
* Hold toggle mode for Add/Merge.
* Large UI mode.

## 23. Risks

### 23.1 Risk: Too Simple

If the game is only Add 1 + Merge, players may feel done in 20 minutes.

Solution:

* Add wall modules, bumpers, traits, Lightspeed system, prestige, and challenges.

### 23.2 Risk: Too Chaotic

If the screen becomes unreadable, the player loses the satisfaction of seeing numbers grow.

Solution:

* Strong visual hierarchy.
* Limit active particles.
* Use trails/glows instead of giant clutter.
* Add grouping/summarized popups.

### 23.3 Risk: Physics Bugs

Numbers can get stuck or tunnel through walls at high speed.

Solution:

* Rounded corners.
* Anti-stuck nudges.
* Velocity clamps (the Lightspeed threshold serves as the upper bound).
* Continuous collision or custom wall checks for numbers near max speed.

### 23.4 Risk: Lightspeed Feels Punishing

If the player loses a high-value number to accidental Lightspeed without understanding why, it will feel like a bug, not a mechanic.

Solution:

* Clear visual warning as numbers approach the threshold (trail brightens, edge flickers).
* Tutorial prompt on first Lightspeed event.
* Light Fragment payout must be immediately visible and satisfying — the loss must feel like a reward.
* Keep early-game Lightspeed threshold high enough that it does not happen accidentally until the player has speed upgrades.

### 23.5 Risk: Bad Economy Curve

Incremental games live or die on pacing.

Solution:

* Build debug tools for tuning.
* Log time-to-milestone.
* Add cost/multiplier spreadsheet.
* Playtest first 15 minutes repeatedly.

### 23.6 Risk: Not Enough Market Differentiation

There are already idle/clicker/Plinko-style games.

Solution:

* Emphasize bouncing numbers + merging + Lightspeed + hold-to-rapid-fire tactile play.
* Make the game look great in GIFs.
* Lean into "mergeable physics calculator chaos."

## 24. Development Roadmap

### Phase 1: Core Toy Prototype

Duration: 1–2 weeks

Deliverables:

* Bouncing numbers (pass-through, no inter-number collision).
* Money walls.
* Add 1.
* Hold-to-add.
* Merge.
* Hold-to-merge.
* Lightspeed removal + basic Light Fragment counter.
* Basic upgrade values.

Exit criteria:

* It is fun to play for 10–15 minutes with no art.
* Lightspeed removal feels satisfying, not frustrating.

### Phase 2: Progression Prototype

Duration: 2–4 weeks

Deliverables:

* Upgrade shop.
* Save/load.
* Auto-add.
* Wall upgrades.
* First prestige (arena-full trigger).
* Light Fragment upgrades (Lightspeed threshold raise).
* Basic UI polish.

Exit criteria:

* It is fun to play for 1 hour.

### Phase 3: Demo Production

Duration: 4–8 weeks

Deliverables:

* Polished visuals.
* Audio.
* Tutorial prompts (including Lightspeed tutorial).
* 1 full arena.
* 30+ upgrades.
* Prestige tree preview.
* Steam page assets.
* Trailer.

Exit criteria:

* Demo gets wishlists.
* Players understand the game instantly.

### Phase 4: Full Game Production

Duration: 6–14 months depending on team size and final feature count (see §14.3 scope note)

Deliverables:

* Multiple arenas.
* Full prestige tree.
* More walls/bumpers/traits.
* Challenges.
* Achievements.
* Full balancing pass.
* Steam integration.

Exit criteria:

* 8–15 hours of meaningful progression.
* Stable save system.
* Strong trailer moments.

## 25. MVP Feature List

Must have:

* Bouncing number physics (pass-through).
* Wall income.
* Add 1 button.
* Hold-to-add.
* Merge button.
* Hold-to-merge.
* Lightspeed threshold + Light Fragments.
* Number capacity.
* Arena-full prestige unlock.
* Save/load.
* Basic prestige.

Should have:

* Auto-add.
* Wall upgrades.
* Combo meter.
* Crit payouts.
* Lightspeed Wall.
* Money popups.
* Audio juice.
* Stats panel.

Could have:

* Bumpers.
* Special walls.
* Number traits.
* Multiple arenas.
* Challenges.

Do not add before core is fun:

* Multiplayer.
* Procedural campaigns.
* Complex story.
* Full arena editor.
* Online economy.
* Cosmetic shop.

## 26. Key Design Recommendation

The strongest version of this idea is not a passive idle game. It is an **active incremental physics toy**.

The two holdable buttons are the secret sauce:

* Holding **Add 1** feels like feeding the machine.
* Holding **Merge** feels like compressing chaos into power.

Lightspeed is the third tension: filling the arena creates the prestige condition, but going too fast starts destroying numbers. The player is always managing three pressures — adding, merging, and speed — rather than just watching a number go up.

Everything else should support that fantasy.

The game should be scoped around one promise:

> **Start with one bouncing 1. End by breaking reality with trillion-value numbers ricocheting through a money reactor at the speed of light.**

## 27. Open Design Questions

These are unresolved decisions that will affect implementation. Decide before writing the relevant systems.

**1. Merge sequence: powers of 2 only, or flexible?**

The current ladder (1→2→4→8…) is clear and mirrors 2048. However, it means every number is a power of 2 — there are no "interesting" values. An alternate sequence (e.g. Fibonacci, or doubling with occasional special-tier numbers) would add variety but complicates merge matching logic and UI readability. Decision needed before building the merge system.

**2. What is the energy model for numbers?**

Fully elastic wall bounces prevent the arena from going quiet. Bumpers that add force prevent numbers from decelerating. The Lightspeed threshold is the de-facto ceiling, but numbers that approach it via speed upgrades versus bumper stacking may behave differently. Define whether bumper speed boosts are fixed deltas or multipliers, and whether each wall bounce resets the speed or preserves it. Decide before implementing any bumper or wall type that affects velocity.

**3. How are save files protected?**

A checksum approach is described in §21.3. Decide the specific implementation (CRC32, simple hash, obfuscated JSON) before shipping save code. Incremental games that launch without this get save-edit posts on day one, which skews review scores and balance perception.

**4. Does Lightspeed threshold progress persist through second prestige (Break Infinity)?**

Light Fragments persist through normal prestige. The question is whether they should also persist through Break Infinity resets, or whether Break Infinity resets everything including Light Fragments. This affects how players value Lightspeed upgrades in late game. Decide before designing the Break Infinity system.

**5. Is the Merge Bumper the only passive merge source?**

Currently the Merge Bumper (§7.7.1) is the only way merges can happen without player input. Confirm this is correct and that no other bumper, wall, or trait should trigger passive merges. Keep this list short and explicit — unexpected passive merges will confuse players who are counting pairs manually.
