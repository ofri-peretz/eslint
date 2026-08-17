/**
 * A key that resolves to an IMPORT is not caller-chosen.
 *
 * ## Found by measurement, not by review
 *
 * The §A2 per-rule sample (n=13 for this rule, over 20 repos / 3.0M LOC) scored
 * it at 0 TP / 13 FP. Two of the thirteen are this shape, and they are the
 * interesting two because they are a guard FAILING rather than a guard missing:
 *
 *   fastify.js:255          this[pluginUtils.kRegisteredPlugins]
 *   mongoose/aggregate.js:59  modelOrConn[modelSymbol]
 *
 * Both are Symbol-keyed. A Symbol can never be the string `'__proto__'`, so this
 * is the canonical SAFE spelling of a computed access — and the rule already has
 * `isSymbolKey` for exactly it. Probed:
 *
 *   const kPlugins = Symbol('plugins');   self[kPlugins]   // quiet   ✓
 *   import { kPlugins } from './utils';   self[kPlugins]   // REPORTS ✗
 *
 * `isSymbolKey` resolves an in-file `Symbol()` call and returns false on an
 * `ImportBinding`, because it cannot see the initialiser. Since a shared
 * `symbols.js` is how every codebase that uses symbol keys actually spells it,
 * the guard missed the normal form and caught the rare one.
 *
 * ## Why the fix is not "assume imports are Symbols"
 *
 * We cannot see the other module, so Symbol-ness is unprovable. The sound
 * argument is different and stronger: **an imported binding is fixed by the
 * module graph, not chosen by a caller.** Prototype pollution and mass
 * assignment both require the ATTACKER to pick the property; a key decided at
 * module-load time is picked by whoever wrote the import. That is the same
 * reasoning the rule already applies to module constants via
 * `isStaticExpression`, so this closes an inconsistency rather than adding an
 * exception.
 *
 * The cost is explicit: `import { key } from './x'; obj[key] = v` no longer
 * reports. It is a real recall trade and it is the right one — an attacker who
 * can edit your imports does not need prototype pollution.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectObjectInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('detect-object-injection — imported keys', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        // mongoose/lib/aggregate.js:59, reduced.
        name: 'a named import used as a key',
        code: `import { modelSymbol } from './symbols';
export function isModel(modelOrConn) {
  return modelOrConn[modelSymbol];
}`,
      },
      {
        // fastify.js:255, reduced — the key is a property OF an imported
        // binding, so the resolvable root is the import.
        name: 'a property of a namespace-style import used as a key',
        code: `import pluginUtils from './pluginUtils';
export function has(self, name) {
  return self[pluginUtils.kRegisteredPlugins].includes(name);
}`,
      },
      {
        name: 'a namespace import used as a key',
        code: `import * as symbols from './symbols';
export function get(target) {
  return target[symbols.kState];
}`,
      },
      {
        name: 'a default import used as a key',
        code: `import kState from './kState';
export function get(target) {
  return target[kState];
}`,
      },
      {
        // THE CASE THE FIX WAS WRITTEN FOR, in the spelling the real code uses.
        //
        // Both sampled sites are CommonJS. The first version of this predicate
        // handled `ImportBinding` only, passed every ESM case above, and changed
        // NOTHING at fastify.js:255 or mongoose/aggregate.js:59 — a fix verified
        // against a reduction of the problem instead of the problem.
        name: 'CJS: a require() binding used as a key — fastify.js:255',
        code: `const pluginUtils = require('./pluginUtils');
function has(self, name) {
  return self[pluginUtils.kRegisteredPlugins].includes(name);
}
module.exports = has;`,
      },
      {
        name: 'CJS: a destructured require binding used as a key — mongoose aggregate.js:59',
        code: `const { modelSymbol } = require('./helpers/symbols');
function isModel(modelOrConn) {
  return modelOrConn[modelSymbol];
}
module.exports = isModel;`,
      },
      {
        // REGRESSION: the in-file form must keep working. If this breaks, the
        // change replaced one guard with another instead of widening it.
        name: 'REGRESSION: an in-file Symbol() key still passes',
        code: `const kTag = Symbol('tag');
export function get(target) {
  return target[kTag];
}`,
      },
    ],
    invalid: [
      {
        // CONTROL. A request-derived key must still report — this is the whole
        // rule, and a guard that swallowed it would make every valid case above
        // pass vacuously.
        name: 'CONTROL: a request-derived key still reports',
        code: `export function get(req, target) {
  return target[req.query.k];
}`,
        errors: 1,
      },
      {
        // CONTROL. An imported binding REASSIGNED from a request is no longer
        // module-fixed. The one-write rule that every other predicate in this
        // file uses has to hold here too.
        name: 'CONTROL: a parameter key is not an import',
        code: `export function get(k, target) {
  target[k] = 1;
  return target;
}`,
        errors: 1,
      },
      {
        // CONTROL. The import is the OBJECT, not the key — nothing about that
        // makes the key safe.
        name: 'CONTROL: importing the target does not make the key safe',
        code: `import { registry } from './registry';
export function set(req) {
  registry[req.body.name] = 1;
}`,
        errors: 1,
      },
      {
        // CONTROL for the CJS half. A `const` initialised from anything other
        // than `require` is not a module binding, and this one is a request.
        name: 'CONTROL: a const bound to request data is not a require binding',
        code: `export function set(req, target) {
  const key = req.body.name;
  target[key] = 1;
}`,
        errors: 1,
      },
      {
        // CONTROL. Reassignment after the require means the binding no longer
        // holds the module — the same one-write rule every other predicate here
        // uses.
        name: 'CONTROL: a require binding REASSIGNED to request data',
        code: `let utils = require('./utils');
function set(req, target) {
  utils = req.body.name;
  target[utils] = 1;
}
module.exports = set;`,
        errors: 1,
      },
    ],
  });
});
