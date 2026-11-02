const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 144,
  traces: 1200,
  rule: 'no-log-injection',
  key: (s) => `${tag(s.recv)}|${tag(s.shape)}|${tag(s.source)}`,
  config: () => ({}),
  code: (s) => {
    const src = tag(s.source);
    const pre =
      {
        OneHop: 'const name = req.body.username;',
        TwoHop: 'const raw = req.body.username;\n    const name = raw;',
        LocalCount: 'const name = items.length;',
      }[src] ?? '';
    const v = {
      ReqBody: 'req.body.username',
      OneHop: 'name',
      TwoHop: 'name',
      Wrapped: 'sanitizeForLog(req.body.username)',
      Param: 'username',
      LocalCount: 'name',
    }[src];
    const recv = {
      Console: 'console',
      Logger: 'logger',
      ThisLogger: 'this.logger',
      ReqLog: 'req.log',
      FastifyLog: 'fastify.log',
      Span: 'span',
    }[tag(s.recv)];
    const args = {
      Concat: `'login attempt: ' + ${v}`,
      Template: '`login attempt: ${' + v + '}`',
      ObjectArg: `{ event: 'login', user: ${v} }, 'login attempt'`,
      SeparateArg: `'login attempt', ${v}`,
    }[tag(s.shape)];
    return `declare const logger: any, fastify: any, span: any;\ndeclare function sanitizeForLog(v: unknown): string;\nexport class Auth {\n  logger: any;\n  onLogin(req: any, username: string, items: string[]) {\n    ${pre}\n    ${recv}.error(${args});\n  }\n}\n`;
  },
};
