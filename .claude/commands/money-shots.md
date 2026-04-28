# money-shots

Track where your money lives, where it's leaking, and where it's sleeping unclaimed.

Revenue intelligence for independent artists who'd rather make music than read royalty statements.
This command maps your income architecture and finds the gaps you're not collecting.

## Context Needed

Ask for:
- Current release catalog (titles, release dates, platforms live)
- Distributor(s) in use (DistroKid / TuneCore / CD Baby / Amuse / other)
- PRO registration status: ASCAP / BMI / SESAC / SOCAN / PRS / unregistered
- Sync licensing: any placements, any pitching activity, any library registrations
- Publishing: self-published / admin deal / co-pub deal / full deal
- Merchandise: active / inactive / platform (Printful / Shopify / Bandcamp / other)
- Live performance income: touring / ticketed shows / none
- Any brand deals, placements, or licensing to date

## Process

1. **Revenue map** — catalog all current income streams and status:
   - Master royalties (streaming + downloads + sync masters)
   - Publishing royalties (performance + mechanical + sync pub side)
   - Live/touring
   - Merchandise
   - Direct fan monetization (Bandcamp / Patreon / Substack)
   - Brand / sync / licensing
   - Teaching / coaching / production services

2. **Leak detection** — identify uncollected or undercollected income:
   - PRO registration gaps (works not registered = performance royalties gone)
   - Mechanical royalties: are you collecting via MLC (US) or Harry Fox / Songtrust equivalent?
   - YouTube Content ID: is your catalog claimed? Are you collecting AdSense?
   - SoundExchange (digital performance / non-interactive streaming for featured artists)
   - International sub-publishing: are your works registered in foreign PROs?

3. **Benchmark analysis** — what's the earning potential vs actual:
   - Streaming payout rate by tier (per 1k streams by platform)
   - Estimated monthly royalty potential at current stream count
   - Comparison against industry median for catalog size

4. **Opportunity stack ranking** — highest ROI moves right now:
   - What registration costs $0 and recovers real money immediately?
   - What platform is underutilized relative to your audience?
   - What licensing category fits your catalog style?

5. **90-day action plan** — concrete steps with effort/return estimates

## Output Format

```markdown
# Money Shot Report: [Artist Name]
**Date:** [date] | **Catalog Size:** [N tracks] | **Distributor:** [name]

## Revenue Map
| Stream | Status | Est. Monthly | Notes |
|--------|--------|-------------|-------|
| Streaming (masters) | Active | $[X] | Via [distributor] |
| Performance royalties | [Registered/Not] | $[X] | [PRO name] |
| Mechanical royalties | [Collecting/Not] | $[X] | MLC / Songtrust |
| YouTube Content ID | [Claimed/Not] | $[X] | |
| SoundExchange | [Registered/Not] | $[X] | |
| Sync (masters + pub) | [Active/Inactive] | $[X] | |
| Merch | [Active/Inactive] | $[X] | |
| Live | [Active/Inactive] | $[X] | |
| Direct fan | [Active/Inactive] | $[X] | |
| **Total estimated** | | **$[X]/mo** | |

## Leak Report
- 🔴 **[Stream]:** [what's uncollected and why] — Est. lost: $[X]/yr
- 🟡 **[Stream]:** [underperforming] — Gap: [reason]
- 💡 **[Opportunity]:** [untapped stream] — Est. upside: $[X]/yr

## Registrations Needed
| Action | Platform/PRO | Effort | Est. Recovery |
|--------|-------------|--------|--------------|
| Register works | ASCAP/BMI | 1hr | $[X]/yr |
| Claim YouTube | Content ID | 30min | $[X]/yr |
| Register | SoundExchange | 1hr | $[X]/yr |
| Mechanical via | Songtrust / MLC | 1hr | $[X]/yr |

## Streaming Benchmark
| Platform | Your Streams/Mo | Est. Payout | Rate Used |
|----------|----------------|-------------|-----------|

## 90-Day Action Plan
1. [Day 1-7]: [Action] — [what it unlocks]
2. [Day 8-30]: [Action] — [what it unlocks]
3. [Day 31-60]: [Action] — [what it unlocks]
4. [Day 61-90]: [Action] — [what it unlocks]

## Sync Opportunity Fit
[Based on catalog style: which sync categories, libraries, or supervisors to target]
```

## Platform Payout Reference (approximate 2024-2025)
| Platform | Per 1k Streams |
|----------|---------------|
| Tidal | ~$4.00 |
| Apple Music | ~$3.50 |
| Spotify | ~$3.00-4.00 |
| Amazon Music | ~$4.00 |
| YouTube Music | ~$2.00 |
| YouTube (Content ID) | ~$1.00-2.00 |
| Pandora | ~$1.30 |
| Deezer | ~$2.50 |

## Rules

- Every stream that isn't registered is money you've already earned but can't collect
- PRO registration is free — not registering is a choice to leave royalties on the table
- Sync is slow money that compounds: one placement can pay for years
- Distribution deals that take publishing cuts are traps — flag them explicitly
- Never quote specific income without noting stream count and payout rate variance
- Mechanical royalties in the US (post-2021) go through the MLC if unclaimed — check before assuming it's gone
