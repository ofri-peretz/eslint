/**
 * SAFE - a template literal whose only interpolation is a module `const` bound
 * to a literal. The specifier is fixed at build time and no caller can steer
 * it. This exact shape is marked VALID by eslint-plugin-security's own corpus.
 */
const METHOD = 'debounce';
const SCOPE = 'lodash';

const debounce = require(`${SCOPE}/${METHOD}`);
const merge = require(`lodash/merge`);

export function throttleWrites(write, wait = 200) {
  return debounce(merge(write, {}), wait);
}
