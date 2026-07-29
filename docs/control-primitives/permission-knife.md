# Quirk Permission Knife

## Doctrine

Permissions should be narrow enough to cut cleanly. A Permission Knife is a
scoped, time-boxed, retractable grant that reduces the Capability Surface to
the minimum needed for a single run or task class. Every knife carries a
revocation hash so it can be cancelled without waiting for expiration.

Knives are issued per principal, not per agent. The same agent may hold many
knives, each with different scopes, and losing one knife does not invalidate
the agent's entire surface.

## Required fields

| Field                  | Type              | Description                                                         |
| ---------------------- | ----------------- | ------------------------------------------------------------------- |
| `knife_id`             | string            | Stable UUID for the grant.                                          |
| `principal`            | string            | User, service account, or agent principal.                          |
| `surface_id`           | string            | Capability Surface this knife narrows.                              |
| `allowed_capabilities` | array             | Capability refs from the surface that are granted.                  |
| `scope`                | string            | Human-readable scope of the grant.                                  |
| `resource_filter`      | object            | Row-level or resource-level filter (e.g. `asset_type:photography`). |
| `not_before`           | string (ISO 8601) | Earliest effective time.                                            |
| `expires_at`           | string (ISO 8601) | Expiration time.                                                    |
| `revocation_hash`      | string            | Hash of revocation instruction; set to `null` when active.          |
| `issued_by`            | string            | Issuer identity.                                                    |

## Example YAML

```yaml
knife_id: knife-promote-017
principal: agent-curator-v2
surface_id: surf-cap-001
allowed_capabilities:
  - quirk.runs.promote
  - quirk.offers.mint
scope: promote winning experiment runs to offers
resource_filter:
  asset_status: approved
  offer_minted: false
not_before: "2026-07-29T10:00:00Z"
expires_at: "2026-07-30T10:00:00Z"
revocation_hash: null
issued_by: bob@quirk.systems
```

## Schema

See [`/schemas/quirk-permission-knife.schema.json`](../schemas/quirk-permission-knife.schema.json).

## Enforcement note

Supabase RLS policies on `quirk_tool_calls` and `quirk_receipts` join against
the active knife on every write. Cloudflare Durable Objects hold a revocation
set; revoked knives are rejected at the edge before reaching the origin.
