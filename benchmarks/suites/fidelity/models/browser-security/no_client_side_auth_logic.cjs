const { tag } = require('../../lib.cjs');

const AUTH = [
  'admin',
  'authenticated',
  'authorized',
  'isAdmin',
  'isAuthenticated',
  'role',
];
const CRED = ['password', 'secret', 'token'];

module.exports = {
  domain: 68, // 17 expressions x 2 x 2 options
  traces: 1000,
  rule: 'no-client-side-auth-logic',
  key: (s) => `${tag(s.expr)}|auth=${s.customAuth}|cred=${s.customCred}`,
  config: (s) => ({
    authKeywords: s.customAuth ? [...AUTH, 'superuser'] : AUTH,
    credentialProperties: s.customCred ? [...CRED, 'pin'] : CRED,
  }),
  code: (s) => {
    const cond = {
      StoreAuthenticated: "localStorage.getItem('authenticated')",
      StoreIsAdmin: "localStorage.getItem('isAdmin') === 'true'",
      StoreIsAdminSnake: "localStorage.getItem('is_admin') === 'true'",
      StoreUserRole: "localStorage.getItem('userRole') === 'admin'",
      StoreRoles: "localStorage.getItem('roles_cache_version') === '2'",
      StoreTheme: "localStorage.getItem('theme') === 'dark'",
      StoreAdministrator:
        "localStorage.getItem('administrator_contact') !== null",
      StoreSuperuser: "localStorage.getItem('superuser') === 'true'",
      SessionIsAdmin: "sessionStorage.getItem('isAdmin') === 'true'",
      StoreComputed: "localStorage['getItem']('isAdmin') === 'true'",
      CmpPassword: "form.password === 'hunter2'",
      CmpToken: 'user.token === storedToken',
      CmpSecretLoose: 'config.secret == input',
      NeqPassword: "form.password !== 'hunter2'",
      CmpName: "user.name === 'bob'",
      CmpPin: "form.pin === '1234'",
      PasswordLength: 'form.password.length > 8',
    }[tag(s.expr)];
    return `declare const form: any, user: any, config: any;\ndeclare const storedToken: string, input: string;\ndeclare function proceed(): void;\nif (${cond}) {\n  proceed();\n}\n`;
  },
  model: (s) => s.verdict,
};
