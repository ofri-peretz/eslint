/**
 * ADVERSARIAL SAFE - the same shadow written as an arrow const, which is how a
 * bundle evaluator in a build script binds its module map.
 */
const modules = new Map([['crypto-js', () => ({ AES: {} })]]);

const require = (id) => modules.get(id)?.();

export const evaluate = () => require('crypto-js');
