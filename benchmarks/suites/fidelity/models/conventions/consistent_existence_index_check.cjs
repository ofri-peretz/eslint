const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const FORM = {
  In: ['return key in obj;'],
  InPrivate: ['return #secret in obj;'],
  ForIn: ['for (const k in obj) return k === key;', 'return false;'],
  OwnMethod: ['return obj.hasOwnProperty(key);'],
  OwnSubscript: ["return obj['hasOwnProperty'](key);"],
  ProtoCall: ['return Object.prototype.hasOwnProperty.call(obj, key);'],
  HasOwn: ['return Object.hasOwn(obj, key);'],
  HasOwnGlobalThis: ['return globalThis.Object.hasOwn(obj, key);'],
  OtherHasOwn: ['return registry.hasOwn(obj, key);'],
};

const PREFERRED = {
  PrefHasOwn: undefined,
  PrefIn: { preferred: 'in' },
  PrefHasOwnProperty: { preferred: 'hasOwnProperty' },
};

module.exports = {
  rule: 'consistent-existence-index-check',
  domain: 9 * 3,
  traces: 300,
  key: keyOf('form', 'preferred'),
  config: (s) => PREFERRED[tag(s.preferred)],
  code: (s) =>
    src(
      'declare const registry: { hasOwn(o: object, k: string): boolean };',
      'export class Store {',
      '  #secret = 1;',
      '  has(obj: Record<string, unknown>, key: string): boolean {',
      FORM[tag(s.form)].map((l) => `    ${l}`),
      '  }',
      '}',
    ),
};
