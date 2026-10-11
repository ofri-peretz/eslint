/**
 * Tests for no-decode-without-verify rule
 * Security: CWE-345 (Data Authenticity)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDecodeWithoutVerify } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-decode-without-verify', () => {
  describe('Valid Code - Verify Operations', () => {
    ruleTester.run('valid - verify operations', noDecodeWithoutVerify, {
      valid: [
        // jwt.verify is safe
        {
          name: 'verify',
          code: `import jwt from 'jsonwebtoken';
const payload = jwt.verify(token, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['RS256'] });`,
        },
        // jose jwtVerify is safe
        {
          code: `import jwt from 'jsonwebtoken';
const { payload } = await jwtVerify(token, key);`,
        },
        // sign is not flagged
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        },
      ],
      invalid: [],
    });
  });

  // The reported false positive ("matches any method named decode") does not
  // reproduce: the SDK-evidence gate resolves the callee to an imported JWT
  // library first. These are the two shapes from the report, locked so the
  // gate cannot be removed without a red test. Both are verbatim from the
  // 8-repo corpus scan.
  describe('Valid Code - decode() on a non-JWT receiver', () => {
    ruleTester.run('valid - SDK-evidence gate', noDecodeWithoutVerify, {
      valid: [
        // Shopify/cli packages/cli-kit/src/public/node/toml/toml-file.ts:48 —
        // a TOML file parser. No JWT library imported in the file at all.
        `file.content = file.decode(raw);`,
        // okta/okta-auth-js lib/oidc/handleOAuthResponse.ts:109 — Okta's own
        // SDK method. That file imports only relative paths, so the file-level
        // gate is what saves it.
        `import { clone } from '../util';
const accessJwt = sdk.token.decode(accessToken);`,
        // The same call in a file that DOES import a JWT library, with the
        // receiver imported from somewhere else. This is the argon2 shape the
        // foreign-import gate was built for, one member deeper: the gate read
        // only a bare Identifier receiver, so `sdk.token.decode` never had its
        // root (`sdk`) checked at all.
        `import jwt from 'jsonwebtoken';
import { sdk } from '@okta/okta-auth-js';
const accessJwt = sdk.token.decode(accessToken);`,
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Decode Operations', () => {
    ruleTester.run('invalid - decode without verify', noDecodeWithoutVerify, {
      valid: [],
      invalid: [
        // Basic jwt.decode()
        {
          name: 'decode reads the claims without checking who signed them',
          code: `import jwt from 'jsonwebtoken';
const payload = jwt.decode(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // jose's decode is `decodeJwt`. The method set listed `decodeJWT`, an
        // all-caps spelling no JWT library ships, so this went unreported even
        // though jose is a listed library.
        {
          code: `import { decodeJwt } from 'jose';
const claims = decodeJwt(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // decode with options
        {
          code: `import jwt from 'jsonwebtoken';
const decoded = jwt.decode(token, { complete: true });`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // Using payload directly
        {
          code: `import jwt from 'jsonwebtoken';
const userId = jwt.decode(token).sub;`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // jwt-decode library - jwtDecode pattern
        {
          code: `import jwt from 'jsonwebtoken';
const payload = jwtDecode(accessToken);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        // jwt-decode library - jwt_decode pattern (snake_case import)
        {
          code: `import jwt from 'jsonwebtoken';
const payload = jwt_decode(accessToken);`,
          errors: [{ messageId: 'jwtDecodeLibrary' }],
        },
        // jose decodeJwt (decode only)
        {
          code: `import jwt from 'jsonwebtoken';
const payload = decodeJWT(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Corpus regressions
// ---------------------------------------------------------------------------
// `decode()` cannot be replaced by `verify()` when there is no key to verify
// with — exactly the position a client is in when checking whether its own
// token has expired so it can refresh. twilio's TokenAuthStrategy.isTokenExpired
// (src/auth_strategy/TokenAuthStrategy.ts:49) is the corpus case, and its own
// comment says so: "Decode the token without verifying the signature, as we
// only want to read the expiration for this check."
ruleTester.run('no-decode-without-verify (corpus)', noDecodeWithoutVerify, {
  valid: [
    // The twilio shape, reduced.
    `import jwt from 'jsonwebtoken';
     function isTokenExpired(token) {
       const decoded = jwt.decode(token);
       if (!decoded || !decoded.exp) return true;
       return Date.now() >= decoded.exp * 1000;
     }`,
    // Direct member read of a time claim.
    `import jwt from 'jsonwebtoken';
     const stale = jwt.decode(token).exp < now;`,
    // The corpus writes `as JwtPayload` between the call and the declarator;
    // the type wrapper must not hide the binding.
    `import jwt from 'jsonwebtoken';
     const decoded = jwt.decode(token) as JwtPayload;
     if (decoded.exp < now) refresh();`,
  ],
  invalid: [
    // Reading an AUTHORIZATION claim from an unverified token is the whole
    // point of the rule. Shopify's exchange.ts:291 does this with `.sub`.
    {
      code: `import { decodeJwt } from 'jose';
     const userId = decodeJwt(idToken).sub;`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
    // A time claim AND an identity claim is still a finding.
    {
      code: `import jwt from 'jsonwebtoken';
     const d = jwt.decode(token);
     if (d.exp < now) refresh();
     grantAccess(d.role);`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
    // Passing the decoded object on is an unbounded use.
    {
      code: `import jwt from 'jsonwebtoken';
     const d = jwt.decode(token);
     if (!d.exp) return;
     audit(d);`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
    // A destructuring declarator that pulls an authority claim. (Audit
    // 2026-10: this case used to be `const { exp } = jwt.decode(token)` and
    // was reported only because a destructuring pattern was not followed —
    // an implementation limit, not a judgement. Destructuring nothing but time
    // claims is the frontend refresh check and is now valid; pulling `sub`
    // alongside `exp` keeps the recall this case was guarding.)
    {
      code: `import jwt from 'jsonwebtoken';
     const { exp, sub } = jwt.decode(token);`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
    // A computed claim read cannot be checked statically.
    {
      code: `import jwt from 'jsonwebtoken';
     const d = jwt.decode(token);
     use(d[claimName]);`,
      errors: [{ messageId: 'decodeWithoutVerify' }],
    },
  ],
});

// A receiver built from a platform constructor was never a JWT client.
// `new TextDecoder().decode(bytes)` shares a method name with JWT decoding and
// nothing else — auth0's express-openid-connect has exactly this line in
// lib/appSession.js:92, reported as decoding a token without verifying it.
ruleTester.run(
  'no-decode-without-verify — built-in receivers',
  noDecodeWithoutVerify,
  {
    valid: [
      `import jwt from 'jsonwebtoken';\nconst cleartext = new TextDecoder().decode(plaintext);`,
      `import jwt from 'jsonwebtoken';\nconst p = new URLSearchParams(q).toString();`,
    ],
    invalid: [
      // The real thing still reports, in the same file shape.
      {
        code: `import jwt from 'jsonwebtoken';\nconst claims = jwt.decode(token);\nuse(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  },
);

// ---------------------------------------------------------------------------
// PROVENANCE — a token read off a token-endpoint grant response is not
// attacker-supplied. Every fixture below is red on the pre-provenance rule,
// which had no source model at all and reported any `decode()` it could see.
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-decode-without-verify — grant-response provenance',
  noDecodeWithoutVerify,
  {
    valid: [
      /*
       * Audit 2026-10 (zero-deferral pass, owner decision on FN-8): the five
       * corpus cases that stood here are now INVALID (first five in the
       * invalid list). They were exempted because the token was read off a
       * member NAMED `access_token` / `id_token` / `refresh_token` of a
       * receiver not NAMED like a request — so `data.id_token` from
       * `await request.json()` (a browser POST) was exempt too. The exemption
       * now rests on provenance: the value must come, structurally, from a
       * back-channel HTTP response this code made — `fetch(...).json()`, an
       * axios/got/ky/undici response, an openid-client grant. None of the five
       * shows that within its file (each receives the response as a parameter
       * from elsewhere), so each reports. Code that truly decodes a token it
       * fetched itself can say so with `@verified-separately`, or keep the
       * fetch in view.
       */
      {
        // @found FN-8, reasoned during the 2026-10-10 zero-deferral pass
        name: 'FP: a token read off the JSON body of a fetch() to the token endpoint',
        code: `import { decodeJwt } from 'jose';
export async function exchange(code) {
  const res = await fetch(tokenUrl, { method: 'POST', body: form(code) });
  const tokens = await res.json();
  return decodeJwt(tokens.id_token).sub;
}`,
      },
      {
        name: 'a token destructured straight off an awaited fetch body',
        code: `import { decodeJwt } from 'jose';
export async function exchange(code) {
  const { access_token } = await (await fetch(tokenUrl, { method: 'POST' })).json();
  return decodeJwt(access_token as string).scope;
}`,
      },
      {
        name: "a token read off an axios response's data",
        code: `import axios from 'axios';
import { decodeJwt } from 'jose';
const http = axios.create({ baseURL });
export async function refresh(rt) {
  const response = await http.post('/oauth/token', { refresh_token: rt });
  return decodeJwt(response.data.access_token).exp;
}`,
      },
      {
        name: "a token read off got's parsed JSON",
        code: `import got from 'got';
import { decodeJwt } from 'jose';
export async function exchange(code) {
  const body = await got.post(tokenUrl, { form: { code } }).json();
  return decodeJwt(body.id_token).sub;
}`,
      },
      {
        name: "a token read off undici's response body",
        code: `import { request } from 'undici';
import { decodeJwt } from 'jose';
export async function exchange(code) {
  const { body } = await request(tokenUrl, { method: 'POST' });
  const tokens = await body.json();
  return decodeJwt(tokens.id_token).sub;
}`,
      },
      {
        name: 'a token from an openid-client grant',
        code: `import * as client from 'openid-client';
import { decodeJwt } from 'jose';
export async function callback(config, url) {
  const tokens = await client.authorizationCodeGrant(config, url);
  return decodeJwt(tokens.access_token).scope;
}`,
      },
      {
        name: "a token from openid-client's back-channel callback()",
        code: `import { Issuer } from 'openid-client';
import { decodeJwt } from 'jose';
const issuer = await Issuer.discover(issuerUrl);
const client = new issuer.Client({ client_id });
export async function cb(req) {
  const tokenSet = await client.callback(redirectUri, client.callbackParams(req));
  return decodeJwt(tokenSet.id_token).sub;
}`,
      },
      {
        name: 'a parameter every caller feeds from a fetched body',
        code: `import { decodeJwt } from 'jose';
function readScope(token) { return decodeJwt(token).scope; }
export async function exchange(code) {
  const tokens = await (await fetch(tokenUrl)).json();
  return readScope(tokens.access_token);
}`,
      },
    ],
    invalid: [
      // Corpus: auth0/express-openid-connect lib/context.js:184
      // (`extractActClaim`). The token is a field of the response openid-client
      // just got back from the token endpoint.
      {
        name: 'no provenance: a field of a parameter named like a token exchange (auth0 extractActClaim)',
        code: `import { decodeJwt } from 'jose';
function extractActClaim(exchanged) {
  if (exchanged.access_token) {
    const decoded = decodeJwt(exchanged.access_token);
    if (decoded.act) return decoded.act;
  }
  return undefined;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // Corpus: Shopify/cli packages/cli-kit/src/private/node/session/exchange.ts:291
      // (`buildIdentityToken`) — the decoded `sub` becomes a local cache key.
      {
        name: 'no provenance: a field of a parameter named like a token response (Shopify buildIdentityToken)',
        code: `import * as jose from 'jose';
function buildIdentityToken(result) {
  return { userId: result.id_token ? jose.decodeJwt(result.id_token).sub! : undefined };
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // Corpus: auth0/express-openid-connect lib/context.js:221
      // (`warnIfNotCertificateBound`). The grant response is TWO frames up: the
      // parameter hop is what makes this one work, and a strictly same-function
      // model would still report it.
      {
        name: 'no provenance: a parameter fed by a parameter named session (auth0 warnIfNotCertificateBound)',
        code: `import { decodeJwt } from 'jose';
function warnIfNotCertificateBound(config, accessToken) {
  const decoded = decodeJwt(accessToken);
  if (!decoded.cnf) console.warn('not certificate-bound');
}
function onCallback(config, session) {
  warnIfNotCertificateBound(config, session.access_token);
}
function onRefresh(config, session) {
  warnIfNotCertificateBound(config, session.access_token);
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // Corpus: auth0/express-openid-connect lib/tokenset.js:63 (`claims()`).
      // DISPUTED upstream; exempted here for the same reason as the rest —
      // `id_token` is a grant-response field name, and `this` is the TokenSet
      // that response was parsed into. (It is also verified at issuance and
      // stored in an A256GCM-encrypted cookie, so the value never round-trips
      // through anything the attacker can write.)
      {
        name: 'no provenance: this.id_token on a class named TokenSet (auth0 TokenSet.claims)',
        code: `const { decodeJwt } = require('jose');
class TokenSet {
  claims() {
    if (!this.id_token) return undefined;
    return decodeJwt(this.id_token);
  }
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // One `const` hop, and the `as` wrapper TypeScript adds.
      {
        name: 'no provenance: a field of a parameter named grant, behind an as-cast',
        code: `import { decodeJwt } from 'jose';
function f(grant) {
  const raw = grant.refresh_token as string;
  return decodeJwt(raw);
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // THE FRONT CHANNEL. `response_mode=form_post` posts `id_token` into the
      // request body and openid-client hands callback `params` with the same
      // keys — identical member name, opposite trust. Verifying these is the
      // whole point of the callback, so the exemption must not reach them.
      {
        code: `import { decodeJwt } from 'jose';
const claims = decodeJwt(req.body.id_token);
grant(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        code: `import { decodeJwt } from 'jose';
const claims = decodeJwt(params.access_token);
grant(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // A member name that is not a grant-response field.
      {
        code: `import { decodeJwt } from 'jose';
const claims = decodeJwt(session.bearer);
grant(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // Computed member — nothing to read the field name from.
      {
        code: `import { decodeJwt } from 'jose';
const claims = decodeJwt(grant[field]);
grant(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // Private field: non-computed, but the property is a PrivateIdentifier.
      {
        code: `import { decodeJwt } from 'jose';
class S { #id_token = t; read() { return decodeJwt(this.#id_token); } }`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // Neither a member nor an identifier.
      {
        code: `import { decodeJwt } from 'jose';
const claims = decodeJwt('a.b.c');
grant(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // An unresolvable (global / injected) binding proves nothing.
      {
        code: `import { decodeJwt } from 'jose';
const claims = decodeJwt(globalToken);
grant(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // A declared-but-uninitialised local proves nothing.
      {
        code: `import { decodeJwt } from 'jose';
let token;
const claims = decodeJwt(token);
grant(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // An imported binding is not traceable from this file.
      {
        code: `import { decodeJwt } from 'jose';
import { token } from './token';
const claims = decodeJwt(token);
grant(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // A destructured parameter: the binding is not one of `params`.
      {
        code: `import { decodeJwt } from 'jose';
function read({ id_token }) { return decodeJwt(id_token); }
read(grant);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // An arrow function has no name to find call sites by.
      {
        code: `import { decodeJwt } from 'jose';
const read = (t) => decodeJwt(t);
read(grant.id_token);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // A named function nobody calls in this file — an exported helper is
      // never exempted, because its callers are somewhere else.
      {
        code: `import { decodeJwt } from 'jose';
export function read(t) { return decodeJwt(t); }`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // Referenced, but not called — passing the function as a value says
      // nothing about its arguments.
      {
        code: `import { decodeJwt } from 'jose';
function read(t) { return decodeJwt(t); }
register(read);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // Called with the parameter slot empty.
      {
        code: `import { decodeJwt } from 'jose';
function read(t) { return decodeJwt(t); }
read();`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // ONE bad call site is enough: the second caller hands it the raw
      // Authorization header.
      {
        code: `import { decodeJwt } from 'jose';
function read(t) { return decodeJwt(t); }
read(grant.id_token);
read(req.headers.authorization);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // Past the depth limit — provenance, not a solver.
      {
        code: `import { decodeJwt } from 'jose';
function f(grant) {
  const a = grant.id_token;
  const b = a;
  const c = b;
  const d = c;
  const e = d;
  return decodeJwt(e);
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  },
);

// ---------------------------------------------------------------------------
// FP/FN audit 2026-10
// ---------------------------------------------------------------------------
describe('no-decode-without-verify — audit 2026-10', () => {
  ruleTester.run(
    'time claims, header kid, non-JWT receivers',
    noDecodeWithoutVerify,
    {
      valid: [
        {
          name: 'FP-5: a destructured exp is a time-claim read',
          code: `import { jwtDecode } from 'jwt-decode';
export function isTokenExpired(token) {
  const { exp } = jwtDecode(token);
  return Date.now() >= exp * 1000;
}`,
        },
        {
          name: 'FP-5: destructuring several time claims, one renamed',
          code: `import { jwtDecode } from 'jwt-decode';
const { exp, iat: issuedAt, 'nbf': notBefore } = jwtDecode(token);`,
        },
        {
          name: 'FP-6: decoding the header to pick the JWKS key by kid',
          code: `import jwt from 'jsonwebtoken';
export async function verifyToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) throw new Error('malformed');
  const key = await client.getSigningKey(decoded.header.kid);
  return jwt.verify(token, key.getPublicKey(), { algorithms: ['RS256'] });
}`,
        },
        {
          name: 'FP-6: reading kid straight off the decode call',
          code: `import jwt from 'jsonwebtoken';
const kid = jwt.decode(token, { complete: true }).header.kid;`,
        },
        {
          name: 'FP-6: allowHeaderInspection permits any header read',
          code: `import jwt from 'jsonwebtoken';
const decoded = jwt.decode(token, { complete: true });
const alg = decoded.header.alg;`,
          options: [{ allowHeaderInspection: true }],
        },
        {
          name: 'FP-6: allowHeaderInspection permits reading the header object itself',
          code: `import jwt from 'jsonwebtoken';
const header = jwt.decode(token, { complete: true }).header;`,
          options: [{ allowHeaderInspection: true }],
        },
        {
          name: 'FP-7: a TextDecoder held in a const',
          code: `import { jwtVerify } from 'jose';
const decoder = new TextDecoder();
export const text = (bytes) => decoder.decode(bytes, { stream: true });`,
        },
        {
          name: "FP-7: jose's base64url codec",
          code: `import { base64url, jwtVerify } from 'jose';
const secret = base64url.decode(process.env.JWT_SECRET_B64);`,
        },
        {
          name: "FP-7: jose's base64url codec through a namespace import",
          code: `import * as jose from 'jose';
const secret = jose.base64url.decode(process.env.JWT_SECRET_B64);`,
        },
      ],
      invalid: [
        {
          name: 'FP-5 keeps recall: destructuring an authority claim',
          code: `import { jwtDecode } from 'jwt-decode';
const { exp, role } = jwtDecode(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        {
          name: 'FP-5 keeps recall: a rest element passes the claims on',
          code: `import { jwtDecode } from 'jwt-decode';
const { exp, ...claims } = jwtDecode(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        {
          name: 'an array-destructured decode has no claim name to check',
          code: `import { jwtDecode } from 'jwt-decode';
const [first] = jwtDecode(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        {
          name: 'FP-5 keeps recall: a computed destructuring key names nothing',
          code: `import { jwtDecode } from 'jwt-decode';
const { [claim]: value } = jwtDecode(token);`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        {
          name: 'FP-6 keeps recall: header.alg without the option',
          code: `import jwt from 'jsonwebtoken';
const decoded = jwt.decode(token, { complete: true });
const alg = decoded.header.alg;`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        {
          name: 'FP-6 keeps recall: the payload read next to the kid',
          code: `import jwt from 'jsonwebtoken';
const decoded = jwt.decode(token, { complete: true });
const kid = decoded.header.kid;
const sub = decoded.payload.sub;`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        {
          name: 'FP-6 keeps recall: a bare header with the option off',
          code: `import jwt from 'jsonwebtoken';
const header = jwt.decode(token, { complete: true }).header;`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        {
          name: 'FP-6 keeps recall: a decoded value only checked for presence reads nothing',
          code: `import jwt from 'jsonwebtoken';
const decoded = jwt.decode(token, { complete: true });
if (!decoded) throw new Error('x');`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
        {
          name: 'FP-7 keeps recall: a const built by a JWT library still decodes',
          code: `import jwt from 'jsonwebtoken';
import { createDecoder } from 'fast-jwt';
const d = createDecoder();
d.decode(token).role;`,
          errors: [{ messageId: 'decodeWithoutVerify' }],
        },
      ],
    },
  );
});

// ---------------------------------------------------------------------------
// Zero-deferral pass (audit 2026-10): provenance, not names, for FN-8.
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-decode-without-verify — back-channel provenance',
  noDecodeWithoutVerify,
  {
    valid: [],
    invalid: [
      {
        // @found FN-8, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md)
        name: 'FN: an id_token the browser POSTed, read off request.json()',
        code: `import { decodeJwt } from 'jose';
export async function POST(request) {
  const data = await request.json();
  const claims = decodeJwt(data.id_token);
  return createSession(claims.sub);
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        // @found FN-8, reasoned during the 2026-10-10 zero-deferral pass
        name: "FN: openid-client's callbackParams are the front channel",
        code: `import { Issuer } from 'openid-client';
import { decodeJwt } from 'jose';
const issuer = await Issuer.discover(issuerUrl);
const client = new issuer.Client({ client_id });
export function cb(req) {
  const params = client.callbackParams(req);
  return decodeJwt(params.id_token).sub;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a fetch that is shadowed by a local binding is not the platform fetch',
        code: `import { decodeJwt } from 'jose';
export async function f(fetch) {
  const t = await (await fetch(u)).json();
  return decodeJwt(t.id_token).sub;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a response from an unrelated library is not a back channel',
        code: `import { decodeJwt } from 'jose';
import { fromCache } from './cache';
export async function f() {
  const t = await fromCache('tokens');
  return decodeJwt(t.id_token).sub;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  },
);
