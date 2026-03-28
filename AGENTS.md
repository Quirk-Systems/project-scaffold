# AGENTS.md

> Patterns, recipes, and architecture for building AI agents with Claude on this scaffold.

---

## What Is an Agent?

An agent is a Claude session that can use tools, observe results, and loop until a task is complete. The key difference from a single prompt: **agents act, observe, and decide repeatedly.**

```
User Task → [Claude decides] → Tool Call → Result → [Claude decides] → ... → Final Answer
```

---

## Quick Start — Agentic Loop

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic();

async function runAgent(task: string, tools: Tool[]): Promise<string> {
  const messages: MessageParam[] = [{ role: "user", content: task }];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const last = response.content.find((b) => b.type === "text");
      return last?.type === "text" ? last.text : "";
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          if (block.type !== "tool_use") return null;
          const result = await executeTool(block.name, block.input);
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        })
      );

      messages.push({
        role: "user",
        content: toolResults.filter(Boolean) as MessageParam["content"],
      });
    }
  }
}
```

---

## Tool Definition Patterns

### Minimal Tool
```typescript
const readFileTool: Tool = {
  name: "read_file",
  description: "Read the contents of a file at the given path.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute path to the file" },
    },
    required: ["path"],
  },
};
```

### Tool With Optional Params
```typescript
const searchTool: Tool = {
  name: "search_code",
  description: "Search for a pattern in source files. Returns matching lines with file and line number.",
  input_schema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regex pattern to search for" },
      glob: { type: "string", description: "File glob filter, e.g. '**/*.ts'" },
      case_sensitive: { type: "boolean", description: "Default false" },
    },
    required: ["pattern"],
  },
};
```

### Tool With Enum
```typescript
const dbQueryTool: Tool = {
  name: "db_query",
  description: "Run a read-only SQL query against the database.",
  input_schema: {
    type: "object",
    properties: {
      sql: { type: "string" },
      dialect: { type: "string", enum: ["sqlite", "postgres"], default: "sqlite" },
    },
    required: ["sql"],
  },
};
```

---

## Multi-Agent Patterns

### Orchestrator + Subagents
```typescript
// Orchestrator breaks task → delegates to specialized subagents
async function orchestrate(task: string) {
  const plan = await planAgent(task);          // plan: string[]
  const results = await Promise.all(
    plan.map((subtask) => codeAgent(subtask))  // parallel execution
  );
  return await synthesizeAgent(results);
}
```

### Pipeline (Sequential)
```typescript
const pipeline = [
  (input: string) => researchAgent(input),
  (input: string) => draftAgent(input),
  (input: string) => reviewAgent(input),
  (input: string) => finalizeAgent(input),
];

async function runPipeline(task: string) {
  let state = task;
  for (const step of pipeline) {
    state = await step(state);
  }
  return state;
}
```

### Evaluator-Optimizer Loop
```typescript
async function evaluatorOptimizer(task: string, maxRounds = 3) {
  let solution = await generateAgent(task);

  for (let i = 0; i < maxRounds; i++) {
    const evaluation = await evaluateAgent(task, solution);
    if (evaluation.score >= 0.9) break;
    solution = await improveAgent(task, solution, evaluation.feedback);
  }

  return solution;
}
```

---

## Claude Code as Agent Runtime

This scaffold is designed to work with Claude Code. Claude Code gives you:

- File system tools (Read, Write, Edit, Glob, Grep)
- Shell execution (Bash)
- Subagent spawning (Agent tool)
- Web access (WebSearch, WebFetch)
- GitHub integration (mcp__github__*)

### Custom Slash Commands

Create `.claude/commands/<name>.md` — Claude executes the prompt on `/name`.

```
.claude/
└── commands/
    ├── ship.md          # lint + test + build + commit + push
    ├── audit.md         # run security and dependency audit
    ├── perf.md          # run performance analysis
    └── scaffold.md      # generate a new component with tests
```

### CLAUDE.md Layering
```
CLAUDE.md                # project-wide rules
src/CLAUDE.md            # src-specific patterns
src/lib/CLAUDE.md        # library-specific rules
src/app/api/CLAUDE.md    # API route conventions
```

---

## MCP Server Setup

MCP (Model Context Protocol) extends Claude with custom tools.

### Adding an MCP Server (claude_desktop_config.json)
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/mcp-server/index.js"],
      "env": {
        "API_KEY": "..."
      }
    }
  }
}
```

### Minimal MCP Server (TypeScript)
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "my-server", version: "1.0.0" });

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "get_weather",
      description: "Get current weather for a city",
      inputSchema: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
    },
  ],
}));

server.setRequestHandler("tools/call", async (req) => {
  const { name, arguments: args } = req.params;
  if (name === "get_weather") {
    // fetch weather...
    return { content: [{ type: "text", text: `Sunny in ${args.city}` }] };
  }
});

await server.connect(new StdioServerTransport());
```

---

## Error Handling in Agents

```typescript
// Wrap tool execution with structured error reporting
async function safeTool(name: string, fn: () => Promise<unknown>) {
  try {
    return { success: true, result: await fn() };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      tool: name,
    };
  }
}

// Return errors as tool results — let Claude decide how to recover
{
  type: "tool_result",
  tool_use_id: block.id,
  is_error: true,
  content: `Tool failed: ${error.message}. You may retry with different parameters.`,
}
```

---

## Observability

```typescript
// Trace every agent step
interface AgentTrace {
  id: string;
  task: string;
  steps: AgentStep[];
  duration_ms: number;
  total_tokens: number;
}

interface AgentStep {
  turn: number;
  tools_called: string[];
  input_tokens: number;
  output_tokens: number;
  stop_reason: string;
}
```

---

## Guardrails

```typescript
const GUARDRAILS = {
  maxTurns: 20,           // prevent infinite loops
  maxTokensTotal: 100_000, // cost control
  timeoutMs: 120_000,      // 2 min wall clock
  allowedTools: new Set(["read_file", "search_code"]), // allowlist
};

// Check before each tool execution
function checkGuardrails(state: AgentState) {
  if (state.turns >= GUARDRAILS.maxTurns) throw new Error("Max turns exceeded");
  if (state.tokens >= GUARDRAILS.maxTokensTotal) throw new Error("Token budget exceeded");
  if (Date.now() - state.startTime > GUARDRAILS.timeoutMs) throw new Error("Timeout");
}
```

---

## Model Selection for Agents

| Task | Model | Why |
|------|-------|-----|
| Complex reasoning, planning | claude-opus-4-6 | Best judgment |
| Code generation, tool use | claude-sonnet-4-6 | Speed + quality balance |
| Simple extraction, classification | claude-haiku-4-5 | Fast + cheap |
| Subagent tasks | claude-sonnet-4-6 | Reliable tool use |

---

## Resources

- [Anthropic Agent Docs](https://docs.anthropic.com/en/docs/build-with-claude/agents)
- [MCP Spec](https://modelcontextprotocol.io)
- [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code)
- [Anthropic Cookbook — Agents](https://github.com/anthropics/anthropic-cookbook/tree/main/agents)
