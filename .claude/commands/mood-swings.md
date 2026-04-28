# mood-swings

Map the emotional arc of an album, EP, or playlist — so the whole body of work breathes.

A tracklist is not a playlist. A playlist puts songs together.
A tracklist architects a journey. This command designs the journey.

## Context Needed

Ask for:
- Project name and format (album / EP / mixtape / playlist)
- Track listing (names, rough duration, optional: brief mood descriptor per track)
- Intended listener context (headphones alone / party / driving / workout / background)
- Any anchoring decisions already made (opener, closer, single placement)

## Process

1. **Plot emotional coordinates** for each track on two axes:
   - Energy: 1 (minimal/ambient) → 10 (peak/maximal)
   - Valence: 1 (dark/heavy) → 10 (euphoric/bright)

2. **Draw the arc** — what is the emotional trajectory across the full runtime?
   Common arc types:
   - Mountain: build → peak → resolution
   - Valley: normal → dark → redemption
   - Sine wave: oscillating tension and release
   - Flat + spike: steady state with one climactic moment
   - Descent: sustained mood deepening

3. **Identify structural weaknesses:**
   - Energy plateaus (same level for 3+ consecutive tracks)
   - Jarring transitions (too much delta between adjacent tracks)
   - Missing emotional beats (arc calls for something that isn't there)
   - Wrong opener or closer (first and last are the most remembered)

4. **Transition map** — for each adjacent pair, how does the gap feel?

5. **Sequencing recommendations** — reorder, add, or cut to fix weaknesses

## Output Format

```markdown
# Mood Map: [Project Name]

**Format:** [Album/EP/Mixtape] | **Runtime:** [total] | **Context:** [listener situation]

## Emotional Coordinates
| # | Track | Energy (1-10) | Valence (1-10) | Mood Tag |
|---|-------|---------------|----------------|----------|
| 1 | [name] | X | X | [tag] |

## Arc Type
[Identified arc + one-sentence description of the emotional journey]

## Arc Visualization
```
Energy
10 |         ∧
   |        / \
 5 |  ∧____/   \____
   | /               \
 1 |/                 \_
    T1  T2  T3  T4  T5  T6
```

## Transition Map
| Gap | Delta E | Delta V | Transition Feel | Flag? |
|-----|---------|---------|-----------------|-------|
| T1→T2 | +2 | -1 | smooth step up | |
| T2→T3 | -5 | -4 | JARRING | ⚠️ |

## Structural Weaknesses
- ⚠️ [Weakness]: [tracks affected] — [recommendation]

## Sequencing Recommendation
[Proposed new order with rationale, or "current order works, adjust T3"]

## Opener Assessment
[Why the current opener works or doesn't — first track sets the entire frame]

## Closer Assessment
[Why the current closer works or doesn't — last track is the aftertaste]
```

## Rules
- Score each track before making sequencing judgments — don't go off vibes alone
- The opener and closer are worth 3x the middle tracks in impact
- A good arc has at least one surprise and at least one moment of rest
- If a track doesn't serve the arc, say so clearly — even if it's the best track
