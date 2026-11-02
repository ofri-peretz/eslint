const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 120,
  traces: 1000,
  rule: 'no-missing-authentication',
  key: (s) => `${tag(s.router)}|${tag(s.method)}|${tag(s.auth)}|${tag(s.path)}`,
  config: () => ({}),
  code: (s) => {
    const [decl, name] = {
      App: ['const app = express();', 'app'],
      ExpressRouter: ['const router = express.Router();', 'router'],
      Fastify: ['const server = fastify();', 'server'],
      NotRouter: ['const cache = new Map<string, unknown>();', 'cache'],
    }[tag(s.router)];
    const mw = {
      NoAuth: '',
      AuthenticateCall: 'authenticate(), ',
      PassportAuth: "passport.authenticate('jwt', { session: false }), ",
      RequireAuthRef: 'requireAuth, ',
      RateLimitOnly: 'rateLimit({ max: 10 }), ',
    }[tag(s.auth)];
    const path = {
      Private: '/api/user/profile',
      Login: '/api/login',
      Health: '/health',
    }[tag(s.path)];
    const method = tag(s.method) === 'Get' ? 'get' : 'post';
    return `import express from 'express';\nimport fastify from 'fastify';\nimport passport from 'passport';\nimport rateLimit from 'express-rate-limit';\nimport { authenticate, requireAuth } from './auth';\n${decl}\n${name}.${method}('${path}', ${mw}(req: any, res: any) => {\n  res.json(req.user);\n});\n`;
  },
};
