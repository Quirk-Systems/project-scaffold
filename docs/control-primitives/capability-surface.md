# Quirk Capability Surface

## Doctrine

An agent's power is only what is explicitly declared. The Capability Surface is
the canonical allowlist of tools, models, data sets, and network boundaries an
agent may use. Any capability not listed is forbidden, and runtime fences treat
absence as denial.

Capability Surfaces are versioned and reviewed. A new version requires a new
review cycle; old versions remain readable so historical receipts can be
interpreted.

## Required fields

| Field                | Type              | Description                                        |
| -------------------- | ----------------- | -------------------------------------------------- |
| `surface_id`         | string            | Stable UUID for this surface.                      |
| `agent_id`           | string            | Agent this surface describes.                      |
| `version`            | string            | SemVer of the surface declaration.                 |
| `tools`              | array             | Tool names the agent may invoke.                   |
| `models`             | array             | Allowed model IDs or model-family patterns.        |
| `data_access`        | array             | Tables, buckets, or APIs the agent may read/write. |
| `network_boundaries` | array             | Allowed egress hosts, patterns, or `none`.         |
| `owner`              | string            | Human owner accountable for the surface.           |
| `reviewed_at`        | string (ISO 8601) | Last review timestamp.                             |
| `expires_at`         | string (ISO 8601) | Surface expiration; runs blocked after this.       |

## Example YAML

```yaml
surface_id: surf-cap-001
agent_id: agent-curator-v2
version: 2.3.0
tools:
  - quirk.assets.search
  - quirk.annotations.create
  - quirk.runs.promote
models:
  - openai:gpt-5
  - huggingface:meta-llama/*
data_access:
  - read:quirk_assets
  - read:quirk_annotations
network_boundaries:
  - supabase.io
  - api.cloudflare.com
owner: alice@quirk.systems
reviewed_at: "2026-07-29T10:00:00Z"
expires_at: "2026-10-29T10:00:00Z"
```

## Schema

See [`/schemas/quirk-capability-surface.schema.json`](../schemas/quirk-capability-surface.schema.json).

## Enforcement note

Cloudflare Workers validate a signed JWT capability claim on every inbound
request; claims must be a subset of the latest surface. Supabase RLS policies on
`quirk_tool_calls` reject tool names outside the active surface. The active
surface is pinned at spawn time by the [Agent Spawn Gate](agent-spawn-gate.md).
