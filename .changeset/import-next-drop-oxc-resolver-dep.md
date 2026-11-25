---
'eslint-plugin-import-next': patch
'oxlint-plugin-import-next': patch
---

chore(deps): drop the hard `oxc-resolver` dependency from import-next

import-next never imported `oxc-resolver` itself; it reached it through `@interlace/eslint-devkit`, which already treats it as an optional peer and now resolves without it. A fresh install of import-next no longer downloads `oxc-resolver` and its native bindings. `oxc-resolver` is declared as an optional peer: install it to keep the exact previous resolution (tsconfig `references`, `#imports` maps, full `exports` pattern support).
