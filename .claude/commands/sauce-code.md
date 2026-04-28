# sauce-code

Document the exact recipe behind a track that worked — so you can reproduce the sauce.

The rarest skill in production is not making something great.
It's knowing *why* it was great and being able to do it again.

## Context Needed

Ask for:
- Track name and project/folder location
- Approximate date made (helps find version in DAW history)
- The vibe/feeling target: what were you going for?
- What specifically worked (the drop, the vocal texture, the energy arc, etc.)
- DAW and primary instruments/plugins used

## Process

1. **Sonic fingerprint** — describe the defining sound characteristics in precise terms
   (not "it's dark" — "sub-heavy, ~60Hz center, minimal mid presence, saturated hi-hats rolled to 12kHz")

2. **Template anatomy** — document the signal chain for each key element:
   - Sound source (synth, sample, live recording)
   - Processing chain in order (compression → EQ → saturation → reverb → etc.)
   - Key parameter values for anything non-default

3. **Arrangement decisions** — document structure and why it works:
   - Section map with timestamps
   - What each transition does emotionally
   - What's deliberately absent (negative space)

4. **Prompt archaeology** (if AI-generated elements):
   - Reconstruct the Suno/Udio/other prompt or prompt chain
   - Note model version if known
   - What iterations were tried before this one

5. **The x-factor note** — one paragraph on the non-obvious decision that made it work

## Output Format

```markdown
# Sauce Code: [Track Name]

**Date:** [approximate]
**Project:** [file path or reference]
**Vibe Target:** [what you were going for]

## Sonic Fingerprint
[Precise frequency/texture/energy description]

## Signal Chain — [Element Name]
| Stage | Tool | Key Settings |
|-------|------|-------------|
| Source | [synth/sample] | [patch/sample name] |
| Compression | [plugin] | [attack/release/ratio/threshold] |
| EQ | [plugin] | [boosts/cuts] |
| Saturation | [plugin] | [drive/mode] |
| Reverb/Delay | [plugin] | [size/time/wet] |

## Arrangement Map
| Section | Bars | What It Does |
|---------|------|-------------|
| Intro | 1-8 | [emotional function] |
| Drop | 9-24 | [emotional function] |

## Prompts Used (if applicable)
[Reconstructed or exact prompts, model, iteration notes]

## The X-Factor
[The non-obvious thing that made it work]

## Reproduction Notes
[Anything that would be hard to recreate — sample clearance, one-time performance, etc.]
```

## Rules
- Be specific enough that you could recreate this from scratch in 6 months
- If exact settings are unknown, use ranges and descriptors
- Document failures too — what you tried that didn't work is valuable
- This is a technical document, not a blog post — density > readability
