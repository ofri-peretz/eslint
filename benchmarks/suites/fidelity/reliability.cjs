/**
 * Shared helpers for the eslint-plugin-reliability models
 * (`models/reliability/`).
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */
const { tag } = require('./lib.cjs');

/**
 * A `key` built from the named state variables: one distinct string per
 * abstract input, so `domain` is the size of their product (or of the union of
 * the focus slices that declare them).
 */
const keyOf =
  (...fields) =>
  (s) =>
    fields.map((k) => `${k}=${tag(s[k])}`).join(' ');

/** Indent a list of statement lines into a block body. */
const block = (lines, pad = '  ') => lines.map((l) => `${pad}${l}`).join('\n');

module.exports = { keyOf, block };
