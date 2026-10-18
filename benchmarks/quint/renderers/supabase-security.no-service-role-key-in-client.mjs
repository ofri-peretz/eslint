// Renders one state of models/supabase-security.no-service-role-key-in-client.qnt.
// Spells the shape only; the verdict is the model's `expected`.
//
// JWTs and secret keys are assembled at run time, so this file holds no
// literal a secret scanner would read as a live key.

export const plugin = 'supabase-security';
export const rule = 'no-service-role-key-in-client';
export const dimensions = ['key', 'file', 'factory', 'binding'];

const b64url = (s) => Buffer.from(s).toString('base64url');
const jwt = (claims) =>
  [
    b64url('{"alg":"HS256","typ":"JWT"}'),
    b64url(JSON.stringify(claims)),
    'bm90LWEtc2lnbmF0dXJl',
  ].join('.');

const KEY = {
  ServiceEnv: 'process.env.SUPABASE_SERVICE_ROLE_KEY!',
  ServicePublicEnv: 'process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!',
  ServiceViteEnv: 'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY',
  AnonPublicEnv: 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!',
  ServiceJwtLiteral: `'${jwt({ iss: 'supabase', ref: 'abcdefghij', role: 'service_role' })}'`,
  SecretKeyLiteral: `'${['sb', 'secret', 'Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5'].join('_')}'`,
  AnonJwtLiteral: `'${jwt({ iss: 'supabase', ref: 'abcdefghij', role: 'anon' })}'`,
  DemoServiceJwt: `'${jwt({ iss: 'supabase-demo', role: 'service_role' })}'`,
};

const FACTORY = {
  CreateClient: [
    "import { createClient } from '@supabase/supabase-js';",
    (k) => `createClient('https://x.supabase.co', ${k})`,
  ],
  CreateBrowserClient: [
    "import { createBrowserClient } from '@supabase/ssr';",
    (k) => `createBrowserClient('https://x.supabase.co', ${k})`,
  ],
  CreateServerClient: [
    "import { createServerClient } from '@supabase/ssr';",
    (k) =>
      `createServerClient('https://x.supabase.co', ${k}, { cookies: {} as any })`,
  ],
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const directive = {
    PlainModule: '',
    UseClient: "'use client';",
    ServerOnly: "import 'server-only';",
  }[c.file];
  const [imp, make] = FACTORY[c.factory];
  const pre = c.binding === 'ViaConst' ? `const key = ${KEY[c.key]};\n` : '';
  const arg = c.binding === 'ViaConst' ? 'key' : KEY[c.key];
  return [directive, imp, `${pre}export const db = ${make(arg)};`, '']
    .filter((l, i) => i > 0 || l)
    .join('\n');
}
