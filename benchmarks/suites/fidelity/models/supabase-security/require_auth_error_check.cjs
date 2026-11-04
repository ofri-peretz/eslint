const { tag } = require('../../lib.cjs');
const { supabaseClient } = require('../../orm.cjs');

/** method -> [call, the identity it resolves in `data`]. */
const METHODS = {
  GetUser: ['getUser()', 'user'],
  GetSession: ['getSession()', 'session'],
  GetClaims: ['getClaims()', 'claims'],
  RefreshSession: ['refreshSession()', 'session'],
  ExchangeCode: ['exchangeCodeForSession(req.query.code)', 'session'],
};

/** use -> (identity) => [destructuring pattern, statements using it]. */
const USES = {
  BindError: (i) => [
    '{ data, error }',
    `if (error) throw error;\nreturn data.${i};`,
  ],
  BindErrorRenamed: (i) => [
    '{ data, error: authError }',
    `if (authError) throw authError;\nreturn data.${i};`,
  ],
  BindErrorQuoted: (i) => [
    "{ data, 'error': e }",
    `if (e) throw e;\nreturn data.${i};`,
  ],
  BindRest: (i) => [
    '{ data, ...rest }',
    `if (rest.error) throw rest.error;\nreturn data.${i};`,
  ],
  BindComputed: (i) => [
    '{ data, [ERR]: e }',
    `if (e) throw e;\nreturn data.${i};`,
  ],
  Guard: (i) => [
    `{ data: { ${i} } }`,
    `if (!${i}) return res.redirect('/login');\nreturn res.json(${i});`,
  ],
  DataGuard: (i) => [
    '{ data }',
    `if (!data.${i}) return res.redirect('/login');\nreturn res.json(data.${i});`,
  ],
  OptionalChain: (i) => [`{ data: { ${i} } }`, `return res.json(${i}?.id);`],
  ShortCircuit: (i) => [
    `{ data: { ${i} } }`,
    `return res.json(${i} && ${i}.id);`,
  ],
  Returned: (i) => [`{ data: { ${i} } }`, `return ${i};`],
  Passed: (i) => [`{ data: { ${i} } }`, `return audit(${i});`],
  DataTruthy: () => [
    '{ data }',
    "if (data) return res.render('dashboard');\nreturn res.redirect('/login');",
  ],
  StrictUndefined: (i) => [
    `{ data: { ${i} } }`,
    `if (${i} !== undefined) return res.json(${i}.id);\nreturn res.redirect('/login');`,
  ],
  Unchecked: (i) => [`{ data: { ${i} } }`, `return res.json(${i}.id);`],
  DataDeref: (i) => ['{ data }', `return res.json(data.${i}.id);`],
  NeverRead: () => ['{ data }', "return res.send('ok');"],
};

function code(s) {
  const [call, identity] = METHODS[tag(s.method)];
  const [pattern, use] = USES[tag(s.use)](identity);
  const sp = tag(s.spelling);
  const [verb, args] = call.split('(');
  const result =
    sp === 'Bracket' ? `db['auth']['${verb}'](${args}` : `db.auth.${call}`;
  const body =
    tag(s.form) === 'Await'
      ? `const ${pattern} = await ${result};\n${use}`
      : `return ${result}.then((${pattern}: any) => {\n${use
          .split('\n')
          .map((l) => `  ${l}`)
          .join('\n')}\n});`;
  return (
    [
      ...supabaseClient(sp === 'Bracket' ? 'Named' : sp),
      "const ERR = 'error';",
      'declare function audit(x: unknown): unknown;',
      `export async function handle(req: any, res: any) {\n${body
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')}\n}`,
    ].join('\n') + '\n'
  );
}

module.exports = {
  rule: 'require-auth-error-check',
  domain: 7 * 5 * 2 * 16, // spellings x methods x await/then x uses
  traces: 9000,
  key: (s) =>
    `${tag(s.spelling)}|${tag(s.method)}|${tag(s.form)}|${tag(s.use)}`,
  code,
};
