# Runtime Model

Quirk routes work to provider-independent runtime profiles.

## Selection dimensions

- required capabilities
- data classification
- permissions and secrets
- duration and checkpoint requirements
- memory and concurrency
- latency
- retry and idempotency behavior
- observability
- cost

## Runtime rule

A runtime is selected because it satisfies a contract, not because it is currently fashionable or already connected.

Long-running or side-effecting work belongs in durable workers. Low-latency stateless validation may run at the edge. Canonical mutations require explicit authority regardless of runtime.
