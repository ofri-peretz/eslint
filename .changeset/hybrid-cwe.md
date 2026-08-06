---
'eslint-plugin-nestjs-security': patch
---

`no-hybrid-app-config-loss` reports an accurate CWE and severity

The rule mapped to CWE-284, which is a Pillar — MITRE marks it Discouraged for
real findings. It now maps to CWE-20 (Improper Input Validation), the
consequence that actually reproduces: on NestJS 9.4.3 a Kafka `@MessagePattern`
handler received a number through a DTO with `@IsString()` when
`inheritAppConfig` was absent, and rejected it once the flag was set.

Severity drops from 7.5/HIGH to 5.3/MEDIUM: reaching these handlers requires
access to the message broker, not merely the network.

Detection is unchanged, and the rule stays deliberately ungated.
