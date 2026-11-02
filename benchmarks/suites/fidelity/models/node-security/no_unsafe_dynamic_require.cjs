const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-unsafe-dynamic-require',
  domain: 168, // 6 loaders x 7 specifiers x 2 x 2 options
  traces: 1800,
  key: (s) =>
    `${tag(s.loader)}|${tag(s.spec)}|allowDyn=${s.allowDyn}|unresolved=${s.unresolvedOpt}`,
  config: (s) => ({
    allowDynamicImport: s.allowDyn,
    reportUnresolvedSpecifiers: s.unresolvedOpt,
  }),
  code: (s) => {
    const x = {
      Literal: "'./config.json'",
      ReqParam: 'req.params.moduleName',
      ReqTemplate: '`./plugins/${req.query.plugin}`',
      ArgvConcat: "'./configs/' + process.argv[2]",
      EnvConcat: "'./configs/' + process.env.APP_ENV",
      Unresolved: '`./plugins/${pluginName}`',
      LookupTable: 'ALLOWED[req.query.plugin as keyof typeof ALLOWED]',
    }[tag(s.spec)];
    const [head, call] = {
      RequireBare: ['', `require(${x});`],
      CreateRequireNamed: [
        "import { createRequire } from 'node:module';\nconst load = createRequire(import.meta.url);",
        `load(${x});`,
      ],
      ModuleDefaultCreateRequire: [
        "import nodeModule from 'node:module';\nconst requireCjs = nodeModule.createRequire(import.meta.url);",
        `requireCjs(${x});`,
      ],
      CjsCreateRequire: [
        "const { createRequire } = require('module');\nconst load = createRequire(__filename);",
        `load(${x});`,
      ],
      DynamicImport: ['', `await import(${x});`],
      LocalCreateRequire: [
        'const createRequire = (u: string) => (s: string) => [u, s];\nconst load = createRequire(import.meta.url);',
        `load(${x});`,
      ],
    }[tag(s.loader)];
    const table =
      "const ALLOWED = { csv: './plugins/csv', json: './plugins/json' } as const;";
    return `${head}\n${table}\nexport async function handler(req: any, pluginName: string) {\n  ${call}\n}\n`;
  },
  model: (s) => s.verdict,
};
