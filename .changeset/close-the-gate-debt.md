---
'@interlace/eslint-devkit': minor
'eslint-plugin-nestjs-security': major
---

Share one SDK-evidence probe, and gate the last plugin that had none

`createModuleEvidence` moves the probe into the devkit. Five plugins each
carried their own copy, so the two false-negative classes the audit found —
TypeScript's `import =` form and Deno's `npm:` / `deno.land` specifiers — had to
be fixed five times. One implementation now carries package-root matching,
rejection of relative specifiers, both dynamic forms, lexically-scoped `require`
shadowing, an optional non-import evidence arm, and a per-`Program` cache.

`nestjs-security` is gated on it. Measured over 107,382 files across 107
repositories, **22% of everything it reported (219 of 999 findings) was in a
file importing no NestJS package** — its rules key on decorator and method names
that Angular, TypeORM and plain TypeScript classes share. This is a **major**:
any rule may now stay silent where it previously reported.

Every other SDK plugin already abstained, but eight of them proved it only
inside a devkit factory. They now ship a registry-wide lock as well, so the
guarantee survives a hand-written rule added tomorrow.
