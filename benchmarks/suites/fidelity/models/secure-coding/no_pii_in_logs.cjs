const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 64,
  traces: 600,
  rule: 'no-pii-in-logs',
  key: (s) => `${tag(s.sink)}|${tag(s.value)}|${tag(s.shape)}`,
  config: () => ({}),
  code: (s) => {
    const v = tag(s.value);
    const expr = {
      UserEmail: 'user.email',
      CreditCard: 'customer.creditCard',
      Ssn: 'record.ssn',
      StringifyUser: 'JSON.stringify(user)',
      UserId: 'user.id',
      Emailer: 'user.emailer',
      Hashed: 'hashStable(record.ssn)',
    }[v];
    const callee = {
      ConsoleLog: 'console.log',
      ConsoleError: 'console.error',
      ConsoleDebug: 'console.debug',
      LoggerInfo: 'logger.info',
    }[tag(s.sink)];
    let args;
    if (v === 'LiteralEmail') {
      args =
        tag(s.shape) === 'Arg'
          ? "'signed in', 'john.doe@example.com'"
          : '`signed in john.doe@example.com`';
    } else {
      args =
        tag(s.shape) === 'Arg'
          ? `'signed in', ${expr}`
          : '`signed in ${' + expr + '}`';
    }
    return `declare const user: any, customer: any, record: any, logger: any;\ndeclare function hashStable(v: unknown): string;\nexport function audit() {\n  ${callee}(${args});\n}\n`;
  },
};
