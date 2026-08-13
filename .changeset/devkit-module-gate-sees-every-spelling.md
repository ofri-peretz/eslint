---
'@interlace/eslint-devkit': minor
---

The shared SDK gate now recognises every way a module can be brought into a
file, not just `import` and a bare `require()`.

```js
import OpenAI = require('openai');        // gate stayed shut
const { OpenAI } = await import('openai'); // gate stayed shut
```

`createModuleListEvidence` routes the flat `modules` lists that the SDK rule
factories already take through `createModuleEvidence`, which understands
import-equals, dynamic import, re-exports, Deno specifiers and `require`
shadowing. Before this, four plugins — `anthropic-security`,
`gemini-security`, `mcp-sdk-security` and `openai-security` — ran **no rule at
all** on a file that loaded its SDK either of those two ways. The gate was
never wrong about the library; it was wrong about the spelling.

The same pass narrowed three shared factories to report evidence rather than
resemblance: `sdk-api-key-rule` now names the property that actually held the
credential instead of guessing the first configured one,
`browser-escape-hatch-rule` and `system-prompt-injection-rule` check the
receiver, and `sql-injection-rule` requires the driver import.

`matchesModule` is **deprecated but still exported**. It only answers "which
package is this string in?" and cannot see how the module was loaded — prefer
`createModuleListEvidence`. It is kept so this stays a minor release: dropping
it would strand every plugin on its `^1` range, which is the opposite of
shipping these fixes.
