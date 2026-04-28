# verse-vaults

Manage lyrics with full version control, tagging, and resurrection intelligence.

Every line you killed might be the hook of the next track.
Every draft holds a ghost of the final. Version it all.

## Context Needed

Ask for:
- Track/project name
- Current lyrics (paste raw text)
- Stage: brainstorm | draft | refined | final | shelved
- Mood/energy tags for this piece
- Any lines flagged as "might use elsewhere"

## Process

1. **Parse and structure** the raw text:
   - Identify sections (verse, chorus, bridge, hook, pre, outro, ad-lib)
   - Flag incomplete lines with [PLACEHOLDER]
   - Flag strong candidates with [KEEPER]
   - Flag potential cuts with [MAYBE CUT]

2. **Version stamp** — create a dated snapshot entry

3. **Tag analysis** — extract and suggest tags:
   - Theme tags (love, loss, grind, ascension, chaos, etc.)
   - Sonic fit tags (which BPM ranges, energy levels this would suit)
   - Mood tags (introspective, aggressive, vulnerable, triumphant)

4. **Line archaeology** — surface any previously shelved lines from context
   that could fit here

5. **Killed lines vault** — isolate any cut lines for the resurrection archive

## Output Format

```markdown
# Verse Vault: [Track Name]
**Version:** [YYYY-MM-DD]-v[N]
**Stage:** [brainstorm|draft|refined|final|shelved]
**Tags:** [theme], [sonic fit], [mood], [energy]

## Structured Lyrics

### [Section Name]
[Line] [KEEPER/MAYBE CUT/PLACEHOLDER]
[Line]
...

## Version Notes
[What changed from last version, why]

## Killed Lines Archive
> [Line that was cut]
> *Cut because:* [reason] | *Potential future use:* [context]

## Tags Applied
- Theme: [list]
- Sonic fit: [BPM range, energy level]
- Mood: [list]

## Open Slots
[PLACEHOLDER] in [Section] — needs: [description of what's missing]
```

## Rules
- Never delete — always archive to Killed Lines
- Every version gets a timestamp and a brief note on what changed
- Flag lines that are strong but don't fit this track for future use
- If a section feels forced, say so explicitly — better to name it than ignore it
