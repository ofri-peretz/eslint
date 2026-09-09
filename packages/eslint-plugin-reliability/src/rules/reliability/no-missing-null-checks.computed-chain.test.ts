/**
 * A guard covers the whole chain that starts at the guarded value — including
 * the COMPUTED links.
 *
 * `rootGuards` read the relation off the source text: `response` covers
 * `response.data.items` because that text starts with `response.`. An index does
 * not, so `m[0]` was not covered by a check on `m`, and
 * `const m = /x/.exec(s); return m ? m[0].length : 0` reported — the shape every
 * regex match in a parser is written in. `m[0]` alone was fine; adding one more
 * link past the index was not.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingNullChecks } from './no-missing-null-checks';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-missing-null-checks — a guard covers computed links too', () => {
  ruleTester.run('computed chain', noMissingNullChecks, {
    valid: [
      {
        name: 'ternary test guards past an index',
        code: 'export function f(s: string) { const m = /x/.exec(s); return m ? m[0].length : 0; }',
      },
      {
        name: 'early return guards past an index',
        code: 'export function f(s: string) { const m = /x/.exec(s); if (m === null) return 0; return m[0].length; }',
      },
      {
        name: 'falsy early return guards past an index',
        code: 'export function f(s: string) { const m = /x/.exec(s); if (!m) return 0; return m[0].length; }',
      },
      {
        name: 'short-circuit && guards past an index',
        code: 'export function f(s: string) { const m = /x/.exec(s); return m && m[1].length; }',
      },
      {
        name: 'the dotted case still works',
        code: 'export function f(s: string) { const m = /x/.exec(s); return m ? m.index : 0; }',
      },
    ],
    invalid: [
      {
        name: 'no guard at all, past an index',
        code: 'export function f(s: string) { const m = /x/.exec(s); return m[0].length; }',
        errors: [{ messageId: 'missingNullCheck' as const }],
      },
      {
        name: 'a guard on a different binding does not carry over',
        code: 'export function f(s: string) { const m = /x/.exec(s); const n = /y/.exec(s); return n ? m[0].length : 0; }',
        errors: [{ messageId: 'missingNullCheck' as const }],
      },
    ],
  });
});

describe('no-missing-null-checks — three more shapes of the same guard', () => {
  // `list.find(...)` is used throughout because it is a shape this rule actually
  // finds nullable. A `declare function f(): T | undefined` is not: the rule reads
  // the file, not the type checker, so a test written that way passes whatever the
  // guard logic does and proves nothing.
  const FIND = 'declare const list: { value?: unknown }[];\n';

  ruleTester.run('alternate arm and try-catch exits', noMissingNullChecks, {
    valid: [
      {
        name: '`x === undefined ? A : x.y` guards the ALTERNATE, not the consequent',
        code: `${FIND}export function f() { const w = list.find((c) => c.value !== undefined); return w === undefined ? 'unset' : String(w.value); }`,
      },
      {
        name: 'the alternate arm reached through a template literal',
        code: `${FIND}export function f(n: string) { const w = list.find((c) => c.value !== undefined); return w === undefined ? \`${'${n}'} is unset\` : \`${'${n}'} = ${'${JSON.stringify(w.value)}'}\`; }`,
      },
      {
        name: '`x === null ? A : x.y`',
        code: `${FIND}export function f() { const w = list.find((c) => c.value !== null); return w === null ? 0 : w.value; }`,
      },
      {
        name: '`x != null ? x.y : A` still guards the consequent',
        code: `${FIND}export function f() { const w = list.find((c) => c.value !== undefined); return w != null ? w.value : 0; }`,
      },
      {
        name: 'a non-null assertion continues the chain',
        code: 'export function f(s: string) { const m = /x/.exec(s); return m ? m!.length : 0; }',
      },
      {
        name: 'a try whose finally leaves ends the branch on its own',
        code: `${FIND}declare function run(): number; declare function close(): void;
          export function f() {
            const seam = list.find((c) => c.value !== undefined);
            if (seam === undefined) {
              try { close(); } finally { return run(); }
            }
            seam.value = false;
            return 0;
          }`,
      },
      {
        name: 'a type assertion between the && and the access',
        code: 'export function f(s: string) { const m = /x/.exec(s); return m && String(m[1] as string); }',
      },
      {
        name: 'an early-return branch whose try returns and whose catch throws',
        code: `${FIND}declare function run(): number;
          export function f() {
            const seam = list.find((c) => c.value !== undefined);
            if (seam === undefined) {
              try { return run(); } catch (err) { throw err; }
            }
            seam.value = false;
            return 0;
          }`,
      },
    ],
    invalid: [
      {
        name: 'no guard at all in the alternate position',
        code: `${FIND}export function f() { const w = list.find((c) => c.value !== undefined); return true ? 'x' : String(w.value); }`,
        errors: [{ messageId: 'missingNullCheck' as const }],
      },
      {
        name: 'a try whose block falls through does not end the branch',
        code: `${FIND}declare function log(e: unknown): void; declare function close(): void;
          export function f() {
            const seam = list.find((c) => c.value !== undefined);
            if (seam === undefined) {
              try { close(); } catch (err) { throw err; }
            }
            seam.value = false;
            return 0;
          }`,
        errors: [{ messageId: 'missingNullCheck' as const }],
      },
      {
        name: 'a try whose catch falls through does not end the branch',
        code: `${FIND}declare function run(): number; declare function log(e: unknown): void;
          export function f() {
            const seam = list.find((c) => c.value !== undefined);
            if (seam === undefined) {
              try { return run(); } catch (err) { log(err); }
            }
            seam.value = false;
            return 0;
          }`,
        errors: [{ messageId: 'missingNullCheck' as const }],
      },
    ],
  });
});
