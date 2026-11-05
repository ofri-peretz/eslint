const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const PATH = {
  WithParam: "'/user/:id'",
  Plural: "'/orders'",
  Root: "'/'",
  Dynamic: 'route',
  Singular: "'/order'",
};

const CALL = {
  Get: (p) => `app.get(${p}, handler);`,
  Post: (p) => `app.post(${p}, handler);`,
  Delete: (p) => `app.delete(${p}, handler);`,
  GetSubscript: (p) => `app['get'](${p}, handler);`,
};

const OPT = {
  Defaults: undefined,
  NamingOff: { checkResourceNaming: false },
  StatusOff: { checkStatusCodes: false },
  MethodsOff: { checkHttpMethods: false },
};

module.exports = {
  rule: 'enforce-rest-conventions',
  // 4 methods x (3 option sets x 4 paths + NamingOff x 5 paths).
  domain: 4 * (3 * 4 + 5),
  traces: 500,
  key: keyOf('method', 'path', 'opt'),
  config: (s) => OPT[tag(s.opt)],
  code: (s) =>
    src(
      'declare const app: Record<string, (path: string, h: unknown) => void>;',
      'declare const handler: unknown;',
      'export function mount(route: string) {',
      `  ${CALL[tag(s.method)](PATH[tag(s.path)])}`,
      '}',
    ),
};
