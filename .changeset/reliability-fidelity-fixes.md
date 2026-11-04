---
'eslint-plugin-reliability': patch
---

fix: rules now decide by code structure, found by the new Quint fidelity models.

- `require-network-timeout`: a request is recognised by binding, not by name. A local `fetch` or a local object named `axios` is not reported; `globalThis.fetch`, a renamed or required axios, `axios['get']`, `axios(config)` and `axios.request(config)` are. The config is read from the slot the axios method defines, so `axios.post(url, body, { timeout })` is bounded and a `timeout` field in the request body is not. `axios.create` and `axios.isCancel` send no request and are no longer reported. A quoted or computed `timeout` key counts, a `const`-bound options literal is resolved, and options the file cannot see (a parameter, a spread of one) are no longer reported.
- `error-message`: a local class named `Error` is no longer reported; `globalThis.Error()`, `new Error(undefined)` and an empty or blank template literal are.
- `no-missing-error-context`: an object literal with a `message` key carries a message, and a file-declared subclass whose constructor passes a message to `super` can be thrown with no argument. With `requireStackTrace`, a file-declared class is an Error by its `extends` clause, not by whether its name ends in "Error".
- `no-await-in-loop`: a loop that feeds an awaited value into its next iteration (a cursor the test reads, an accumulator passed to the next await, a status that decides a `break` or `return`) is no longer reported. `allowWhile` now covers do-while loops.
- `no-missing-null-checks`: destructuring a value with null evidence (`const { name } = users.find(…)`) is reported like the property read it performs.
- `no-unsafe-type-narrowing`: the angle-bracket and mixed spellings of a double assertion (`<T>(<unknown>x)`, `<T>(x as unknown)`, `(<unknown>x) as T`) are reported.
- `no-unhandled-promise`: a promise created in a `try` block without `await` (or in its `catch` / `finally`) is reported; the try block cannot catch its rejection.
