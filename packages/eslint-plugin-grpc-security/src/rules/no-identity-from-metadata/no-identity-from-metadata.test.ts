/**
 * @fileoverview Tests for no-identity-from-metadata
 *
 * The two lab files are read verbatim from the CWE-290 corpus: the grpc-1
 * "Trust the Gateway" server returns a forwarded identity header as the
 * caller and authorizes on it (reported), and its reference fix resolves the
 * caller from a server-side token table (silent).
 *
 * The litmus every case below holds: rename every identifier and header to
 * `foo`/`bar` and nothing changes. The rule keys on where a value came from
 * (a gRPC handler's `call.metadata`) and where it ends up (one side of an
 * equality check against a per-request record), never on a header name.
 */

import fs from 'node:fs';
import path from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noIdentityFromMetadata } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const corpus = (file: string): string =>
  fs.readFileSync(
    path.resolve(__dirname, '../../../../../benchmarks/corpus/CWE-290', file),
    'utf8',
  );

/** A handler whose authorization compares `user` against a looked-up record. */
const handler = (resolve: string): string => `
server.addService(pkg.svc.service, {
  Get(call, cb) {
    const user = ${resolve};
    const acc = ACCOUNTS[call.request.id];
    if (acc.owner !== user) return cb({ code: 7 });
    cb(null, acc);
  },
});`;

const ERR = [{ messageId: 'identityFromMetadata' as const }];

ruleTester.run('no-identity-from-metadata', noIdentityFromMetadata, {
  valid: [
    {
      name: 'lab grpc-1 reference fix: the caller comes from a server-side token table',
      // @found ofri-peretz/security-research:protocol-ctf/solutions/grpc-1/fixed-server.mjs
      code: corpus('safe/grpc-1-lab-fixed-server.js'),
    },
    {
      name: 'a header value used as a lookup key is resolved, not trusted',
      code: handler(`SESSIONS[call.metadata.get('foo')[0]]`),
    },
    {
      name: 'a header value handed to a verifier is the verifier’s result, not the header',
      code: handler(`verify(call.metadata.get('foo')[0])`),
    },
    {
      name: 'an API key compared with a secret from the environment is a credential check',
      code: `server.addService(svc, {
  Get(call, cb) {
    const key = call.metadata.get('foo')[0];
    if (key !== process.env.BAR) return cb({ code: 16 });
    cb(null, {});
  },
});`,
    },
    {
      name: 'compared with a member of a module-level config object',
      code: `const CONFIG = { key: 'x' };
server.addService(svc, {
  Get(call, cb) {
    if (call.metadata.get('foo')[0] !== CONFIG.key) return cb({ code: 16 });
    cb(null, {});
  },
});`,
    },
    {
      name: 'a metadata value that is only logged',
      code: `server.addService(svc, { Get(call, cb) { log(call.metadata.get('foo')[0]); cb(null, {}); } });`,
    },
    {
      name: 'compared, but not in a branch: no decision rests on it',
      code: `server.addService(svc, { Get(call, cb) { const same = acc.owner === call.metadata.get('foo')[0]; cb(null, { same }); } });`,
    },
    {
      name: 'not a handler: `.get` on a parameter of a function nobody registers',
      code: `export function check(call, acc) {\n  if (acc.owner !== call.metadata.get('foo')[0]) throw new Error('no');\n}`,
    },
    {
      name: 'an object passed to something other than addService',
      code: `router.register(svc, { Get(call, cb) { if (acc.owner !== call.metadata.get('foo')[0]) return cb(1); } });`,
    },
    {
      name: 'the second handler parameter is the callback, not the call',
      code: `server.addService(svc, { Get(call, cb) { if (acc.owner !== cb.metadata.get('foo')[0]) return cb(1); } });`,
    },
    {
      name: 'a reassigned binding is not followed',
      code: handler(
        `(() => { let u = call.metadata.get('foo')[0]; u = lookup(u); return u; })()`,
      ),
    },
    {
      name: 'a helper whose metadata argument is not call metadata',
      code: `function who(md) { return md.get('foo')[0]; }\n${handler(`who(new Metadata())`)}`,
    },
    {
      name: 'a function that returns the header but whose result decides nothing',
      code: `function who(md) { return md.get('foo')[0]; }\nserver.addService(svc, { Get(call, cb) { log(who(call.metadata)); cb(null, {}); } });`,
    },
    {
      name: 'a recursive resolver that only calls itself',
      code: `function who(md) { return who(md); }\n${handler(`who(call.metadata)`)}`,
    },
    {
      name: 'a normalizer called with no argument at that position',
      code: `function norm(u) { return u; }\n${handler(`norm()`)}`,
    },
    {
      name: 'a resolver built by a factory is not followed',
      code: `const who = makeWho();\n${handler(`who(call.metadata)`)}`,
    },
    {
      name: 'a resolver returned by a call is not followed',
      code: handler(`factory()(call.metadata)`),
    },
    {
      name: '`.get` on another member of the call is not metadata',
      code: handler(`call.headers.get('foo')[0]`),
    },
    {
      name: '`.get` on a `this` member is not a handler’s metadata',
      code: handler(`this.metadata.get('foo')[0]`),
    },
    {
      name: 'an imported binding is not call metadata',
      code: `import { md } from './md';\n${handler(`md.get('foo')[0]`)}`,
    },
    {
      name: 'a recursive resolver whose only outside caller passes something else',
      code: `function who(md) { if (again) return who(md); return md.get('foo')[0]; }\n${handler(`who(new Metadata())`)}`,
    },
    {
      name: 'a declared but never assigned binding has no origin',
      code: `let h;\n${handler(`h`)}`,
    },
    {
      name: '`.get` on the call object itself is not its metadata',
      code: `server.addService(svc, { Get(call, cb) { if (rec.owner !== call.get('foo')[0]) return cb(7); } });`,
    },
    {
      name: 'an ordering comparison is not an identity check',
      code: `server.addService(svc, { Get(call, cb) { if (rec.level < call.metadata.get('foo')[0]) return cb(7); } });`,
    },
    {
      name: 'a comparison in a class field decides nothing',
      code: `class A { ok = rec.owner === call.metadata.get('foo')[0]; }`,
    },
  ],
  invalid: [
    {
      name: 'lab grpc-1: the forwarded identity header is returned as the caller',
      // @found ofri-peretz/security-research:protocol-ctf/challenges/grpc/grpc-1/server.mjs:20 (corpus line 26)
      code: corpus('vulnerable/grpc-1-lab-server.js'),
      errors: ERR,
    },
    {
      name: 'read straight into the identity in the handler',
      code: handler(`call.metadata.get('foo')[0]`),
      errors: ERR,
    },
    {
      name: 'optional index and a string wrapper',
      code: handler(`String(call.metadata.get('foo')?.[0] ?? '')`),
      errors: ERR,
    },
    {
      name: 'string methods keep the value what it was',
      code: handler(`\`\${call.metadata.get('foo')[0]}\`.trim().toLowerCase()`),
      errors: ERR,
    },
    {
      name: 'through a const and a ternary',
      code: handler(
        `(() => { const h = call.metadata.get('foo')[0]; return h ? h : null; })()`,
      ),
      errors: ERR,
    },
    {
      name: 'the metadata bound to a const first',
      code: `server.addService(svc, {
  Get(call, cb) {
    const md = call.metadata;
    const user = md.get('foo')[0];
    if (ACCOUNTS[call.request.id].owner !== user) return cb({ code: 7 });
  },
});`,
      errors: ERR,
    },
    {
      name: 'destructured metadata parameter',
      code: `server.addService(svc, {
  Get({ metadata, request }, cb) {
    const user = metadata.get('foo')[0];
    if (load(request.id).owner !== user) return cb({ code: 7 });
  },
});`,
      errors: ERR,
    },
    {
      name: 'an arrow resolver and a handler object bound to a const',
      code: `const who = (md) => md.get('foo')[0];
const impl = {
  Get: (call, cb) => {
    const acc = ACCOUNTS[call.request.id];
    return acc.owner === who(call.metadata) ? cb(null, acc) : cb({ code: 7 });
  },
};
server.addService(svc, impl);`,
      errors: ERR,
    },
    {
      name: 'a resolver several hops from the handler',
      code: `function header(md) { return md.get('foo')[0]; }
function who(md) { const h = header(md); return h; }
${handler(`who(call.metadata)`)}`,
      errors: ERR,
    },
    {
      name: 'with an await in between',
      code: `async function who(md) { return md.get('foo')[0]; }
server.addService(svc, {
  async Get(call, cb) {
    const user = await who(call.metadata);
    const acc = await db.find(call.request.id);
    if (acc.owner != user) return cb({ code: 7 });
  },
});`,
      errors: ERR,
    },
    {
      name: 'the identity on the left of the comparison',
      code: `server.addService(svc, { Get(call, cb) { if (call.metadata.get('foo')[0] !== rec.owner) return cb(7); } });`,
      errors: ERR,
    },
    {
      name: 'a resolver with a bare return and a nested callback',
      code: `function who(md) {
  if (!md) return;
  const parse = (v) => v.trim();
  return md.get('foo')[0];
}
${handler(`who(call.metadata)`)}`,
      errors: ERR,
    },
    {
      name: 'a normalizer that takes the header value as a parameter',
      code: `function norm(u) { return u.trim().toLowerCase(); }\n${handler(`norm(call.metadata.get('foo')[0])`)}`,
      errors: ERR,
    },
    {
      name: 'an IIFE resolver',
      code: handler(`((md) => md.get('foo')[0])(call.metadata)`),
      errors: ERR,
    },
    {
      name: 'array destructuring of the header values',
      code: `server.addService(svc, { Get(call, cb) { const [user] = call.metadata.get('foo'); if (rec.owner !== user) return cb(7); } });`,
      errors: ERR,
    },
    {
      name: 'TypeScript casts keep the value',
      code: handler(`call.metadata.get('foo')[0]! as string`),
      errors: ERR,
    },
    {
      name: 'one read reaching two checks is reported once',
      code: `server.addService(svc, { Get(call, cb) { const u = call.metadata.get('foo')[0]; if (a.owner !== u) return cb(7); if (b.owner !== u) return cb(7); } });`,
      errors: ERR,
    },
  ],
});
