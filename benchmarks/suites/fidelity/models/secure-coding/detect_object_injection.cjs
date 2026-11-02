const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 16,
  traces: 300,
  rule: 'detect-object-injection',
  key: (s) => `${tag(s.key)}|${tag(s.pos)}|${tag(s.guard)}`,
  config: () => ({}),
  code: (s) => {
    const k = { DynKey: 'userKey', LiteralProto: "'__proto__'", NumIndex: '0' }[
      tag(s.key)
    ];
    const g = tag(s.guard);
    const objInit = g === 'NullProto' ? 'Object.create(null)' : '{}';
    const access = {
      Write: `obj[${k}] = value;`,
      Read: `out = obj[${k}];`,
      Invoke: `out = obj[${k}](value);`,
    }[tag(s.pos)];
    const stmt = {
      NoGuard: access,
      NullProto: access,
      IncludesGuard: `if (ALLOWED_KEYS.includes(${k})) {\n    ${access}\n  }`,
      HasOwnGuard: `if (Object.prototype.hasOwnProperty.call(obj, ${k})) {\n    ${access}\n  }`,
    }[g];
    return `const ALLOWED_KEYS = ['name', 'age', 'email'];\nexport function set(userKey: string, value: unknown) {\n  const obj: any = ${objInit};\n  let out: unknown;\n  ${stmt}\n  return [obj, out];\n}\n`;
  },
};
