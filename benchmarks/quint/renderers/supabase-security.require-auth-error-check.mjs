// Renders one state of models/supabase-security.require-auth-error-check.qnt.
// Spells the shape only; the verdict is the model's `expected`.

export const plugin = 'supabase-security';
export const rule = 'require-auth-error-check';
export const dimensions = ['method', 'binding', 'use'];

const METHOD = {
  GetUser: ['getUser', 'user'],
  GetSession: ['getSession', 'session'],
  GetClaims: ['getClaims', 'claims'],
};

/** What the code does with identity `I` and the result container `K`. */
function use(u, I, K) {
  switch (u) {
    case 'FalsyGuard':
      return `if (!${I}) throw new Error('unauthenticated');\n  return 'ok';`;
    case 'ReturnIdentity':
      return `return ${I};`;
    case 'OptionalChain':
      return `return ${I}?.id ?? null;`;
    case 'ContainerTest':
      // A pattern that binds the identity directly has no container to test;
      // the same mistake is then a test the failure path passes.
      return K === null
        ? `if (${I} !== undefined) return 'dashboard';\n  return 'login';`
        : `if (${K}) return 'dashboard';\n  return 'login';`;
    case 'UndefinedCompare':
      return `if (${I} !== undefined) return 'dashboard';\n  return 'login';`;
    case 'Deref':
      return `return db.from('notes').select().eq('owner', ${I}.id);`;
    case 'Unused':
      return "return 'ok';";
    default:
      throw new Error(u);
  }
}

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const [m, id] = METHOD[c.method];
  const call = `db.auth.${m}()`;
  let body;
  switch (c.binding) {
    case 'IdentityPattern':
      body = `  const { data: { ${id} } } = await ${call};\n  ${use(c.use, id, null)}`;
      break;
    case 'DataPattern':
      body = `  const { data } = await ${call};\n  ${use(c.use, `data.${id}`, 'data')}`;
      break;
    case 'ThenCallback':
      body = `  return ${call}.then(({ data }) => {\n  ${use(c.use, `data.${id}`, 'data')}\n  });`;
      break;
    case 'WithError':
      body = `  const { data, error } = await ${call};\n  if (error) throw error;\n  ${use(c.use, `data.${id}`, 'data')}`;
      break;
    case 'NotDestructured':
      body = `  const result = await ${call};\n  ${use(c.use, `result.data.${id}`, 'result.data')}`;
      break;
    default:
      throw new Error(c.binding);
  }
  return [
    "import { createClient } from '@supabase/supabase-js';",
    "const db = createClient('https://x.supabase.co', process.env.SUPABASE_ANON_KEY!);",
    'export async function handler() {',
    body,
    '}',
    '',
  ].join('\n');
}
