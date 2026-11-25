const { tag } = require('../../lib.cjs');

// The key's name in the access, and the loop or callback that binds it.
const BINDINGS = {
  DynKey: { k: 'userKey', wrap: (a) => a },
  LiteralProto: { k: "'__proto__'", wrap: (a) => a },
  NumIndex: { k: '0', wrap: (a) => a },
  MapKey: {
    k: 'mk',
    wrap: (a) =>
      `new Map<string, unknown>().forEach((v, mk) => {\n    ${a}\n  });`,
  },
  ArrayIndex: {
    k: 'i',
    wrap: (a) =>
      `Object.values(value as object).forEach((v, i) => {\n    ${a}\n  });`,
  },
  ListedKey: {
    k: 'lk',
    wrap: (a) => `for (const lk of LISTED) {\n    ${a}\n  }`,
  },
  TupleSlot: {
    k: 'ts',
    wrap: (a) => `for (const [, ts] of PAIRS) {\n    ${a}\n  }`,
  },
  ListedProto: {
    k: 'pk',
    wrap: (a) => `for (const pk of TAINTED_LIST) {\n    ${a}\n  }`,
  },
};

module.exports = {
  // DynKey 4 positions x 4 guards, LiteralProto and NumIndex 2 positions each,
  // and five more key sources x 4 positions.
  domain: 40,
  traces: 600,
  rule: 'detect-object-injection',
  key: (s) => `${tag(s.key)}|${tag(s.pos)}|${tag(s.guard)}`,
  config: () => ({}),
  code: (s) => {
    const { k, wrap } = BINDINGS[tag(s.key)];
    const g = tag(s.guard);
    const objInit = g === 'NullProto' ? 'Object.create(null)' : '{}';
    const access = {
      Write: `obj[${k}] = value;`,
      Delete: `delete obj[${k}];`,
      Read: `out = obj[${k}];`,
      Invoke: `out = obj[${k}](value);`,
    }[tag(s.pos)];
    const stmt = {
      NoGuard: access,
      NullProto: access,
      IncludesGuard: `if (ALLOWED_KEYS.includes(${k})) {\n    ${access}\n  }`,
      HasOwnGuard: `if (Object.prototype.hasOwnProperty.call(obj, ${k})) {\n    ${access}\n  }`,
    }[g];
    return [
      "const ALLOWED_KEYS = ['name', 'age', 'email'];",
      "const LISTED = ['name', 'age'] as const;",
      "const PAIRS = [['first', 'name'], ['second', 'age']] as const;",
      "const TAINTED_LIST = ['name', '__proto__'];",
      'export function set(userKey: string, value: unknown) {',
      `  const obj: any = ${objInit};`,
      '  let out: unknown;',
      `  ${wrap(stmt)}`,
      '  return [obj, out];',
      '}',
      '',
    ].join('\n');
  },
};
