/**
 * Comprehensive tests for detect-object-injection rule
 * Security: CWE-915 (Prototype Pollution)
 * 
 * Type-Aware Feature:
 * This rule supports TypeScript type-aware checking to reduce false positives.
 * When TypeScript parser services are available (parserOptions.project configured),
 * the rule can detect if a property key is constrained to a union of safe string
 * literals (e.g., 'name' | 'email') and will NOT flag these as dangerous.
 * 
 * Without type information, all dynamic property accesses are flagged.
 * 
 * @see https://portswigger.net/web-security/prototype-pollution
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectObjectInjection } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
// Note: Without parserOptions.project, type-aware checking is not available
// Tests here verify the fallback behavior (flags all dynamic access)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('detect-object-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe object access', detectObjectInjection, {
      valid: [
        // Literal property access
        {
          code: 'obj.name = value;',
        },
        {
          code: 'obj["name"] = value;',
        },
        {
          code: 'const val = obj.name;',
        },
        {
          code: 'const val = obj["name"];',
        },
        // Dot notation
        {
          code: 'obj.property = value;',
        },
        {
          code: 'const val = obj.property;',
        },
        // Template literal with no expressions
        {
          code: 'obj["static"] = value;',
        },
        // Line 383: Early return in isHighRiskAssignment for non-member assignments
        {
          code: 'const x = value;',
        },
        {
          code: 'let y = 5;',
        },
        {
          code: 'z += 10;',
        },
        // Numeric index access - should be safe (array access)
        {
          code: `
            const items = ['a', 'b', 'c'];
            const first = items[0];
            const second = items[1];
          `,
        },
        // Validated with includes() - should be safe
        {
          code: `
            const VALID_KEYS = ['name', 'email', 'age'];
            function getField(obj, key) {
              if (VALID_KEYS.includes(key)) {
                return obj[key];
              }
            }
          `,
        },
        // Validated with hasOwnProperty - should be safe
        {
          code: `
            function safeGet(obj, key) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                return obj[key];
              }
            }
          `,
        },
        // Validated with Object.hasOwn - should be safe
        {
          code: `
            function safeGet(obj, key) {
              if (Object.hasOwn(obj, key)) {
                return obj[key];
              }
            }
          `,
        },
        // Validated with simple hasOwnProperty - should be safe
        {
          code: `
            function safeGet(obj, key) {
              if (obj.hasOwnProperty(key)) {
                return obj[key];
              }
            }
          `,
        },
        // Validated with 'in' operator - should be safe
        {
          code: `
            function safeGet(obj, key) {
              if (key in obj) {
                return obj[key];
              }
            }
          `,
        },
        // Validated and assigned - should be safe
        {
          code: `
            const ALLOWED = ['light', 'dark', 'system'];
            function setTheme(userTheme) {
              if (!ALLOWED.includes(userTheme)) {
                throw new Error('Invalid theme');
              }
              config[userTheme] = true;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Bracket Notation', () => {
    ruleTester.run('invalid - dynamic property access', detectObjectInjection, {
      valid: [],
      invalid: [
        // Note: Rule may not detect all dynamic property access patterns
        // Rule checks for dangerous patterns but may miss some cases
        // These represent expected behavior - rule may need enhancement
        {
          code: 'obj[userInput] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'const val = obj[userKey];',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj[`${prefix}${key}`] = value;',
          // Template literal with expressions - should report once on AssignmentExpression
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: `
            const key = getUserInput();
            obj[key] = value;
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj[config.key] = value;',
          // Nested property access - should report once on AssignmentExpression
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('Invalid Code - Prototype Pollution', () => {
    ruleTester.run('invalid - prototype pollution patterns', detectObjectInjection, {
      valid: [],
      invalid: [
        // Note: Rule may not detect literal dangerous properties
        // Rule checks for dynamic access patterns but may miss literal dangerous properties
        // These represent expected behavior - rule may need enhancement
        {
          code: 'obj["__proto__"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj[prototypeKey] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj["constructor"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', detectObjectInjection, {
      valid: [],
      invalid: [
        {
          code: 'obj[userInput] = value;',
          errors: [
            {
              messageId: 'objectInjection',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', detectObjectInjection, {
      valid: [
        // Literal strings (if allowLiterals is true)
        {
          code: 'obj["name"] = value;',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        {
          code: 'obj[userInput] = value;',
          options: [{ allowLiterals: true }],
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', detectObjectInjection, {
      valid: [
        {
          code: 'obj["name"] = value;',
          options: [{ allowLiterals: true }],
        },
        // Line 329: Early return when allowLiterals is false but literal is safe
        {
          code: 'obj["safeProperty"] = value;',
          options: [{ allowLiterals: false }],
        },
        {
          code: 'user["email"] = value;',
          options: [{ allowLiterals: false }],
        },
      ],
      invalid: [
        {
          code: 'obj[userInput] = value;',
          options: [{ allowLiterals: true }],
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj[dangerousKey] = value;',
          options: [{ dangerousProperties: ['dangerousKey'] }],
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('Type-Aware Detection (without parserOptions.project)', () => {
    /**
     * Note: These tests run WITHOUT TypeScript type information (no parserOptions.project).
     * Without type info, the rule falls back to flagging ALL dynamic property accesses.
     * 
     * When parserOptions.project IS configured (in a real TypeScript project),
     * the rule uses type information to detect:
     * - Union types like 'name' | 'email' → SAFE (not flagged)
     * - Single literal types like const key: 'name' → SAFE (not flagged)
     * - String type (any string) → DANGEROUS (flagged)
     * 
     * See the rule's JSDoc for detailed type-aware behavior.
     */
    ruleTester.run('type-aware fallback behavior', detectObjectInjection, {
      valid: [
        // Dot notation is always safe
        {
          code: 'obj.name = value;',
        },
        // String literal bracket notation
        {
          code: 'obj["email"] = value;',
        },
      ],
      invalid: [
        // Without type info, const key = 'name' is still an identifier access (flagged)
        // WITH type info and proper literal type inference, this would be SAFE
        {
          code: `
            const key = 'name';
            obj[key] = value;
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
        // Without type information, any identifier access is flagged
        // When type-aware: if key is typed as 'name' | 'email', this would be SAFE
        {
          code: `
            const key: string = getUserInput();
            obj[key] = value;
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
        // Generic string type should always be flagged
        {
          code: `
            function setProperty(obj: object, key: string, value: unknown) {
              obj[key] = value;
            }
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
        // Dynamic access with function return value
        {
          code: `
            const key = getPropertyName();
            obj[key] = value;
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('TypeScript Union Type Patterns (documentation)', () => {
    /**
     * These tests document expected behavior when type information IS available.
     * Without parserOptions.project, these tests verify the fallback behavior.
     * 
     * With type-aware checking enabled:
     * - Union of safe literals ('name' | 'email') → NOT flagged
     * - Union containing dangerous property ('__proto__' | 'name') → FLAGGED
     * - Generic string → FLAGGED
     */
    ruleTester.run('union type documentation tests', detectObjectInjection, {
      valid: [
        // These are always safe regardless of type info
        {
          code: 'obj["name"] = value;',
        },
        {
          code: 'obj["email"] = value;',
        },
        {
          code: `
            type SafeKey = 'name' | 'email';
            // With type info, this would be detected as safe
            // Without type info, we'd need the literal usage
            obj["name"] = value;
          `,
        },
      ],
      invalid: [
        // Dangerous property literal is ALWAYS flagged
        {
          code: 'obj["__proto__"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj["constructor"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj["prototype"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        // Variable access without type info is flagged
        {
          code: `
            type Key = 'name' | 'email';
            const key: Key = 'name';
            obj[key] = value;
          `,
          // Without type info, this is flagged because 'key' is an identifier
          // WITH type info, this would be SAFE (key is constrained to 'name' | 'email')
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('Complex Access Patterns', () => {
    ruleTester.run('complex patterns', detectObjectInjection, {
      valid: [
        // Nested dot notation (safe)
        {
          code: 'obj.user.name = value;',
        },
        // Method call result with literal (safe)
        {
          code: 'const result = obj["data"];',
        },
      ],
      invalid: [
        // Nested bracket with variable (dangerous)
        {
          code: 'obj.users[userId] = data;',
          errors: [{ messageId: 'objectInjection' }],
        },
        // Chained bracket access (dangerous) — still flagged, but reported once.
        // The dedup added in #183 (checkAssignmentExpression walks the chain and
        // marks every intermediate computed access handled; checkMemberExpression
        // reports "only the OUTERMOST") collapses `a[b][c]` to a single finding
        // per statement to avoid duplicate findings at the same source position.
        // The vulnerability is still caught — one objectInjection report.
        {
          code: 'obj[key1][key2] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        // Three-level-deep chain — forces the chain-walking `while` loop in
        // checkAssignmentExpression to execute its body more than once
        // (marking both `a[b]` and `a[b][c]` as handled) before exiting on
        // the innermost non-computed-MemberExpression object (`a`).
        {
          code: 'a[b][c][d] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        // Computed property from function (dangerous)
        {
          code: 'obj[getKey()] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        // Ternary in bracket (dangerous)
        {
          code: 'obj[condition ? key1 : key2] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  /**
   * FP Regression: for..in / Object.keys / Object.entries iteration
   * Keys produced by these loops are own property names from the object,
   * not user-controlled input → safe from prototype-pollution injection.
   */
  describe('FP Regression: for-in and Object-keys iteration', () => {
    ruleTester.run('for..in loop variable is safe', detectObjectInjection, {
      valid: [
        {
          code: `
            for (const key in obj) {
              result[key] = obj[key];
            }
          `,
        },
        {
          code: `
            const target = {};
            for (const prop in source) {
              if (Object.prototype.hasOwnProperty.call(source, prop)) {
                target[prop] = source[prop];
              }
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('Object.keys iteration variable is safe', detectObjectInjection, {
      valid: [
        {
          code: `
            for (const key of Object.keys(obj)) {
              copy[key] = obj[key];
            }
          `,
        },
        {
          code: `
            for (const key of Object.keys(defaults)) {
              if (!(key in options)) options[key] = defaults[key];
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('Object.entries iteration variable is safe', detectObjectInjection, {
      valid: [
        {
          code: `
            for (const [key, val] of Object.entries(schema)) {
              result[key] = transform(val);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  /**
   * FP Regression: typed-array element access
   * Typed arrays (Int8Array…Float64Array, BigInt64Array, BigUint64Array) use
   * numeric indices by construction — string-keyed prototype pollution is
   * impossible.
   */
  describe('FP Regression: typed-array access', () => {
    ruleTester.run('typed-array new-expression objects are safe', detectObjectInjection, {
      valid: [
        {
          code: `
            const buf = new Float32Array(1024);
            for (let i = 0; i < buf.length; i++) {
              buf[i] = Math.random();
            }
          `,
        },
        {
          code: `
            const pixels = new Uint8Array(width * height * 4);
            pixels[offset] = r;
            pixels[offset + 1] = g;
          `,
        },
        {
          code: `
            const view = new Int32Array(buffer);
            const val = view[idx];
          `,
        },
      ],
      invalid: [],
    });
  });

  /**
   * Benchmark FP Regression Tests
   * Source: eslint-benchmark-suite/benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js
   */
  describe('Benchmark FP Regression', () => {
    ruleTester.run('benchmark FP: safe_proto_nullproto', detectObjectInjection, {
      valid: [
        // Object.create(null) is immune to prototype pollution
        // Bracket notation on null-prototype objects is inherently safe
        {
          code: `
            function safeStore(entries) {
              const obj = Object.create(null);
              for (const [key, value] of entries) {
                obj[key] = value;
              }
              return obj;
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('benchmark FP: safe_random_shuffle', detectObjectInjection, {
      valid: [
        // Fisher-Yates shuffle uses computed index on arrays
        // Array bracket access with numeric index is not prototype pollution
        {
          code: `
            function shuffle(array) {
              const shuffled = [...array];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              return shuffled;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  /**
   * Codemod / AST-walker context detection.
   * Covers both the filename-pattern branches and the import-source scan
   * (which must be exercised via a real ImportDeclaration for every listed
   * package, plus a negative case where an import exists but matches none).
   */
  describe('Codemod / AST-walker context detection', () => {
    ruleTester.run('filename under a codemods directory is skipped', detectObjectInjection, {
      valid: [
        {
          code: 'obj[userInput] = value;',
          filename: '/repo/tools/codemods/rename.ts',
        },
        {
          code: 'obj[userInput] = value;',
          filename: '/repo/tools/codemod/rename.ts',
        },
      ],
      invalid: [],
    });

    ruleTester.run('filename matching the *codemod.ts pattern is skipped', detectObjectInjection, {
      valid: [
        {
          code: 'obj[userInput] = value;',
          filename: '/repo/tools/rename.codemod.ts',
        },
        {
          code: 'obj[userInput] = value;',
          filename: '/repo/tools/rename.codemod.mjs',
        },
      ],
      invalid: [],
    });

    ruleTester.run('each recognized AST-tool import marks the file as codemod context', detectObjectInjection, {
      valid: [
        { code: "import x from '@babel/types';\nobj[userInput] = value;", filename: '/repo/a.ts' },
        { code: "import x from '@babel/traverse';\nobj[userInput] = value;", filename: '/repo/b.ts' },
        { code: "import x from 'recast';\nobj[userInput] = value;", filename: '/repo/c.ts' },
        { code: "import x from 'jscodeshift';\nobj[userInput] = value;", filename: '/repo/d.ts' },
        { code: "import x from 'eslint';\nobj[userInput] = value;", filename: '/repo/e.ts' },
        { code: "import x from 'estree-walker';\nobj[userInput] = value;", filename: '/repo/f.ts' },
        { code: "import x from 'ast-types';\nobj[userInput] = value;", filename: '/repo/g.ts' },
        { code: "import x from 'esrap';\nobj[userInput] = value;", filename: '/repo/h.ts' },
        { code: "import x from 'unist-util-visit';\nobj[userInput] = value;", filename: '/repo/i.ts' },
        // startsWith('@typescript-eslint/') subpath match
        { code: "import x from '@typescript-eslint/utils';\nobj[userInput] = value;", filename: '/repo/j.ts' },
      ],
      invalid: [],
    });

    ruleTester.run(
      'an unrelated import does not suppress detection (scan continues past non-matches)',
      detectObjectInjection,
      {
        valid: [],
        invalid: [
          {
            code: "import React from 'react';\nobj[userInput] = value;",
            filename: '/repo/component.ts',
            errors: [{ messageId: 'objectInjection' }],
          },
        ],
      },
    );
  });

  /**
   * hasPrecedingValidation — exercise the negated-includes recursion, the
   * hasOwnProperty.call() args[1]-mismatch false path, and the non-block
   * (unbraced) early-exit consequent shape.
   */
  describe('hasPrecedingValidation edge cases', () => {
    ruleTester.run('negated includes() check (!ARRAY.includes(key)) with early throw is safe', detectObjectInjection, {
      valid: [
        {
          code: `
            const ALLOWED = ['light', 'dark'];
            function setTheme(userTheme) {
              if (!ALLOWED.includes(userTheme)) throw new Error('bad theme');
              config[userTheme] = true;
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run(
      'hasOwnProperty.call() whose second argument is NOT the key identifier still flags access',
      detectObjectInjection,
      {
        valid: [],
        invalid: [
          {
            code: `
              function get(obj, key) {
                if (Object.prototype.hasOwnProperty.call(obj, 'literalOtherName')) {
                  return obj[key];
                }
              }
            `,
            errors: [{ messageId: 'objectInjection' }],
          },
        ],
      },
    );

    ruleTester.run(
      'obj.hasOwnProperty(key) or Object.hasOwn(obj, key) whose key argument is NOT the accessed identifier still flags access',
      detectObjectInjection,
      {
        valid: [],
        invalid: [
          {
            code: `
              function get(obj, key) {
                if (obj.hasOwnProperty('literalOtherName')) {
                  return obj[key];
                }
              }
            `,
            errors: [{ messageId: 'objectInjection' }],
          },
          {
            code: `
              function get(obj, key) {
                if (Object.hasOwn(obj, 'literalOtherName')) {
                  return obj[key];
                }
              }
            `,
            errors: [{ messageId: 'objectInjection' }],
          },
        ],
      },
    );

    ruleTester.run(
      'unbraced (non-block) throw or return consequent still counts as an early exit',
      detectObjectInjection,
      {
        valid: [
          {
            code: `
              const ALLOWED = ['a', 'b'];
              function setValue(key, value) {
                if (!ALLOWED.includes(key)) return;
                store[key] = value;
              }
            `,
          },
        ],
        invalid: [],
      },
    );
  });

  /**
   * isNumericKey — cover the remaining bitwise/arithmetic operators and the
   * loop-counter identifier resolution edge cases.
   */
  describe('isNumericKey coverage', () => {
    ruleTester.run('bitwise and arithmetic coercions on the key are treated as numeric', detectObjectInjection, {
      valid: [
        { code: 'const v = arr[x | 0];' },
        { code: 'const v = arr[x & 0xff];' },
        { code: 'const v = arr[x ^ 1];' },
        { code: 'const v = arr[x << 1];' },
        { code: 'const v = arr[x >> 1];' },
        { code: 'const v = arr[x >>> 0];' },
        { code: 'const v = arr[x * 2];' },
        { code: 'const v = arr[x / 2];' },
        { code: 'const v = arr[x % 2];' },
        { code: 'const v = arr[x - 1];' },
        { code: 'const v = arr[Number(x)];' },
        { code: 'const v = arr[parseInt(x, 10)];' },
        { code: 'const v = arr[parseFloat(x)];' },
      ],
      invalid: [],
    });

    ruleTester.run(
      'a for-loop identifier whose initializer is NOT a numeric literal is still flagged',
      detectObjectInjection,
      {
        valid: [],
        invalid: [
          // Uses "cursor" (not in the numericIndexNames safe-list of i/j/k/index/idx/n/len)
          // so the access must be judged by isLoopCounterIdentifier's numeric-init check,
          // not short-circuited earlier by the common-index-name allowlist.
          {
            code: `
              for (let cursor = getStart(); cursor < 10; cursor++) {
                obj[cursor] = value;
              }
            `,
            errors: [{ messageId: 'objectInjection' }],
          },
        ],
      },
    );

    ruleTester.run(
      'an identifier declared outside any for-statement init is still flagged',
      detectObjectInjection,
      {
        valid: [],
        invalid: [
          {
            code: `
              let cursor = getDynamicKey();
              obj[cursor] = value;
            `,
            errors: [{ messageId: 'objectInjection' }],
          },
        ],
      },
    );
  });

  /**
   * isForInOrObjectKeysKey — negative paths: a for...of over a plain array
   * (not Object.keys/entries) must NOT be treated as a safe iteration key.
   */
  describe('isForInOrObjectKeysKey negative paths', () => {
    ruleTester.run('for...of over a plain array is not a safe iteration key', detectObjectInjection, {
      valid: [],
      invalid: [
        {
          code: `
            for (const key of someArray) {
              obj[key] = value;
            }
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });

    ruleTester.run('for...of over Object.values (not keys or entries) is not a safe iteration key', detectObjectInjection, {
      valid: [],
      invalid: [
        {
          code: `
            for (const key of Object.values(obj)) {
              target[key] = 1;
            }
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });

    ruleTester.run(
      'a for...in loop reusing a pre-declared variable (no fresh VariableDeclaration) is not a safe iteration key',
      detectObjectInjection,
      {
        valid: [],
        invalid: [
          {
            // `key` is a pre-declared function parameter, not a fresh
            // `for (const key in obj)` binding, so it is never treated as a
            // safe iteration key — both the assignment (target[key]) and the
            // read (obj[key]) are flagged.
            code: `
              function copy(key, obj, target) {
                for (key in obj) {
                  target[key] = obj[key];
                }
              }
            `,
            errors: [
              { messageId: 'objectInjection' },
              { messageId: 'objectInjection' },
            ],
          },
        ],
      },
    );
  });

  /**
   * isPrototypelessObject — the array-spread ("[...array]") detection branch,
   * exercised with a non-numeric, non-validated key so the access reaches
   * this check instead of short-circuiting earlier on isNumericKey.
   */
  describe('isPrototypelessObject array-spread pattern', () => {
    ruleTester.run('a variable initialized from an array spread is treated as prototype-less', detectObjectInjection, {
      valid: [
        {
          code: `
            const merged = [...baseArray];
            merged[dynamicKey] = value;
          `,
        },
      ],
      invalid: [],
    });
  });

  /**
   * isReflectResultAccess — direct call, optional-chain recursion (true and
   * false paths), and a plain (non-Reflect) object to confirm the negative.
   */
  describe('isReflectResultAccess (Reflect metadata access)', () => {
    ruleTester.run('Reflect.getMetadata(...) result access is safe', detectObjectInjection, {
      valid: [
        {
          code: "const v = Reflect.getMetadata(PARAMTYPES_METADATA, target)[dynamicIndex];",
        },
        // Optional-chain form: Reflect.getMetadata(...)?.[key]. Note the whole
        // expression is wrapped in a single outer ChainExpression here, so the
        // MemberExpression visitor's `node.object` is still the plain
        // CallExpression (direct-call branch) — this does NOT exercise the
        // ChainExpression recursion itself (see the parenthesized cases below
        // for that), but it does confirm the optional-chain member access is
        // still recognized as safe end-to-end.
        {
          code: "const v = Reflect.getMetadata(PARAMTYPES_METADATA, target)?.[dynamicIndex];",
        },
        // Parenthesized optional-chain object: `(Reflect?.getMetadata(...))`
        // becomes its own standalone ChainExpression, so `node.object` really
        // IS a ChainExpression here — this exercises the recursive branch
        // (lines 740-744) on its TRUE path (recurses into a Reflect call).
        {
          code: "const v = (Reflect?.getMetadata(PARAMTYPES_METADATA, target))[dynamicIndex];",
        },
      ],
      invalid: [],
    });

    ruleTester.run(
      'a non-optional-chain non-Reflect call is still flagged (direct-call recursion base case false)',
      detectObjectInjection,
      {
        valid: [],
        invalid: [
          {
            code: 'const v = getMetadata(target)?.[dynamicIndex];',
            errors: [{ messageId: 'objectInjection' }],
          },
        ],
      },
    );

    ruleTester.run(
      'a parenthesized optional-chain object that is NOT a Reflect call is still flagged (recursion false path)',
      detectObjectInjection,
      {
        valid: [],
        invalid: [
          {
            // `node.object` is a standalone ChainExpression (same shape as the
            // safe case above) but its inner call is NOT `Reflect.*`, so the
            // recursive call falls through to the final `return false`.
            code: 'const v = (getMetadata?.(target))[dynamicIndex];',
            errors: [{ messageId: 'objectInjection' }],
          },
        ],
      },
    );

    // NOTE: unlike the read-access path (isHighRiskMemberAccess), the
    // assignment path (isHighRiskAssignment) does NOT call
    // isReflectResultAccess — Reflect-metadata assignment targets are still
    // flagged. This documents that real, current behavior.
    ruleTester.run(
      'Reflect metadata ASSIGNMENT (not read) is still flagged — isHighRiskAssignment has no Reflect exemption',
      detectObjectInjection,
      {
        valid: [],
        invalid: [
          {
            code: 'Reflect.getMetadata(META_KEY, target)[dynamicIndex] = value;',
            errors: [{ messageId: 'objectInjection' }],
          },
        ],
      },
    );
  });

  /**
   * isDangerousPropertyAccess — non-number Literal keys (boolean), and the
   * SCREAMING_SNAKE_CASE / camelCase-typed-suffix identifier allowlists.
   */
  describe('isDangerousPropertyAccess literal/identifier edge cases', () => {
    ruleTester.run('a boolean literal key is NOT treated as a safe numeric index', detectObjectInjection, {
      valid: [],
      invalid: [
        {
          code: 'obj[true] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });

    ruleTester.run('SCREAMING_SNAKE_CASE identifiers are treated as safe compile-time constants', detectObjectInjection, {
      valid: [
        { code: 'obj[STATUS_CODE] = value;' },
        { code: 'const v = obj[PARAMTYPES_METADATA];' },
      ],
      invalid: [],
    });

    ruleTester.run('camelCase identifiers with a typed or enumerated suffix are treated as safe', detectObjectInjection, {
      valid: [
        { code: 'obj[errorHttpStatusCode] = value;' },
        { code: 'obj[retryCount] = value;' },
        { code: 'const v = obj[reqType];' },
      ],
      invalid: [],
    });
  });

  /**
   * isHighRiskAssignment's own isNumericKey / ChainExpression call sites —
   * these mirror isHighRiskMemberAccess's checks but run on the ASSIGNMENT
   * side (obj[key] = value), which is a structurally different call path.
   */
  describe('isNumericKey and Reflect checks on the assignment side', () => {
    ruleTester.run('unary-plus coerced key is treated as numeric on assignment', detectObjectInjection, {
      valid: [
        { code: 'arr[+x] = value;' },
      ],
      invalid: [],
    });

    ruleTester.run('unary-plus coerced key is treated as numeric on read access', detectObjectInjection, {
      valid: [
        { code: 'const v = arr[+x];' },
      ],
      invalid: [],
    });
  });

  /**
   * Object.assign(target, untrustedSource) / spread-merge equivalent-injection
   * detection (checkObjectAssignSpread). This whole visitor path was
   * previously untested — cover: the ObjectExpression-first-arg short
   * circuit (true and false), the tainted-vs-safe source classification
   * (single tainted, mixed safe+tainted, and all-safe short-circuit), and
   * the test-file suppression that reaches this specific visitor.
   */
  describe('Object.assign / spread-merge object-injection detection', () => {
    ruleTester.run('Object.assign with a fresh object-literal target is always safe', detectObjectInjection, {
      valid: [
        // First argument is a fresh ObjectExpression -- no taint risk regardless of sources.
        { code: 'Object.assign({}, source);' },
        { code: 'Object.assign({}, untrustedSource, anotherSource);' },
      ],
      invalid: [],
    });

    ruleTester.run('Object.assign onto a non-literal target with an untrusted source is flagged', detectObjectInjection, {
      valid: [],
      invalid: [
        {
          code: 'Object.assign(target, source);',
          errors: [{ messageId: 'objectInjection' }],
        },
        // Mixed sources: one safe (object literal), one tainted (identifier) --
        // the tainted one alone is enough to trigger the report.
        {
          code: "Object.assign(target, { a: 1 }, source);",
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });

    ruleTester.run('Object.assign whose extra sources are all literals or object-expressions is safe', detectObjectInjection, {
      valid: [
        // Every source after the target is an ObjectExpression or Literal --
        // anyTaintedSource is false, so the function returns before reporting.
        { code: "Object.assign(target, { a: 1 }, 'literal-string');" },
        { code: "Object.assign(target, 'just-a-string');" },
      ],
      invalid: [],
    });

    ruleTester.run('Object.assign is not flagged when the callee is not Object.assign', detectObjectInjection, {
      valid: [
        { code: 'Foo.assign(target, source);' },
        { code: 'Object.notAssign(target, source);' },
        { code: "Object['assign'](target, source);" },
        { code: 'plainCall(target, source);' },
      ],
      invalid: [],
    });

    ruleTester.run('Object.assign inside a test file is suppressed like all other checks', detectObjectInjection, {
      valid: [
        {
          code: 'Object.assign(target, source);',
          filename: '/repo/src/utils.test.ts',
        },
      ],
      invalid: [],
    });
  });
});

