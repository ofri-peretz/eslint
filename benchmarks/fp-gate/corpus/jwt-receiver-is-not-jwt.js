// Provenance: LavaMoat/LavaMoat packages/harden/src/pnpm/opinions.js:69 (HEAD 2026-08-22)
// and shardeum/json-rpc-server src/middlewares/debugMiddleware.ts:66.
//
// Benign because: neither repo contains a JWT. `verify` here is an ordinary method
// name. Any rule in eslint-plugin-jwt-security that fires on this is matching a bare
// `.verify(` shape without establishing that the receiver is a JWT library.
const opinion = {
  async apply(changes, facts) {
    if (await this.verify(changes, [], facts)) return [];
    return changes;
  },
  async verify(_changes, _results, facts) {
    return facts.packageJson?.packageManager === 'pnpm@>=11.0.0';
  },
};

// A local ed25519 signature check, not a JWT.
function verify(sigObj, ownerPk) {
  return sigObj.sign.owner === ownerPk;
}
const signatureOk = verify({ sign: { owner: 'k' } }, 'ed25519-pubkey');

module.exports = { opinion, signatureOk };
