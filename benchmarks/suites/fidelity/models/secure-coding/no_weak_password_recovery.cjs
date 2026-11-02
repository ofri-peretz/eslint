const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 20,
  traces: 250,
  rule: 'no-weak-password-recovery',
  key: (s) => `${tag(s.name)}|${tag(s.gen)}`,
  config: () => ({}),
  code: (s) => {
    const name = {
      ResetToken: 'passwordResetToken',
      RecoveryCode: 'recoveryCode',
      ForgotToken: 'forgotPasswordToken',
      Neutral: 'cacheBuster',
    }[tag(s.name)];
    const gen = {
      MathRandom: 'Math.random().toString(36).slice(2)',
      DateNow: 'Date.now().toString()',
      RandomBytes: "crypto.randomBytes(32).toString('hex')",
      RandomUuid: 'crypto.randomUUID()',
      DestrRandomBytes: "randomBytes(32).toString('hex')",
    }[tag(s.gen)];
    return `import crypto from 'crypto';\nimport { randomBytes } from 'node:crypto';\nexport function issue() {\n  const ${name} = ${gen};\n  return ${name};\n}\n`;
  },
};
