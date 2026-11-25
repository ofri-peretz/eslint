/**
 * Decoding a token to find out whose it is, then verifying it with that
 * owner's key, is not "decode without verify".
 *
 * brocoders/nestjs-boilerplate `src/auth/auth.service.ts`, resetPassword():
 *
 *   const jwtData = this.jwtService.decode<{ forgotUserId?: string }>(hash);
 *   user = await this.usersService.findById(jwtData?.forgotUserId);
 *   await this.jwtService.verifyAsync(hash, {
 *     secret: this.getForgotSecret(user),
 *     algorithms: ['HS256'],
 *   });
 *
 * The token is signed with a per-user secret, so it cannot be verified before
 * the decode names the user. It was reported at CWE-345.
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
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const nest = `import { JwtService } from '@nestjs/jwt';`;
const jsonwebtoken = `import jwt from 'jsonwebtoken';`;

ruleTester.run(
  'no-decode-without-verify — decode to pick the key',
  noDecodeWithoutVerify,
  {
    valid: [
      {
        name: 'the brocoders reset flow: decode, load the user, verifyAsync with a pinned algorithm',
        code: `${nest}
class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  async resetPassword(hash, password) {
    let userId;
    try {
      const jwtData = this.jwtService.decode(hash);
      userId = jwtData?.forgotUserId;
    } catch {
      userId = undefined;
    }
    const user = await this.usersService.findById(userId);
    try {
      await this.jwtService.verifyAsync(hash, {
        secret: this.getForgotSecret(user),
        algorithms: ['HS256'],
      });
    } catch {
      throw new Error('invalidHash');
    }
    user.password = password;
  }
}`,
      },
      {
        name: 'jsonwebtoken: decode for the key id, then verify the same const',
        code: `${jsonwebtoken}
async function check(raw) {
  const token = raw;
  const { header } = jwt.decode(token, { complete: true });
  const key = await keys.get(header.kid, header.typ);
  const payload = jwt.verify(token, key, { algorithms: ['RS256', 'ES256'] });
  return payload;
}`,
      },
      {
        name: 'the verify result is returned directly',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  return jwt.verify(token, secretFor(claims.tenant), { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'the verify result is assigned to an existing binding',
        code: `${jsonwebtoken}
function check(token) {
  let payload;
  const claims = jwt.decode(token);
  payload = jwt.verify(token, secretFor(claims.tenant), { algorithms: ['HS256'] }) as Claims;
  return payload;
}`,
      },
      {
        name: 'a verify in finally runs on every path',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  try { warm(); } finally { jwt.verify(token, key, { algorithms: ['HS256'] }); }
  return claims;
}`,
      },
      {
        name: 'a decode whose result is discarded',
        code: `${jsonwebtoken}
function check(token) {
  jwt.decode(token);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a decode assigned to an existing local, used only after the verify',
        code: `${jsonwebtoken}
function check(token) {
  let claims;
  claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: ['HS256'] });
  return claims;
}`,
      },
      {
        name: 'a decode read straight into a lookup bound to the key',
        code: `${jsonwebtoken}
function check(token) {
  const key = secretFor(jwt.decode(token).tenant);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a read of the binding before the decode is not derived from it',
        code: `${jsonwebtoken}
function check(token) {
  let claims;
  log(claims);
  claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a lookup through new, read for the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, new Keys(claims.tenant).secret, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a claim read into a local that nothing uses before the verify',
        code: `${jsonwebtoken}
function check(token) {
  const tenant = jwt.decode(token).tenant;
  jwt.verify(token, key, { algorithms: ['HS256'] });
  return tenant;
}`,
      },
      {
        name: 'an alias of the claims that is only read after the verify',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  const copy = claims;
  jwt.verify(token, key, { algorithms: ['HS256'] });
  return copy;
}`,
      },
      {
        name: 'the claims are used for real work only after the verify',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: ['HS256'] });
  await grantRole(claims.sub, claims.role);
  return claims;
}`,
      },
      {
        name: 'the claim picks the key through a lookup: a call argument that feeds the verify key',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  const user = await users.findById(claims.sub);
  jwt.verify(token, user.secret, { algorithms: ['HS256'] });
  await grantRole(claims.sub);
}`,
      },
      {
        name: 'a lookup result assigned to an existing local, then used as the key',
        code: `${jsonwebtoken}
async function check(token) {
  let user;
  const claims = jwt.decode(token);
  user = await users.findById(claims.sub);
  jwt.verify(token, user.secret, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'destructuring the claim to pick the key',
        code: `${jsonwebtoken}
function check(token) {
  const { tenant } = jwt.decode(token);
  jwt.verify(token, secretFor(tenant), { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a claim read through a non-null assertion feeds a lookup bound to the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  const key = secretFor(claims!.tenant);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a claim cast with as feeds a lookup bound to the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  const key = secretFor((claims as Claims).tenant);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a claim inside a template literal builds the lookup key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  const key = secretFor(\`tenant:\${claims.tenant}\`);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a claim inside an object literal passed to the lookup',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  const key = secretFor({ tenant: claims.tenant });
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'NestJS: the key is the secret option, picked by the claim',
        code: `${nest}
class S {
  constructor(private readonly jwtService: JwtService) {}
  async check(token) {
    const claims = this.jwtService.decode(token);
    await this.jwtService.verifyAsync(token, {
      secret: secretFor(claims.tenant),
      algorithms: ['HS256'],
    });
  }
}`,
      },
      {
        name: 'NestJS: the key is the publicKey option, picked by the claim',
        code: `${nest}
class S {
  constructor(private readonly jwtService: JwtService) {}
  async check(token) {
    const claims = this.jwtService.decode(token);
    await this.jwtService.verifyAsync(token, {
      publicKey: keyFor(claims.tenant),
      algorithms: ['RS256'],
    });
  }
}`,
      },
      {
        name: 'an optional-chained claim feeds a lookup bound to the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  const key = secretFor(claims?.tenant);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a module-level decode followed by an unconditional module-level verify',
        code: `${jsonwebtoken}
const token = read();
const claims = jwt.decode(token);
jwt.verify(token, key, { algorithms: ['HS256'] });`,
      },
    ],
    invalid: [
      {
        // @found CodeRabbit review on eslint#1717 2026-11-24
        name: 'FN: the claims grant a role before the verify runs',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  await grantRole(claims.sub, claims.role);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim in an if condition before the verify',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  if (claims.admin) { elevate(); }
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'the claims are returned before the verify',
        code: `${jsonwebtoken}
function check(token, early) {
  const claims = jwt.decode(token);
  if (early) return claims;
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'the claims are stored on req.user before the verify',
        code: `${jsonwebtoken}
function check(req, token) {
  const claims = jwt.decode(token);
  req.user = claims;
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a single claim stored on req.user before the verify',
        code: `${jsonwebtoken}
function check(req, token) {
  const claims = jwt.decode(token);
  req.userId = claims.sub;
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim copied to a module variable is a write that outlives the function',
        code: `${jsonwebtoken}
let current;
function check(token) {
  const claims = jwt.decode(token);
  current = claims.sub;
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a lookup whose result never reaches the key is not a key lookup',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  const user = await users.findById(claims.sub);
  audit(user);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim copied to a local that is then used for real work',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  const role = claims.role;
  await grantRole(role);
  jwt.verify(token, secretFor(role), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim used as the audience of the verify is not the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: ['HS256'], audience: claims.aud });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a method called on the claims is a use, not a lookup',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  claims.audit();
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'the claims are spread into a call before the verify',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  log({ ...claims });
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a decoded value used inside a nested callback before the verify',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  later(() => grantRole(claims.sub));
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a decode assigned to a local that is then used for real work',
        code: `${jsonwebtoken}
async function check(token) {
  let claims;
  claims = jwt.decode(token);
  await grantRole(claims.sub);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a decode assigned to a module variable outlives the function',
        code: `${jsonwebtoken}
let claims;
function check(token) {
  claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a decode assigned to an undeclared global',
        code: `${jsonwebtoken}
function check(token) {
  claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a decode passed straight to a call that is not a key lookup',
        code: `${jsonwebtoken}
function check(token) {
  grantRole(jwt.decode(token).sub);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim assigned to an undeclared global',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  leaked = claims.sub;
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim that is itself the key lets the attacker choose it',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, claims.secret, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim copied to a local that is then the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  const key = claims.secret;
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'NestJS: a claim as the secret option is the attacker-chosen key',
        code: `${nest}
class S {
  constructor(private readonly jwtService: JwtService) {}
  async check(token) {
    const claims = this.jwtService.decode(token);
    await this.jwtService.verifyAsync(token, { secret: claims.secret, algorithms: ['HS256'] });
  }
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim choosing between two keys is a branch on a claim',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, claims.admin ? adminKey : userKey, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a method called on the claims whose result is the key is not a lookup',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, claims.getKey(), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a lookup result that nothing reads is not a key lookup',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  const user = await users.findById(claims.sub);
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a compound assignment of a claim to a local is not a plain copy',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  let salt = '';
  salt += claims.sub;
  jwt.verify(token, secretFor(salt), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim assigned to a global the scope declares has no local to follow',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  Array = claims.sub;
  jwt.verify(token, key, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a verify before the decode does not cover claims used after it',
        code: `${jsonwebtoken}
function check(token) {
  jwt.verify(token, key, { algorithms: ['HS256'] });
  const claims = jwt.decode(token);
  return claims.sub;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'the token is the key of another verify, not the verified token',
        code: `${jsonwebtoken}
function check(token, other) {
  const claims = jwt.decode(token);
  jwt.verify(other, token, { algorithms: ['HS256'] });
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'the token is only bound to another name',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  const alias = token;
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a decode with no token',
        code: `${jsonwebtoken}
function check() {
  return jwt.decode();
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'NestJS: a lookup of a claim in an option after the key is not the key',
        code: `${nest}
class S {
  constructor(private readonly jwtService: JwtService) {}
  async check(token) {
    const claims = this.jwtService.decode(token);
    await this.jwtService.verifyAsync(token, {
      secret: key,
      algorithms: ['HS256'],
      audience: audienceFor(claims.tenant),
    });
  }
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a lookup of a claim in the verify callback is not the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: ['HS256'] }, () => grant(lookup(claims.sub)));
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'NestJS: a claim as the audience option is not the key',
        code: `${nest}
class S {
  constructor(private readonly jwtService: JwtService) {}
  async check(token) {
    const claims = this.jwtService.decode(token);
    await this.jwtService.verifyAsync(token, {
      secret: key,
      algorithms: ['HS256'],
      audience: claims.aud,
    });
  }
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: "algorithms: ['none'] accepts an unsigned token, so it verifies nothing",
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, null, { algorithms: ['none'] });
  return claims.sub;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: "a pinned list that also allows 'none' still lets an unsigned token through",
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: ['HS256', 'None'] });
  return claims.sub;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a verify that only runs in a branch does not protect the decode',
        code: `${jsonwebtoken}
function check(token, strict) {
  const claims = jwt.decode(token);
  if (strict) jwt.verify(token, secret, { algorithms: ['HS256'] });
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a verify behind && does not run every time',
        code: `${jsonwebtoken}
function check(token, strict) {
  const claims = jwt.decode(token);
  strict && jwt.verify(token, secret, { algorithms: ['HS256'] });
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a verify in the catch block runs only when something failed',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  try { use(claims); } catch { jwt.verify(token, secret, { algorithms: ['HS256'] }); }
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a verify inside a callback may never be called',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  later(() => jwt.verify(token, secret, { algorithms: ['HS256'] }));
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a verify before the decode does not cover it',
        code: `${jsonwebtoken}
function check(token) {
  jwt.verify(token, secret, { algorithms: ['HS256'] });
  return jwt.decode(token);
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'the token binding is reassigned, so the verify may check another token',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  token = refresh();
  jwt.verify(token, secret, { algorithms: ['HS256'] });
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a different token is verified',
        code: `${jsonwebtoken}
function check(token, other) {
  const claims = jwt.decode(token);
  jwt.verify(other, secret, { algorithms: ['HS256'] });
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'the token is only passed along, not verified',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  audit(token);
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a verify with no algorithms lets the token header choose one',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, secretFor(claims.tenant));
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'algorithms taken from the decoded header is the substitution attack',
        code: `${jsonwebtoken}
function check(token) {
  const { header } = jwt.decode(token, { complete: true });
  jwt.verify(token, key, { algorithms: [header.alg] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'an empty algorithms list pins nothing',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: [] });
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'an algorithms value that is not a list pins nothing',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, key, { algorithms: ALGS });
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a token that is not a plain binding cannot be followed',
        code: `${jsonwebtoken}
function check(req) {
  const claims = jwt.decode(req.token);
  jwt.verify(req.token, key, { algorithms: ['HS256'] });
  return claims;
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a global token has no binding to follow',
        code: `${jsonwebtoken}
const claims = jwt.decode(globalToken);
jwt.verify(globalToken, key, { algorithms: ['HS256'] });`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a module-level verify inside an if is still conditional',
        code: `${jsonwebtoken}
const token = read();
const claims = jwt.decode(token);
if (strict) { jwt.verify(token, key, { algorithms: ['HS256'] }); }`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  },
);
