/**
 * Shared helpers for the quality-plugin models (`models/operability/`,
 * `models/modularity/`, `models/modernization/`).
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */
const { num, tag } = require('./lib.cjs');

/** A state value as text: a sum-type tag, an ITF integer, or a boolean. */
const show = (v) =>
  v && typeof v === 'object' && '#bigint' in v ? String(num(v)) : tag(v);

/**
 * A `key` built from the named state variables: one distinct string per
 * abstract input, so `domain` is the size of their product (or of the union of
 * the focus slices that declare them).
 */
const keyOf =
  (...fields) =>
  (s) =>
    fields.map((k) => `${k}=${show(s[k])}`).join(' ');

/** Join source lines into a file that ends with a newline. */
const src = (...lines) => [...lines.flat(), ''].join('\n');

module.exports = { keyOf, src };
