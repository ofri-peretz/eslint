const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 12,
  traces: 200,
  rule: 'require-backend-authorization',
  key: (s) => `${tag(s.env)}|${tag(s.check)}`,
  config: () => ({}),
  code: (s) => {
    const cond = {
      RoleEq: "user.role === 'ADMIN'",
      IsAdmin: 'currentUser.isAdmin',
      PermissionsIncludes: "user.permissions.includes('delete')",
      ComputedRole: "user['role'] === 'ADMIN'",
      NameEq: "user.name === 'alice'",
      StatusCheck: 'response.status === 403',
    }[tag(s.check)];
    const browser = tag(s.env) === 'Browser';
    const head = browser ? '' : "import express from 'express';\n";
    const use = browser
      ? "  window.location.assign('/admin');"
      : '  doAdminThing();';
    return `${head}declare const user: any, currentUser: any, response: any;\ndeclare function doAdminThing(): void;\nexport function render() {\n  if (${cond}) {\n  ${use}\n  }\n}\n`;
  },
};
