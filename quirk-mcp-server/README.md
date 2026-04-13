# Quirk MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that bridges Claude to an Obsidian vault, tailored for the Quirk OS workflow.

## What it does

Exposes the Obsidian vault at `OBSIDIAN_VAULT_PATH` as a set of tools Claude can call directly:

| Tool | Description |
| --- | --- |
| `read_note` | Read a note's content + parsed frontmatter |
| `create_note` | Create a new note with YAML frontmatter |
| `update_note` | Replace a note's content |
| `append_to_note` | Append content to an existing note |
| `search_vault` | Full-text search across the vault |
| `list_notes` | List notes, optionally filtered by folder |
| `get_backlinks` | Find all notes that link to a target note |
| `get_forward_links` | Extract `[[wikilinks]]` from a note |
| `get_tags` | List all tags with file counts |
| `get_frontmatter` | Parse and return a note's YAML frontmatter |
| `move_note` | Move or rename a note |
| `get_daily_note` | Get or create today's daily note |
| `search_by_tag` | Find notes with a specific tag |
| `get_vault_stats` | Vault health: note count, tag count, orphans |

This is a **filesystem-direct** server — it reads and writes `.md` files without requiring Obsidian to be running. That matters for Claude Code sessions where you're not necessarily sitting inside the app.

## Install

```bash
cd quirk-mcp-server
npm install
npm run build
```

## Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `~/.config/Claude/claude_desktop_config.json` (Linux):

```json
{
  "mcpServers": {
    "quirk": {
      "command": "node",
      "args": ["/absolute/path/to/quirk-mcp-server/dist/index.js"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/home/you/Obsidian/Quirk",
        "QUIRK_DAILY_FOLDER": "Daily",
        "QUIRK_READ_ONLY": "false"
      }
    }
  }
}
```

Restart Claude Desktop. The tools should appear in the tools menu.

## Configure Claude Code

```bash
claude mcp add quirk node /absolute/path/to/quirk-mcp-server/dist/index.js \
  --env OBSIDIAN_VAULT_PATH=/home/you/Obsidian/Quirk
```

Or project-level via `.mcp.json`.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `OBSIDIAN_VAULT_PATH` | **required** | Absolute path to vault root |
| `QUIRK_DAILY_FOLDER` | `Daily` | Folder for daily notes |
| `QUIRK_DAILY_FORMAT` | `YYYY-MM-DD` | Daily note filename format |
| `QUIRK_READ_ONLY` | `false` | If `true`, disables all write tools |
| `QUIRK_MAX_FILE_BYTES` | `1048576` | Max note size to read (1 MB default) |

## Safety

- Paths are sanitized — `../` escapes are rejected.
- `.obsidian/`, `.trash/`, `.smart-connections/`, `.git/` are excluded from reads and writes.
- Set `QUIRK_READ_ONLY=true` to audit Claude's behavior before granting write access.
- Run your vault under `git` with `Obsidian Git` auto-commit for rollback.

## Development

```bash
npm run dev          # run with tsx
npm run type-check
npm test
```
