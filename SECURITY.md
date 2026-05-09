# Security Policy

## Supported Versions

This repository is currently an active scaffold. Security updates apply to the `main` branch and the latest tagged release, if releases are in use.

| Version / Branch | Supported |
| --- | --- |
| `main` | :white_check_mark: |
| Latest release | :white_check_mark: |
| Older releases / branches | Best effort |

## Reporting a Vulnerability

Please report suspected vulnerabilities privately. Do **not** open a public GitHub issue for security-sensitive reports.

Email: **207279+bryansayler@users.noreply.github.com**

Include as much detail as possible:

- Affected file, package, route, workflow, or configuration
- Steps to reproduce
- Expected vs. actual behavior
- Potential impact
- Suggested fix, if known

## Response Expectations

I will make a best-effort attempt to acknowledge valid reports within **7 days**.

If the report is accepted, I will prioritize a fix based on severity and may publish a security advisory or release notes after the issue is resolved.

If the report is declined, I will explain why it is not considered a vulnerability or why it is out of scope for this repository.

## Scope

Security concerns may include:

- Dependency vulnerabilities
- Unsafe default configuration
- Secrets exposure
- Authentication or authorization issues
- Build, CI, or deployment risks
- Filesystem access risks in related MCP/server tooling
- Path traversal, unsafe file writes, missing read-only controls, or missing file-size limits

## Out of Scope

The following are generally out of scope unless they demonstrate a direct security impact:

- General code quality suggestions
- Missing features
- Theoretical attacks without a reproducible path
- Vulnerabilities in third-party services outside this repository’s control
- Social engineering or phishing simulations

## Security Baseline

For filesystem-touching tools, especially MCP-style servers, the expected baseline includes:

- Path traversal prevention
- Explicit excluded-directory guards
- Maximum file-size limits
- Read-only mode support
- Bounded concurrency
- Input validation
- No secret logging
- Least-privilege configuration
