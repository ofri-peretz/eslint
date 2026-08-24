---
'@interlace/ui': patch
---

fix: ArticleCard renders no views chip for zero views

Sources that cannot report views (dev.to's public API) return 0, and the card
displayed a literal "👁 0" on every article. A zero-view chip reads as product
failure, not information — absence is the honest presentation of absence.
