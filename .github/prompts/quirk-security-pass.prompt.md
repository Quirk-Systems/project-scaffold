---
name: quirk-security-pass
description: Review changed code for exploitable security failures
agent: ask
---

Perform a threat-focused review of the selected code.

Trace:

- attacker-controlled inputs
- identity and session establishment
- authorization decisions
- secrets and sensitive data
- database and storage access
- outbound requests
- webhooks and callbacks
- redirects and rendered output
- logging and telemetry
- administrative operations

For each credible issue provide:

- attack path
- prerequisite access
- affected asset
- impact
- exploitability
- exact code location
- minimal mitigation
- regression test

Distinguish exploitable findings from hardening suggestions. Do not inflate severity.
