# Model Selection

> Wrong model = wrong tradeoffs. Right model = fast + cheap + good enough.

---

## Current Claude Models

| Model | ID | Best For | Context |
|-------|-----|---------|---------|
| Claude Opus 4.6 | `claude-opus-4-6` | Complex reasoning, hard problems | 200k |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Most tasks, code, tool use | 200k |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fast extraction, classification | 200k |

---

## Decision Framework

```
Is the task complex reasoning, planning, or architecture?
  → Opus 4.6

Is the task code generation, refactoring, or agentic tool use?
  → Sonnet 4.6 (best speed/quality balance for most tasks)

Is the task extraction, classification, summarization, or simple Q&A?
  → Haiku 4.5 (10x cheaper, fast enough for these tasks)

Do you need the absolute best output regardless of cost?
  → Opus 4.6

Is this a high-volume pipeline where cost matters?
  → Start with Haiku, upgrade to Sonnet only where quality is insufficient
```

---

## Task → Model Mapping

| Task | Recommended Model | Why |
|------|------------------|-----|
| Architecture design, trade-off analysis | Opus 4.6 | Needs deep reasoning |
| Feature implementation (non-trivial) | Sonnet 4.6 | Code quality + speed |
| Bug fix (small, contained) | Sonnet 4.6 | Fast, accurate enough |
| Code review | Sonnet 4.6 | Good at spotting issues |
| Test generation | Sonnet 4.6 | Reliable output format |
| Documentation generation | Haiku 4.5 | Extraction task, low complexity |
| Summarization | Haiku 4.5 | Pattern match, no reasoning needed |
| Classification / labeling | Haiku 4.5 | High throughput, simple task |
| JSON extraction from unstructured text | Haiku 4.5 | Fast, cheap, accurate |
| Complex debugging across many files | Opus 4.6 | Needs to hold full context + reason |
| Multi-step agentic task | Sonnet 4.6 | Reliable tool use, reasonable cost |
| Subagent in parallel pipeline | Haiku 4.5 | Many parallel tasks → cost matters |

---

## Context Window Usage

200k tokens for all current models. Practical limits:

| Content Type | Approximate Token Count |
|-------------|------------------------|
| 1 line of code | ~3-5 tokens |
| 100 lines of code | ~400-600 tokens |
| 1000 lines of code | ~4,000-6,000 tokens |
| Full 300-line file | ~1,500-2,000 tokens |
| 10 moderate files | ~15,000-25,000 tokens |
| Full small codebase (~50 files) | ~75,000-150,000 tokens |

Rule: Don't send more context than the model needs. Irrelevant context degrades focus.

---

## Cost Estimation (Approximate)

```typescript
// Rough cost estimator (prices change — check docs.anthropic.com)
function estimateCost(inputTokens: number, outputTokens: number, model: string) {
  const pricing = {
    "claude-opus-4-6":    { input: 15, output: 75  }, // per million tokens
    "claude-sonnet-4-6":  { input: 3,  output: 15  },
    "claude-haiku-4-5-20251001": { input: 0.25, output: 1.25 },
  };

  const p = pricing[model];
  const cost = (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
  return `$${cost.toFixed(4)}`;
}

// Example: 1000 requests, 2k tokens in, 500 tokens out
// Haiku:  ~$0.625
// Sonnet: ~$6.75
// Opus:   ~$45
```

For agentic tasks multiply by average number of turns.

---

## Switching Models in Code

```typescript
const MODEL_CONFIG = {
  planning: "claude-opus-4-6",
  coding: "claude-sonnet-4-6",
  extraction: "claude-haiku-4-5-20251001",
} as const;

type TaskType = keyof typeof MODEL_CONFIG;

async function runWithModel(task: string, taskType: TaskType) {
  return client.messages.create({
    model: MODEL_CONFIG[taskType],
    max_tokens: 4096,
    messages: [{ role: "user", content: task }],
  });
}
```

---

## When to Upgrade Model

Upgrade from Haiku → Sonnet when:
- Output quality is consistently insufficient for the task
- The model misses edge cases that matter
- Complex instructions aren't being followed

Upgrade from Sonnet → Opus when:
- Multi-step reasoning leads to wrong conclusions
- The model gives up on hard problems
- You need the absolute best for a high-stakes decision

---

## Batch API (Cost Optimization)

For non-real-time tasks, use the Batch API for 50% cost reduction:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Create a batch
const batch = await client.messages.batches.create({
  requests: items.map((item, i) => ({
    custom_id: `request-${i}`,
    params: {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: item.prompt }],
    },
  })),
});

// Poll for completion
let result = await client.messages.batches.retrieve(batch.id);
while (result.processing_status !== "ended") {
  await new Promise(resolve => setTimeout(resolve, 5000));
  result = await client.messages.batches.retrieve(batch.id);
}

// Retrieve results
for await (const item of await client.messages.batches.results(batch.id)) {
  if (item.result.type === "succeeded") {
    // process item.result.message
  }
}
```

Use for: bulk classification, content generation pipelines, overnight processing tasks.
