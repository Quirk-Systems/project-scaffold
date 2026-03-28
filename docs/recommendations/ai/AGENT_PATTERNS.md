# Agent Patterns

> Agents are programs with Claude as the decision-making core. Design them like any program.

---

## The Fundamental Loop

```
Input → Claude → Decision → Tool Call → Result → Claude → Decision → ... → Output
```

Every agent is a variation on this loop. The differences are:
- What tools are available
- When to stop
- How errors are handled
- How many agents are running

---

## Pattern 1: Simple Agentic Loop

One agent, one task, stops when done.

```typescript
async function simpleAgent(task: string, tools: Tool[]) {
  const messages: MessageParam[] = [{ role: "user", content: task }];

  for (let turn = 0; turn < 20; turn++) {  // max turns as safety net
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      return extractText(response.content);
    }

    if (response.stop_reason === "tool_use") {
      const results = await executeTools(response.content, tools);
      messages.push({ role: "user", content: results });
    }
  }

  throw new Error("Agent exceeded max turns");
}
```

---

## Pattern 2: Orchestrator + Subagents

Orchestrator breaks task into parallel subtasks, delegates to specialist agents, synthesizes results.

```typescript
async function orchestrate(task: string) {
  // Step 1: Plan
  const plan = await planningAgent(task);
  // plan.subtasks: ["research X", "analyze Y", "write Z"]

  // Step 2: Execute in parallel
  const results = await Promise.all(
    plan.subtasks.map((subtask) => workerAgent(subtask))
  );

  // Step 3: Synthesize
  return await synthesizerAgent(task, results);
}

// Worker is a simple agentic loop with domain-specific tools
async function workerAgent(subtask: string) {
  return simpleAgent(subtask, DOMAIN_TOOLS);
}
```

Best for: tasks that can be parallelized (research + analysis + writing simultaneously).
Cost: parallel agents = parallel cost. Budget accordingly.

---

## Pattern 3: Pipeline (Sequential)

Each stage's output is the next stage's input. Good for transformation chains.

```typescript
const pipeline: Array<(input: string) => Promise<string>> = [
  (input) => researchAgent(input),      // gather information
  (input) => structureAgent(input),     // organize it
  (input) => draftAgent(input),         // write it
  (input) => reviewAgent(input),        // critique it
  (input) => refineAgent(input),        // improve it
];

async function runPipeline(initialInput: string): Promise<string> {
  let state = initialInput;
  for (const stage of pipeline) {
    state = await stage(state);
  }
  return state;
}
```

Best for: quality-critical content where each step genuinely builds on the last.

---

## Pattern 4: Evaluator-Optimizer

Generate, evaluate, improve. Loop until quality threshold met.

```typescript
async function evaluatorOptimizer(
  task: string,
  maxRounds = 5,
  threshold = 0.85
) {
  let solution = await generatorAgent(task);

  for (let round = 0; round < maxRounds; round++) {
    const evaluation = await evaluatorAgent(task, solution);

    if (evaluation.score >= threshold) {
      return { solution, rounds: round + 1, finalScore: evaluation.score };
    }

    solution = await improverAgent(task, solution, evaluation.feedback);
  }

  return { solution, rounds: maxRounds, finalScore: 0 }; // best effort
}
```

Best for: code generation, content quality, when you need iteration toward a quality bar.

---

## Pattern 5: Map-Reduce

Process many items independently (map), combine results (reduce).

```typescript
async function mapReduce<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>,
  reducer: (results: R[]) => Promise<string>
) {
  // Map: process each item (parallelized)
  const BATCH_SIZE = 10;  // respect rate limits
  const results: R[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(mapper));
    results.push(...batchResults);
  }

  // Reduce: synthesize all results
  return reducer(results);
}

// Example: analyze 100 files, summarize findings
const summary = await mapReduce(
  sourceFiles,
  (file) => analyzeFileAgent(file),
  (analyses) => synthesizeAgent(analyses)
);
```

---

## Tool Design Principles

### Make tools atomic
Each tool does one thing. Claude composes them.

```typescript
// BAD: too much in one tool
const analyzeAndFixTool = { name: "analyze_and_fix", ... };

// GOOD: separate concerns
const readFileTool = { name: "read_file", ... };
const writeFileTool = { name: "write_file", ... };
const runTestsTool = { name: "run_tests", ... };
// Claude decides how to combine them
```

### Describe tools for Claude, not for a function signature
```typescript
// BAD description (too terse)
{ name: "search", description: "Search files" }

// GOOD description (tells Claude when/why to use it)
{
  name: "search_code",
  description: `Search for a regex pattern in source files.
    Use when you need to find where something is defined or used.
    Returns file paths, line numbers, and matching lines.
    Prefer this over read_file when you don't know which file contains what you need.`
}
```

### Return structured, typed results
```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  hint?: string;  // guidance for Claude on what to try next if failed
}
```

---

## Rate Limiting & Cost Control

```typescript
class RateLimitedAgent {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private readonly MAX_CONCURRENT = 5;
  private readonly TOKENS_PER_MINUTE = 100_000;
  private tokensUsed = 0;

  async run(fn: () => Promise<void>) {
    await this.waitForCapacity();
    try {
      this.running++;
      await fn();
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private async waitForCapacity() {
    while (this.running >= this.MAX_CONCURRENT) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

---

## Observability

Trace every agent run:

```typescript
interface AgentRun {
  id: string;
  task: string;
  model: string;
  startedAt: Date;
  completedAt?: Date;
  status: "running" | "success" | "error" | "timeout";
  turns: AgentTurn[];
  totalInputTokens: number;
  totalOutputTokens: number;
  error?: string;
}

// Log to your monitoring system
async function tracedAgent(task: string) {
  const run: AgentRun = { id: uuid(), task, model: "claude-sonnet-4-6", ... };

  try {
    const result = await simpleAgent(task, tools);
    run.status = "success";
    return result;
  } catch (err) {
    run.status = "error";
    run.error = String(err);
    throw err;
  } finally {
    run.completedAt = new Date();
    await logAgentRun(run);
  }
}
```
