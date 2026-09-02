/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-buffer-overread
 * Detects buffer access beyond bounds (CWE-126)
 *
 * Buffer overread occurs when reading from buffers beyond their allocated
 * length, potentially leading to information disclosure, crashes, or
 * other security issues.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe buffer access patterns
 * - Bounds checking operations
 * - JSDoc annotations (@safe, @validated)
 * - Input validation functions
 */
import type {
  TSESLint,
  TSESTree,
  SecurityRuleOptions,
} from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  createSafetyChecker,
  propertyName,
} from '@interlace/eslint-devkit';
import { constInitializerOf, resolveConstant } from '../../utils/const-value';
import {
  bindingInit,
  findVariable,
  makeReadsTaintSource,
} from '../../utils/provenance';

/**
 * The Buffer read/write surface this rule bounds-checks.
 *
 * The list used to hold the little-endian spellings only — `readUInt16LE`,
 * `readUInt32LE` and their `Int` siblings — with every `*BE` reader absent.
 * Network byte order IS big-endian, so a protocol parser reaches for `*BE`
 * almost exclusively, and the rule was blind to most real parsers:
 * `ledger.readBigUInt64BE(Number(req.params.entry))` produced nothing.
 *
 * The READ surface is complete here. The write side is deliberately left as it
 * was: writing past the end is CWE-787, a different weakness with a different
 * fix, and this rule reports under CWE-126.
 */
const DEFAULT_BUFFER_METHODS: readonly string[] = [
  'readUInt8',
  'readInt8',
  'readUInt16LE',
  'readUInt16BE',
  'readInt16LE',
  'readInt16BE',
  'readUInt32LE',
  'readUInt32BE',
  'readInt32LE',
  'readInt32BE',
  'readBigUInt64LE',
  'readBigUInt64BE',
  'readBigInt64LE',
  'readBigInt64BE',
  'readFloatLE',
  'readFloatBE',
  'readDoubleLE',
  'readDoubleBE',
  'readUIntLE',
  'readUIntBE',
  'readIntLE',
  'readIntBE',
  'writeUInt8',
  'writeUInt16LE',
  'writeUInt32LE',
  'slice',
  'subarray',
  'copy',
];

/**
 * Roots that carry an inbound request, per the shared provenance model.
 *
 * A VOCABULARY, not a protocol surface: `event`, `ctx` and `context` are
 * ordinary English words that a great many programs use for something else,
 * and this list is on the REPORTING path — it is what makes an index
 * attacker-steerable. So it is the default of `untrustedSources` rather than a
 * constant, exactly as `no-timing-unsafe-compare` already exposes the same
 * list under the same option name. A consumer whose framework spells the
 * request `koaCtx`, or whose `event` is a DOM event, can say so.
 */
const DEFAULT_UNTRUSTED_SOURCES: readonly string[] = [
  'req',
  'request',
  'event',
  'ctx',
  'context',
];

/**
 * Identifier spellings that conventionally name a Node Buffer.
 *
 * EXACT membership, not substring. `bufferTypes.some(t => name.includes(t))`
 * made every identifier containing "buffer" a Buffer, so a `rowBuffer` built by
 * `rows.map(…)` and a `lineBuffer` array of strings were both reported as
 * buffer overreads — an out-of-range array read is `undefined`, not a
 * disclosure of adjacent memory, so CWE-126 does not apply to either.
 *
 * The names that survive are the ones the rule's own history names as the
 * false-negative target: a Buffer PARAMETER, whose type this file cannot see.
 * `b` and `chunk` stay out (single-character names and stream-chunk arrays
 * produce too many false positives), and so does anything longer that merely
 * contains one of these.
 *
 * Also a vocabulary and also on the reporting path — a parameter named `bytes`
 * is a Buffer by convention only, and a codebase where `bytes` is a count of
 * bytes has no remedy but turning the rule off. So it is the default of
 * `bufferParameterNames`. Setting it to `[]` disables the convention entirely
 * and leaves only bindings this file can prove hold a Buffer.
 */
const DEFAULT_BUFFER_PARAMETER_NAMES: readonly string[] = [
  'buf',
  'buffer',
  'bytes',
];

/**
 * `fs.readFileSync(path)` with no encoding returns a Buffer.
 *
 * With an encoding — `readFileSync(p, 'utf8')` — it returns a string, so the
 * argument shape decides, not the callee's name. Without this the commonest
 * way a Buffer enters a program was invisible and
 * `blob.slice(Number(req.query.start))` went unreported.
 */
function isBufferReturningRead(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const callee = node.callee;
  const name =
    callee.type === AST_NODE_TYPES.Identifier
      ? callee.name
      : callee.type === AST_NODE_TYPES.MemberExpression
        ? // `b['readUInt8'](0)` reads the same bytes `b.readUInt8(0)` reads.
          propertyName(callee)
        : null;
  // A second argument is an encoding or an options bag, and either can turn the
  // result into a string. Only the unambiguous one-argument form counts.
  return name === 'readFileSync' && node.arguments.length === 1;
}

/**
 * Eight more used to sit here — `bufferOverread`, `bufferLengthNotChecked`,
 * `useSafeBufferAccess`, `validateBufferIndices`, `checkBufferBounds`,
 * `strategyBoundsChecking`, `strategyInputValidation`, `strategySafeBuffers` —
 * more dead metadata than live. Every `context.report` in this file names one
 * of the five below.
 *
 * Two of the eight could not have been emitted usefully even if wired:
 * `bufferOverread` interpolated `{{severity}}` and `{{safeAlternative}}`,
 * placeholders no call site here supplies, so it would have rendered literal
 * braces into the user's editor. The other six were severity-LOW INFO and
 * STRATEGY notes whose text is already the `fix:` line of the five messages
 * that fire — "Check 0 <= index < buffer.length", "Validate slice start/end
 * indices", and so on. Nothing was lost by deleting them; a rule advertising
 * thirteen messages and emitting five was simply describing itself wrongly.
 */
type MessageIds =
  | 'unsafeBufferAccess'
  | 'missingBoundsCheck'
  | 'negativeBufferIndex'
  | 'userControlledBufferIndex'
  | 'unsafeBufferSlice'
  | 'boundsCheckDisabled';

export interface Options extends SecurityRuleOptions {
  /** Buffer methods to check for bounds safety */
  bufferMethods?: string[];

  /** Functions that validate buffer indices */
  boundsCheckFunctions?: string[];

  /** Buffer types to monitor */
  bufferTypes?: string[];

  /** Additional function names to consider as buffer index validators */
  trustedSanitizers?: string[];

  /**
   * Identifier roots treated as carrying an inbound request, and therefore as
   * attacker-steerable. Default: `['req', 'request', 'event', 'ctx',
   * 'context']`.
   *
   * REPLACES the default list; pass the defaults back if you mean to extend
   * it. Set it to `[]` and no index is ever classed as user-controlled from
   * its root, which turns off the `userControlledBufferIndex` finding.
   */
  untrustedSources?: string[];

  /**
   * Parameter spellings treated as a Node Buffer when nothing else in the file
   * proves the type. Default: `['buf', 'buffer', 'bytes']`.
   *
   * Matched as the WHOLE lower-cased name, never as a substring. REPLACES the
   * default list. `[]` drops the convention and leaves only bindings whose
   * initializer this rule can see.
   */
  bufferParameterNames?: string[];

  /** Additional JSDoc annotations to consider as safe markers */
  strictMode?: boolean;

  /**
   * Report every buffer index this rule cannot prove validated, not only those
   * traceable to input. Default: `false`.
   *
   * `true` restores the pre-inversion behaviour. Measured on an 8-repo corpus
   * it produced 15 findings: two argument parsers, four loop counters in a
   * vendored keystroke recorder, one buffer WRITE, and eight in minified
   * bundles where one-letter names collide across closures.
   */
  reportUnvalidatedIndices?: boolean;
}

type RuleOptions = [Options?];

/**
 * Methods that return a VIEW over the same memory rather than reading a value.
 * Owned by the slice handler; the generic read/write handler must skip them so
 * one site yields one finding.
 */
const VIEW_METHODS: ReadonlySet<string> = new Set(['slice', 'subarray']);

export const noBufferOverread = createRule<RuleOptions, MessageIds>({
  name: 'no-buffer-overread',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-buffer-overread.md',
      description: 'Detects buffer access beyond bounds',
      cwe: 'CWE-126',
    },
    messages: {
      boundsCheckDisabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,

        issueName: 'Buffer bounds check disabled',

        cwe: 'CWE-125',

        owasp: 'A06:2021',

        cvss: 7.5,

        description:
          'The deprecated noAssert argument is true, which turns off the bounds check on this read. Past the end of the buffer it returns whatever memory follows instead of throwing.',

        severity: 'HIGH',

        compliance: ['SOC2', 'PCI-DSS', 'ISO27001'],

        fix: 'Drop the noAssert argument and let the read throw on an out-of-range offset.',

        documentationLink: 'https://cwe.mitre.org/data/definitions/125.html',
      }),
      unsafeBufferAccess: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Buffer Access',
        cwe: 'CWE-126',
        description: 'Buffer accessed without bounds validation',
        severity: 'HIGH',
        fix: 'Add bounds check before buffer access',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      missingBoundsCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Bounds Check',
        cwe: 'CWE-126',
        description: 'Buffer operation missing bounds validation',
        severity: 'MEDIUM',
        fix: 'Validate indices before buffer operations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      negativeBufferIndex: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Negative Buffer Index',
        cwe: 'CWE-126',
        description: 'Negative index used for buffer access',
        severity: 'MEDIUM',
        fix: 'Ensure buffer indices are non-negative',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      userControlledBufferIndex: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Buffer Index',
        cwe: 'CWE-126',
        description: 'Buffer accessed with user-controlled index',
        severity: 'HIGH',
        fix: 'Validate user input before using as buffer index',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      unsafeBufferSlice: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Buffer Slice',
        cwe: 'CWE-126',
        description: 'Buffer slice with unvalidated indices',
        severity: 'MEDIUM',
        fix: 'Validate slice start/end indices',
        documentationLink:
          'https://nodejs.org/api/buffer.html#bufslicestart-end',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          bufferMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_BUFFER_METHODS],
            description: 'Buffer read/write methods checked for bounds',
          },
          boundsCheckFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'validateIndex',
              'checkBounds',
              'safeIndex',
              'validateBufferIndex',
            ],
            description: 'Function names that count as a bounds check',
          },
          bufferTypes: {
            type: 'array',
            items: { type: 'string' },
            default: ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView'],
            description: 'Constructor names treated as buffer types',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional function names to consider as buffer index validators',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional JSDoc annotations to consider as safe markers',
          },
          untrustedSources: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_UNTRUSTED_SOURCES],
            description:
              'Identifier roots treated as carrying an inbound request (default: req, request, event, ctx, context). Replaces the list; [] disables root-based taint.',
          },
          bufferParameterNames: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_BUFFER_PARAMETER_NAMES],
            description:
              'Parameter spellings treated as a Buffer when the type is not otherwise visible (default: buf, buffer, bytes). Whole-name match, never substring. Replaces the list; [] drops the convention.',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
          reportUnvalidatedIndices: {
            type: 'boolean',
            default: false,
            description:
              'Report every index that cannot be proven validated. Restores the pre-inversion behaviour.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      bufferMethods: [...DEFAULT_BUFFER_METHODS],
      boundsCheckFunctions: [
        'validateIndex',
        'checkBounds',
        'safeIndex',
        'validateBufferIndex',
      ],
      bufferTypes: ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
      untrustedSources: [...DEFAULT_UNTRUSTED_SOURCES],
      bufferParameterNames: [...DEFAULT_BUFFER_PARAMETER_NAMES],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      bufferMethods = [...DEFAULT_BUFFER_METHODS],
      boundsCheckFunctions = [
        'validateIndex',
        'checkBounds',
        'safeIndex',
        'validateBufferIndex',
      ],
      bufferTypes = ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView'],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
      reportUnvalidatedIndices = false,
      untrustedSources = [...DEFAULT_UNTRUSTED_SOURCES],
      bufferParameterNames = [...DEFAULT_BUFFER_PARAMETER_NAMES],
    }: Options = options;

    // Lower-cased once, then matched whole. `isBufferType` compares against
    // `node.name.toLowerCase()`, so a user who writes `bufferParameterNames:
    // ['Buf']` must still match `buf` — folding here rather than at every call
    // site is what makes the option behave the same way the built-ins do.
    const bufferParameterSet: ReadonlySet<string> = new Set(
      bufferParameterNames.map((name) => name.toLowerCase()),
    );

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Was this INDEX produced by one of the project's own bounds helpers?
     *
     * `trustedSanitizers` was plumbed into `createSafetyChecker` and could
     * never fire: `safetyChecker.isSafe` is handed the buffer ACCESS —
     * `buffer[i]`, `buf.readUInt32LE(off)` — and the devkit's sanitizer test
     * only recognises a call or an identifier bound to one. The index, which
     * is what the finding is actually about, was never examined. Setting the
     * option changed nothing.
     *
     * CUSTOM names only, deliberately. Routing the index through the devkit's
     * `isSanitizedInput` would also apply its built-in list, and that list
     * contains `parseInt`, `Number` and `String` — none of which bounds-checks
     * anything. `const off = parseInt(req.query.off); buf[off]` would have
     * become "safe", trading this false positive for a false negative on the
     * exact shape the rule exists to catch.
     *
     * One binding hop, through `bindingInit`, so `const safeOff =
     * clamp(raw); buf[safeOff]` is recognised as well as `buf[clamp(raw)]`.
     */
    const passedTrustedSanitizer = (indexNode: TSESTree.Node): boolean => {
      if (trustedSanitizers.length === 0) return false;
      // An Identifier only. `isUserControlledIndex` answers `true` for exactly
      // two shapes — an Identifier, or a MemberExpression with a tainted root —
      // so nothing else ever reaches this function. A direct call as the index,
      // `buf[clamp(x)]`, is not reported in the first place and needs no
      // exemption here; a version of this helper that also matched a call
      // directly carried a branch no input could take.
      if (indexNode.type !== AST_NODE_TYPES.Identifier) return false;
      const init = bindingInit(sourceCode, indexNode);
      if (init === undefined || init.type !== AST_NODE_TYPES.CallExpression)
        return false;
      const calleeNode = init.callee;
      if (calleeNode.type === AST_NODE_TYPES.Identifier) {
        return trustedSanitizers.includes(calleeNode.name);
      }
      return (
        calleeNode.type === AST_NODE_TYPES.MemberExpression &&
        trustedSanitizers.includes(propertyName(calleeNode) as string)
      );
    };

    /**
     * "Can an attacker steer this value?" — the shared provenance model.
     *
     * What stood here instead was three overlapping name tests, all of them on
     * a REPORTING path:
     *
     * ```ts
     * varName.includes(keyword)                       // 'offset', 'index', 'user'…
     * keywords.some(k => sourceCode.getText(init.object).includes(k))
     * keywords.some(k => sourceCode.getText(indexNode).includes(k))
     * ```
     *
     * The last two match printed SOURCE, which the repo's own rules forbid
     * outright. All three answered "user-controlled" for values that are
     * nothing of the sort: `const offset = 4; MAGIC[offset - 1]` and
     * `const VERSION_INDEX = 0; LAYOUT[VERSION_INDEX]` were both reported as
     * "Buffer accessed with user-controlled index" in files that contain no
     * request, no socket and no parameter — rename the constant and the finding
     * disappears, which is the definition of a name-inference false positive.
     *
     * `makeReadsTaintSource` decides by flow instead: request roots, request
     * PROPERTY names wherever the receiver came from, one hop per binding,
     * last-write-before-use for a reassigned `let`, and `unwrapTypeSyntax` so a
     * TypeScript `as string` does not end the walk. Nothing was lost by
     * deleting the name tests: an index that is a bare parameter was already
     * exempted by `isIndexValidated`, so the name test could only ever fire on
     * a LOCAL, whose provenance is exactly what this reader follows.
     */
    const readsTaintSource = makeReadsTaintSource(
      sourceCode,
      new Set(untrustedSources.map((source) => source.toLowerCase())),
    );

    /**
     * Variables known to hold a buffer.
     *
     * Keyed by the resolved SCOPE VARIABLE, not by name. The set used to hold
     * bare strings, so one `const buf = Buffer.alloc(8)` anywhere in a file made
     * every unrelated `buf` in every other function a buffer — and in minified
     * bundles, where the same one-letter names are reused in dozens of
     * closures, that is most of the file. Shopify/cli's vendored speedscope
     * bundles produced 8 of the rule's 15 corpus findings that way.
     */
    const bufferVars = new Set<TSESLint.Scope.Variable>();

    /** Register a declarator's binding as a buffer, resolved through scope. */
    const addBufferVar = (id: TSESTree.Identifier): void => {
      const variable = findVariable(sourceCode, id);
      if (variable) bufferVars.add(variable);
    };

    /**
     * Check if this identifier refers to a buffer.
     *
     * Takes the NODE rather than the name so the binding can be resolved
     * through the scope chain — shadowing included.
     */
    const isBufferType = (node: TSESTree.Identifier): boolean => {
      const variable = findVariable(sourceCode, node);
      if (variable && bufferVars.has(variable)) return true;
      // A binding this file CAN see, and which is not a buffer, ends the
      // question. `const rowBuffer = rows.map(…)` is an array however it is
      // spelled, and the conventional-name fallback below exists only for the
      // parameter case, where there is no initializer to look at.
      if (variable !== null && variable.defs.length > 0) {
        return (
          variable.defs[0].type === 'Parameter' &&
          bufferParameterSet.has(node.name.toLowerCase())
        );
      }
      return bufferParameterSet.has(node.name.toLowerCase());
    };

    /**
     * Is this member expression being WRITTEN to rather than read?
     *
     * `buffer[i] = str.charCodeAt(i)` (`okta/okta-auth-js`
     * `lib/crypto/base64.ts:57`) is a buffer *overwrite* if it is anything —
     * CWE-787, a different weakness with a different fix. CWE-126 is about
     * reading past the end, and a rule that reports both under one id tells the
     * reader the wrong thing about what is wrong.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isWriteTarget = (node: TSESTree.Node): boolean => {
      const parent = node.parent;
      if (!parent) return false;
      if (parent.type === AST_NODE_TYPES.AssignmentExpression)
        return parent.left === node;
      return parent.type === AST_NODE_TYPES.UpdateExpression;
    };

    /**
     * Is this index the counter of a loop that already bounds it?
     *
     * `for (let c = 0, cl = charset.length; c < cl; ++c) charset[c]` cannot
     * overread: the loop condition IS the bounds check. The rule reported four
     * of these in `okta/okta-signin-widget`'s vendored TypingDNA recorder
     * (`typingdna.js:1206-1229`), where every access is `revs[i]` inside
     * `for (i = 0; i < revs.length; i++)`.
     *
     * Any `<`/`<=` comparison with the counter on the left counts. Proving the
     * right-hand side is the buffer's own length would be stricter, but a loop
     * bounded by *some* limit is not the unbounded read this rule is for, and
     * the stricter form would still miss `i < len` where `len` was hoisted.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isLoopBounded = (indexNode: TSESTree.Node): boolean => {
      if (indexNode.type !== AST_NODE_TYPES.Identifier) return false;
      const name = indexNode.name;
      let current: TSESTree.Node | undefined = indexNode.parent;
      while (current) {
        const test =
          current.type === AST_NODE_TYPES.ForStatement ||
          current.type === AST_NODE_TYPES.WhileStatement
            ? current.test
            : null;
        if (
          test &&
          test.type === AST_NODE_TYPES.BinaryExpression &&
          (test.operator === '<' || test.operator === '<=') &&
          test.left.type === AST_NODE_TYPES.Identifier &&
          test.left.name === name
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    };

    /**
     * Can an attacker steer this index?
     *
     * One line, because the whole question is delegated to the shared
     * provenance model. See `readsTaintSource` above for what the four
     * hand-rolled name and printed-source tests that used to live here got
     * wrong, and why deleting them costs no recall.
     */
    const isUserControlledIndex = (indexNode: TSESTree.Node): boolean =>
      readsTaintSource(indexNode);

    /**
     * Has this index been through something that bounds it?
     *
     * The previous implementation walked the index's ANCESTORS looking for
     * `VariableDeclarator` with a matching name — but a use site is never
     * inside its own declarator, so that walk could only ever succeed for
     * `const i = f(i)`. In practice the function fell through to its second
     * clause, "function parameters are assumed validated", and returned false
     * for every local. The binding is now resolved through `bindingInit`,
     * which is what the walk was reaching for.
     */
    const isIndexValidated = (indexNode: TSESTree.Node): boolean => {
      if (indexNode.type === AST_NODE_TYPES.Literal) {
        return typeof indexNode.value === 'number' && indexNode.value >= 0;
      }
      if (isBoundsCheckCall(indexNode)) return true;
      if (indexNode.type !== AST_NODE_TYPES.Identifier) return false;

      // A parameter's value is decided by a caller this rule does not follow.
      // Reporting every one of them made the finding a property of the rule's
      // analysis depth rather than of the code.
      const variable = findVariable(sourceCode, indexNode);
      if (variable !== null && variable.defs[0]?.type === 'Parameter')
        return true;

      const init = bindingInit(sourceCode, indexNode);
      return init !== undefined && isBoundsCheckCall(init);
    };

    /**
     * Is this expression a call that returns a bounded index?
     *
     * Either one of the project's configured bounds helpers, or `Math.min` /
     * `Math.max` — the clamp idiom.
     */
    const isBoundsCheckCall = (node: TSESTree.Node): boolean => {
      if (node.type !== AST_NODE_TYPES.CallExpression) return false;
      const callee = node.callee;
      if (callee.type === AST_NODE_TYPES.Identifier) {
        return boundsCheckFunctions.includes(callee.name);
      }
      if (
        callee.type !== AST_NODE_TYPES.MemberExpression ||
        propertyName(callee) === null
      ) {
        return false;
      }
      return (
        (callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'Math' &&
          (propertyName(callee) === 'min' || propertyName(callee) === 'max')) ||
        boundsCheckFunctions.includes(propertyName(callee) as string)
      );
    };

    /**
     * Is there a guard in scope comparing this index against the buffer's
     * length?
     *
     * Structural, and it has to be: the previous version rendered the
     * condition with `sourceCode.getText(...)` and asked whether the string
     * contained `"<buffername>.length"` and one of `<`, `<=`, `>`, `>=`, `&&`,
     * `||`. That matched a comment, a string literal, and any unrelated
     * expression that happened to print those characters — and it keyed on the
     * buffer's SPELLING, so a shadowed name in another scope satisfied it.
     *
     * The shape looked for now is a comparison one of whose sides mentions the
     * index and the other of which reads `.length` on the SAME resolved
     * buffer variable. `at + 4 > index.length` matches; `end > record.length`
     * guarding a read of `start` does not, which is the whole point — a guard
     * on the wrong variable is not a guard.
     */
    const hasBoundsCheck = (
      buffer: TSESTree.Identifier,
      indexNode: TSESTree.Node,
    ): boolean => {
      const guards: TSESTree.BinaryExpression[] = [];
      collectComparisons(enclosingBody(indexNode), guards);
      return guards.some(
        (test) =>
          (mentions(test.left, indexNode) &&
            readsLengthOf(test.right, buffer)) ||
          (mentions(test.right, indexNode) && readsLengthOf(test.left, buffer)),
      );
    };

    /**
     * Do these two identifiers name the same binding?
     *
     * Resolved variables are compared by identity, so shadowing is honoured.
     * When NEITHER resolves — two undeclared globals — the name is all there
     * is; comparing `null === null` would otherwise make every `.length` in
     * the file a bounds check on every buffer in it.
     */
    const sameBinding = (
      a: TSESTree.Identifier,
      b: TSESTree.Identifier,
    ): boolean => {
      const left = findVariable(sourceCode, a);
      const right = findVariable(sourceCode, b);
      if (left === null && right === null) return a.name === b.name;
      return left === right;
    };

    /** The statement list this node sits in, or the whole program. */
    const enclosingBody = (node: TSESTree.Node): TSESTree.Node => {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (
          current.type === AST_NODE_TYPES.FunctionDeclaration ||
          current.type === AST_NODE_TYPES.FunctionExpression ||
          current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          current.type === AST_NODE_TYPES.Program
        ) {
          return current;
        }
        current = current.parent;
      }
      return node;
    };

    /** Every `<`/`<=`/`>`/`>=` comparison inside this subtree. */
    const collectComparisons = (
      node: TSESTree.Node,
      out: TSESTree.BinaryExpression[],
    ): void => {
      if (
        node.type === AST_NODE_TYPES.BinaryExpression &&
        ['<', '<=', '>', '>='].includes(node.operator)
      ) {
        out.push(node);
      }
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const value = (node as unknown as Record<string, unknown>)[key];
        for (const child of Array.isArray(value) ? value : [value]) {
          if (
            child !== null &&
            typeof child === 'object' &&
            typeof (child as TSESTree.Node).type === 'string'
          ) {
            collectComparisons(child as TSESTree.Node, out);
          }
        }
      }
    };

    /** Does this expression mention the index (as itself or as a sub-term)? */
    const mentions = (
      node: TSESTree.Node,
      indexNode: TSESTree.Node,
    ): boolean => {
      if (indexNode.type !== AST_NODE_TYPES.Identifier) return false;
      const walk = (current: TSESTree.Node): boolean => {
        if (current.type === AST_NODE_TYPES.Identifier) {
          return sameBinding(current, indexNode);
        }
        if (current.type === AST_NODE_TYPES.BinaryExpression) {
          return walk(current.left as TSESTree.Node) || walk(current.right);
        }
        if (current.type === AST_NODE_TYPES.CallExpression) {
          return current.arguments.some(
            (argument) =>
              argument.type !== AST_NODE_TYPES.SpreadElement && walk(argument),
          );
        }
        return false;
      };
      return walk(node);
    };

    /** Is this `<buffer>.length` on the very variable being indexed? */
    const readsLengthOf = (
      node: TSESTree.Node,
      buffer: TSESTree.Identifier,
    ): boolean =>
      node.type === AST_NODE_TYPES.MemberExpression &&
      propertyName(node) === 'length' &&
      node.object.type === AST_NODE_TYPES.Identifier &&
      sameBinding(node.object, buffer);

    /**
     * Is this index PROVABLY negative?
     *
     * It used to answer "yes" to any subtraction — "conservative: assume it
     * could be negative" — which is proof by ignorance on a reporting path.
     * `MAGIC[offset - 1]`, with `const offset = 4`, was reported as a negative
     * buffer index in a file where the value is 3.
     *
     * Now the value has to be resolvable and actually below zero. Nothing real
     * is lost: an unresolvable subtraction of a tainted value is still caught
     * by the user-controlled arm, which is where it belongs.
     */
    const couldBeNegative = (indexNode: TSESTree.Node): boolean => {
      const value = constantNumber(indexNode, 0);
      return value !== null && value < 0;
    };

    /**
     * The number this expression evaluates to, or `null` when it cannot be
     * decided.
     *
     * `const` aliases are followed through `constInitializerOf` rather than
     * `resolveConstant`, because `const back = -5` binds a UnaryExpression and
     * not a Literal — the one spelling a "negative index" check most needs to
     * read. The depth cap terminates `const a = a`.
     */
    const constantNumber = (
      node: TSESTree.Node,
      depth: number,
    ): number | null => {
      if (depth > 6) return null;
      if (node.type === AST_NODE_TYPES.UnaryExpression) {
        const inner = constantNumber(node.argument, depth + 1);
        if (inner === null) return null;
        return node.operator === '-'
          ? -inner
          : node.operator === '+'
            ? inner
            : null;
      }
      if (node.type === AST_NODE_TYPES.BinaryExpression) {
        if (node.operator !== '-' && node.operator !== '+') return null;
        const left = constantNumber(node.left as TSESTree.Node, depth + 1);
        const right = constantNumber(node.right, depth + 1);
        if (left === null || right === null) return null;
        return node.operator === '-' ? left - right : left + right;
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        const init = constInitializerOf(sourceCode, node);
        return init === null ? null : constantNumber(init, depth + 1);
      }
      const resolved = resolveConstant(sourceCode, node);
      return resolved !== null && typeof resolved.value === 'number'
        ? resolved.value
        : null;
    };

    return {
      /**
       * The deprecated `noAssert` argument on the numeric Buffer reads.
       *
       * Distinct from everything else in this rule, which is CWE-126 — an
       * offset an attacker steers. This is CWE-125: the offset may be perfectly
       * ordinary, and the caller has switched off the check that would catch it
       * being wrong. Node deprecated the parameter in v8; where it is still
       * honoured, an out-of-range read returns adjacent memory rather than
       * throwing.
       *
       * Unconditional, because `noAssert: true` has no safe reading.
       */
      // The selector pins the property to a plain Identifier, so no runtime
      // type guard is needed for it — one would be an uncoverable branch, and
      // this package gates on 100%.
      'CallExpression[callee.type="MemberExpression"][callee.computed=false][callee.property.type="Identifier"]'(
        node: TSESTree.CallExpression,
      ) {
        const callee = node.callee as TSESTree.MemberExpression;
        const method = (callee.property as TSESTree.Identifier).name;
        if (!/^(?:read|write)[A-Z]/.test(method)) return;
        // `readUIntBE(offset, byteLength, noAssert)` takes three; the rest two.
        const flag = node.arguments.at(-1);
        if (
          node.arguments.length >= 2 &&
          flag?.type === AST_NODE_TYPES.Literal &&
          flag.value === true
        ) {
          context.report({ node: flag, messageId: 'boundsCheckDisabled' });
        }
      },

      // Track buffer variable declarations
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type === AST_NODE_TYPES.Identifier && node.init) {
          // Check if assigned a buffer type
          if (
            node.init.type === AST_NODE_TYPES.NewExpression &&
            node.init.callee.type === AST_NODE_TYPES.Identifier &&
            bufferTypes.includes(node.init.callee.name)
          ) {
            addBufferVar(node.id);
          }

          // `fs.readFileSync(path)` with no encoding returns a Buffer, and it
          // is the commonest way one enters a program at all.
          if (isBufferReturningRead(node.init)) {
            addBufferVar(node.id);
          }

          // Check if assigned from Buffer.from() or Buffer.alloc()
          if (
            node.init.type === AST_NODE_TYPES.CallExpression &&
            node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.init.callee.object.type === AST_NODE_TYPES.Identifier &&
            node.init.callee.object.name === 'Buffer' &&
            node.init.callee.property.type === AST_NODE_TYPES.Identifier &&
            // @vocabulary Node Buffer API
            ['from', 'alloc', 'allocUnsafe'].includes(
              node.init.callee.property.name,
            )
          ) {
            addBufferVar(node.id);
          }

          // Check if assigned a buffer method result.
          //
          // The RECEIVER has to be a buffer too. Without that check any
          // `.slice()` or `.copy()` made its result a buffer, so
          // `const args = process.argv.slice(2)` registered `args` — which is
          // how `const nextArg = args[patternIdx + 1]` came to be a buffer
          // overread in two Shopify/cli argument parsers.
          if (node.init.type === AST_NODE_TYPES.CallExpression) {
            const callee = node.init.callee;
            if (
              callee.type === AST_NODE_TYPES.MemberExpression &&
              bufferMethods.includes(propertyName(callee) as string) &&
              callee.object.type === AST_NODE_TYPES.Identifier &&
              isBufferType(callee.object)
            ) {
              addBufferVar(node.id);
            }
          }

          // A substring test on the DECLARED NAME used to sit here —
          // `bufferTypes.some(t => varName.toLowerCase().includes(t))` — which
          // registered `rowBuffer`, `lineBuffer` and `arrayBufferView` as
          // buffers whatever they were initialized to. The initializer above is
          // the evidence; the spelling is not.
        }
      },

      // Check member expressions (buffer[index], buffer.method())
      MemberExpression(node: TSESTree.MemberExpression) {
        // Check for buffer[index] access
        if (node.computed && node.object.type === AST_NODE_TYPES.Identifier) {
          const buffer = node.object;
          const indexNode = node.property;

          // A write is CWE-787, not CWE-126 — a different rule's site.
          if (isWriteTarget(node)) return;
          // A loop counter is already bounded by the loop condition.
          if (isLoopBounded(indexNode)) return;

          if (isBufferType(node.object)) {
            // Check for negative indices
            if (couldBeNegative(indexNode)) {
              context.report({
                node,
                messageId: 'negativeBufferIndex',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
              return;
            }

            // Check for user-controlled indices without validation
            if (
              isUserControlledIndex(indexNode) &&
              !isIndexValidated(indexNode)
            ) {
              // Check if there's a bounds check in scope
              if (!hasBoundsCheck(buffer, indexNode)) {
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }
                if (passedTrustedSanitizer(indexNode)) {
                  return;
                }

                context.report({
                  node,
                  messageId: 'userControlledBufferIndex',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
                return;
              }
            }

            // The third arm used to report `unsafeBufferAccess` for ANY index
            // this rule could not prove validated. That is the "can I prove it
            // safe?" question, and it made the finding a property of the
            // rule's own analysis depth rather than of the code: on the corpus
            // it produced `const nextArg = args[patternIdx + 1]` in two
            // argument parsers and every access in two minified vendor
            // bundles.
            //
            // It now requires the same evidence the arm above does — an index
            // that can be traced to input — and differs only in that a bounds
            // check somewhere in scope was found, which downgrades the report
            // rather than silencing it. `reportUnvalidatedIndices` restores
            // the sweep.
            if (
              reportUnvalidatedIndices &&
              !hasBoundsCheck(buffer, indexNode) &&
              !isIndexValidated(indexNode)
            ) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }
              if (passedTrustedSanitizer(indexNode)) {
                return;
              }

              context.report({
                node,
                messageId: 'unsafeBufferAccess',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for buffer method calls that need bounds checking
        if (
          bufferMethods.includes(propertyName(node) as string) &&
          node.object.type === 'Identifier' &&
          isBufferType(node.object)
        ) {
          // This is a parent of a CallExpression, we'll check it there
        }
      },

      // Check buffer method calls
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for buffer.slice() / buffer.subarray() calls.
        //
        // `subarray` is the non-deprecated spelling of `slice` on a Buffer and
        // returns a view over the SAME memory, so an unvalidated offset reads
        // exactly as far past the end. It was absent from the rule entirely,
        // which meant a codebase that had followed Node's own advice to migrate
        // off `slice` silently lost the check.
        if (
          callee.type === 'MemberExpression' &&
          VIEW_METHODS.has(propertyName(callee) as string) &&
          callee.object.type === 'Identifier' &&
          isBufferType(callee.object)
        ) {
          const args = node.arguments;

          // Check slice arguments
          for (const arg of args) {
            if (isUserControlledIndex(arg) && !isIndexValidated(arg)) {
              if (
                safetyChecker.isSafe(node, context) ||
                passedTrustedSanitizer(arg)
              ) {
                continue;
              }
              // A guard comparing this very offset against the buffer's own
              // length is the remediation. It was consulted only for
              // `buf[index]`, so the documented fix silenced the computed form
              // and left the method form reporting.
              if (hasBoundsCheck(callee.object, arg)) {
                continue;
              }

              context.report({
                node: arg,
                messageId: 'unsafeBufferSlice',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for buffer read/write methods.
        //
        // The view methods are excluded: the handler above already owns them,
        // and reporting both left `buf.slice(req.query.start)` with two
        // findings — one line, two message ids, one underlying fact.
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          bufferMethods.includes(propertyName(callee) as string) &&
          !VIEW_METHODS.has(propertyName(callee) as string) &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          isBufferType(callee.object)
        ) {
          const args = node.arguments;

          // Check offset/length arguments
          for (const arg of args) {
            if (isUserControlledIndex(arg) && !isIndexValidated(arg)) {
              if (
                safetyChecker.isSafe(node, context) ||
                passedTrustedSanitizer(arg)
              ) {
                continue;
              }
              if (hasBoundsCheck(callee.object, arg)) {
                continue;
              }

              context.report({
                node: arg,
                messageId: 'missingBoundsCheck',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check binary expressions that might involve buffer operations
      BinaryExpression(node: TSESTree.BinaryExpression) {
        // Look for patterns like buffer.length - something that might indicate bounds checking
        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);

        if (leftText.includes('.length') || rightText.includes('.length')) {
          // This might be a bounds check - we could analyze this further
        }
      },
    };
  },
});
