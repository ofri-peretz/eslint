# Writing a fidelity model

One model per rule, as a pair in `models/<plugin>/`:

- `<rule_name_with_underscores>.qnt`: what the rule **should** decide.
- `<rule_name_with_underscores>.cjs`: turns one sampled input into real source.

`npm run fidelity -- <plugin>/<model>` samples the model, lints every input with
the built rule and fails on any disagreement, or if the sampled inputs do not
cover the declared `domain`. A full `npm run fidelity` also fails while any rule
in the five plugins has no model.

## The model is the spec, not a copy of the code

The spec follows AGENTS.md "Flag only clear problems": a model reports only
what the code proves is a real problem, and decides by structure, never by
matching specific string values such as hostnames, IP ranges or value lists.
Where the docs leave a case to judgment, model it as silent.

Write the `.qnt` from the rule's contract: `docs/rules/<rule>.md`, the CWE it
cites, its options schema, and what a correct implementation must do. Do not
transcribe `index.ts` branch by branch: a model copied from the code agrees with
the code by construction and can only ever find nothing.

Model the inputs a real codebase writes, especially the ones a rule tends to
miss:

- every spelling of the sink: `a.b()`, `a['b']()`, a destructured or renamed
  import, `require` vs `import`, a `node:` specifier
- the evidence the rule must see (an import, a request-derived value) present
  and absent, and the safe twin of every unsafe input
- each option at default and at a non-default value

Keep the domain finite and small (aim for ≤ 1000 inputs) so the run proves
coverage of all of it.

## Shape

```quint
// Model of eslint-plugin-<plugin>/<rule> (CWE-<n>).
module <rule_name> {
  type Sink = A | B | C
  pure def reports(s: Sink, evidence: bool): bool = ...
  var sink: Sink
  var evidence: bool
  var verdict: bool
  action step = {
    nondet s = Set(A, B, C).oneOf()
    nondet e = Set(true, false).oneOf()
    all { sink' = s, evidence' = e, verdict' = reports(s, e) }
  }
  action init = step
}
```

```js
const { tag } = require('../../lib.cjs');
module.exports = {
  rule: '<rule-name>',
  domain: 6, // 3 sinks x evidence: the exact count of distinct `key` values
  traces: 300, // raise until the run reports inputs=domain/domain
  key: (s) => `${tag(s.sink)}|evidence=${s.evidence}`,
  config: (s) => undefined, // or the rule options for this input
  code: (s) => '...', // valid TS that parses; the rule runs on src/app.ts
  // filename: 'src/x.controller.ts',  // or (s) => ..., when the rule cares about the path
};
```

Every `key` must be distinct per abstract input, and `domain` must equal the
number of distinct keys. See the five existing models for worked examples.

## Rules that read other files

A rule that follows imports (a cycle, a missing export, an unresolved path, a
dependency missing from `package.json`) needs the files it reads. Add `files`:

```js
module.exports = {
  rule: 'named',
  typed: true, // lint with type information (a TS program over the files)
  // settings: { 'import/resolver': { typescript: true } }, // ESLint settings
  files: (s) => ({
    'src/dep.ts': 'export const real = 1;\n',
    'package.json': '{ "name": "app" }\n',
  }),
  code: (s) => "import { real } from './dep';\n", // the linted file
  // filename: 'src/app.ts' (the default) is where `code` is written
};
```

The runner writes `files` plus `code` (at `filename`) into a fresh temp dir,
lints `filename` there with the dir as the ESLint `cwd`, and deletes the dir.
With `typed: true` it adds a `tsconfig.json` (`moduleResolution: bundler`,
`allowJs`) unless the input brings one, and lints with
`parserOptions.project`. Each distinct input is linted once, however often
Quint samples it, so a typed model costs one TS program per domain input:
keep those domains small. `settings` works with or without `files`.
`imports.cjs` renders every import spelling (`importOf(form, spec)`) for the
import-next models.

## When the model and the rule disagree

Decide which one is wrong, from the rule's documented contract:

- **The rule is wrong** (a real false positive or false negative): keep the
  model, and report the divergence with the exact code. It gets fixed in the
  rule, with a test that fails first.
- **The model is wrong** (you misread the contract): fix the model.

Never bend the model toward the code just to make the run pass.
