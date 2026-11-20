---
'eslint-plugin-secure-coding': minor
---

fix(secure-coding): no-unsafe-deserialization no longer reports eval() and the Function constructor

`eval(x)`, `window.eval(x)` and `new Function(x)` turn a string into running code. That is code
injection (CWE-95), and `node-security/detect-eval-with-expression` already reports it, so a
combined run reported every such line twice, once under the wrong class. This rule now leaves them
to the owner and keeps what is deserialization: `unserialize`, `deserialize`, node-serialize, YAML
loaders, and strings handed to `setTimeout` / `setInterval`.

`eval` and `Function` are removed from the default `dangerousFunctions` and are ignored if listed.
The `dangerousFunctionConstructor` message is gone. If you run `secure-coding` without
`node-security`, add `node-security/detect-eval-with-expression` to keep eval coverage.
