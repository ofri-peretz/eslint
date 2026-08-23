---
'@interlace/ui': minor
---

`RemoteMarkdown` accepts `tags`, forwarded to the underlying fetch as
`next.tags`.

Vercel's runtime cache outlives a deployment. Without a tag the cached entry
is untargetable, so shipping a fix to the remote document leaves the old copy
served until `revalidate` happens to elapse and nothing can force it sooner.
Tagging makes the entry reachable by `revalidateTag()` and
`vercel cache invalidate --tag`, which is what lets a release actually
invalidate it.

Additive and optional — omitting `tags` keeps the previous behaviour.
