# AGENTS.md

> Architecture, agent roster, and extension guide for the Quirk OS AI layer.

This repository ships two coupled AI systems: the **voice layer** (`src/lib/ai/`) that speaks
to users, and the **data-engine agents** (`src/lib/quirk/agents/`) that process assets.
They are intentionally decoupled — they share data (annotations, scores) but never import
each other.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Voice layer  src/lib/ai/                                       │
│  Persona (frozen, cached) + Register (per-moment tonal mode)    │
│  generateText() / streamText() / createStream()                 │
└─────────────────────────────────────────────────────────────────┘
                         ↕ data only (scores, annotations)
┌─────────────────────────────────────────────────────────────────┐
│  Data-engine agents  src/lib/quirk/agents/                      │
│  Archivist Goblin → Curator Imp → Diff Witch                    │
│                   → Lab Rat King → Pipeline Foreman             │
└─────────────────────────────────────────────────────────────────┘
         ↕ QuirkScores (shared vocabulary, src/lib/quirk/scoring.ts)
┌─────────────────────────────────────────────────────────────────┐
│  Goldilocks gate  src/lib/quirk/goldilocks.ts                   │
│  too_cold | just_right | too_hot → controls auto-mint           │
└─────────────────────────────────────────────────────────────────┘
```

The asset lifecycle that agents serve:

```
capture → annotate → mutate → diff → experiment → promote → publish
   │          │                │          │            │
Archivist  Curator          Diff      Lab Rat      Foreman
 Goblin     Imp             Witch      King       (pipelines)
```

---

## Voice Layer — `src/lib/ai/`

### Client (`client.ts`)

The Anthropic client is a lazy singleton — it throws at first call if
`ANTHROPIC_API_KEY` is absent, so the app boots and validates without secrets.

```typescript
import { getAnthropic, assertAiConfigured, DEFAULT_MODEL } from "@/lib/ai";
// DEFAULT_MODEL = "claude-opus-4-7"
// assertAiConfigured() — call at startup in features that require the key
```

### Personas (`personas.ts`)

A persona is a **frozen identity prompt** — it is the cacheable prefix that
stays constant across requests. One persona ships: `"house"`. Add more by
extending `PersonaName` and the `PERSONAS` map.

```typescript
import { getPersona, type PersonaName } from "@/lib/ai";

// Current personas: "house"
const persona = getPersona("house");
// persona.system — the prompt text, sent with cache_control: ephemeral
```

The `"house"` persona is the Quirk Systems baseline voice:
> Sharp, concise, quietly funny. Honest about tradeoffs. No filler.

### Registers (`registers.ts`)

A register is a **per-moment tonal mode** layered over the persona. Six ship:

| Register | Directive intent | Animation motion | Use for |
|---|---|---|---|
| `straight` | Neutral, professional | `calm` | Default / informational |
| `deadpan` | Dry, understated | `snappy` | Comedic restraint |
| `warm` | Encouraging, acknowledges intent | `calm` | Onboarding, success moments |
| `hype` | High-energy, punchy | `snappy` | Launches, feature reveals |
| `mock_panic` | Playfully alarmed, genuinely clear | `frantic` | Destructive / risky actions |
| `swoon` | Theatrical, relishes craft | `swoon` | Elegant solution moments |

```typescript
import { getRegister, registerNames, type RegisterName } from "@/lib/ai";

const reg = getRegister("mock_panic");
// reg.directive — appended after the cached persona prefix
// reg.animation  — AnimationVocabulary the UI keys motion off
```

### Generating Text (`generate.ts`)

```typescript
import { generateText, streamText, createStream } from "@/lib/ai";
import type { GenerateOptions } from "@/lib/ai";

// One-shot
const text = await generateText("Describe this asset in one sentence.", {
  persona: "house",       // default: "house"
  register: "hype",       // default: "straight"
  model: "claude-opus-4-7", // default: DEFAULT_MODEL
  maxTokens: 200,          // default: 1024
  effort: "low",           // "low" | "medium" | "high" | "xhigh" | "max"
  thinking: false,         // adaptive thinking — off by default
});

// Streaming (SSE / typing effect)
for await (const chunk of streamText(prompt, { register: "swoon" })) {
  process.stdout.write(chunk);
}

// Raw MessageStream for advanced use (events, finalMessage())
const stream = createStream(prompt, options);
```

**Thinking note:** `thinking: true` maps to adaptive thinking. It is only
supported on Opus 4.6+, Sonnet 4.6+, and the Claude 5 family. Passing it to
a legacy model throws immediately rather than sending a malformed request.

### Prompt Caching

`composeSystem()` places a `cache_control: { type: "ephemeral" }` breakpoint
at the end of the persona block. The register directive follows it, uncached,
so it varies per-request without invalidating the cached prefix. Caching
activates once the cached prefix exceeds ~4096 tokens; grow the persona with
few-shot exemplars to reach that threshold.

### Animation Integration (`animation.ts`)

```typescript
import { animationFor, type AiState } from "@/lib/ai";

const state: AiState = { phase: "summoning", register: "hype" };
const vocab = animationFor(state);
// vocab.waitingCaption — shown while waiting for first token
// vocab.motion         — "calm" | "snappy" | "frantic" | "swoon"
// vocab.intensity      — 0..1 motion intensity
// vocab.enterMs / exitMs — animation timing
```

The `AiState` lifecycle: `idle → summoning → streaming → settled | stumbled`.
Map each phase to your Framer Motion / CSS values; the vocabulary is the
vocabulary, not an implementation.

---

## Data-Engine Agents — `src/lib/quirk/agents/`

All five agents are **pure functions** (or thin async wrappers over the DB).
None calls the Anthropic API — they run on heuristics and scoring so they
are fast, deterministic, and cheaply testable. Import from the barrel:

```typescript
import {
  archivistIngest,
  curatorPropose,
  diffWitchCompare,
  labRatGenerate,
  pickWinner,
  foremanRun,
  isHumanGate,
} from "@/lib/quirk/agents";
```

### Archivist Goblin

**Role:** Ingest messy unstructured input → clean, typed, versioned v1 snapshot.

```typescript
import { archivistIngest, type IngestInput } from "@/lib/quirk/agents";

const result = archivistIngest({
  title: null,           // derived from rawText if absent
  assetType: null,       // detected from content/URL/path hint
  sourceUrl: "https://…",
  storagePath: null,
  rawText: "…",
  metadata: {},
});
// result: { title, assetType, rawText, metadata, snapshot }
```

Metadata written by the Goblin always includes `ingested_by: "archivist_goblin"`,
`detected_type`, `word_count`, `has_source`, and `captured_at`.

### Curator Imp

**Role:** Read an asset → propose tags, themes, persona match, spawn paths, quality, risk.
Proposals carry confidence scores; users approve/edit/reject before persistence.

```typescript
import { curatorPropose } from "@/lib/quirk/agents";
import type { ProposedAnnotation } from "@/lib/quirk/agents";

const proposals: ProposedAnnotation[] = curatorPropose({
  rawText: "…",
  assetType: "prompt",
});
// proposals[]: annotationType, label, value, confidence
// annotationTypes: "tag" | "rating" | "comment" | "persona_fit"
//                | "spawn_path" | "risk" | "quality" | "theme"
```

The six scoring personas the Imp maps against:
`The Hustler` (commercial), `The Trickster` (funny), `The Goblin` (weirdness),
`The Romantic` (emotionalCharge), `The Showrunner` (hookDensity),
`The Oracle` (spawnPotential).

### Diff Witch

**Role:** Semantic diff between two text versions — meaning/tone/score shift,
not character-level noise.

```typescript
import { diffWitchCompare } from "@/lib/quirk/agents";
import type { DiffResult } from "@/lib/quirk/agents";

const diff: DiffResult = diffWitchCompare({
  fromText: previousVersion,
  toText: currentVersion,
});
// diff: { summary, additions[], removals[], meaningShift, scoreDelta }
// scoreDelta is per-axis QuirkScores delta (to − from)
```

`meaningShift` provides human-readable descriptions of tone drift, persona drift,
hook strength, and emotional charge shifts.

### Lab Rat King

**Role:** Generate N scored variants of an input — always including an unmutated
control as run 0 — and surface the winner.

```typescript
import { labRatGenerate, pickWinner } from "@/lib/quirk/agents";
import type { VariantProposal } from "@/lib/quirk/agents";

const variants: VariantProposal[] = labRatGenerate({ text: "…", count: 5 });
// variants[]: { label, prompt, output, scores: QuirkScores, score }
// count is clamped 2..11; default 3

const winnerIdx = pickWinner(variants); // index of highest-scoring variant
```

Built-in mutations: `punch up the hook`, `make it commercial`, `weirder`,
`tighter`, `more emotional`. Mutations cycle if `count > 5`.

### Pipeline Foreman

**Role:** Walk an ordered list of `QuirkPipelineStep` rows, execute each
automatable step via a caller-provided executor, and halt at human-gate steps.

```typescript
import { foremanRun, isHumanGate } from "@/lib/quirk/agents";
import type { ForemanResult, StepExecutor } from "@/lib/quirk/agents";

const executor: StepExecutor = async (step) => {
  // dispatch to the right agent by step.agentRole
  return { message: `${step.stepName} completed.` };
};

const result: ForemanResult = await foremanRun(steps, {
  execute: executor,
  startAfter: lastCompletedStepKey, // resume mid-pipeline
});
// result: { logs: PipelineLogEntry[], status: "completed"|"paused"|"failed", currentStep }
```

A step is a human gate when `step.stepKey` is `"review"` or `"approve"`, or
when `step.agentRole` is null. The Foreman halts and returns `status: "paused"` —
the UI resumes the pipeline after human action.

---

## Scoring Engine — `src/lib/quirk/scoring.ts`

All agents speak the same 7-axis vocabulary. Scores are deterministic, pure, and
LLM-free — no API call required.

```typescript
import { scoreText, scoreDelta, overallScore, type QuirkScores } from "@/lib/quirk/scoring";

const scores: QuirkScores = scoreText("Your text here");
// {
//   hookDensity:    0..1  — question density, opener patterns, short punchy sentences
//   commercial:     0..1  — buy/sell/price/offer keyword density
//   funny:          0..1  — goblin/chaos/absurd keyword density + exclamation ratio
//   weirdness:      0..1  — vocabulary uniqueness + funny signal
//   emotionalCharge: 0..1 — love/hate/grief/rage keyword density
//   spawnPotential: 0..1  — length + uniqueness + hooks → how remixable this is
//   quality:        0..1  — composite headline score
// }

const delta = scoreDelta(fromScores, toScores); // per-axis (to − from)
const headline = overallScore(scores);          // = scores.quality
```

---

## Goldilocks Gate — `src/lib/quirk/goldilocks.ts`

The gate reads a score profile and decides whether an asset should auto-mint a
1/1 offer. **Pure and deterministic** — same scores, same verdict every time.

```typescript
import { readGoldilocks, type GoldilocksReading } from "@/lib/quirk/goldilocks";

const reading: GoldilocksReading = readGoldilocks(scores);
// reading.verdict: "too_cold" | "just_right" | "too_hot"
// reading.heat:    0..1 composite intensity
// reading.reasons: string[] — human-readable rationale for the verdict
```

| Verdict | Condition | Action |
|---|---|---|
| `too_cold` | `quality < 0.25` or no pulse (`hookDensity` and `emotionalCharge` both `< 0.15`) | No mint; promote still succeeds |
| `too_hot` | `weirdness > 0.85` outrunning `quality < 0.5`, or `emotionalCharge > 0.9` with `commercial < 0.2` | Hold for human curator |
| `just_right` | Everything else | Auto-mint via `mintOffer()` |

`null` scores (media assets with no text signal) pass as `just_right` — gate
defers to curation.

**Manual override:** `POST /api/offers` bypasses the gate entirely. Heuristics
drive, humans overrule.

---

## Offers — `src/lib/quirk/offers.ts`

The offer system is the 1/1 drop layer. One offer per asset, ever; the unique
constraint on `quirk_offers.asset_id` makes re-minting impossible.

```typescript
import { mintOffer, claimOffer, retireOffer, listOffers, getOffer } from "@/lib/quirk/offers";

// Mint (persona-voiced pitch if ANTHROPIC_API_KEY is set; fallbackPitch() otherwise)
const offer = await mintOffer({ assetId: "…", register: "hype" });
// Throws OfferAlreadyMintedError if the asset already has an offer

// Claim — atomic conditional UPDATE; returns null if someone beat you to it
const claimed = await claimOffer({ offerId: "…", userId: "…" });

// Retire — curatorial pull-back; only open offers can be retired
const retired = await retireOffer(offerId);
```

`promoteRun()` in `experiments.ts` is the auto-mint path: it runs Goldilocks
and calls `mintOffer()` best-effort if the verdict is `just_right`. Promotion
never fails because minting did.

---

## Adding a New Agent

1. **Add a role** to `AgentRole` in `src/lib/quirk/agents/types.ts` and update
   `AGENT_LABELS`.
2. **Create the module** at `src/lib/quirk/agents/<name>.ts`. Export the main
   function from `src/lib/quirk/agents/index.ts`.
3. **Use `QuirkScores`** as the shared vocabulary — `scoreText()` is the entry point.
4. **Keep it pure** where possible. DB calls go in the domain module
   (`src/lib/quirk/`), not the agent. Agent modules own lifecycle logic, not routes.
5. **Wire to the Foreman**: add a `stepKey` / `agentRole` pairing in the
   pipeline schema and dispatch in your `StepExecutor`.
6. **Write a unit test** at `src/lib/quirk/agents/<name>.test.ts` — agents are
   pure functions and trivially testable without mocks.

---

## Adding a New Persona or Register

**Persona** (`src/lib/ai/personas.ts`): extend `PersonaName`, add a `Persona`
object with a `system` prompt, update `PERSONAS`. Keep the system prompt
stable across requests — it is the cached prefix; volatile content belongs in
a register directive.

**Register** (`src/lib/ai/registers.ts`): extend `RegisterName`, add a
`Register` object with a `directive` and `AnimationVocabulary`. Keep directives
short; they are not cached.

---

## Model Selection

| Task | Model | Why |
|---|---|---|
| Offer pitch copy, long-form generation | `claude-opus-4-7` (default) | Best voice quality |
| Fast conversational responses | `claude-sonnet-4-6` | Speed + quality balance |
| Simple extraction, classification | `claude-haiku-4-5` | Fast + cheap |
| Tasks needing extended reasoning | Any Opus 4.6+ or Sonnet 4.6+ with `thinking: true` | Adaptive thinking |

Override per-call via `GenerateOptions.model`. The default (`DEFAULT_MODEL =
"claude-opus-4-7"`) automatically applies `effort: "low"` for latency; callers
that override the model must pass `effort` explicitly if they want it.

---

## Resources

- [Anthropic Agent Docs](https://docs.anthropic.com/en/docs/build-with-claude/agents)
- [MCP Spec](https://modelcontextprotocol.io)
- [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code)
- [Anthropic SDK — TypeScript](https://github.com/anthropics/anthropic-sdk-typescript)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — module boundaries and asset lifecycle
- [docs/recommendations/ai/](docs/recommendations/ai/) — prompt patterns, model selection, evals
