const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-env-injection',
  domain: 26, // 13 write shapes x 2 option values
  traces: 300,
  key: (s) => `${tag(s.write)}|extraPayload=${s.extraPayload}`,
  config: (s) => (s.extraPayload ? { extraRequestRoots: ['payload'] } : {}),
  code: (s) => {
    const body = {
      DirectReq: 'process.env[req.body.key] = req.body.value;',
      DestructuredReq:
        'const { key, value } = req.body;\n  process.env[key] = value;',
      AliasOneHop: "const k = req.body.key;\n  process.env[k] = '1';",
      ThreeHops:
        "const a = req.body.key;\n  const b = a;\n  const c = b;\n  process.env[c] = '1';",
      AllowlistLookup:
        "const ALLOWED: Record<string, string> = { locale: 'APP_LOCALE', theme: 'APP_THEME' };\n  const target = ALLOWED[req.body.setting];\n  if (!target) return;\n  process.env[target] = String(req.body.value);",
      DotLiteral: 'process.env.APP_LOCALE = req.body.locale;',
      BracketLiteral: "process.env['APP_LOCALE'] = req.body.locale;",
      AssignReq: 'Object.assign(process.env, req.body);',
      AssignLiteral: "Object.assign(process.env, { NODE_ENV: 'production' });",
      CtxRoot: "process.env[ctx.request.body.name] = '1';",
      EventRoot: "process.env[event.queryStringParameters.k] = '1';",
      ParamKey: "process.env[name] = '1';",
      PayloadRoot: 'process.env[payload.key] = payload.value;',
    }[tag(s.write)];
    return `export function handler(req: any, ctx: any, event: any, payload: any, name: string) {\n  ${body}\n}\n`;
  },
  model: (s) => s.verdict,
};
