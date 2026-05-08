# AI Memory Patterns

> LLMs are stateless. Memory is the infrastructure you build around them.

---

## Types of Memory

| Type | What | Implementation |
|------|------|---------------|
| In-context | Current conversation history | Messages array |
| Episodic | Past conversation summaries | DB + retrieval |
| Semantic | Knowledge / facts about entities | Vector DB |
| Procedural | How to do things | CLAUDE.md / system prompts |
| Working | Current task state | Agent state object |

---

## In-Context Memory (Conversation)

The simplest form: just keep the messages array.

```typescript
const memory: MessageParam[] = [];

async function chat(userMessage: string): Promise<string> {
  memory.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: memory,
  });

  const assistantMessage = extractText(response.content);
  memory.push({ role: "assistant", content: assistantMessage });

  return assistantMessage;
}
```

Limit: grows until you hit the context window. Compress or summarize when needed.

---

## Conversation Compression

When history gets long, summarize old turns:

```typescript
const COMPRESSION_THRESHOLD = 50; // messages
const KEEP_RECENT = 10;           // keep last N messages verbatim

async function compressMemory(messages: MessageParam[]): Promise<MessageParam[]> {
  if (messages.length < COMPRESSION_THRESHOLD) return messages;

  const toCompress = messages.slice(0, -KEEP_RECENT);
  const recent = messages.slice(-KEEP_RECENT);

  const summary = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: toCompress,
    system: `Summarize this conversation concisely. Preserve:
      - Decisions made
      - Key facts established
      - Current task state
      - User preferences discovered
      Output as bullet points.`,
  });

  const summaryMessage: MessageParam = {
    role: "user",
    content: `[Conversation summary]\n${extractText(summary.content)}\n[End summary]`,
  };

  return [summaryMessage, ...recent];
}
```

---

## External Memory (Episodic)

Store and retrieve past conversations:

```typescript
// Schema (Drizzle)
export const conversationMemory = sqliteTable("conversation_memory", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  summary: text("summary").notNull(),
  keyFacts: text("key_facts").notNull(),  // JSON array
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// After each conversation, store summary
async function storeMemory(userId: string, messages: MessageParam[]) {
  const summary = await extractConversationSummary(messages);

  await db.insert(conversationMemory).values({
    userId,
    summary: summary.text,
    keyFacts: JSON.stringify(summary.facts),
  });
}

// Retrieve relevant past context
async function loadMemory(userId: string, currentTopic: string): Promise<string> {
  const memories = await db.query.conversationMemory.findMany({
    where: eq(conversationMemory.userId, userId),
    orderBy: desc(conversationMemory.createdAt),
    limit: 5,
  });

  if (!memories.length) return "";

  return memories
    .map(m => `[${m.createdAt}] ${m.summary}`)
    .join("\n");
}
```

---

## CLAUDE.md as Procedural Memory

CLAUDE.md is how you give an AI persistent procedural memory — knowledge about how to work in this specific codebase.

```markdown
# CLAUDE.md (project memory)

## What this project does
[Prevents re-asking "what does this project do?"]

## Key architectural decisions
[ADRs in brief — why we made specific choices]

## Patterns to follow
[Code patterns to reuse]

## Patterns to avoid
[Known footguns and why]

## Common tasks
[How to do recurring tasks in this codebase]
```

Layer CLAUDE.md files:
```
CLAUDE.md               # global project context
src/lib/CLAUDE.md       # library conventions
src/app/api/CLAUDE.md   # API route patterns
```

---

## Vector Memory (Semantic Search)

For "remember facts about users/entities":

```typescript
// Using a simple embedding-based approach
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function embed(text: string): Promise<number[]> {
  // Anthropic doesn't have an embeddings endpoint — use OpenAI ada-002
  // or a local model like nomic-embed-text
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Store a fact
async function remember(key: string, fact: string) {
  const embedding = await embed(fact);
  await db.insert(memories).values({
    key,
    fact,
    embedding: JSON.stringify(embedding),
  });
}

// Retrieve similar facts
async function recall(query: string, limit = 5) {
  const queryEmbedding = await embed(query);

  // In production: use pgvector or a vector DB (Pinecone, Qdrant, etc.)
  // For SQLite: brute force cosine similarity
  const all = await db.select().from(memories);
  return all
    .map(m => ({
      ...m,
      similarity: cosineSimilarity(queryEmbedding, JSON.parse(m.embedding)),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
```

---

## Working Memory (Agent State)

For agentic tasks, maintain explicit state:

```typescript
interface AgentState {
  task: string;
  plan: string[];
  completedSteps: string[];
  discoveredFacts: Record<string, string>;
  errors: Array<{ step: string; error: string; }>;
  context: string;  // accumulated relevant context
}

// Inject state into system prompt
function buildSystemWithState(state: AgentState): string {
  return `
${BASE_SYSTEM}

## Current Task
${state.task}

## Plan
${state.plan.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Completed Steps
${state.completedSteps.join("\n")}

## Known Facts
${Object.entries(state.discoveredFacts).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

## Context
${state.context}
  `.trim();
}
```

---

## RAG (Retrieval-Augmented Generation)

Pull relevant context from a knowledge base before asking Claude:

```typescript
async function ragQuery(userQuestion: string, knowledgeBase: Document[]) {
  // 1. Find relevant documents
  const relevant = await semanticSearch(userQuestion, knowledgeBase, 5);

  // 2. Build context from retrieved docs
  const context = relevant
    .map(doc => `[${doc.title}]\n${doc.content}`)
    .join("\n\n---\n\n");

  // 3. Answer with context
  return client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `Answer questions using only the provided context.
      If the context doesn't contain the answer, say so.
      Cite which document you're drawing from.`,
    messages: [{
      role: "user",
      content: `Context:\n${context}\n\nQuestion: ${userQuestion}`,
    }],
  });
}
```
