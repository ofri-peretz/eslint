---
'eslint-plugin-modularity': patch
---

fix: rules now decide by code structure, found by the new Quint fidelity models.

- `no-external-api-calls-in-utils`: HTTP clients are recognised by binding. An injected client (a parameter named `fetch` or `axios`, also when it shadows an import) is the fix the rule suggests and is no longer reported; `axios['post'](url)` is. `**` in `utilityPatterns` now spans several directories. A `const` alias of `globalThis.fetch` is a client, and a derived client resolves through any number of `const` links.
- `no-mutable-exports`: a `let` / `var` exported through an export list (`export { count }`, `export { count as total }`) is reported like `export let`.
- `ddd-anemic-domain-model`: behaviour written as an arrow-function class property counts as a business method; a concise arrow getter or delegation (`getBalance = () => this.balance`) and a quoted method name are read like their block-bodied, unquoted forms.
- `ddd-value-object-immutability`: a constructor parameter property without `readonly` is a mutable field; `Object.freeze(this.items)` no longer counts as freezing the instance. Static fields are not instance state and are not reported.
