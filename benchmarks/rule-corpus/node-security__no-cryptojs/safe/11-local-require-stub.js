/**
 * ADVERSARIAL SAFE - a test-support module registry with its OWN `require`.
 * The identifier is a local function declaration and the string names a key in
 * `stubs`; this file loads nothing from npm. A report here would be a match on
 * the callee's spelling, not on a module load.
 */
const stubs = {
  'crypto-js': { AES: { encrypt: () => 'STUB', decrypt: () => 'STUB' } },
};

function require(id) {
  if (!(id in stubs)) throw new Error(`no stub registered for ${id}`);
  return stubs[id];
}

export const legacyCipherStub = () => require('crypto-js');
