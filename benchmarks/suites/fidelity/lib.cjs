/**
 * Helpers for model adapters (`models/<plugin>/<model>.cjs`).
 *
 * Quint writes ITF JSON: integers as `{ "#bigint": "3" }`, sum-type values as
 * `{ tag, value }`. These read them back as plain JS values.
 */
const num = (v) =>
  v && typeof v === 'object' && '#bigint' in v
    ? Number(v['#bigint'])
    : Number(v);
const tag = (v) => (v && typeof v === 'object' && 'tag' in v ? v.tag : v);

/**
 * Add a test-file dimension to a model adapter whose rule exempts test files
 * through an option (`allowInTests`, `ignoreInTests`, `ignoreFiles`).
 *
 * The `.qnt` side declares `type TestCtx = Prod | TestDefault | TestFlip` and a
 * `testCtx` state variable:
 *
 *   - `Prod`        — the model's own filename, options as the model sets them;
 *   - `TestDefault` — `testFile`, with the option left at its default;
 *   - `TestFlip`    — `testFile`, with the option set to `flip` (its
 *                     non-default value).
 *
 * The wrapper triples `domain`, extends `key` with the context, and raises
 * `traces` so the larger domain is still covered.
 */
function withTestFile(cfg, { option, flip, testFile = 'src/app.test.ts' }) {
  const key = cfg.input ?? cfg.key;
  const filename = (s) =>
    typeof cfg.filename === 'function' ? cfg.filename(s) : cfg.filename;
  return {
    ...cfg,
    input: undefined,
    domain: cfg.domain * 3,
    traces: Math.ceil((cfg.traces ?? 300) * 3.5),
    key: (s) => `${key(s)}|test=${tag(s.testCtx)}`,
    filename: (s) => (tag(s.testCtx) === 'Prod' ? filename(s) : testFile),
    config: (s) => {
      const base = cfg.config?.(s);
      return tag(s.testCtx) === 'TestFlip'
        ? { ...(base ?? {}), [option]: flip }
        : base;
    },
  };
}

module.exports = { num, tag, withTestFile };
