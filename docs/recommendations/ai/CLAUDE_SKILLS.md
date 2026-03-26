# Claude Skills, Commands & Patterns

---

## CLAUDE.md — The Config File That Changes Everything

Drop `CLAUDE.md` at repo root. Claude reads it on every session.

```markdown
# CLAUDE.md

## Project Overview
[What this project does in 2-3 sentences]

## Stack
- Language: TypeScript / Python / Go
- Framework: Next.js / FastAPI / Gin
- DB: Postgres + Prisma
- Infra: Vercel + Railway

## Commands
- `npm run dev` — start dev server
- `npm run test` — run tests
- `npm run lint` — lint + typecheck

## Architecture
[Brief description of folder layout and key patterns]

## Key Conventions
- All API routes in `src/app/api/`
- Zod for all validation
- Never commit secrets — use `.env.local`
- Prefer named exports

## What NOT to Do
- Don't use `any` in TypeScript
- Don't skip input validation
- Don't add console.log to prod code
```

---

## Slash Commands (Custom)

Create in `.claude/commands/` as `.md` files.

### `/commit`
```markdown
# Commit

Stage all changes and create a semantic commit message.
Format: `type(scope): description`
Types: feat | fix | docs | refactor | test | chore
Run: git diff --staged first to understand changes.
```

### `/review`
```markdown
# Code Review

Review the current diff for:
1. Logic errors and edge cases
2. Security issues (injection, auth, validation)
3. Performance problems
4. Missing tests
5. Code clarity

Be direct. Output as bullet points per file.
```

### `/spec`
```markdown
# Write Spec

Given a feature description, write:
1. User stories (As a X, I want Y, so that Z)
2. Acceptance criteria (Given/When/Then)
3. Edge cases to test
4. What's explicitly out of scope
```

### `/debug`
```markdown
# Debug

Given the error, systematically:
1. Read the full stack trace
2. Find the root cause (not just the symptom)
3. Explain WHY it happens
4. Propose the minimal fix
5. Suggest how to prevent it class of error
```

### `/docs`
```markdown
# Generate Docs

For the selected code, write:
1. A one-line summary
2. Parameter descriptions with types
3. Return value description
4. At least one usage example
5. Any gotchas or side effects
```

---

## Effective Prompting Patterns

### Chain of Thought — Force Reasoning First
```
Before answering, think through:
1. What is actually being asked?
2. What constraints exist?
3. What could go wrong?
Then give your answer.
```

### Structured Output
```
Respond ONLY as JSON with this shape:
{
  "decision": "...",
  "reasoning": "...",
  "confidence": 0.0-1.0,
  "alternatives": [...]
}
```

### Role + Context
```
You are a senior security engineer reviewing this PR.
Focus on: auth bypass, injection, data exposure.
Ignore: style, formatting, naming.
```

### Iterative Refinement
```
Draft 1: Write it fast, don't overthink.
Draft 2: Cut 30% of words. Keep all meaning.
Draft 3: Fix any logical gaps or missing edge cases.
Output only Draft 3.
```

### Negative Constraints
```
Do NOT:
- Add new dependencies
- Change the public API
- Touch files outside src/auth/
- Write comments unless logic is non-obvious
```

---

## Claude API Patterns (Code)

### Basic Streaming
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const stream = await client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Explain LSM trees" }],
});

for await (const chunk of stream) {
  if (
    chunk.type === "content_block_delta" &&
    chunk.delta.type === "text_delta"
  ) {
    process.stdout.write(chunk.delta.text);
  }
}
```

### Tool Use
```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  tools: [
    {
      name: "search_codebase",
      description: "Search for a pattern in the codebase",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search pattern" },
          file_glob: { type: "string", description: "File filter glob" },
        },
        required: ["query"],
      },
    },
  ],
  messages: [{ role: "user", content: "Find all TODO comments" }],
});
```

### System Prompt Template
```typescript
const SYSTEM = `
You are an expert ${domain} assistant embedded in a development workflow.

## Context
${projectContext}

## Rules
- Be concise. No filler.
- If uncertain, say so.
- Prefer code over prose when explaining technical things.
- Never invent APIs or functions that don't exist.

## Output Format
${outputFormat}
`.trim();
```

---

## Memory Patterns

### Project Memory via CLAUDE.md
- Root `CLAUDE.md` = global project context
- `src/CLAUDE.md` = subsystem-specific rules
- `src/api/CLAUDE.md` = API-specific patterns

### Conversation Memory (API)
```typescript
const messages: MessageParam[] = [];

// Add user message
messages.push({ role: "user", content: userInput });

// Get response
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: SYSTEM,
  messages,
});

// Add assistant response for next turn
messages.push({
  role: "assistant",
  content: response.content,
});
```

---

## Agent SDK Patterns

```typescript
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
// or standard
import Anthropic from "@anthropic-ai/sdk";

// Agentic loop pattern
async function agentLoop(task: string, tools: Tool[]) {
  const messages: MessageParam[] = [{ role: "user", content: task }];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      const toolResults = await executeTools(response.content);
      messages.push({ role: "user", content: toolResults });
    }
  }

  return messages;
}
```

---

## Resources

- [Claude docs](https://docs.anthropic.com) — official reference
- [Prompt library](https://docs.anthropic.com/en/prompt-library) — vetted templates
- [Model specs](https://docs.anthropic.com/en/docs/about-claude/models) — which model for what
- [Tool use guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) — function calling
- [Cookbook](https://github.com/anthropics/anthropic-cookbook) — worked examples
