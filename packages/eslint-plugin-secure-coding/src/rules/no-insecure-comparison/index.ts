/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-comparison
 * Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities
 * CWE-697: Incorrect Comparison
 * 
 * @see https://cwe.mitre.org/data/definitions/697.html
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, formatLLMMessage, MessageIcons, isTestFilePath, propertyName } from '@interlace/eslint-devkit';
import { createRule, createModuleEvidence } from '@interlace/eslint-devkit';

/**
 * Whether this file loads an AST-manipulation library.
 *
 * Through the devkit probe, not a `Program.body` scan for `ImportDeclaration`.
 * This is a *suppression* gate, so a spelling it cannot read fails in the
 * false-positive direction: `const ts = require('typescript')` in a CommonJS
 * codemod lost the exemption and every `node.key === 'foo'` in it reported a
 * hardcoded-secret comparison, while the identical ESM file was silent.
 */
const fileUsesAstTooling = createModuleEvidence({
  packages: [
    '@babel/types',
    '@babel/traverse',
    '@babel/generator',
    '@babel/parser',
    'recast',
    'jscodeshift',
    'estree-walker',
    'unist-util-visit',
    '@typescript-eslint/utils',
    '@typescript-eslint/typescript-estree',
    'typescript',
    'ts-morph',
    'eslint',
  ],
});

type MessageIds =
  | 'insecureComparison'
  | 'useStrictEquality'
  | 'useTimingSafeEqual'
  | 'timingUnsafeComparison';

export interface Options {
  /** Allow insecure comparison in test files. Default: false */
  allowInTests?: boolean;
  
  /** Additional patterns to ignore. Default: [] */
  ignorePatterns?: string[];

  /**
   * Report plain loose equality — `==` between operands that are not secrets.
   * Default: true, which is the behaviour this rule has always had.
   *
   * Turning it off keeps the part of this rule only a security plugin does —
   * `==` or `===` on a token, password or signature, where coercion or an early
   * return is an authentication bypass — and leaves generic type-coercion to
   * `eqeqeq`, which is what most projects already run it under.
   *
   * The option exists because the two findings are not the same claim.
   * IGNF/cartes.gouv.fr-entree-carto suppressed this rule fifteen times, every
   * one annotated "comparaison de clefs metier, pas de secret" — a team reading
   * a CWE-697 HIGH on `if (key == filename)` and correctly judging that their
   * business keys are not credentials. Across 158 scanned repositories the two
   * largest shapes were `if (key == filename)` and
   * `if (e.code == 'MODULE_NOT_FOUND')`: 140 findings about a filename and an
   * error code.
   */
  reportLooseEquality?: boolean;
}

type RuleOptions = [Options?];

export const noInsecureComparison = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-comparison',
  meta: {
    type: 'problem',
    // NOT deprecated, and the pointer that said otherwise was losing users a
    // whole weakness class.
    //
    // This rule reported two things: CWE-208 (comparing a secret with an
    // operator that short-circuits, leaking timing) and CWE-697 (`==` coercing
    // types before it compares). It was marked `deprecated` with
    // `replacedBy: ['node-security/no-timing-unsafe-compare']`, which covers the
    // FIRST of those and nothing else — probed: `no-timing-unsafe-compare` is
    // QUIET on `if (userRole == "admin")`.
    //
    // And this is the ONLY rule in the ecosystem carrying CWE-697 — verified by
    // grepping every plugin. So a user who did as they were told, disabled this
    // and enabled the replacement, silently lost type-coercion detection
    // entirely, with the deprecation notice reassuring them nothing was missing.
    // A wrong `replacedBy` is worse than none: it converts a considered
    // migration into a coverage hole.
    //
    // The CWE-208 half does overlap `node-security/no-timing-unsafe-compare`,
    // which is the better implementation of it. That is a real partition
    // question, but it is answered by narrowing this rule's timing head, not by
    // retiring the only owner of a different weakness. Recorded in
    // RULE-QUALITY-PROGRAM.md.
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insecure-comparison.md',
      description: 'Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities',
      cwe: 'CWE-697',
      cvss: 5.3,
    },
    // No `fixable`: this rule emits suggestions only. Rewriting `==` to `===`
    // is not guaranteed to preserve behaviour, so it must not run under
    // `--fix`.
    hasSuggestions: true,
    messages: {
      insecureComparison: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure Comparison',
        cwe: 'CWE-697',
        description: 'Insecure comparison operator ({{operator}}) detected - can lead to type coercion vulnerabilities',
        severity: 'HIGH',
        fix: 'Use strict equality ({{strictOperator}}) instead: {{example}} — Not a finding if the comparison is against null, which tests null and undefined together on purpose',
        documentationLink: 'https://cwe.mitre.org/data/definitions/697.html',
      }),
      useStrictEquality: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Strict Equality',
        description: 'Use strict equality operator',
        severity: 'LOW',
        fix: 'Replace == with === and != with !== — Not a finding if the comparison is the idiomatic `x == null` nullish test',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality',
      }),
      /**
       * The timing finding's own suggestion, because reusing `useStrictEquality`
       * for it mislabelled the rewrite. That suggestion's fix replaces the
       * comparison with `crypto.timingSafeEqual(...)`, but its text said "Use
       * strict equality operator / Replace == with ===" — so a user was told to
       * do the very thing the finding above it warns about (`===` is what leaks
       * the timing), and the code they actually got was something else entirely.
       * A mislabelled rewrite on a security rule is worse than no suggestion.
       */
      useTimingSafeEqual: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use A Constant-Time Comparison',
        description: 'Compare secrets in constant time, not with an operator that short-circuits',
        severity: 'LOW',
        fix: 'Rewrite as crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) — Not a finding if neither side is a secret the caller can guess one character at a time',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
      }),
      timingUnsafeComparison: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Timing Attack Risk',
        cwe: 'CWE-208',
        description: 'Secret comparison with {{operator}} can leak timing information',
        severity: 'HIGH',
        fix: 'Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) — Not a finding if the compared value is public, such as an id or a status',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow insecure comparison in test files',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional patterns to ignore',
          },
          reportLooseEquality: {
            type: 'boolean',
            default: true,
            description:
              'Report `==` between non-secret operands. Turn off to keep only the secret-comparison findings and leave generic type coercion to eqeqeq.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  // NOT `skipTestFiles: true`, unlike its siblings, and the seal probe's §B1
  // therefore fails here on purpose.
  //
  // This rule already owns the question through `allowInTests`, which a
  // concurrent hardening pass deliberately defaulted to FALSE: a test that
  // compares an API key with `===` is demonstrating the bug the rule exists to
  // find, and several repositories keep real fixtures in `__tests__`. Setting
  // `skipTestFiles` would make that option dead code — it is checked at line
  // 266, and the devkit gate runs first — and would silently flip the default
  // the option was given.
  //
  // Whoever reconciles §B1 with `allowInTests` across the plugin should do it
  // in one pass, not by half-overriding one rule.
  defaultOptions: [
    {
      allowInTests: false,
      ignorePatterns: [],
      reportLooseEquality: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      ignorePatterns = [],
      reportLooseEquality = true,
    } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);
    const sourceCode = context.sourceCode;

    // Codemods and AST-walker tools legitimately compare AST identifiers
    // (`node.key === 'foo'`, `node.name === 'bar'`) — those keys aren't
    // secrets, they're AST property names that happen to share the word
    // "key". Detect codemod context once per file.
    const isCodemodFile = (() => {
      if (/\/codemod[s]?\//i.test(filename)) return true;
      if (/codemod\.[mc]?[jt]sx?$/i.test(filename)) return true;
      return fileUsesAstTooling(sourceCode.ast);
    })();

    /**
     * Check if a string matches any ignore pattern
     */
    // oxlint-disable-next-line consistent-function-scoping
    function matchesIgnorePattern(text: string, patterns: string[]): boolean {
      return patterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(text);
        } catch {
          // Invalid regex - treat as literal string match
          return text.toLowerCase().includes(pattern.toLowerCase());
        }
      });
    }

    /**
     * `null` literal, ignoring parentheses.
     */
    function isNullLiteral(node: TSESTree.Node): boolean {
      return node.type === 'Literal' && node.raw === 'null';
    }

    /**
     * Check BinaryExpression for insecure comparison operators
     */
    /**
     * Is this operand provably a string at the comparison?
     *
     * A string literal, a template literal, or a name bound once to either. The
     * single-write check is what makes the binding provable — a variable written
     * twice can hold anything by the time the comparison runs.
     */
    function isStringTyped(node: TSESTree.Node, seen = new Set<string>()): boolean {
      if (node.type === AST_NODE_TYPES.Literal) return typeof node.value === 'string';
      if (node.type === AST_NODE_TYPES.TemplateLiteral) return true;
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      // `var a = b; var b = a;` resolves forever without this — a stack overflow that
      // takes the whole ESLint run down, not just the rule. A cycle proves nothing about
      // the type, so it answers "not provably a string".
      if (seen.has(node.name)) return false;
      seen.add(node.name);

      for (
        let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === node.name);
        if (!variable) continue;
        // EVERY write, not "exactly one write". The single-write rule was a proxy for
        // "provably a string", and it is the wrong proxy for the commonest shape there
        // is — `let mode = 'animated'; if (x) mode = 'static';`. Both writes are string
        // literals, so `mode == 'static'` cannot coerce, yet the binding has two writes
        // and the exemption was refused. Reading the writes themselves answers the
        // actual question, and a binding with no writes at all (a parameter, an import)
        // still proves nothing and still returns false.
        const writes = variable.references.filter((ref) => ref.isWrite());
        if (writes.length === 0) return false;
        // `writeExpr` is absent for a write with no inspectable expression and
        // is typed as nullable, so `!== undefined` alone does not narrow it.
        // A write we cannot read proves nothing, which is a refusal.
        return writes.every((ref) => {
          const written = ref.writeExpr;
          return written != null && isStringTyped(written, seen);
        });
      }
      return false;
    }

    function checkBinaryExpression(node: TSESTree.BinaryExpression) {
      if (isTestFile) {
        return;
      }

      // Skip codemod / AST-walker contexts — `node.key === '...'` style
      // comparisons there are AST identifier checks, not secret comparisons.
      if (isCodemodFile) {
        return;
      }

      // Word-level, not substring-level. The bare keywords `key`, `auth` and
      // `mac` used to be matched as substrings of the whole expression's source
      // text, which made `if (key === "__non_webpack_require__")` a "timing
      // attack" and swept in `monkey`, `keyword`, `machine`, `author`. A secret
      // is named by a *word*, so match words.
      const secretKeywords = new Set([
        'secret', 'secrets', 'token', 'tokens', 'password', 'passwd', 'pwd',
        'apikey', 'api_key', 'secretkey', 'secret_key', 'privatekey', 'private_key',
        'signature', 'hmac', 'digest', 'checksum', 'nonce', 'otp',
        'passwordhash', 'password_hash', 'hashedpassword', 'hashed_password',
        'credential', 'credentials',
      ]);

      /**
       * Split an identifier-ish name into lowercase word segments:
       * `expectedPassword` → ['expected', 'password'], `api_key` → ['api','key'].
       * The joined form is kept too so `apiKey` also matches the `apikey` entry.
       */
      // oxlint-disable-next-line consistent-function-scoping
      const nameSegments = (name: string): string[] => {
        const parts = name
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .split(/[^A-Za-z0-9]+/)
          .filter(Boolean)
          .map((p) => p.toLowerCase());
        // ADJACENT PAIRS. A two-word secret name only matched when the whole
        // identifier was exactly those two words: `apiKey` hit the `apikey` entry,
        // but `SERVICE_API_KEY` split to ['service','api','key'] and matched
        // nothing — `key` alone is deliberately not a secret word, so the most
        // literally-named credential in the corpus went unreported. Joining
        // neighbouring segments finds `api`+`key` wherever it sits in the name,
        // and the keyword set stays closed, so this widens the match without
        // widening what counts as a secret.
        const pairs: string[] = [];
        for (let i = 0; i + 1 < parts.length; i += 1) {
          pairs.push(parts[i] + parts[i + 1], `${parts[i]}_${parts[i + 1]}`);
        }
        return [...parts, ...pairs, parts.join(''), parts.join('_'), name.toLowerCase()];
      };

      /**
       * Every name the VALUE of an expression is known by — including the names it
       * carried one binding ago.
       *
       * The comparison site is not where a secret is named. `const expected =
       * config.callback.token; if (presented !== expected)` writes no secret word at
       * the `!==`, and reading only that line missed it; so did `const { token: t } =
       * session; t === presented`, and so did the computed-key spelling
       * `req.headers['x-api-key']`. All three are the same secret, written the way
       * real code writes it. Each hop below is a resolution through the SCOPE — the
       * binding's own writes, the destructuring key that produced it, the string
       * literal that is the property name — never a guess from the spelling at hand.
       */
      const scopeAtNode = sourceCode.getScope(node);

      /** The key names a destructuring pattern binds `target` under, e.g. `{ token: t }` → 'token'. */
      // oxlint-disable-next-line consistent-function-scoping
      const destructuringKeys = (pattern: TSESTree.Node, target: TSESTree.Identifier): string[] => {
        const keys: string[] = [];
        const walkPattern = (n: TSESTree.Node): void => {
          if (n.type === 'ObjectPattern') {
            for (const property of n.properties) {
              if (property.type !== 'Property') continue;
              if (property.value === target && !property.computed && property.key.type === 'Identifier') {
                keys.push(property.key.name);
              }
              walkPattern(property.value);
            }
          } else if (n.type === 'ArrayPattern') {
            for (const element of n.elements) if (element) walkPattern(element);
          } else if (n.type === 'AssignmentPattern') {
            walkPattern(n.left);
          }
        };
        walkPattern(pattern);
        return keys;
      };

      const namesIn = (expr: TSESTree.Node): string[] => {
        const out: string[] = [];
        const visited = new Set<TSESTree.Node>();
        const walk = (n: TSESTree.Node): void => {
          if (visited.has(n)) return;
          visited.add(n);
          if (n.type === 'Identifier') {
            out.push(n.name);
            resolveIdentifier(n);
          } else if (n.type === 'MemberExpression') {
            walk(n.object);
            // `req.headers['x-api-key']` names the same property as
            // `req.headers.xApiKey`, just spelled with brackets — so both
            // spellings contribute a name, and anything the AST cannot name is
            // walked as an expression instead.
            const key = propertyName(n);
            if (key !== null) out.push(key);
            else walk(n.property);
          } else if (n.type === 'CallExpression') {
            walk(n.callee);
          } else if (n.type === 'ConditionalExpression') {
            // Either branch can be the secret, so both count.
            walk(n.consequent);
            walk(n.alternate);
          } else if (
            n.type === 'TSAsExpression' ||
            n.type === 'TSSatisfiesExpression' ||
            n.type === 'TSNonNullExpression'
          ) {
            walk(n.expression);
          }
        };

        /** Follow an identifier to what it was bound from, one binding at a time. */
        function resolveIdentifier(identifier: TSESTree.Identifier): void {
          for (
            let scope: TSESLint.Scope.Scope | null = scopeAtNode;
            scope;
            scope = scope.upper
          ) {
            const variable = scope.variables.find((v) => v.name === identifier.name);
            if (!variable) continue;
            const writes = variable.references.filter((ref) => ref.isWrite());
            // More than one write and the value at the comparison is not knowable from
            // any single initializer, so nothing is claimed.
            if (writes.length === 1 && writes[0].writeExpr) walk(writes[0].writeExpr);
            for (const def of variable.defs) {
              if (def.type !== 'Variable') continue;
              out.push(...destructuringKeys(def.node.id, def.name));
            }
            return;
          }
        }

        walk(expr);
        return out;
      };

      /**
       * Does this operand name a secret?
       *
       * REMOVED, deliberately: an `isSecurityContext` escalation that walked up to the
       * enclosing function or method, tested its NAME against
       * `/security|auth|crypto|hash|token|secret|insecure|verify|validate/`, and — if it
       * matched — promoted the generic words `provided`, `expected`, `actual`, `input`,
       * `value` and `data` to secrets. Two names, both generic, decided a CWE-208
       * finding between them, with no evidence from the values at all. The same
       * comparison reported or stayed silent purely on the enclosing function's
       * spelling:
       *
       *   function validateAddress(value) { return value === 'US'; }   // reported
       *   function normalizeAddress(value) { return value === 'US'; }  // silent
       *
       * `validate` is the single commonest verb in application code — every Zod
       * refinement, every schema method, every form checker — and `value` is the single
       * commonest parameter name, so the pair fires on ordinary business logic. It cost
       * three false positives in this rule's corpus (a country-code validator, an
       * order-state machine, an asset-hash helper) and bought nothing: a real credential
       * is named by its own word, and `secretKeywords` already matches those. The rule's
       * own test suite asserted this behaviour as correct; those cases are now `valid`.
       *
       * See CLAUDE.md, "A rule decides by evidence. Never by a name."
       */
      const isPotentialSecret = (expr: TSESTree.Expression): boolean =>
        namesIn(expr)
          .flatMap(nameSegments)
          .some((segment) => secretKeywords.has(segment));

      // Timing-safe comparison for secrets even with strict equality
      if ((node.operator === '===' || node.operator === '!==') &&
          (isPotentialSecret(node.left) || isPotentialSecret(node.right))) {
        
        // SKIP: Length comparisons are safe - they're actually required before timingSafeEqual
        const isLengthComparison = (expr: TSESTree.Expression): boolean => {
          return expr.type === AST_NODE_TYPES.MemberExpression &&
                 expr.property.type === AST_NODE_TYPES.Identifier &&
                 expr.property.name === 'length';
        };
        
        if (isLengthComparison(node.left) || isLengthComparison(node.right)) {
          return; // Length checks are safe and recommended
        }

        // SKIP: comparison against a boolean / null / undefined literal. A timing attack
        // needs a secret on BOTH sides — you cannot learn a secret by discovering how many
        // characters of `true` matched. `verifyToken(t).valid === true` is a boolean check
        // that happens to sit on an identifier the secret-name heuristic likes.
        const isNonSecretLiteral = (expr: TSESTree.Expression): boolean =>
          (expr.type === AST_NODE_TYPES.Literal &&
            (typeof expr.value === 'boolean' || expr.value === null)) ||
          (expr.type === AST_NODE_TYPES.Identifier && expr.name === 'undefined');

        if (isNonSecretLiteral(node.left) || isNonSecretLiteral(node.right)) {
          return;
        }


        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);
        
        // ... rest of logic uses example ...
        const example = `crypto.timingSafeEqual(Buffer.from(${leftText}), Buffer.from(${rightText}))`;
        
        context.report({
          node,
          messageId: 'timingUnsafeComparison',
          data: {
            operator: node.operator,
            strictOperator: node.operator,
            example: example,
          },
          suggest: [
            {
              messageId: 'useTimingSafeEqual',
              fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(node, example),
            },
          ],
        });
        return;
      }

      // Check for insecure comparison operators
      if (node.operator === '==' || node.operator === '!=') {
        const text = sourceCode.getText(node);
        
        // Check if it matches any ignore pattern
        if (matchesIgnorePattern(text, ignorePatterns)) {
          return;
        }

        // `x == null` / `x != null` is the idiomatic nullish check: it matches
        // null *and* undefined in one comparison, which is exactly why it is
        // written that way. It is not a type-coercion weakness, and rewriting
        // it to `=== null` silently drops the `undefined` case. Core `eqeqeq`
        // exempts it under the `smart`/`allow-null` options for the same
        // reason. Measured on express/axios/sequelize: 73 of 161 reports from
        // this rule were this pattern.
        if (isNullLiteral(node.left) || isNullLiteral(node.right)) {
          return;
        }

        // Both operands provably strings — `==` and `===` behave identically, so
        // there is no coercion to warn about. `var accessLevel = 'user'; if
        // (accessLevel != 'user')` is a case eslint-plugin-security's own corpus
        // marks valid; we reported it, on the operator alone. The rule's subject is
        // type coercion, and coercion needs two types.
        if (isStringTyped(node.left) && isStringTyped(node.right)) {
          return;
        }

        /*
         * Only decline PLAIN type coercion.
         *
         * The timing-unsafe path above handles `===`/`!==` on a secret, so a
         * secret compared with `==` arrives here instead — and an early version
         * of this option silenced it, turning `if (apiKey == provided)` into a
         * clean file. That is the opposite of the point: loose equality on a
         * credential is worse than strict, not better, because it adds coercion
         * to a comparison that already leaks by short-circuiting.
         */
        const comparesSecret =
          isPotentialSecret(node.left) || isPotentialSecret(node.right);
        if (!reportLooseEquality && !comparesSecret) {
          return;
        }

        const strictOperator = node.operator === '==' ? '===' : '!==';
        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);
        const example = `${leftText} ${strictOperator} ${rightText}`;

        context.report({
          node: node,
          messageId: 'insecureComparison',
          data: {
            operator: node.operator,
            strictOperator,
            example,
          },
          // No `fix` here on purpose: swapping `==` for `===` can change
          // runtime behaviour when the operands differ in type, so it is not
          // safe to run under `--fix`. Offered as a suggestion the author
          // opts into.
          suggest: [
            {
              messageId: 'useStrictEquality',
              fix: (fixer: TSESLint.RuleFixer) => {
                return fixer.replaceText(node, example);
              },
            },
          ],
        });
      }
    }

    return {
      BinaryExpression: checkBinaryExpression,
    };
  },
});

