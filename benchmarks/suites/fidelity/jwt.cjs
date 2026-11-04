/**
 * Shared spellings for the jwt-security models (`models/jwt-security/`).
 *
 * Every rule in eslint-plugin-jwt-security is gated on the file importing a JWT
 * library, so each model samples how real code reaches a `jsonwebtoken` method:
 * a default, namespace or required binding (`jwt.verify`), a named, renamed or
 * destructured one (`verify`), a computed member (`jwt['verify']`), and the
 * same call with no JWT import at all, where every rule must stay silent.
 * `Jose` is jose's `jwtVerify`, for the rules that judge a verify.
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */
/** Spelling tag -> (method) => [import line, callee expression]. */
const SPELLINGS = {
  Default: (m) => [`import jwt from 'jsonwebtoken';`, `jwt.${m}`],
  Namespace: (m) => [`import * as jwt from 'jsonwebtoken';`, `jwt.${m}`],
  Require: (m) => [`const jwt = require('jsonwebtoken');`, `jwt.${m}`],
  Named: (m) => [`import { ${m} } from 'jsonwebtoken';`, m],
  // A neutral alias: `verify as jwtVerify` would pass by matching jose's
  // `jwtVerify` export by name, not by following the import.
  Renamed: (m) => [
    `import { ${m} as ${m}Token } from 'jsonwebtoken';`,
    `${m}Token`,
  ],
  RequireDestructured: (m) => [`const { ${m} } = require('jsonwebtoken');`, m],
  Bracket: (m) => [`import jwt from 'jsonwebtoken';`, `jwt['${m}']`],
  NoImport: (m) => ['', `jwt.${m}`],
  // jose's verifier, for the verify-side rules: `jwtVerify(token, key, opts)`.
  Jose: () => [`import { jwtVerify } from 'jose';`, 'await jwtVerify'],
};

/** The import line and the callee for one spelling of `jsonwebtoken.<m>`. */
const spell = (spelling, method) => SPELLINGS[spelling](method);

/**
 * Verifiers for the rules that require an option on every verify:
 * jsonwebtoken in each spelling, jose's `jwtVerify` and `compactVerify` (a JWS
 * verify: it takes `algorithms` but no claim options), and an injected
 * @nestjs/jwt `JwtService`, which takes its options second.
 * Each maps an options expression ('' = none) to [imports, call].
 */
const VERIFIERS = {
  ...Object.fromEntries(
    Object.keys(SPELLINGS)
      .filter((k) => k !== 'Jose')
      .map((k) => [
        k,
        (opts) => {
          const [imp, c] = spell(k, 'verify');
          return [
            imp,
            `${c}(${['token', 'key', opts].filter(Boolean).join(', ')})`,
          ];
        },
      ]),
  ),
  Jose: (opts) => [
    "import { jwtVerify } from 'jose';",
    `await jwtVerify(${['token', 'key', opts].filter(Boolean).join(', ')})`,
  ],
  JoseCompact: (opts) => [
    "import { compactVerify } from 'jose';",
    `await compactVerify(${['token', 'key', opts].filter(Boolean).join(', ')})`,
  ],
  NestService: (opts) => [
    "import { JwtService } from '@nestjs/jwt';",
    `this.jwtService.verify(${['token', opts].filter(Boolean).join(', ')})`,
  ],
};

/**
 * Where a verify's options come from: inline, through every same-file binding
 * the rules document they follow, and from the places they cannot see (a
 * parameter, a call, a spread of a call). `x` is the required option, `alt`
 * another valid spelling of it, `other` an unrelated option.
 * Each maps to [top-level preamble, options expression].
 */
const OPTION_SHAPES = ({ x, alt, other }) => ({
  NoOpts: ['', ''],
  EmptyObj: ['', '{}'],
  OtherOnly: ['', `{ ${other} }`],
  Inline: ['', `{ ${other}, ${x} }`],
  AltSpelling: ['', `{ ${alt} }`],
  ConstWith: [`const verifyOptions = { ${x} };`, 'verifyOptions'],
  ConstWithout: [`const verifyOptions = { ${other} };`, 'verifyOptions'],
  SpreadConstWith: [`const base = { ${x} };`, '{ ...base, complete: true }'],
  SpreadConstWithout: [
    `const base = { ${other} };`,
    '{ ...base, complete: true }',
  ],
  CastWith: ['', `{ ${x} } as VerifyOptions`],
  LetWith: [`let verifyOptions = { ${x} };`, 'verifyOptions'],
  MemberWith: [`const config = { verify: { ${x} } };`, 'config.verify'],
  ReturnWith: [
    `function verifyOptions() {
  return { ${x} };
}`,
    'verifyOptions()',
  ],
  ReturnWithout: [
    `function verifyOptions() {
  return { ${other} };
}`,
    'verifyOptions()',
  ],
  ParamOpts: ['', 'opts'],
  CallOpts: ['', 'getVerifyOptions()'],
  SpreadCall: ['', '{ ...getVerifyOptions() }'],
});

/**
 * The adapter for a "verify must carry option X" model. `options(verifier)`
 * returns `{ x, alt, other }` for that verifier, since jose spells some
 * options differently.
 */
function verifyOptionModel({ rule, options }) {
  const { tag } = require('./lib.cjs');
  return {
    rule,
    domain: 187, // 11 verifiers x 17 option shapes
    traces: 1600,
    key: (s) => `${tag(s.verifier)}|${tag(s.shape)}`,
    code: (s) => {
      const v = tag(s.verifier);
      const [pre, opts] = OPTION_SHAPES(options(v))[tag(s.shape)];
      const [imp, call] = VERIFIERS[v](opts);
      const body =
        v === 'NestService'
          ? `export class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  check(token: string, opts: any) {
    return ${call};
  }
}`
          : `export async function check(token: string, key: any, opts: any) {
  return ${call};
}`;
      return [imp, pre, body].filter(Boolean).join('\n');
    },
  };
}

module.exports = {
  SPELLINGS,
  spell,
  VERIFIERS,
  OPTION_SHAPES,
  verifyOptionModel,
};
