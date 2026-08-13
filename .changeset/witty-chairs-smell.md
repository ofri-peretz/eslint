---
---

Docs-only: adds the OpenSSF Scorecard badge to the badge row of all 31 published
package READMEs. Deliberately empty — no version bump.

READMEs do ship inside the npm tarball, so the badge will not appear on any
package's npm page until that package's next release. Cutting 31 patch releases
purely to surface a badge is not worth the release noise; each package picks it
up on its next real publish. The badge is live on GitHub immediately, which is
where it matters for the Scorecard/CII trust signal.
