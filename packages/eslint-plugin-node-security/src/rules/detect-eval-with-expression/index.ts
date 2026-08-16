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
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

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
      good: 'JSON.parse(\'{"key": "\' + value + \'"}"\')'
    },
    effort: '2 minutes'
  },
  {
    pattern: 'Math\\.|parseInt|parseFloat',
    category: 'math',
    safeAlternative: 'Math functions or parseInt/parseFloat',
    example: {
      bad: 'eval(\'Math.\' + method + \'(\' + arg + \')\')',
      good: 'const mathMethods = {sin: Math.sin, cos: Math.cos}; mathMethods[method](arg)'
    },
    effort: '5 minutes'
  },
  {
    pattern: '\\$\\{|template|interpolat',
    category: 'template',
    safeAlternative: 'Template literals or template engine',
    example: {
      bad: 'eval(\'Hello \' + userName + \'!\')',
      // oxlint-disable-next-line no-template-curly-in-string
      good: 'const template = `Hello ${userName}!`;'
    },
    effort: '3 minutes'
  },
  {
    pattern: '\\[.*\\]|object\\[|obj\\.|\\.',
    category: 'object',
    safeAlternative: 'Direct property access or Map',
    example: {
      bad: 'eval(\'obj.\' + property)',
      good: 'const allowedProps = {name: true, age: true}; if (allowedProps[property]) obj[property]'
    },
    effort: '8 minutes'
  }
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
 * Handles both spellings a file can use: the member form off a namespace
 * (`vm.runInNewContext`, `vm2.NodeVM`) and the destructured/named form
 * (`const { NodeVM } = require('vm2')`), including renames — the map stores the
 * *exported* name, so `const { NodeVM: Sandbox }` still resolves to 'NodeVM'.
 */
function resolveModuleMember(
  callee: TSESTree.Node,
  bindings: ReadonlyMap<string, string>,
): string | null {
  const name = calleeTrailingName(callee);
  if (name === null) return null;
  if (callee.type === 'Identifier') {
    const bound = bindings.get(name);
    return bound !== undefined && bound !== NAMESPACE ? bound : null;
  }
  const { object } = callee as TSESTree.MemberExpression;
  if (object.type !== 'Identifier') return null;
  return bindings.get(object.name) === NAMESPACE ? name : null;
}

/** The trailing name of a callee: `vm.Script` → 'Script', `VMScript` → same. */
function calleeTrailingName(callee: TSESTree.Node): string | null {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type !== 'MemberExpression' || callee.computed) return null;
  return callee.property.type === 'Identifier' ? callee.property.name : null;
}

/** A string written out in full — no runtime assembly, nothing to steer. */
function isStaticStringNode(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') return typeof node.value === 'string';
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0;
  return false;
}

/**
 * Generate refactoring steps based on pattern.
 * Module-scope so it is directly unit-testable (Layer-2).
 */
export const generateRefactoringSteps = (pattern: EvalPattern | null): string => {
  if (!pattern) {
    return [
      '   1. Remove eval() usage entirely',
      '   2. Identify what the code is trying to achieve',
      '   3. Use appropriate safe alternative (JSON.parse, Map, etc.)',
      '   4. Add input validation if dynamic behavior needed',
      '   5. Test thoroughly for edge cases'
    ].join('\n');
  }

  switch (pattern.category) {
    case 'json':
      return [
        '   1. Replace eval() with JSON.parse()',
        '   2. Ensure input is valid JSON string',
        '   3. Add try/catch for JSON parsing errors',
        '   4. Consider using a JSON schema validator'
      ].join('\n');

    case 'math':
      return [
        '   1. Create whitelist of allowed Math functions',
        '   2. Use direct function calls: Math.sin(x)',
        '   3. Validate inputs are numbers',
        '   4. Consider using a math expression parser library'
      ].join('\n');

    // oxlint-disable-next-line no-template-curly-in-string
    case 'template':
      return [
        // oxlint-disable-next-line no-template-curly-in-string
        '   1. Use template literals: `Hello ${name}`',
        '   2. Sanitize variables before interpolation',
        '   3. Use a template engine like Handlebars if complex',
        '   4. Validate template structure'
      ].join('\n');

    case 'object':
      return [
        '   1. Use Map or plain object for key-value access',
        '   2. Whitelist allowed property names',
        '   3. Use hasOwnProperty() check',
        '   4. Consider Object.create(null) for clean objects'
      ].join('\n');

    default:
      return [
        '   1. Identify the specific use case',
        '   2. Find a safer alternative approach',
        '   3. Add comprehensive input validation',
        '   4. Use static analysis if possible'
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
        documentationLink: 'https://nodejs.org/api/vm.html#vm-executing-javascript',
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
        description: 'Use JSON.parse() instead of eval() for JSON string parsing',
        severity: 'HIGH',
        fix: 'Replace eval() with JSON.parse()',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useObjectAccess: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() for property access',
        cwe: 'CWE-95',
        description: 'Use direct property access instead of eval() for dynamic property access',
        severity: 'HIGH',
        fix: 'Use obj[key] or Map.get(key) instead of eval()',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useTemplateLiteral: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() for string interpolation',
        cwe: 'CWE-95',
        description: 'Use template literals instead of eval() for string interpolation',
        // oxlint-disable-next-line no-template-curly-in-string
        severity: 'HIGH',
        // oxlint-disable-next-line no-template-curly-in-string
        fix: 'Replace eval() with template literals: `Hello ${name}`',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      strategyRemove: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Critical eval() security vulnerability',
        cwe: 'CWE-95',
        description: 'eval() usage poses severe security risk',
        severity: 'CRITICAL',
        fix: 'Remove eval() entirely - security risk too high',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      strategyRefactor: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'eval() refactoring required',
        cwe: 'CWE-95',
        description: 'eval() can be refactored to safer alternative',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      strategyValidate: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'eval() input validation needed',
        cwe: 'CWE-95',
        description: 'eval() requires input validation for security',
        severity: 'MEDIUM',
        fix: 'Add input validation before using eval()',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiteralStrings: {
            type: 'boolean',
            default: false,
            description: 'Allow eval with literal strings (false = stricter)'
          },
          additionalEvalFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional functions to treat as eval-like'
          },
          strategy: {
            type: 'string',
            enum: ['remove', 'refactor', 'validate', 'auto'],
            default: 'auto',
            description: 'Strategy for fixing eval usage (auto = smart detection)'
          }
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiteralStrings: false,
      additionalEvalFunctions: [],
      strategy: 'auto'
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowLiteralStrings = false,
      additionalEvalFunctions = [],
      strategy = 'auto'
    }: Options = options;

    /**
     * All functions that can execute arbitrary code
     * NOTE: setTimeout/setInterval are NOT eval-like - they don't execute code strings
     */
    const evalFunctions = new Set([
      'eval',
      'Function',
      ...additionalEvalFunctions
    ]);

    /**
     * Check if a node is a literal string (safe)
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return node.type === 'Literal' && typeof node.value === 'string';
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
     * Check call expressions for dangerous eval usage
     */
    const checkCallExpression = (node: TSESTree.CallExpression) => {
      // Check if it's a call to an eval-like function
      if (node.callee.type === 'Identifier' &&
          evalFunctions.has(node.callee.name)) {

        // Skip if it's a literal string and literals are allowed
        if (allowLiteralStrings &&
            node.arguments.length > 0 &&
            isLiteralString(node.arguments[0])) {
          return;
        }

        // Skip if it's a direct string literal (safe)
        if (node.arguments.length > 0 &&
            node.callee.name === 'eval' &&
            isLiteralString(node.arguments[0])) {
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
            effort: pattern?.effort || '15-30 minutes'
          },
        });
      }

      // Also check for Function constructor usage
      if (node.callee.type === 'NewExpression' &&
          node.callee.callee.type === 'Identifier' &&
          node.callee.callee.name === 'Function') {

        const expression = extractExpression(node);
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
              '   4. Consider module imports instead'
            ].join('\n'),
            effort: '10 minutes'
          }
        });
      }
    };

    /**
     * Check NewExpression for Function constructor usage
     */
    const checkNewExpression = (node: TSESTree.NewExpression) => {
      // Check for new Function() usage
      if (node.callee.type === 'Identifier' && node.callee.name === 'Function') {
        const sourceCode = context.sourceCode;
        const expression = node.arguments.map((arg: TSESTree.Node) => sourceCode.getText(arg)).join(', ');
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
              '   4. Consider module imports instead'
            ].join('\n'),
            effort: '10 minutes'
          }
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
      let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node);
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
      if (variable.references.filter((ref) => ref.isWrite()).length !== 1) {
        return false;
      }
      const [def] = variable.defs;
      if (!def || def.node.type !== 'VariableDeclarator') return false;
      const init = def.node.init;
      return init != null && isStaticStringNode(init);
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

    /** `<sandbox>.run(source)` — the vm2 execution entry point. */
    const isVm2Run = (
      node: TSESTree.CallExpression,
      sandboxes: ReadonlySet<string>,
    ): boolean => {
      const { callee } = node;
      if (callee.type !== 'MemberExpression') return false;
      if (calleeTrailingName(callee) !== 'run') return false;
      if (callee.object.type === 'Identifier') {
        return sandboxes.has(callee.object.name);
      }
      if (callee.object.type !== 'NewExpression') return false;
      const constructed = resolveModuleMember(callee.object.callee, vm2Bindings);
      return constructed !== null && VM2_SANDBOX_CONSTRUCTORS.has(constructed);
    };

    const judgeVmSites = (): void => {
      const sandboxes = new Set<string>();
      for (const candidate of vm2SandboxCandidates) {
        const constructed = resolveModuleMember(
          candidate.init.callee,
          vm2Bindings,
        );
        if (constructed !== null && VM2_SANDBOX_CONSTRUCTORS.has(constructed)) {
          sandboxes.add(candidate.local);
        }
      }

      for (const node of pendingVmCalls) {
        const vmApi = resolveModuleMember(node.callee, vmBindings);
        if (vmApi !== null && VM_CODE_SINK_METHODS.has(vmApi)) {
          reportVmSite(node, node.arguments[0], 'vmCodeExecution', vmApi);
          continue;
        }
        if (isVm2Run(node, sandboxes)) {
          reportVmSite(node, node.arguments[0], 'vm2CodeExecution', 'run');
        }
      }

      for (const node of pendingVmNews) {
        const vmCtor = resolveModuleMember(node.callee, vmBindings);
        if (vmCtor !== null && VM_CODE_CONSTRUCTORS.has(vmCtor)) {
          reportVmSite(node, node.arguments[0], 'vmCodeExecution', vmCtor);
          continue;
        }
        const vm2Ctor = resolveModuleMember(node.callee, vm2Bindings);
        if (vm2Ctor !== null && VM2_CODE_CONSTRUCTORS.has(vm2Ctor)) {
          reportVmSite(node, node.arguments[0], 'vm2CodeExecution', vm2Ctor);
        }
      }
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        checkCallExpression(node);
        // Cheap name filter first: only calls that could name a vm sink are
        // worth carrying to Program:exit.
        const name = calleeTrailingName(node.callee);
        if (name !== null && (VM_CODE_SINK_METHODS.has(name) || name === 'run')) {
          pendingVmCalls.push(node);
        }
      },
      NewExpression(node: TSESTree.NewExpression) {
        checkNewExpression(node);
        const name = calleeTrailingName(node.callee);
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
        if (node.id.type === 'Identifier' && node.init?.type === 'NewExpression') {
          vm2SandboxCandidates.push({ local: node.id.name, init: node.init });
        }
      },
      'Program:exit': judgeVmSites,
    };
  },
});
