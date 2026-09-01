/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: detect-eval-with-expression
 * Detects eval(variable) which can allow an attacker to run arbitrary code
 * LLM-optimized with comprehensive fix guidance and security context
 *
 * @see https://owasp.org/www-community/attacks/Code_Injection
 * @see https://cwe.mitre.org/data/definitions/95.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, staticString, propertyName } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  constInitializerOf,
  resolveConstantString,
} from '../../utils/const-value';

/**
 * Three more used to sit here: `evalWithExpression`, `useFunctionConstructor`
 * and `useSaferAlternative`. `selectStrategyMessage` is the only thing that
 * decides a messageId in this rule, and it can return exactly six of the eight
 * below — the three deleted were never among them. Nor could they have been
 * emitted usefully: `evalWithExpression` interpolates `{{safeAlternative}}` and
 * `useSaferAlternative` interpolates `{{alternative}}`, and no call site in
 * this file passes either placeholder at the top level of `data`, so both would
 * have rendered literal braces to the user. Deleted rather than wired, because
 * there is no lost report path to restore — the six that are reachable already
 * cover every pattern category.
 */
type MessageIds =
  | 'vmCodeExecution'
  | 'vm2CodeExecution'
  | 'useJsonParse'
  | 'useObjectAccess'
  | 'useTemplateLiteral'
  | 'strategyRemove'
  | 'strategyRefactor'
  | 'strategyValidate';

export interface Options {
  /** Allow eval with literal strings. Default: false (stricter) */
  allowLiteralStrings?: boolean;

  /** Additional functions to treat as eval-like */
  additionalEvalFunctions?: string[];

  /** Strategy for fixing eval usage: 'remove', 'refactor', 'validate', or 'auto' */
  strategy?: 'remove' | 'refactor' | 'validate' | 'auto';
}

type RuleOptions = [Options?];

/**
 * Pattern categories and their safe alternatives
 */
interface EvalPattern {
  pattern: string;
  category: 'json' | 'math' | 'template' | 'object' | 'dynamic' | 'other';
  safeAlternative: string;
  example: { bad: string; good: string };
  effort: string;
}

const EVAL_PATTERNS: EvalPattern[] = [
  {
    pattern: 'JSON\\.parse|parse\\(.*\\)',
    category: 'json',
    safeAlternative: 'JSON.parse()',
    example: {
      bad: 'eval(\'{"key": "\' + value + \'"}"\')',
      good: 'JSON.parse(\'{"key": "\' + value + \'"}"\')',
    },
    effort: '2 minutes',
  },
  {
    pattern: 'Math\\.|parseInt|parseFloat',
    category: 'math',
    safeAlternative: 'Math functions or parseInt/parseFloat',
    example: {
      bad: "eval('Math.' + method + '(' + arg + ')')",
      good: 'const mathMethods = {sin: Math.sin, cos: Math.cos}; mathMethods[method](arg)',
    },
    effort: '5 minutes',
  },
  {
    pattern: '\\$\\{|template|interpolat',
    category: 'template',
    safeAlternative: 'Template literals or template engine',
    example: {
      bad: "eval('Hello ' + userName + '!')",
      // oxlint-disable-next-line no-template-curly-in-string
      good: 'const template = `Hello ${userName}!`;',
    },
    effort: '3 minutes',
  },
  {
    pattern: '\\[.*\\]|object\\[|obj\\.|\\.',
    category: 'object',
    safeAlternative: 'Direct property access or Map',
    example: {
      bad: "eval('obj.' + property)",
      good: 'const allowedProps = {name: true, age: true}; if (allowedProps[property]) obj[property]',
    },
    effort: '8 minutes',
  },
];

/**
 * The `vm` module turns a string into running code exactly the way `eval` does.
 *
 * `vm.runInNewContext` is routinely mistaken for a sandbox because it takes a
 * context object — but the objects handed into that context carry their own
 * constructor chain, and `this.constructor.constructor('return process')()` is
 * the one-liner that walks back out. Node's own docs say it is not a security
 * mechanism. All four entry points take the code as argument 0.
 *
 * @see https://nodejs.org/api/vm.html#vm-executing-javascript
 */
const VM_CODE_SINK_METHODS = new Set([
  'runInNewContext',
  'runInThisContext',
  'runInContext',
  'compileFunction',
]);

/** `new vm.Script(code)` — compiles now, runs later; same string→code step. */
const VM_CODE_CONSTRUCTORS = new Set(['Script', 'SourceTextModule']);

/** vm2 classes that wrap a sandbox; their `.run()` takes the source. */
const VM2_SANDBOX_CONSTRUCTORS = new Set(['VM', 'NodeVM']);

/** `new VMScript(code)` — vm2's precompiled-source class. */
const VM2_CODE_CONSTRUCTORS = new Set(['VMScript']);

const VM_MODULES = new Set(['vm', 'node:vm']);
const VM2_MODULES = new Set(['vm2']);

/** Marks a local bound to a whole module rather than one of its exports. */
const NAMESPACE = '*';

/** The module specifier of `require('x')`, or null for anything else. */
function requiredModule(node: TSESTree.Node | null | undefined): string | null {
  if (!node || node.type !== 'CallExpression') return null;
  if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') {
    return null;
  }
  const [source] = node.arguments;
  if (!source || source.type !== 'Literal') return null;
  return typeof source.value === 'string' ? source.value : null;
}

/**
 * Which export of a tracked module this callee refers to.
 *
 * Handles every spelling a file can use: the member form off a namespace
 * (`vm.runInNewContext`, `vm2.NodeVM`), the destructured/named form
 * (`const { NodeVM } = require('vm2')`) including renames — the map stores the
 * *exported* name, so `const { NodeVM: Sandbox }` still resolves to 'NodeVM' —
 * and the inline `require('node:vm').runInNewContext(…)`, which creates no
 * local binding at all and so was invisible to a binding-only lookup.
 *
 * `name` is passed in rather than derived here because a computed member
 * (`vm[VM_API]`) needs the rule's constant resolver to name it, and that
 * resolver needs the SourceCode this module-scope helper does not have.
 */
function resolveModuleMember(
  callee: TSESTree.Node,
  bindings: ReadonlyMap<string, string>,
  modules: ReadonlySet<string>,
  name: string | null,
): string | null {
  if (name === null) return null;
  if (callee.type === 'Identifier') {
    const bound = bindings.get(name);
    return bound !== undefined && bound !== NAMESPACE ? bound : null;
  }
  // A non-null `name` came from `calleeTrailingName`/`trailingName`, and both
  // produce one only for an Identifier or a MemberExpression — the Identifier
  // case returned above, so this is the member form. A `!== 'MemberExpression'`
  // guard here would be an unreachable branch pretending to be a check.
  const { object } = callee as TSESTree.MemberExpression;
  if (object.type === 'Identifier') {
    return bindings.get(object.name) === NAMESPACE ? name : null;
  }
  const inline = requiredModule(object);
  return inline !== null && modules.has(inline) ? name : null;
}

/** The trailing name of a callee: `vm.Script` → 'Script', `VMScript` → same. */
function calleeTrailingName(callee: TSESTree.Node): string | null {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type !== 'MemberExpression' || callee.computed) return null;
  return callee.property.type === 'Identifier' ? callee.property.name : null;
}

/** A string written out in full — no runtime assembly, nothing to steer. */
function isStaticStringNode(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') return staticString(node) !== null;
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0;
  return false;
}

/**
 * Generate refactoring steps based on pattern.
 * Module-scope so it is directly unit-testable (Layer-2).
 */
export const generateRefactoringSteps = (
  pattern: EvalPattern | null,
): string => {
  if (!pattern) {
    return [
      '   1. Remove eval() usage entirely',
      '   2. Identify what the code is trying to achieve',
      '   3. Use appropriate safe alternative (JSON.parse, Map, etc.)',
      '   4. Add input validation if dynamic behavior needed',
      '   5. Test thoroughly for edge cases',
    ].join('\n');
  }

  switch (pattern.category) {
    case 'json':
      return [
        '   1. Replace eval() with JSON.parse()',
        '   2. Ensure input is valid JSON string',
        '   3. Add try/catch for JSON parsing errors',
        '   4. Consider using a JSON schema validator',
      ].join('\n');

    case 'math':
      return [
        '   1. Create whitelist of allowed Math functions',
        '   2. Use direct function calls: Math.sin(x)',
        '   3. Validate inputs are numbers',
        '   4. Consider using a math expression parser library',
      ].join('\n');

    // oxlint-disable-next-line no-template-curly-in-string
    case 'template':
      return [
        // oxlint-disable-next-line no-template-curly-in-string
        '   1. Use template literals: `Hello ${name}`',
        '   2. Sanitize variables before interpolation',
        '   3. Use a template engine like Handlebars if complex',
        '   4. Validate template structure',
      ].join('\n');

    case 'object':
      return [
        '   1. Use Map or plain object for key-value access',
        '   2. Whitelist allowed property names',
        '   3. Use hasOwnProperty() check',
        '   4. Consider Object.create(null) for clean objects',
      ].join('\n');

    default:
      return [
        '   1. Identify the specific use case',
        '   2. Find a safer alternative approach',
        '   3. Add comprehensive input validation',
        '   4. Use static analysis if possible',
      ].join('\n');
  }
};

export const detectEvalWithExpression = createRule<RuleOptions, MessageIds>({
  name: 'detect-eval-with-expression',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/detect-eval-with-expression.md',
      description:
        'Detects strings turned into running code — eval(variable), the Function constructor, and the vm / vm2 sinks that are mistaken for sandboxes',
      cwe: 'CWE-95',
      cvss: 9.8,
      confidence: 'high',
    },
    // `false`: no `context.report` in this file passes a `suggest` array. It was
    // `true` while the rule's only suggestion had `fix: () => null`, which
    // ESLint discards — so the flag advertised an affordance that reached no
    // user. A consumer or an integration reading `hasSuggestions` is entitled
    // to believe it.
    hasSuggestions: false,
    messages: {
      vmCodeExecution: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Code Execution Through the vm Module (CWE-94)',
        cwe: 'CWE-94',
        cvss: 9.8,
        description:
          'vm.{{api}}() compiles and runs its first argument as JavaScript, and that argument is not written out in full here. The vm module is NOT a security boundary — Node documents it as such — because any object reachable from the context carries a constructor chain back out: `this.constructor.constructor("return process")()`. A string that is not a constant is a string an attacker may be able to steer.',
        severity: 'CRITICAL',
        fix: 'Do not evaluate the value as code. Parse it (JSON.parse, an expression parser) or dispatch through a fixed map of allowed operations; if untrusted code genuinely has to run, isolate it in a separate process with its own privileges — not in vm.',
        documentationLink:
          'https://nodejs.org/api/vm.html#vm-executing-javascript',
      }),
      vm2CodeExecution: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Code Execution Through vm2 (CWE-94)',
        cwe: 'CWE-94',
        cvss: 9.8,
        description:
          'vm2 is abandoned and was retired by its maintainer after sandbox escapes that it could not fix (CVE-2023-37903, CVE-2023-37466). Running source that is not a constant inside it is arbitrary code execution on the host, not sandboxed execution.',
        severity: 'CRITICAL',
        fix: 'Stop using vm2. Run untrusted code out-of-process under an OS-level boundary (a separate process with dropped privileges, a container, or isolated-vm), or remove the need to execute caller-supplied source.',
        documentationLink: 'https://github.com/patriksimek/vm2/issues/533',
      }),
      useJsonParse: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() for JSON parsing',
        cwe: 'CWE-95',
        description:
          'Use JSON.parse() instead of eval() for JSON string parsing',
        severity: 'HIGH',
        fix: 'Replace eval() with JSON.parse()',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useObjectAccess: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() for property access',
        cwe: 'CWE-95',
        description:
          'Use direct property access instead of eval() for dynamic property access',
        severity: 'HIGH',
        fix: 'Use obj[key] or Map.get(key) instead of eval()',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useTemplateLiteral: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() for string interpolation',
        cwe: 'CWE-95',
        description:
          'Use template literals instead of eval() for string interpolation',
        // oxlint-disable-next-line no-template-curly-in-string
        severity: 'HIGH',
        // oxlint-disable-next-line no-template-curly-in-string
        fix: 'Replace eval() with template literals: `Hello ${name}`',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      strategyRemove: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Critical eval() security vulnerability',
        cwe: 'CWE-95',
        description: 'eval() usage poses severe security risk',
        severity: 'CRITICAL',
        fix: 'Remove eval() entirely - security risk too high',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      strategyRefactor: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'eval() refactoring required',
        cwe: 'CWE-95',
        description: 'eval() can be refactored to safer alternative',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      strategyValidate: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'eval() input validation needed',
        cwe: 'CWE-95',
        description: 'eval() requires input validation for security',
        severity: 'MEDIUM',
        fix: 'Add input validation before using eval()',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiteralStrings: {
            type: 'boolean',
            default: false,
            description: 'Allow eval with literal strings (false = stricter)',
          },
          additionalEvalFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional functions to treat as eval-like',
          },
          strategy: {
            type: 'string',
            enum: ['remove', 'refactor', 'validate', 'auto'],
            default: 'auto',
            description:
              'Strategy for fixing eval usage (auto = smart detection)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiteralStrings: false,
      additionalEvalFunctions: [],
      strategy: 'auto',
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowLiteralStrings = false,
      additionalEvalFunctions = [],
      strategy = 'auto',
    }: Options = options;

    /**
     * All functions that can execute arbitrary code
     * NOTE: setTimeout/setInterval are NOT eval-like - they don't execute code strings
     */
    const evalFunctions = new Set([
      'eval',
      'Function',
      ...additionalEvalFunctions,
    ]);

    /**
     * Check if a node is a literal string (safe)
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return staticString(node) !== null;
    };

    /**
     * Select message ID based on strategy
     */
    const selectStrategyMessage = (pattern: EvalPattern | null): MessageIds => {
      switch (strategy) {
        case 'remove':
          return 'strategyRemove';
        case 'refactor':
          return 'strategyRefactor';
        case 'validate':
          return 'strategyValidate';
        case 'auto':
        default:
          // Auto mode: choose based on pattern confidence
          if (pattern && pattern.category === 'json') {
            return 'useJsonParse';
          }
          if (pattern && pattern.category === 'object') {
            return 'useObjectAccess';
          }
          if (pattern && pattern.category === 'template') {
            return 'useTemplateLiteral';
          }
          return 'strategyRefactor'; // Default to refactor for unknown patterns
      }
    };

    /**
     * Detect the pattern category from the expression
     */
    const detectPattern = (expression: string): EvalPattern | null => {
      for (const pattern of EVAL_PATTERNS) {
        if (new RegExp(pattern.pattern, 'i').test(expression)) {
          return pattern;
        }
      }
      return null;
    };

    /**
     * Extract expression text for pattern analysis
     */
    const extractExpression = (node: TSESTree.CallExpression): string => {
      const sourceCode = context.sourceCode;

      // Try to get the argument text
      if (node.arguments.length > 0) {
        return sourceCode.getText(node.arguments[0]);
      }

      return 'dynamic expression';
    };

    /**
     * Global objects that expose `eval` as a property.
     *
     * `globalThis.eval(src)` is how isomorphic code reaches eval without a
     * bundler's static analysis noticing, and it is the same sink. Exact
     * membership against a closed set of global names — not a substring test.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const GLOBAL_OBJECTS = new Set(['globalThis', 'global', 'window', 'self']);

    /**
     * Which eval-like function this callee ultimately names, if any.
     *
     * `eval` is reachable by four spellings that all execute the same string:
     *
     *   eval(src)                  the bare identifier
     *   (0, eval)(src)             INDIRECT eval — the canonical way to force
     *                              global-scope evaluation, and what bundlers
     *                              emit
     *   globalThis.eval(src)       the property form
     *   const c = eval; c(src)     bound to a local whose name says nothing
     *
     * Matching only the first made the other three silent while looking, in the
     * rule's own tests, like full coverage. The binding is resolved through the
     * scope analyser: `queue.run` and `HANDLERS.eval` stay quiet because they
     * do not resolve to eval, not because of how they are spelled.
     */
    /**
     * Does this identifier resolve to the GLOBAL of that name, rather than to an
     * import, a local, or a parameter that merely shares the spelling?
     *
     * An unresolved identifier is the global — that is precisely what "not declared
     * anywhere in this file" means for `eval` and `Function`.
     */
    const isGlobalBinding = (identifier: TSESTree.Identifier): boolean => {
      // `findVariable` is the local helper declared below in this same `create`;
      // it is initialised before any visitor runs.
      const variable = findVariable(identifier);
      return !variable || variable.defs.length === 0;
    };

    const evalCalleeName = (
      callee: TSESTree.Node,
      depth = 0,
    ): string | null => {
      if (depth > 3) return null;
      if (callee.type === 'Identifier') {
        if (evalFunctions.has(callee.name)) {
          // The NAME is not the sink — the binding is. `Function` imported from
          // `aws-cdk-lib/aws-lambda` is an AWS Lambda construct that deploys a
          // Python handler, and every CDK stack that declares a lambda writes
          // `new Function(this, id, { runtime: Runtime.PYTHON_3_11, ... })`.
          // Matching the spelling reported 30 findings in a 6 KLOC CDK library
          // (cdklabs/cdk-enterprise-iac) and would fire on essentially every CDK
          // codebase in existence.
          //
          // A resolved definition means the identifier is a local, a parameter or
          // an import — anything but the global. Fall through to the alias path so
          // `const Function = globalThis.Function` is still caught, and an
          // unresolved identifier still reports, because that IS the global.
          if (isGlobalBinding(callee)) return callee.name;
          const aliased = constInitializerOf(context.sourceCode, callee);
          return aliased ? evalCalleeName(aliased, depth + 1) : null;
        }
        const init = constInitializerOf(context.sourceCode, callee);
        return init ? evalCalleeName(init, depth + 1) : null;
      }
      if (callee.type === 'SequenceExpression') {
        // The grammar gives a sequence at least two operands, so the last one
        // always exists; a `?:` for the empty case would be a branch no input
        // can reach.
        const [last] = callee.expressions.slice(-1) as [TSESTree.Expression];
        return evalCalleeName(last, depth + 1);
      }
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        GLOBAL_OBJECTS.has(callee.object.name) &&
        evalFunctions.has(propertyName(callee) as string)
      ) {
        return propertyName(callee) as string;
      }
      return null;
    };

    /**
     * Check call expressions for dangerous eval usage
     */
    const checkCallExpression = (node: TSESTree.CallExpression) => {
      // Check if it's a call to an eval-like function
      const evalName = evalCalleeName(node.callee);
      if (evalName !== null) {
        // Skip if it's a literal string and literals are allowed
        if (
          allowLiteralStrings &&
          node.arguments.length > 0 &&
          isLiteralString(node.arguments[0])
        ) {
          return;
        }

        // Skip if it's a direct string literal (safe)
        if (
          node.arguments.length > 0 &&
          evalName === 'eval' &&
          isLiteralString(node.arguments[0])
        ) {
          return;
        }

        const expression = extractExpression(node);
        const pattern = detectPattern(expression);
        const steps = generateRefactoringSteps(pattern);

        // The `suggest:` array that used to hang off this report offered ONE
        // suggestion, repeating the report's own messageId, with
        // `fix: () => null`. ESLint discards a suggestion whose fixer returns
        // null before it reaches the user, so nothing was ever offered and
        // `hasSuggestions: true` overstated the rule. The suite even recorded
        // the fact — "Rule provides suggestions but fix returns null (no
        // auto-fix), so we don't test them here" — which is documenting a
        // defect rather than mitigating it. The remediation text it carried is
        // already in `data.safeAlternative` and `data.steps` of the report
        // itself, which the user actually sees.
        //
        // `selectStrategyMessage(pattern)` is inlined rather than held in a
        // local: at the report site the local told a reader nothing about which
        // message this is, and any static reader of this file saw the VARIABLE
        // name where a messageId belongs.
        context.report({
          node,
          messageId: selectStrategyMessage(pattern),
          data: {
            expression,
            patternCategory: pattern?.category || 'dynamic code execution',
            safeAlternative: pattern?.safeAlternative || 'Remove eval entirely',
            steps,
            effort: pattern?.effort || '15-30 minutes',
          },
        });
      }

      // `new Function(body)()` — the immediately-invoked spelling — used to be
      // reported HERE as well as by `checkNewExpression` below, so one site
      // produced two identical diagnostics at the same location. The
      // NewExpression visitor already covers every `new Function(...)`, invoked
      // or not; this branch only ever duplicated it.
    };

    /**
     * Check NewExpression for Function constructor usage
     */
    const checkNewExpression = (node: TSESTree.NewExpression) => {
      // Check for new Function() usage.
      //
      // `isGlobalBinding` and not just the name: `Function` imported from
      // `aws-cdk-lib/aws-lambda` is an AWS Lambda construct that deploys a handler,
      // and `new Function(this, id, { runtime: Runtime.PYTHON_3_11 })` is how every
      // CDK stack declares one. Matching the spelling produced 30 findings in a
      // 6 KLOC CDK library (cdklabs/cdk-enterprise-iac).
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'Function' &&
        isGlobalBinding(node.callee)
      ) {
        const sourceCode = context.sourceCode;
        const expression = node.arguments
          .map((arg: TSESTree.Node) => sourceCode.getText(arg))
          .join(', ');
        const pattern = detectPattern(expression);

        context.report({
          node,
          messageId: selectStrategyMessage(pattern),
          data: {
            expression: `new Function(${expression})`,
            patternCategory: 'function constructor',
            safeAlternative: 'Arrow function or regular function',
            steps: [
              '   1. Replace Function constructor with arrow function',
              '   2. Use regular function declaration',
              '   3. Validate any dynamic parts',
              '   4. Consider module imports instead',
            ].join('\n'),
            effort: '10 minutes',
          },
        });
      }
    };

    // ── vm / vm2 code-execution sinks ────────────────────────────────────
    //
    // Same class of defect as `eval(expr)`: a string becomes running code. The
    // only reason it needs its own pass is that the sink is reached through a
    // module binding, so nothing can be judged until every binding in the file
    // is known — hence the collect-then-judge shape, mirroring
    // `detect-non-literal-fs-filename`. A `const vm = require('vm')` written
    // *below* the call would otherwise leave the call silently unchecked.

    /** Local name → export of `vm` it is bound to ('*' = the module itself). */
    const vmBindings = new Map<string, string>();
    /** Local name → export of `vm2` it is bound to ('*' = the module itself). */
    const vm2Bindings = new Map<string, string>();
    /** `const s = new NodeVM()` — locals holding a vm2 sandbox. */
    const vm2SandboxCandidates: Array<{
      local: string;
      init: TSESTree.NewExpression;
    }> = [];
    const pendingVmCalls: TSESTree.CallExpression[] = [];
    const pendingVmNews: TSESTree.NewExpression[] = [];

    /** The nearest binding for an identifier, walking outward through scopes. */
    const findVariable = (node: TSESTree.Identifier) => {
      let scope: TSESLint.Scope.Scope | null =
        context.sourceCode.getScope(node);
      while (scope) {
        const found = scope.variables.find((v) => v.name === node.name);
        if (found) return found;
        scope = scope.upper;
      }
      return null;
    };

    /**
     * Is this argument a string the author wrote out, rather than one the
     * program assembled?
     *
     * One hop of constant resolution is deliberate and is what separates the
     * two corpus fixtures: `vm.runInNewContext(SCRIPT, …)` where
     * `const SCRIPT = 'total = price * quantity'` is a hard-coded program and
     * must stay silent, while `vm.runInNewContext(req.query.expr, …)` is not.
     * The single-write requirement is the load-bearing part — a binding that is
     * written more than once could hold anything by the time the call runs, so
     * proving its initializer constant proves nothing.
     */
    const isStaticCode = (node: TSESTree.Node | undefined): boolean => {
      // No code argument at all — there is no string to judge.
      if (!node) return true;
      if (isStaticStringNode(node)) return true;
      if (node.type !== 'Identifier') return false;
      const variable = findVariable(node);
      if (!variable) return false;

      // The LAST write before this call decides, which is the same
      // straight-line model `provenance.ts` uses. Counting writes instead of
      // reading them made
      //
      //   let program = 'result = rows.length';
      //   if (mode === 'sum') program = 'result = total(rows)';
      //   vm.runInNewContext(program, ctx);
      //
      // a report: two writes, both of them constants the author typed, so the
      // program that runs is one of two strings the author wrote.
      //
      // Position is load-bearing in the other direction too. "Every write is
      // static" would excuse `function go(s) { vm.run(s); s = 'x = 1'; }`,
      // where the literal is assigned AFTER the sink has already run the
      // parameter. No write before the use means unresolved, which stays
      // reported.
      const lastWrite = variable.references
        .filter((ref) => ref.isWrite())
        .map((ref) => ref.writeExpr)
        .filter((write): write is TSESTree.Node => write != null)
        .filter((write) => write.range[1] <= node.range[0])
        .sort((a, b) => a.range[1] - b.range[1])
        .at(-1);
      return lastWrite !== undefined && isStaticStringNode(lastWrite);
    };

    /** Record `local` as bound to `imported` from a tracked module. */
    const bindModuleName = (
      moduleName: string,
      local: string,
      imported: string,
    ): void => {
      if (VM_MODULES.has(moduleName)) vmBindings.set(local, imported);
      else if (VM2_MODULES.has(moduleName)) vm2Bindings.set(local, imported);
    };

    /** `const { NodeVM } = require('vm2')` / `const vm = require('vm')`. */
    const bindRequire = (node: TSESTree.VariableDeclarator): void => {
      const moduleName = requiredModule(node.init);
      if (moduleName === null) return;
      if (node.id.type === 'Identifier') {
        bindModuleName(moduleName, node.id.name, NAMESPACE);
        return;
      }
      if (node.id.type !== 'ObjectPattern') return;
      for (const property of node.id.properties) {
        if (property.type !== 'Property') continue;
        if (property.key.type !== 'Identifier') continue;
        if (property.value.type !== 'Identifier') continue;
        bindModuleName(moduleName, property.value.name, property.key.name);
      }
    };

    const reportVmSite = (
      node: TSESTree.Node,
      code: TSESTree.Node | undefined,
      messageId: 'vmCodeExecution' | 'vm2CodeExecution',
      api: string,
    ): void => {
      if (isStaticCode(code)) return;
      context.report({ node, messageId, data: { api } });
    };

    /**
     * The trailing name of a callee, resolving a computed property through a
     * constant: `vm[VM_API]` where `const VM_API = 'runInNewContext'` names the
     * same sink as `vm.runInNewContext`.
     */
    const trailingName = (callee: TSESTree.Node): string | null => {
      if (callee.type === 'MemberExpression' && callee.computed) {
        // A computed property is an expression, never a PrivateIdentifier.
        return (
          resolveConstantString(context.sourceCode, callee.property)?.value ??
          null
        );
      }
      return calleeTrailingName(callee);
    };

    /** `<sandbox>.run(source)` — the vm2 execution entry point. */
    const isVm2Run = (
      node: TSESTree.CallExpression,
      sandboxes: ReadonlySet<string>,
    ): boolean => {
      const { callee } = node;
      if (callee.type !== 'MemberExpression') return false;
      if (trailingName(callee) !== 'run') return false;
      if (callee.object.type === 'Identifier') {
        return sandboxes.has(callee.object.name);
      }
      if (callee.object.type !== 'NewExpression') return false;
      const constructed = resolveModuleMember(
        callee.object.callee,
        vm2Bindings,
        VM2_MODULES,
        trailingName(callee.object.callee),
      );
      return constructed !== null && VM2_SANDBOX_CONSTRUCTORS.has(constructed);
    };

    const judgeVmSites = (): void => {
      const sandboxes = new Set<string>();
      for (const candidate of vm2SandboxCandidates) {
        const constructed = resolveModuleMember(
          candidate.init.callee,
          vm2Bindings,
          VM2_MODULES,
          trailingName(candidate.init.callee),
        );
        if (constructed !== null && VM2_SANDBOX_CONSTRUCTORS.has(constructed)) {
          sandboxes.add(candidate.local);
        }
      }

      for (const node of pendingVmCalls) {
        const name = trailingName(node.callee);
        const vmApi = resolveModuleMember(
          node.callee,
          vmBindings,
          VM_MODULES,
          name,
        );
        if (vmApi !== null && VM_CODE_SINK_METHODS.has(vmApi)) {
          reportVmSite(node, node.arguments[0], 'vmCodeExecution', vmApi);
          continue;
        }
        if (isVm2Run(node, sandboxes)) {
          reportVmSite(node, node.arguments[0], 'vm2CodeExecution', 'run');
        }
      }

      for (const node of pendingVmNews) {
        const name = trailingName(node.callee);
        const vmCtor = resolveModuleMember(
          node.callee,
          vmBindings,
          VM_MODULES,
          name,
        );
        if (vmCtor !== null && VM_CODE_CONSTRUCTORS.has(vmCtor)) {
          reportVmSite(node, node.arguments[0], 'vmCodeExecution', vmCtor);
          continue;
        }
        const vm2Ctor = resolveModuleMember(
          node.callee,
          vm2Bindings,
          VM2_MODULES,
          name,
        );
        if (vm2Ctor !== null && VM2_CODE_CONSTRUCTORS.has(vm2Ctor)) {
          reportVmSite(node, node.arguments[0], 'vm2CodeExecution', vm2Ctor);
        }
      }
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        checkCallExpression(node);
        // A LOCAL name is not the export name. `import { runInThisContext as
        // runIt } from 'node:vm'` calls the sink as `runIt(…)`, so filtering
        // identifier callees by the sink vocabulary threw the renamed import
        // away before `resolveModuleMember` — which exists to resolve exactly
        // that rename — ever saw it. Every identifier callee is carried; the
        // binding decides at Program:exit, which is the whole point of
        // deferring.
        if (node.callee.type === 'Identifier') {
          pendingVmCalls.push(node);
          return;
        }
        const name = trailingName(node.callee);
        if (
          name !== null &&
          (VM_CODE_SINK_METHODS.has(name) || name === 'run')
        ) {
          pendingVmCalls.push(node);
        }
      },
      NewExpression(node: TSESTree.NewExpression) {
        checkNewExpression(node);
        if (node.callee.type === 'Identifier') {
          pendingVmNews.push(node);
          return;
        }
        const name = trailingName(node.callee);
        if (
          name !== null &&
          (VM_CODE_CONSTRUCTORS.has(name) || VM2_CODE_CONSTRUCTORS.has(name))
        ) {
          pendingVmNews.push(node);
        }
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const moduleName = node.source.value;
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier') {
            if (specifier.imported.type !== 'Identifier') continue;
            bindModuleName(
              moduleName,
              specifier.local.name,
              specifier.imported.name,
            );
            continue;
          }
          // Default and namespace imports both stand for the module object.
          bindModuleName(moduleName, specifier.local.name, NAMESPACE);
        }
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        bindRequire(node);
        if (
          node.id.type === 'Identifier' &&
          node.init?.type === 'NewExpression'
        ) {
          vm2SandboxCandidates.push({ local: node.id.name, init: node.init });
        }
      },
      'Program:exit': judgeVmSites,
    };
  },
});
