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
  try { warm(claims.tenant); } finally { jwt.verify(token, key, { algorithms: ['HS256'] }); }
  return claims;
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
