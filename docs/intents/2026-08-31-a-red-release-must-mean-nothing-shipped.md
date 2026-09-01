---
slug: a-red-release-must-mean-nothing-shipped
opened: 2026-08-31
packages: []
cases: []
---

## What

A release job that reports `failure` must be readable as "nothing was
published", or it must say plainly which packages it DID publish before it
died. Today neither is true.

## Why

On 2026-08-31, run `33346361671` reported six publish jobs as `failure`:

    failure  Publish eslint-plugin-maintainability@3.1.2
    failure  Publish eslint-plugin-browser-security@2.0.7
    failure  Publish eslint-plugin-modularity@2.4.0
    failure  Publish eslint-plugin-conventions@5.1.0
    failure  Publish @interlace/eslint-devkit@1.17.4
    failure  Publish eslint-plugin-react-features@1.5.0

Every one of those versions is on npm, published by the GitHub Actions OIDC
identity with a SLSA provenance attestation. The publish succeeded and the job
went red afterwards.

`release.yml` runs `npm publish` at line 333 and pushes the git tag and creates
the GitHub release after it. The file's own comments already name the hazard —
"fails AFTER a successful npm publish, which is the worst place to fail — the
package is public and unrecallable while the repo has no tag to diff against"
— and carry two mitigations written after previous occurrences. It happened
again anyway.

The cost is not theoretical. It cost this session hours. `Scan pinned corpus`
was red because five packages were bumped and unpublished; I read the release
run, saw six red publish jobs, and concluded the release had not happened and
was waiting on a human approval. It had happened. The status was the only
evidence available and it pointed the wrong way.

A release status that cannot distinguish "did not publish" from "published and
then failed to tag" is worse than no status, because it is believed.

## Constraints

- No weakening of the post-publish steps. The tag and the GitHub release are
  how a published version is auditable; making them optional trades one
  integrity gap for another.
- The job must still exit non-zero when a post-publish step fails. This is
  about what the failure SAYS, not about turning it green.
- npm is unrecallable. Nothing here may retry a publish on a path where it
  could double-publish.

## Done when

- A publish job that has run `npm publish` successfully records that fact where
  the run summary can read it, before any step that can fail.
- The run summary distinguishes, per package, between NOT PUBLISHED and
  PUBLISHED — POST-STEPS FAILED.
- A regression lock asserts the ordering: no step that can fail may sit between
  `npm publish` and the step that records the publish.
