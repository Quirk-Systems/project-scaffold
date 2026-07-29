# Quirk Runtime Profiles

Runtime profiles describe execution properties rather than vendors. Routing considers capability, risk, latency, privacy, cost, checkpointing, and recoverability.

Profiles currently define:

- `local` — broad development access, never production authority.
- `ci` — reproducible validation in an ephemeral environment.
- `worker` — durable queued execution with checkpoints and bounded retries.
- `edge` — low-latency stateless work with strict data and duration limits.

A provider adapter may implement a profile, but the provider is not the profile.
