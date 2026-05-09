# MCP — Model Context Protocol Servers

> Bridges between Claude (Desktop or Code) and external systems. Stdio
> transport, JSON-RPC, tool / resource / prompt registration.

---

## Quirk MCP servers

Each Quirk MCP server lives in its own repo and is deployed independently
of `project-scaffold`. The scaffold is for Next.js apps; MCP servers are
their own deployable.

| Server | Repo | What it bridges |
| --- | --- | --- |
| `quirk-mcp-server` | `Quirk-Systems/quirk-mcp-server` *(repo TBD)* | An Obsidian vault → Claude. Filesystem-direct read/write, search, backlinks, tags, daily notes, vault stats. |

> The `quirk-mcp-server` was prototyped inside this scaffold on branch
> `claude/quirk-mcp-server-fHdiT` (commits `51bfadc` and `eba61dc`) and
> then extracted. To recover that history when seeding the new repo:
>
> ```bash
> git format-patch 51bfadc^..eba61dc -- quirk-mcp-server/
> # apply with: git am --directory=. *.patch
> ```

---

## Build pattern

Use the official TypeScript SDK with stdio transport. Validate inputs with
zod; convert to JSON Schema for the MCP `list_tools` response with
`zod-to-json-schema`. Keep handlers pure — no globals beyond a single
`Config` loaded from env at startup.

Mandatory safety rails for any filesystem-touching server:

- Reject path traversal (`..`, absolute paths outside the root).
- Maintain an excluded-dir list (`.git`, `.obsidian`, etc).
- Cap max-file-byte reads to protect Claude's context window.
- Provide a `READ_ONLY=true` env toggle.
- Parallelize reads with bounded concurrency (16 is a reasonable default).

---

## Where to install

| Client | Config |
| --- | --- |
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Linux) | `~/.config/Claude/claude_desktop_config.json` |
| Claude Code (global) | `claude mcp add <name> <command>` |
| Claude Code (project) | `.mcp.json` at repo root |

Restart the client after editing config; servers appear in the tools panel.
