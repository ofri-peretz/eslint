/**
 * ADVERSARIAL SAFE - a test-support registry with its OWN `require`. The
 * identifier is a local function declaration; the string names a key in
 * `stubs`, and nothing is loaded from npm.
 */
const stubs = {
  'node-forge': { pki: {} },
  sjcl: { encrypt: () => 'STUB' },
};

function require(id) {
  if (!(id in stubs)) throw new Error(`no stub registered for ${id}`);
  return stubs[id];
}

export const forgeStub = () => require('node-forge');
