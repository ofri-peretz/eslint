/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What this rule does to the twelve shapes real code actually produces.
 *
 * `detect-object-injection` has resisted triage because the corpus files it
 * under 4,286 distinct shape signatures, none of which is a decision anyone can
 * make. `Mem(Id[Id])` is `paths[i]`. `Assign=(Mem(Id[Id]),Id)` is
 * `fields[field] = include`. Adjudicating 4,286 of those is not work, it is a
 * treadmill.
 *
 * The finite question is the one this file asks: of the shapes that actually
 * occur, which does the rule report, and is each of those a position worth
 * defending? Twelve shapes cover the head of the distribution — every entry
 * below is copied from a real line in the scanned corpus, cited.
 *
 * The pairing is the point. A rule that reported all twelve would be useless
 * and a rule that reported none would be inert; what these cases pin is
 * exactly where the line falls, so that moving it is a decision somebody makes
 * on purpose rather than a side effect.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { detectObjectInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('detect-object-injection — the shapes real code produces', () => {
  ruleTester.run('wild shapes', detectObjectInjection, {
    valid: [
      // Every READ through a computed key. The rule is silent on all of them,
      // and that is the correct half of the line: prototype pollution needs a
      // write. A read of `__proto__` returns the prototype; it does not
      // replace it.
      { name: 'an array read through a loop counter — 73 findings, the commonest shape', code: 'path = paths[i];' },
      { name: 'a key read off a named property — 23 findings', code: 'if (!current[app.name]) { init(); }' },
      { name: 'a path segment used as a read key — 19 findings', code: 'cur = cur instanceof Map ? cur.get(parts[i]) : cur[parts[i]];' },
      { name: 'a key taken from a field descriptor — 15 findings', code: 'const v = obj[field.field];' },
    ],
    invalid: [
      /**
       * Every WRITE through a computed key, and the whole of FP-010.
       *
       * These seven shapes are ~750 findings in the wild and they are not
       * seven decisions — they are one: **does a computed-key write report
       * without evidence that the key is attacker-controlled?** Today it does.
       * Every one of the examples below has a key that is locally derived —
       * a loop counter, `Object.keys` of a sibling object, a tag name — so
       * every one is arguably a false positive, and equally every one is the
       * exact syntax of a prototype-pollution write.
       *
       * They are `invalid` because that is what the rule does. Recording them
       * as the rule's position is what makes the open question answerable:
       * change the rule and these seven move together, deliberately, instead
       * of 4,286 shape signatures drifting one at a time.
       *
       * The precedent for the other answer is `no-timing-unsafe-compare`,
       * which was inverted to require an attacker-controlled operand and went
       * from 27 findings and zero real oracles to near-zero noise.
       */
      { name: 'a write through a local key — 33 findings', code: 'fields[field] = include;', errors: 1 },
      { name: 'a nested write, both keys local — 28 findings', code: 'obj[i][op] = castPipelineOperator(op, obj[i][op]);', errors: 1 },
      { name: 'copying one document into another — 25 findings', code: 'self[i] = doc[i];', errors: 1 },
      { name: 'lazy initialisation of a nested object — 22 findings', code: 'doc_ = doc_[piece] || (doc_[piece] = {});', errors: 1 },
      { name: 'collecting duplicates into an array — 18 findings', code: 'rawDocs[key] = [rawDocs[key], val];', errors: 1 },
      { name: 'a two-level write, both keys local — 16 findings', code: 'currentUpdate[start][remnant] = now;', errors: 1 },
      { name: 'a tag name used as a label key — 15 findings', code: 'labels[tag.name] = tag.value;', errors: 1 },
    ],
  });
});
