# franken-tracks

Rebuild, reconstruct, and resurrect tracks from existing catalog parts.

New tracks don't require new ideas. They require new surgery.
This command maps your catalog as a parts library and engineers what can be
stitched, inverted, stripped, layered, or cannibalized into something new.

## Context Needed

Ask for:
- Source material: track name(s), project folders, or "all of catalog"
- Goal: remix / edit / mashup / interpolation / stem-rebuild / B-side recovery / snippet recovery
- What's available: stems / full mix / project file / MIDI only / reference recording only
- Intended use: release / sync pitch / live version / demo / internal experiment
- Constraints: sample clearance needed? / original collab rights? / DAW stem format?
- Target feel: closer to original / very different / genre-shifted

## Process

1. **Catalog the parts** — inventory what exists for each source track:
   - Stems available (drums / bass / melodic / vocals / FX / full mix only)
   - MIDI availability (allows pitch/harmony manipulation)
   - Project file state (open in DAW / rendered / inaccessible)
   - Quality of source (mastered / rough mix / demo / only live recording)

2. **Dissection map** — break each source into salvageable components:
   - Structural sections (intro / verse / pre / chorus / bridge / outro)
   - Strong moments vs weak moments per section
   - Unused or buried elements in the original mix
   - Elements that work better isolated than in the full mix

3. **Reconstruction options** — for each goal type, the standard approaches:

   **Remix:**
   - Strip to key elements (vocal + 1-2 musical elements)
   - Rebuild arrangement from scratch around those anchors
   - New BPM, new key (pitch-shift stems), new genre frame

   **Edit:**
   - Tighten: cut intro, cut an entire verse, remove dead air
   - Extend: loop a strong section, add outro, alternate ending
   - Radio edit: 3-min version from 5-min track

   **Mashup:**
   - Identify BPM-compatible sources (or time-stretch to match)
   - Map structural overlaps (chorus A over verse B)
   - Key compatibility (same key, relative major/minor, or intentional clash)

   **Interpolation:**
   - Re-record the hook in new style (new instrumentation, new artist)
   - Preserve melodic contour, swap everything else

   **B-side recovery:**
   - Unfinished tracks that have one strong section
   - Extract, loop, build around that one section

4. **New arrangement sketch** — propose the new structure with source timestamps

5. **Clearance and rights flags** — call out any samples that need clearance

## Output Format

```markdown
# Franken-Track Report: [New Track Name / Working Title]
**Source(s):** [track A, track B] | **Goal:** [remix/edit/mashup/etc.]
**Stems available:** [yes/no/partial] | **Project file:** [open/rendered/lost]

## Parts Inventory

### [Source Track A]
| Section | Timestamp | Usable? | Notes |
|---------|-----------|---------|-------|
| Intro | 0:00-0:16 | Yes | Hook buried in intro — extract |
| Verse 1 | 0:16-0:48 | Partial | Drums only — melody weak |
| Chorus | 0:48-1:20 | Yes | Strongest section |
| Bridge | 2:10-2:42 | No | Flat, cut entirely |

### [Source Track B] (if applicable)
[Same breakdown]

## Dissection Findings
- **Hidden gem:** [section/element that works better extracted]
- **Weakest link:** [section to cut or avoid]
- **Transplant candidate:** [element from Track A that could work in Track B's structure]

## Reconstruction Blueprint

### Proposed New Structure
| Section | Source | Timestamps | What Changes |
|---------|--------|-----------|-------------|
| Intro | Track A | 0:48-1:04 (chorus loop) | New drums under it |
| Drop | Track B | 1:30-2:00 | Pitch-shifted +2 semitones |
| Outro | New | — | Build from isolated piano stem |

**New BPM:** [X] (original: [Y], time-stretch: [Z%])
**New Key:** [X] (original: [Y], pitch shift: [±N semitones])

## Production Notes
[Specific instructions for the DAW session: routing, time-stretch algorithm,
stem processing, how to handle format mismatches]

## Clearance Flags
- 🔴 **[Element]:** Original sample from [source] — clearance required before release
- 🟡 **[Element]:** Self-composed, check co-write splits if collaborators involved
- ✅ **[Element]:** Fully owned, no clearance needed

## Alternative Reconstructions
1. [Approach B — different goal or different part combination]
2. [Approach C — more radical rebuild]

## Recommended Next Step
[Specific first action: open project, contact collaborator, send to mix engineer, etc.]
```

## Rules

- Never assume stems exist — confirm before designing the reconstruction around them
- If only a full mix is available, flag that quality degradation is real and separation tools (RipX / Spleeter / iZotope RX) are imperfect
- Clear any interpolated melodies if the source is commercially released — even self-referential interpolation can trigger publisher claims
- The best remix often uses 10% of the original — stripping down is a creative act
- Mark every clearance flag before the track leaves as a demo — not after it's placed
- "Vibe salvage" is valid: if a track failed but one 4-bar loop is fire, that loop deserves a new home
