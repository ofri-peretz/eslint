const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 480,
  traces: 4500,
  rule: 'no-sql-injection',
  key: (s) =>
    `${tag(s.driver)}|${tag(s.sink)}|${tag(s.build)}|${tag(s.shape)}|${tag(s.source)}`,
  config: (s) => ({ treatParametersAsUntrusted: tag(s.source) === 'ParamOn' }),
  code: (s) => {
    const src = tag(s.source);
    const v = {
      ReqDirect: 'req.params.id',
      ReqHop: 'id',
      ParamOn: 'term',
      ParamOff: 'term',
      Escaped: 'escapeIdentifier(req.params.id)',
      EscapedAmbient: 'ambientEscape(req.params.id)',
      Locals: 'req.locals.id',
      StringWrap: 'String(req.params.id)',
    }[src];
    const pre =
      tag(s.shape) === 'Select'
        ? 'SELECT * FROM users WHERE id = '
        : 'update available for ';
    const arg = {
      Concat: `'${pre}' + ${v}`,
      Template: '`' + pre + '${' + v + '}`',
      ConfigText: `{ text: '${pre}' + ${v} }`,
      Bound: `'${pre}$1', [${v}]`,
      Plain: `'${pre}1'`,
    }[tag(s.build)];
    const method = { Query: 'query', Execute: 'execute', Run: 'run' }[
      tag(s.sink)
    ];
    const head =
      tag(s.driver) === 'PgDriver'
        ? "import { Pool } from 'pg';\nconst db = new Pool();"
        : "import { db } from './db';";
    const hop = src === 'ReqHop' ? '  const id = req.params.id;\n' : '';
    return `${head}\nimport { escapeIdentifier } from './sql-escape';\ndeclare function ambientEscape(v: string): string;\nexport function handler(req: any, term: string) {\n${hop}  return db.${method}(${arg});\n}\n`;
  },
};
