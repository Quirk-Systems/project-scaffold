# OpenAI Tools, Assistants & Patterns

---

## Function Calling — The Right Way

```typescript
import OpenAI from "openai";

const client = new OpenAI();

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City, Country" },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
        },
        required: ["location"],
      },
    },
  },
];

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Weather in Tokyo?" }],
  tools,
  tool_choice: "auto",
});
```

---

## Structured Outputs (Zod + OpenAI)

```typescript
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const ReviewSchema = z.object({
  summary: z.string(),
  issues: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high", "critical"]),
      file: z.string(),
      description: z.string(),
      suggestion: z.string(),
    })
  ),
  approved: z.boolean(),
});

const result = await client.beta.chat.completions.parse({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a code reviewer." },
    { role: "user", content: `Review this code:\n${code}` },
  ],
  response_format: zodResponseFormat(ReviewSchema, "review"),
});

const review = result.choices[0].message.parsed; // fully typed
```

---

## Embeddings + Vector Search

```typescript
// Generate embedding
const embedding = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: "The transformer architecture changed everything",
});

const vector = embedding.data[0].embedding; // float[]

// Cosine similarity (manual)
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}
```

### Paired with pgvector
```sql
-- Enable extension
CREATE EXTENSION vector;

-- Table with embedding column
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1536)
);

-- Similarity search
SELECT content, 1 - (embedding <=> '[...]'::vector) AS score
FROM documents
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;
```

---

## Assistants API Pattern

```typescript
// Create assistant (once, store the ID)
const assistant = await client.beta.assistants.create({
  name: "Code Reviewer",
  instructions: "You review code for bugs, security issues, and clarity.",
  model: "gpt-4o",
  tools: [{ type: "code_interpreter" }, { type: "file_search" }],
});

// Per-conversation thread
const thread = await client.beta.threads.create();

await client.beta.threads.messages.create(thread.id, {
  role: "user",
  content: "Review this PR diff: ...",
});

const run = await client.beta.threads.runs.createAndPoll(thread.id, {
  assistant_id: assistant.id,
});

if (run.status === "completed") {
  const messages = await client.beta.threads.messages.list(thread.id);
  console.log(messages.data[0].content);
}
```

---

## Streaming Responses

```typescript
const stream = await client.chat.completions.stream({
  model: "gpt-4o",
  messages: [{ role: "user", content: prompt }],
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}

const final = await stream.finalChatCompletion();
```

---

## Fine-Tuning Workflow

```jsonl
// training_data.jsonl — one JSON object per line
{"messages": [{"role": "system", "content": "You are a terse code reviewer."}, {"role": "user", "content": "Review: const x = 1"}, {"role": "assistant", "content": "Prefer `let` or `const` — good. No issues."}]}
{"messages": [{"role": "system", "content": "You are a terse code reviewer."}, {"role": "user", "content": "Review: eval(userInput)"}, {"role": "assistant", "content": "CRITICAL: eval() with user input is a code injection vulnerability. Remove immediately."}]}
```

```typescript
// Upload and start fine-tune job
const file = await client.files.create({
  file: fs.createReadStream("training_data.jsonl"),
  purpose: "fine-tune",
});

const job = await client.fineTuning.jobs.create({
  training_file: file.id,
  model: "gpt-4o-mini",
});
```

---

## System Prompt Patterns

### Persona + Rules
```
You are a principal engineer at a high-scale startup.
You value: correctness, simplicity, observability.
You distrust: premature optimization, over-abstraction, magic.

Rules:
- Answer as if the reader is senior but unfamiliar with this codebase
- No filler phrases ("Certainly!", "Great question!")
- When uncertain, quantify your uncertainty
- Prefer concrete examples over abstract explanations
```

### Output Shaping
```
Always respond with:
1. A one-sentence TL;DR
2. The detailed answer
3. A "Watch out for" section if relevant

Never use bullet points for the TL;DR.
```

---

## Resources

- [OpenAI Cookbook](https://github.com/openai/openai-cookbook) — worked examples
- [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs)
- [pgvector](https://github.com/pgvector/pgvector) — Postgres vector extension
- [LangChain](https://www.langchain.com) — orchestration if you need it
- [LlamaIndex](https://www.llamaindex.ai) — RAG pipelines
- [Vercel AI SDK](https://sdk.vercel.ai) — streaming UI + multi-provider
