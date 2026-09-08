---
'eslint-plugin-operability': patch
---

fix(operability): `require-data-minimization` ignores a literal that collects nothing

With `piiFields` configured, a wide object whose every value is a literal reported as excessive data collection:

```ts
export const HOSTS = [
  {
    name: 'commander',
    repo: 'https://…',
    testDir: 'tests',
    runner: 'node:test' /* … */,
  },
];
```

Data collection means a value read from somewhere — a request, a form, a row, an argument. An object whose values are all literals, constants declared in the file, or arrays and objects of those, is configuration and is no longer reported. One collected value among literal defaults keeps the finding.
