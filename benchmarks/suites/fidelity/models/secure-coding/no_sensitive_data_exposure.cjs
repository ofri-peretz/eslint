const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 40,
  traces: 400,
  rule: 'no-sensitive-data-exposure',
  key: (s) =>
    `${tag(s.sink)}|${tag(s.value)}|console=${s.checkConsole}|errors=${s.checkErrors}`,
  config: (s) => ({
    checkConsoleLog: s.checkConsole,
    checkErrorMessages: s.checkErrors,
  }),
  code: (s) => {
    const v = {
      Password: 'password',
      ApiKey: 'apiKey',
      AccessToken: 'accessToken',
      Descriptor: 'passwordError',
      Neutral: 'username',
    }[tag(s.value)];
    const stmt =
      tag(s.sink) === 'ConsoleLog'
        ? `console.log('login', ${v});`
        : `throw new Error('login failed: ' + ${v});`;
    return `export function login(password: string, apiKey: string, accessToken: string, passwordError: string, username: string) {\n  ${stmt}\n}\n`;
  },
};
