# Quirk Libraries

`packages/` contains provider-independent domain libraries. Package source exists before workspace publication so the architecture can be validated without destabilizing the existing lockfile.

Promotion to a publishable workspace package requires:

- a stable public interface
- an owner
- tests
- a compatibility policy
- no undeclared provider dependency
- evidence of reuse in at least two consumers
