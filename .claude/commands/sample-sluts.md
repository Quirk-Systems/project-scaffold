# sample-sluts

Build, tag, and retrieve your sound library with surgical intelligence.

Your sounds are already there. You're just not finding them.
This command turns a folder of files into a queryable creative database
— so you pull the right texture in 30 seconds instead of 30 minutes.

## Context Needed

Ask for:
- Library scope: samples / loops / one-shots / presets / recorded stems / all
- DAW: Ableton / FL Studio / Logic / Bitwig / Reaper / other
- Current organization method (folder names, naming conventions, or "none")
- Approximate library size (folder path or count if known)
- Primary use case: beat making / sound design / scoring / live performance
- What's currently broken: can't find things / duplicates / no BPM tags / wrong folder structure

## Process

1. **Audit the current library** — understand what exists and how it's structured:
   - Surface file count, format types, folder depth
   - Identify naming patterns (or chaos)
   - Find duplicates, unnamed files, misplaced sounds

2. **Design the taxonomy** — build a tagging and folder system that matches how you search:
   - Primary sort: by TYPE (kicks / snares / bass / melodic / FX / vocals / loops / stems)
   - Secondary sort: by MOOD or ENERGY (dark / bright / aggressive / chill)
   - Tertiary: BPM and key tags where applicable
   - File naming convention: `[type]_[descriptor]_[BPM]_[key]_[source].ext`
     Example: `loop_chopped-soul_090bpm_Gmin_vinyl.wav`

3. **Tagging protocol** — for each sound category, define the metadata fields:
   - One-shots: type / sub-type / character (punchy/roomy/bright/dark) / processing state
   - Loops: BPM / key / type / energy / vibe
   - Presets: synth / category / mood / sonic character

4. **DAW integration** — how to surface this in your workflow:
   - Ableton: Pack + User Library + search tags + hot-swap workflow
   - FL Studio: Browser folders + FL Cloud + tag search
   - Logic: Loop Browser + Smart Folders
   - DAW-agnostic: Splice Desktop / Looperman local / BOME / XO

5. **Curation recommendations** — kill the dead weight:
   - Sounds you've never used in 12+ months: archive folder
   - Duplicates at different bit depths: keep highest quality, archive rest
   - Broken/corrupt files: quarantine before delete

## Output Format

```markdown
# Sample Library Report: [Artist/Project Name]
**Date:** [date] | **DAW:** [name] | **Library size:** [N files / X GB]

## Current State Audit
| Category | File Count | Issues Found |
|----------|-----------|-------------|
| Kicks | [N] | [naming chaos / duplicates / untagged] |
| Snares | [N] | |
| Loops | [N] | [no BPM tags] |
| Presets | [N] | [scattered folders] |

## Proposed Folder Structure
```
/Samples
  /kicks
    /punchy
    /roomy
    /processed
  /snares
    /tight
    /open
    /clap
  /hats
    /closed
    /open
    /pedal
  /percs
  /bass
    /sub
    /mid
    /top
  /loops
    /drums
    /melodic
    /bass
    /vocal-chops
  /one-shots
    /FX
    /foley
    /sweeps
  /presets
    /[synth-name]
  /stems
    /[project-name]
  /_archive
```

## File Naming Convention
`[type]_[descriptor]_[BPM]_[key]_[source-or-pack].ext`

Examples:
- `kick_sub-punch_140bpm_analog-heat.wav`
- `loop_jazz-break_092bpm_Amin_crate-dig.wav`
- `preset_pad-dark_juno106_lush.fxp`

## Tagging Schema
| Sound Type | Required Tags | Optional Tags |
|-----------|--------------|--------------|
| Loops | BPM, Key, Type | Mood, Energy, Source |
| One-shots | Type, Sub-type | Character, Processing |
| Presets | Synth, Category | Mood, Sonic character |

## Curation Recommendations
- Archive: [N files] older than 12 months, unused
- Duplicate candidates: [list or pattern]
- Priority tagging queue: [most-used folder with least tags]

## DAW Integration Steps
[Specific steps for [DAW]: how to point browser, create collections, enable search]

## Quick Retrieval Workflow
1. [How to search by BPM in DAW]
2. [How to filter by mood/vibe tag]
3. [Hot-swap workflow for fast auditioning]
```

## Rules

- Tagging is only worth doing if the search actually works in your DAW — test before committing
- A flat folder of 500 well-named files beats 10 nested folders of unnamed files every time
- Never delete originals until the archive has been live for 30 days and you haven't touched them
- BPM and key metadata on loops is the highest-value tag — prioritize it
- The goal is: heard a vibe → have the sound in the session in under 60 seconds
- If the DAW's browser sucks, recommend a third-party tool (XO, Looperman, Splice Desktop)
