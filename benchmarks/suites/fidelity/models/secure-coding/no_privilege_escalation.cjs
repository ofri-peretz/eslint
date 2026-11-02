const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 54,
  traces: 500,
  rule: 'no-privilege-escalation',
  key: (s) => `${tag(s.op)}|${tag(s.value)}|guarded=${s.guarded}`,
  config: () => ({}),
  code: (s) => {
    const v = {
      ReqBody: 'req.body.role',
      ReqQuery: 'req.query.role',
      Const: "'viewer'",
    }[tag(s.value)];
    const stmt = {
      AssignRole: `user.role = ${v};`,
      AssignPermission: `user.permission = ${v};`,
      AssignAccess: `user.access = ${v};`,
      AssignName: `user.name = ${v};`,
      SetRole: `setRole(user, ${v});`,
      Grant: `grant(user, ${v});`,
      GrantPoints: `grantPoints(user, ${v});`,
      UpdateRoleMember: `userService.updateRole(user, ${v});`,
      GrantAccess: `grantAccess(user, ${v});`,
    }[tag(s.op)];
    const body = s.guarded
      ? `if (hasRole(req.user, 'admin')) {\n    ${stmt}\n  }`
      : stmt;
    return `import express from 'express';\nimport { setRole, grant, grantPoints, grantAccess, hasRole, userService } from './users';\nconst app = express();\ndeclare const user: any;\napp.put('/api/users/:id', (req: any, res: any) => {\n  ${body}\n  res.end();\n});\n`;
  },
};
