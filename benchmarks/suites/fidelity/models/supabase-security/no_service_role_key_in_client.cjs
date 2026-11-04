const { tag } = require('../../lib.cjs');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload) =>
  `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.Qm9nV2xYcGx2ZGtzN0J6ZkR1aG5RcU9yVG1lSGFYZw`;
const claims = (role, iss = 'supabase') => ({
  iss,
  ref: 'qwhzcbtgvxkplmnrsdyf',
  role,
  iat: 1700000000,
  exp: 2015576000,
});

/** key -> { head?: an import it needs, expr: the key expression }. */
const KEYS = {
  NextPublicService: {
    expr: 'process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  },
  VitePublicService: { expr: 'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY' },
  PublicService: { expr: 'process.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY' },
  ReactAppService: { expr: 'process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY' },
  GatsbyService: { expr: 'process.env.GATSBY_SUPABASE_SERVICE_ROLE_KEY' },
  NuxtPublicService: {
    expr: 'process.env.NUXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  },
  ExpoPublicService: {
    expr: 'process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  },
  ServerService: { expr: 'process.env.SUPABASE_SERVICE_ROLE_KEY' },
  ServerServiceBracket: { expr: "process.env['SUPABASE_SERVICE_ROLE_KEY']" },
  ImportMetaServer: { expr: 'import.meta.env.SUPABASE_SERVICE_ROLE_KEY' },
  SvelteStaticPublic: {
    head: "import { PUBLIC_SUPABASE_SERVICE_ROLE_KEY as roleKey } from '$env/static/public';",
    expr: 'roleKey',
  },
  SvelteDynamicPublic: {
    head: "import { env } from '$env/dynamic/public';",
    expr: 'env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  },
  SveltePrivate: {
    head: "import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';",
    expr: 'SUPABASE_SERVICE_ROLE_KEY',
  },
  AnonPublic: { expr: 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY' },
  JwtService: { expr: `'${jwt(claims('service_role'))}'` },
  JwtAnon: { expr: `'${jwt(claims('anon'))}'` },
  JwtDemo: { expr: `'${jwt(claims('service_role', 'supabase-demo'))}'` },
  SbSecret: { expr: "'sb_secret_Hq7Zp2LmW9xVt4KcR8yNb3Fd6GsJe1Ua'" },
  SbSecretStub: { expr: "'sb_secret_xyz'" },
};

const URL = 'process.env.NEXT_PUBLIC_SUPABASE_URL as string';

/** factory -> { head, call(key) }. */
const FACTORIES = {
  CreateNamed: {
    head: "import { createClient } from '@supabase/supabase-js';",
    call: (k) => `createClient(${URL}, ${k})`,
  },
  CreateRenamed: {
    head: "import { createClient as makeClient } from '@supabase/supabase-js';",
    call: (k) => `makeClient(${URL}, ${k})`,
  },
  CreateRequire: {
    head: "const { createClient } = require('@supabase/supabase-js');",
    call: (k) => `createClient(${URL}, ${k})`,
  },
  CreateNamespace: {
    head: "import * as supa from '@supabase/supabase-js';",
    call: (k) => `supa.createClient(${URL}, ${k})`,
  },
  Browser: {
    head: "import { createBrowserClient } from '@supabase/ssr';",
    call: (k) => `createBrowserClient(${URL}, ${k})`,
  },
  BrowserRenamed: {
    head: "import { createBrowserClient as browserClient } from '@supabase/ssr';",
    call: (k) => `browserClient(${URL}, ${k})`,
  },
  BrowserBracket: {
    head: "import * as ssr from '@supabase/ssr';",
    call: (k) => `ssr['createBrowserClient'](${URL}, ${k})`,
  },
  ServerSsr: {
    head: "import { createServerClient } from '@supabase/ssr';",
    call: (k) => `createServerClient(${URL}, ${k}, { cookies: {} as any })`,
  },
  ComponentClient: {
    head: "import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';",
    call: (k) =>
      `createClientComponentClient({ supabaseUrl: ${URL}, supabaseKey: ${k} })`,
  },
  NoImport: {
    head: 'declare function createClient(url: string, key: unknown): unknown;',
    call: (k) => `createClient(${URL}, ${k})`,
  },
};

function code(s) {
  const ctx = tag(s.ctx);
  const f = FACTORIES[tag(s.factory)];
  const k = KEYS[tag(s.key)];
  const direct = tag(s.pass) === 'Direct';
  return (
    [
      ctx === 'UseClient' ? "'use client';" : '',
      ctx === 'ServerOnly' ? "import 'server-only';" : '',
      f.head,
      k.head ?? '',
      direct ? '' : `const KEY = ${k.expr} as string;`,
      `export const db = ${f.call(direct ? `${k.expr} as string` : 'KEY')};`,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

module.exports = {
  rule: 'no-service-role-key-in-client',
  // 12 keys on every ctx x factory x pass + 6 prefixes on CreateNamed/Direct
  // x 3 ctx + SveltePrivate on Plain x 9 factories x 2 passes
  domain: 12 * 3 * 10 * 2 + 6 * 3 + 10 * 2,
  traces: 7000,
  key: (s) => `${tag(s.ctx)}|${tag(s.factory)}|${tag(s.pass)}|${tag(s.key)}`,
  code,
};
