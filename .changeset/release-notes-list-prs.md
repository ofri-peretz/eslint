---
'eslint-plugin-node-security': patch
---

Release notes now list every pull request in the release.

The changeset text says what changed in our words, which is the right thing to
lead with. It does not answer the question a consumer actually arrives with —
_which_ PRs are in the version I just installed — and that is the question asked
by someone whose reported false positive stopped appearing, or by someone
deciding whether an upgrade is worth it.

`scripts/prs-since-release.ts` reads the package's own tags, walks the commits
that touched that package since its previous release, and lists the squash-merge
PRs. Per-package, because the repo's tags interleave every package and the
question is always about one of them. Sorted by `-v:refname` so 5.1.10 ranks above
5.1.9 rather than lexically below it, which would silently truncate the range to a
single release.

It reads git rather than the GitHub API: the tags and subjects are already in the
checkout, and an API call would need a token and a rate-limit budget inside a
matrix job that runs once per package.
