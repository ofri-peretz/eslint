# @interlace/ui

All notable changes to `@interlace/ui` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 0.1.1

### Patch Changes

- **🐛 Fix** — ArticleCard renders no views chip for zero views

  Sources that cannot report views (dev.to's public API) return 0, and the card
  displayed a literal "👁 0" on every article. A zero-view chip reads as product
  failure, not information — absence is the honest presentation of absence.

## 0.1.0

### Minor Changes

- **✨ Feature** — `RemoteMarkdown` accepts `tags`, forwarded to the underlying fetch as `next.tags`. ([#628](https://github.com/ofri-peretz/eslint/pull/628))

  Vercel's runtime cache outlives a deployment. Without a tag the cached entry
  is untargetable, so shipping a fix to the remote document leaves the old copy
  served until `revalidate` happens to elapse and nothing can force it sooner.
  Tagging makes the entry reachable by `revalidateTag()` and
  `vercel cache invalidate --tag`, which is what lets a release actually
  invalidate it.

  Additive and optional — omitting `tags` keeps the previous behaviour.
