---
'eslint-plugin-secure-coding': patch
---

`no-fail-open-auth`: a catch that stores the error in a variable is not fail-open when the next guard reads that variable and throws or returns. The rule now accepts this shape, which FastMCP's stdio authentication uses: `catch (e) { failure = e.message } if (failure !== void 0) throw …`. The write must always run, target a binding declared before the try, and not read its own old value, so a counter like `failures = failures + 1` does not count. The guard must also come before any work. A flag set only on some failures, a compound or member write, and work that runs before the guard still report.
