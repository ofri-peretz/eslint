---
---

fix(release): `changeset:version` now regenerates the link-and-name map

A version bump changes package versions, and `.agent/link-and-name-map.md`
records them. It was not regenerated with the rest, so it went stale on the
**Version PR itself** — the one PR that has to be mergeable for anything to
publish — and `link-and-name-map.lock` failed there every release.

The failure is quiet in the worst way: it does not break a package, it blocks
the release, and it surfaces as an unrelated-looking lint failure on a bot PR
that nobody reads closely. It needed a hand-written commit each time to clear.

Added to the same chain that already regenerates the lockfile, the in-source
version constants and the CHANGELOGs. A lock asserts all four, so dropping any
one of them fails a test instead of a release.
