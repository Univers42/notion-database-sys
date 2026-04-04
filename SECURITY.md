# Security Policy

## Supported Versions

Security fixes are applied to the `develop` branch first, then propagated to release branches when relevant.

| Branch | Supported |
| --- | --- |
| develop | ✅ |
| main | ✅ |
| feature/* | ❌ |

## Reporting a Vulnerability

Please do **not** open public GitHub issues for security vulnerabilities.

Instead, report vulnerabilities privately by emailing:

- dlesieur@dev.local

Please include:

- A clear description of the issue
- Steps to reproduce
- Potential impact
- Any suggested mitigation

## Response Process

- We acknowledge receipt within 72 hours.
- We investigate and assess severity.
- We provide an estimated remediation timeline.
- We coordinate disclosure once a fix is available.

## Scope

This policy covers:

- API and authentication (`packages/api`)
- Core access control logic (`packages/core`)
- Data adapters and DB integrations (`services/dbms`, `src/server`)
- Build and deployment related scripts
