# Security

## Supported versions

Security fixes are applied to the latest released version.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting feature for this repository. Do not open a public issue with exploit details or personal data.

Include the affected version, operating system, reproduction steps, expected impact, and any suggested mitigation.

## Local-data model

DO IT. stores its database in Electron's application-data directory. The app does not provide encryption at rest, authentication, cloud sync, or multi-user isolation. Anyone with access to the operating-system account may be able to read exported or stored JSON data.
