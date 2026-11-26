const {
  verifyOptionModel,
  VERIFIERS,
  OPTION_SHAPES,
} = require('../../jwt.cjs');
const { tag } = require('../../lib.cjs');

const base = verifyOptionModel({
  rule: 'require-algorithm-whitelist',
  options: () => ({
    x: "algorithms: ['RS256']",
    alt: "algorithms: ['RS256', 'ES256']",
    // `algorithm` (singular) is a sign option: verify ignores it, so it pins
    // nothing and must not satisfy the rule.
    other: "algorithm: 'RS256'",
  }),
});

// What the verify is handed as its key. jose fixes the algorithm family from
// the key it is given, so a key set or raw bytes needs no `algorithms` list.
const KEYS = {
  OpaqueKey: { expr: 'key', jose: '' },
  BytesKey: { expr: 'new TextEncoder().encode(secret)', jose: '' },
  KeySetKey: {
    expr: 'createLocalJWKSet({ keys })',
    jose: ', createLocalJWKSet',
  },
};

module.exports = {
  ...base,
  domain: 561, // 11 verifiers x 17 option shapes x 3 key kinds
  traces: 6000,
  key: (s) => `${base.key(s)}|${tag(s.keyKind)}`,
  code: (s) => {
    const v = tag(s.verifier);
    const k = KEYS[tag(s.keyKind)];
    const isJose = v === 'Jose' || v === 'JoseCompact';
    const [pre, opts] = OPTION_SHAPES({
      x: "algorithms: ['RS256']",
      alt: "algorithms: ['RS256', 'ES256']",
      other: "algorithm: 'RS256'",
    })[tag(s.shape)];
    const [imp, call] = isJose
      ? VERIFIERS[v](opts, k.expr, k.jose)
      : VERIFIERS[v](opts).map((part, i) =>
          i === 1 ? part.replace(/\bkey\b/, k.expr) : part,
        );
    const body =
      v === 'NestService'
        ? `export class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  check(token: string, opts: any) {
    return ${call};
  }
}`
        : `export async function check(token: string, key: any, opts: any, secret: string, keys: any) {
  return ${call};
}`;
    return [imp, pre, body].filter(Boolean).join('\n');
  },
};
