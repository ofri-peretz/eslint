---
---

feat(release): the rollup claims the Latest badge, and can open a discussion

Two things GitHub Releases offers that we were not using.

**The "Latest" badge was arbitrary.** Every per-package release passes
`--latest=false` and nothing claimed the badge, so GitHub awarded it to whichever
release was created last. It currently sits on a rollup by luck; a publish job
finishing after would have moved it to a random single package. The rollup is the
one release that describes the whole thing, so it now claims the badge on
purpose — on the create paths and on the idempotent re-run edit.

**Releases can now open a feedback thread.** Set the repo variable
`RELEASE_DISCUSSION_CATEGORY` to a Discussions category name and each rollup
creates one. Discussions is currently disabled on this repository, which is a
repo setting rather than a code change — until it is enabled and the variable is
set, this path is inert and the release is created exactly as before. The flag
errors outright when Discussions is off, so the call falls back rather than
failing a release whose packages are already published.

No published package behaviour changes.
