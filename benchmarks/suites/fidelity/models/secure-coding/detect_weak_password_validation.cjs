const { tag, num } = require('../../lib.cjs');

module.exports = {
  domain: 100,
  traces: 900,
  rule: 'detect-weak-password-validation',
  key: (s) => `${tag(s.name)}|${tag(s.op)}|${num(s.n)}`,
  config: () => ({}),
  code: (s) => {
    const v = {
      Password: 'password',
      Pwd: 'pwd',
      UserPassword: 'user.password',
      Passphrase: 'passphrase',
      Username: 'username',
    }[tag(s.name)];
    const n = num(s.n);
    const stmt = {
      Gte: `if (${v}.length >= ${n}) {\n    return true;\n  }`,
      Gt: `if (${v}.length > ${n}) {\n    return true;\n  }`,
      Eq: `if (${v}.length === ${n}) {\n    return true;\n  }`,
      LtReject: `if (${v}.length < ${n}) {\n    throw new Error('too short');\n  }`,
    }[tag(s.op)];
    return `export function accept(password: string, pwd: string, user: any, passphrase: string, username: string) {\n  ${stmt}\n  return false;\n}\n`;
  },
};
