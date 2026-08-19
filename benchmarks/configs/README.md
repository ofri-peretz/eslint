# One runnable lint config per rule

566 configs, one for each exported rule across 30 plugins. Every number this
repo publishes should be reproducible by someone who does not trust us, and
these are that promise made literal.

```bash
npx eslint --config benchmarks/configs/<plugin>__<rule>.config.mjs \
           --no-config-lookup <path>
```

For example, the ReDoS rule against the corpus:

```bash
npx eslint --config benchmarks/configs/secure-coding__no-redos-vulnerable-regex.config.mjs \
           --no-config-lookup benchmarks/.real-source-cache
```

## What each one contains

Three lines. One rule, at `error`, and nothing else — so a finding can only have
come from the rule named in the filename. Everything shared lives in
[`base.mjs`](./base.mjs): the file extensions, the parser, and the exclusions.

That centralisation is not tidiness. Three separate instruments in this repo
measured the same rule against three different file lists before it was shared,
and a comparison between tools that saw different files is not a comparison.

## Regenerating

```bash
npx tsx scripts/gen-rule-configs.mts
```

Do not hand-edit the generated files; edit the generator or `base.mjs`.

## Naming

`<plugin>__<rule>.config.mjs`, with any slash in the rule name flattened to
`__`. A few plugins namespace rules by category — `react/jsx-key` inside
`react-features` — so the real rule id is `react-features/react/jsx-key` while
the file is `react-features__react__jsx-key.config.mjs`. The id inside the file
is always the real one.

## The exclusions, and one trap

`base.mjs` anchors each directory pattern one level inside a repository. A bare
`**/benchmarks/**` also matches the corpus's own location under
`benchmarks/.real-source-cache`, which silently excludes every file — that
produced a run reporting **0 findings for five rules**, and read exactly like
five perfect rules.
