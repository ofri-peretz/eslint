/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The holder-property exemption reads the CREATION site. That is not the write site.
 *
 * #997 exempted a null-prototype map held as a property of a holder object —
 * `const flags = { bools: Object.create(null) }` — by resolving the holder and reading
 * the property out of its initializer. The safety property is real: a null-prototype
 * target has no prototype to pollute.
 *
 * But an initializer says what the property WAS when the object was built. It says
 * nothing about what it IS at the indexed write. Replace it, and the exemption carried
 * on applying to an ordinary, prototype-bearing object (#998) — a false negative in the
 * rule whose entire subject is prototype pollution, which is the direction this repo
 * treats as the worse trade.
 *
 * ## What withdraws the exemption, and what deliberately does not
 *
 * ```
 * flags = { ...flags, bools: {} }   withdraw — the holder binding is rebound
 * flags.bools = {}                  withdraw — the property is replaced
 * flags.bools ??= {}                withdraw — same installation, different operator
 * delete flags.bools                withdraw — what is there afterwards is not the map
 * flags.bools[key] = true           KEEP     — a write THROUGH the map, not a replacement
 * ```
 *
 * That last line is the whole difficulty. #998 records that the first attempt — withdraw
 * if the holder or the property is written anywhere in the file — had to be reverted,
 * because it counted the indexed write itself and pulled the exemption from five
 * correctly-exempt cases including the burgee one that motivated it. Matching on the
 * assignment TARGET's shape separates them without any flow analysis: `flags.bools` is a
 * replacement, `flags.bools[key]` is not.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';

import { detectObjectInjection } from './index';

const ruleTester = new RuleTester();

ruleTester.run(
  'detect-object-injection — a replaced holder property is not exempt',
  detectObjectInjection,
  {
    valid: [
      {
        // The control from #998, and the case #997 shipped for. If this ever starts
        // reporting, the narrowing has gone too far and taken the real exemption with it.
        name: 'A — the null-prototype map is still the null-prototype map',
        code: `
          declare const keys: string[];
          function parse() {
            const flags: any = { bools: Object.create(null) };
            keys.forEach((key) => {
              flags.bools[key] = true;
            });
            return flags;
          }
        `,
      },
      {
        // Writing through the map is the exempt access itself — it must not read as a
        // replacement of the map. This is the case that broke the reverted attempt.
        name: 'many writes through the property are still writes through it',
        code: `
          declare const keys: string[];
          function parse() {
            const flags: any = { bools: Object.create(null) };
            keys.forEach((key) => {
              flags.bools[key] = true;
              flags.bools[key] = false;
            });
            return flags;
          }
        `,
      },
      {
        // A different property being replaced says nothing about this one.
        name: 'replacing a sibling property leaves this one exempt',
        code: `
          declare const keys: string[];
          function parse() {
            const flags: any = { bools: Object.create(null), strings: {} };
            flags.strings = {};
            keys.forEach((key) => {
              flags.bools[key] = true;
            });
            return flags;
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'B — the property is replaced with an ordinary object',
        code: `
          declare const keys: string[];
          function parse() {
            const flags: any = { bools: Object.create(null) };
            flags.bools = {};
            keys.forEach((key) => {
              flags.bools[key] = true;
            });
            return flags;
          }
        `,
        errors: 1,
      },
      {
        name: 'C — a spread rebuild replaces the holder binding',
        code: `
          declare const keys: string[];
          function parse() {
            let flags: any = { bools: Object.create(null) };
            flags = { ...flags, bools: {} };
            keys.forEach((key) => {
              flags.bools[key] = true;
            });
            return flags;
          }
        `,
        errors: 1,
      },
      {
        name: 'a logical-assignment operator installs it just as plainly',
        code: `
          declare const keys: string[];
          function parse() {
            const flags: any = { bools: Object.create(null) };
            flags.bools ??= {};
            keys.forEach((key) => {
              flags.bools[key] = true;
            });
            return flags;
          }
        `,
        errors: 1,
      },
      {
        name: 'a quoted replacement reaches the same property',
        code: `
          declare const keys: string[];
          function parse() {
            const flags: any = { bools: Object.create(null) };
            flags['bools'] = {};
            keys.forEach((key) => {
              flags.bools[key] = true;
            });
            return flags;
          }
        `,
        errors: 1,
      },
      {
        name: 'deleting it means what is there afterwards is not the map',
        code: `
          declare const keys: string[];
          function parse() {
            const flags: any = { bools: Object.create(null) };
            delete flags.bools;
            keys.forEach((key) => {
              flags.bools[key] = true;
            });
            return flags;
          }
        `,
        errors: 1,
      },
    ],
  },
);
