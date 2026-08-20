/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-deserialization
 * Detects unsafe deserialization of untrusted data (CWE-502)
 *
 * Unsafe deserialization occurs when untrusted data is deserialized in a way that
 * allows attackers to execute arbitrary code or manipulate application logic.
 * This includes:
 * - Using dangerous deserialization libraries
 * - eval() or Function() on untrusted data
 * - YAML/XML parsers that can execute code
 * - Unsafe use of serialization libraries
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe deserialization patterns
 * - Input validation and sanitization
 * - JSDoc annotations (@safe, @validated)
 * - Trusted deserialization libraries
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule,
  resolveModuleBinding,
  unwrapTypeSyntax,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'unsafeDeserialization'
  | 'dangerousEvalUsage'
  | 'unsafeYamlParsing'
  | 'dangerousFunctionConstructor'
  | 'useSafeDeserializer';

export interface Options extends SecurityRuleOptions {
  /** Dangerous deserialization functions to detect */
  dangerousFunctions?: string[];

  /** Functions that validate input before deserialization */
  validationFunctions?: string[];

  /**
   * js-yaml schema exports that make `load` inert. REPLACES the built-in list.
   * Default: DEFAULT_SAFE_YAML_SCHEMAS
   */
  safeYamlSchemas?: string[];

  /** Extra safe js-yaml schema exports, ON TOP of the built-ins. Default: [] */
  additionalSafeYamlSchemas?: string[];

  /**
   * Packages whose parse entry point cannot execute code or instantiate a type
   * the payload names. REPLACES the built-in list.
   * Default: DEFAULT_NON_EXECUTING_PACKAGES
   */
  nonExecutingPackages?: string[];

  /** Extra non-executing packages, ON TOP of the built-ins. Default: [] */
  additionalNonExecutingPackages?: string[];
}

type RuleOptions = [Options?];

/**
 * Timer functions that double as an implied-`eval` sink — but only when the
 * first argument is a string. `setTimeout(fn, 0)` is a scheduler, not a
 * deserializer.
 */
const TIMER_FUNCTIONS = new Set(['setTimeout', 'setInterval']);

/**
 * Package → the exports of it that execute or revive arbitrary code.
 *
 * Resolved through ESLint's scope analysis, NOT through the spelling of the
 * local binding. The name-based check this supplements asks whether the
 * receiver identifier is literally called `yaml` / `js-yaml` / `node-serialize`,
 * which is a test of how the author chose to name a variable:
 *
 *   import yaml   from 'js-yaml'; yaml.load(req.body.doc)     reported
 *   import jsyaml from 'js-yaml'; jsyaml.load(req.body.doc)   SILENT
 *   import { load } from 'js-yaml'; load(req.body.doc)        SILENT
 *
 * All three are the same sink. The second spelling is the UMD global the
 * package itself ships; the third is the form js-yaml's own v4 README uses.
 */
const MODULE_SINKS: Readonly<Record<string, ReadonlySet<string>>> = {
  // `safeLoad` binds the schema with no `!!js/function` tag — deliberately absent.
  'js-yaml': new Set(['load', 'loadAll']),
  'node-serialize': new Set(['unserialize']),
  // funcster exists to turn JSON back into live functions.
  funcster: new Set(['deserialize', 'deepDeserialize']),
  v8: new Set(['deserialize']),
};

/**
 * Packages whose parse entry point provably cannot execute code or instantiate
 * a type the payload names.
 *
 * `yaml` (eemeli/yaml) is a pure YAML 1.2 parser with no function tag — it is
 * NOT js-yaml, and the two are told apart only by resolving the import. Under
 * the receiver-name check `const YAML = require('yaml'); YAML.parse(text)` was
 * CWE-502 at CVSS 9.8 purely because the variable is spelled `YAML`.
 *
 * The argument is the one this file already makes for `JSON.parse`: a parser
 * that cannot execute its input is the REMEDIATION, not the finding.
 */
/**
 * Sinks with no safe input at all, so the provenance question does not arise.
 *
 * `node-serialize`'s `unserialize` and `funcster`'s deserializers exist to turn
 * data back into executable functions — that is their advertised feature, not a
 * misuse. There is no value you can pass them that is safe unless you already
 * control it as code, in which case you would not be deserializing it.
 *
 * `js-yaml`'s `load` is deliberately NOT here: loading a repo-local file with it
 * is ordinary and correct, so it stays gated on untrusted input.
 */
const ALWAYS_UNSAFE_MODULES: ReadonlySet<string> = new Set([
  'node-serialize',
  'funcster',
]);

/**
 * js-yaml schemas that define no JS-instantiating tag. Pinning one of these
 * makes `load` inert — it is what `safeLoad` did before v4 removed it.
 * `DEFAULT_SCHEMA` is deliberately absent from the DEFAULT: it is safe in v4
 * and was not in v3, and the rule cannot see which major is installed.
 *
 * That last sentence is the reason this is an option and not a constant. A
 * repository pinned to js-yaml v4 KNOWS which major is installed, and
 * `yaml.load(x, { schema: yaml.DEFAULT_SCHEMA })` is safe there — but the rule
 * cannot know it, so before the option the only remedy on that line was a
 * disable comment. Set `additionalSafeYamlSchemas: ['DEFAULT_SCHEMA']` on a
 * v4-pinned repo instead.
 */
const DEFAULT_SAFE_YAML_SCHEMAS = [
  'JSON_SCHEMA',
  'CORE_SCHEMA',
  'FAILSAFE_SCHEMA',
];

const DEFAULT_NON_EXECUTING_PACKAGES = [
  'yaml',
  'bson',
  'cbor',
  'msgpackr',
  '@msgpack/msgpack',
  'protobufjs',
];

/**
 * True when the expression can only evaluate to a string, i.e. the argument
 * would actually be compiled by `setTimeout` / `setInterval`. A function
 * reference, an arrow function, or anything else is never implied-eval.
 */
function isStringValued(arg: TSESTree.Node | undefined): boolean {
  if (!arg) return false;
  if (arg.type === 'Literal') return typeof arg.value === 'string';
  if (arg.type === 'TemplateLiteral') return true;
  if (arg.type === 'BinaryExpression' && arg.operator === '+') {
    return isStringValued(arg.left) || isStringValued(arg.right);
  }
  return false;
}

export const noUnsafeDeserialization = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-deserialization',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unsafe-deserialization.md',
      description: 'Detects unsafe deserialization of untrusted data',
      cwe: 'CWE-502',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      unsafeDeserialization: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Deserialization',
        cwe: 'CWE-502',
        description: 'Unsafe deserialization of untrusted data (incl. model/tool output)',
        severity: '{{severity}}',
        fix: '{{safeAlternative}} | validate model/tool output via schema and size limits',
        documentationLink: 'https://cwe.mitre.org/data/definitions/502.html',
      }),
      dangerousEvalUsage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous eval() Usage',
        cwe: 'CWE-502',
        description: 'eval() used for deserialization (code execution vulnerability)',
        severity: 'CRITICAL',
        fix: 'Use JSON.parse() or safe deserialization libraries',
        documentationLink: 'https://cwe.mitre.org/data/definitions/502.html',
      }),
      unsafeYamlParsing: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe YAML Parsing',
        cwe: 'CWE-502',
        description: 'YAML parsing may execute code during deserialization',
        severity: 'HIGH',
        fix: 'Use yaml.safeLoad() or disable code execution',
        documentationLink: 'https://www.npmjs.com/package/js-yaml#loadstr---options-',
      }),
      dangerousFunctionConstructor: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous Function Constructor',
        cwe: 'CWE-502',
        description: 'Function constructor used with untrusted data',
        severity: 'CRITICAL',
        fix: 'Avoid Function constructor with user input',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function',
      }),
      useSafeDeserializer: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Deserializer',
        description: 'Use safe deserialization libraries',
        severity: 'LOW',
        fix: 'Use JSON.parse, safe-json-parse, or validated libraries',
        documentationLink: 'https://www.npmjs.com/package/safe-json-parse',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          dangerousFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['eval', 'Function', 'setTimeout', 'setInterval', 'unserialize', 'deserialize', 'parseUnsafe'], description: 'Functions that execute or deserialize untrusted input'
          },
          validationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validateInput', 'sanitizeData', 'checkSchema', 'validateSchema'], description: 'Function names that count as input validation'
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as safe deserializers',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
          safeYamlSchemas: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SAFE_YAML_SCHEMAS,
            description:
              'js-yaml schema exports that make `load` inert, matched against a resolved js-yaml binding. Add DEFAULT_SCHEMA on a repository pinned to js-yaml v4. Replaces the built-in list.',
          },
          additionalSafeYamlSchemas: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra safe js-yaml schema exports, on top of `safeYamlSchemas`.',
          },
          nonExecutingPackages: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_NON_EXECUTING_PACKAGES,
            description:
              'Packages whose parse entry point cannot execute code or instantiate a payload-named type, matched against a resolved import binding. Replaces the built-in list.',
          },
          additionalNonExecutingPackages: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra non-executing packages, on top of `nonExecutingPackages`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      dangerousFunctions: ['eval', 'Function', 'setTimeout', 'setInterval', 'unserialize', 'deserialize', 'parseUnsafe'],
      validationFunctions: ['validateInput', 'sanitizeData', 'checkSchema', 'validateSchema'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
      safeYamlSchemas: DEFAULT_SAFE_YAML_SCHEMAS,
      additionalSafeYamlSchemas: [],
      nonExecutingPackages: DEFAULT_NON_EXECUTING_PACKAGES,
      additionalNonExecutingPackages: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      dangerousFunctions = ['eval', 'Function', 'setTimeout', 'setInterval', 'unserialize', 'deserialize', 'parseUnsafe'],
      validationFunctions = ['validateInput', 'sanitizeData', 'checkSchema', 'validateSchema'],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
      safeYamlSchemas = DEFAULT_SAFE_YAML_SCHEMAS,
      additionalSafeYamlSchemas = [],
      nonExecutingPackages = DEFAULT_NON_EXECUTING_PACKAGES,
      additionalNonExecutingPackages = [],
    }: Options = options;

    const safeSchemas = new Set([...safeYamlSchemas, ...additionalSafeYamlSchemas]);
    const inertPackages = new Set([
      ...nonExecutingPackages,
      ...additionalNonExecutingPackages,
    ]);

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    // Track variables that have been validated/sanitized
    const validatedVariables = new Set<string>();
    // Track variables that contain untrusted data
    const untrustedVariables = new Set<string>();
    // Variables read from a literal-string file path (e.g. fs.readFileSync('config.json')).
    // These are still "untrusted" for eval/Function but safe for JSON.parse and other
    // schema-validating parsers because the file content is statically bundled.
    const literalPathFileVars = new Set<string>();

    /**
     * Check if this is a dangerous deserialization function
     */
    /**
     * `yaml.load(text, { schema: yaml.JSON_SCHEMA })` — the loader constrained
     * to a schema with no `!!js/function`, `!!js/regexp` or `!!js/undefined`
     * tag.
     *
     * This is the remediation js-yaml's own v4 migration guide gives in place
     * of v3's `safeLoad`, and reporting it tells the user to fix code that is
     * already fixed. The schema is resolved back to the js-yaml export rather
     * than matched on the spelling of the property value.
     */
    const pinsSafeYamlSchema = (
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): boolean => {
      const optionsArg = node.arguments[1];
      if (optionsArg?.type !== 'ObjectExpression') return false;
      return optionsArg.properties.some((property) => {
        if (property.type !== 'Property' || property.computed) return false;
        if (property.key.type !== 'Identifier' || property.key.name !== 'schema') {
          return false;
        }
        const schema = resolveModuleBinding(
          property.value,
          sourceCode.getScope(property.value),
        );
        return (
          schema?.module === 'js-yaml' &&
          safeSchemas.has(schema.path.at(-1) ?? '')
        );
      });
    };

    const isDangerousDeserialization = (node: TSESTree.CallExpression | TSESTree.NewExpression): boolean => {
      const callee = node.callee;

      // Module identity first, because it is EVIDENCE where the checks below
      // are inference from a spelling. A resolved binding settles the question
      // in both directions: `js-yaml`'s `load` is a sink however the import was
      // named, and the `yaml` package's `parse` is not one however it was named.
      const binding = resolveModuleBinding(callee, sourceCode.getScope(callee));
      if (binding) {
        // `some` over the whole export path rather than only its last segment:
        // an empty path (the module root, `import serialize from 'x'; x(…)`)
        // then needs no separate undefined case, and `pkg.default.load` — the
        // interop shape a CJS/ESM bridge produces — resolves the same as
        // `pkg.load`.
        const sinks = MODULE_SINKS[binding.module];
        if (sinks && binding.path.some((segment) => sinks.has(segment))) {
          return !pinsSafeYamlSchema(node);
        }
        if (inertPackages.has(binding.module)) return false;
      }

      // Check for dangerous function calls
      if (callee.type === 'Identifier' && dangerousFunctions.includes(callee.name)) {
        // `setTimeout` / `setInterval` are only a code-execution sink in their
        // implied-eval form — when the FIRST argument is a *string* that the
        // engine compiles. `setTimeout(callback, 1000)` is the ordinary timer
        // form and is not deserialization of anything.
        //
        // Without this gate the rule reported
        // `await new Promise(resolve => setTimeout(resolve, 1000))` at CVSS
        // 9.8 CRITICAL, because `resolve` is an enclosing arrow-function
        // parameter and every parameter is treated as untrusted input.
        if (TIMER_FUNCTIONS.has(callee.name)) {
          return isStringValued(node.arguments[0]);
        }
        return true;
      }

      // Check for member expressions like yaml.load, serialize.unserialize
      if (callee.type === 'MemberExpression') {
        const memberName = callee.property.type === 'Identifier' ? callee.property.name : '';
        const objectName = callee.object.type === 'Identifier' ? callee.object.name : '';

        // `super.deserialize(context)` / `this.deserialize(context)` is a class
        // *implementing* a (de)serialization protocol and chaining to its own
        // base implementation — webpack's serialization layer does this in
        // every Dependency subclass. The argument is the framework's own
        // context object, not attacker-controlled data.
        if (callee.object.type === 'Super' || callee.object.type === 'ThisExpression') {
          return false;
        }

        // Same implied-eval reasoning as above for `window.setTimeout(...)`.
        if (TIMER_FUNCTIONS.has(memberName)) {
          return isStringValued(node.arguments[0]);
        }

        // Parsers that do not execute their input are never a CWE-502 sink.
        // `JSON.parse` is the REMEDIATION this rule's own message recommends,
        // and `yaml.safeLoad` is the safe variant by construction — but `parse`
        // and `load` both appear on the dangerous lists below, so without this
        // they would match by method name alone.
        if (
          (objectName === 'JSON' && memberName === 'parse') ||
          (objectName === 'yaml' && memberName === 'safeLoad')
        ) {
          return false;
        }

        // Check dangerous methods
        if (dangerousFunctions.includes(memberName)) {
          return true;
        }

        // Check dangerous libraries
        if (['yaml', 'js-yaml', 'node-serialize', 'serialize-javascript'].includes(objectName.toLowerCase()) &&
            ['load', 'parse', 'unserialize', 'deserialize'].includes(memberName)) {
          return true;
        }
      }

      // Check for require() calls with dangerous libraries
      if (callee.type === 'Identifier' && callee.name === 'require') {
        const args = node.arguments;
        if (args.length > 0 && args[0].type === 'Literal' && typeof args[0].value === 'string') {
          const moduleName = args[0].value.toLowerCase();
          if (['node-serialize', 'serialize-javascript', 'yaml', 'js-yaml'].includes(moduleName)) {
            return true;
          }
        }
      }

      return false;
    };

    /**
     * Check if input comes from untrusted source
     */
    const isUntrustedInput = (inputNode: TSESTree.Node): boolean => {
    // `x as string` reads exactly what `x` reads — the cast is erased at compile
    // time. Without this the walker falls through to its null/false default, and
    // Express types `req.query.q` as `string | string[] | ParsedQs | undefined`,
    // so a TypeScript handler MUST write the cast to compile. Every suite here
    // was written without one, which is why the gap survived review.
      const bare = unwrapTypeSyntax(inputNode);
      if (bare !== inputNode) return isUntrustedInput(bare);

      // Concatenations and template literals carry their operands' trust:
      // `setTimeout("alert(" + userCode + ")", 100)` is implied eval on
      // untrusted input even though the argument node itself is a
      // BinaryExpression rather than an Identifier.
      if (inputNode.type === 'BinaryExpression' && inputNode.operator === '+') {
        return isUntrustedInput(inputNode.left) || isUntrustedInput(inputNode.right);
      }
      if (inputNode.type === 'TemplateLiteral') {
        return inputNode.expressions.some((e: TSESTree.Expression) => isUntrustedInput(e));
      }

      // `eval(await res.text())` was silent while `eval(param)` reported —
      // the more obviously dangerous form was the one being missed, because
      // neither AwaitExpression nor CallExpression was ever unwrapped.
      if (inputNode.type === 'AwaitExpression') {
        return isUntrustedInput(inputNode.argument);
      }
      if (inputNode.type === 'CallExpression') {
        const callee = inputNode.callee;
        if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
          // Reading a response or a request body yields remote bytes.
          if (['text', 'json', 'arrayBuffer', 'formData', 'blob'].includes(callee.property.name)) {
            return true;
          }
          if (['readFile', 'readFileSync'].includes(callee.property.name)) {
            return true;
          }
          // A method call carries its RECEIVER's provenance.
          //
          //   serialize.unserialize(Buffer.from(req.cookies.session, 'base64').toString())
          //
          // is the node-serialize RCE exactly as CVE-2017-5941 was written, and
          // it was silent: the walker recursed into a call's ARGUMENTS but
          // never into the object it was called on, so `.toString()` — and
          // equally `.trim()`, `.replace()`, `.split()`, every string method a
          // handler puts between the request and the sink — erased the taint.
          if (isUntrustedInput(callee.object)) {
            return true;
          }
        }
        return inputNode.arguments.some(
          (arg) => arg.type !== 'SpreadElement' && isUntrustedInput(arg),
        );
      }

      // Check for MemberExpression patterns like req.body, req.query, etc.
      if (inputNode.type === 'MemberExpression') {
        if (inputNode.object.type === 'Identifier' && inputNode.object.name === 'req') {
          return true;
        }
        if (inputNode.object.type === 'MemberExpression' &&
            inputNode.object.object.type === 'Identifier' &&
            inputNode.object.object.name === 'req') {
          return true;
        }
      }

      if (inputNode.type === 'Identifier') {
        // Check if this variable has been marked as untrusted
        if (untrustedVariables.has(inputNode.name)) {
          return true;
        }

        // Only consider variables untrusted if they actually come from req.* patterns
        // Don't flag generic variable names like 'input', 'data', etc.
        // unless they have been explicitly marked as untrusted

        // Check if it comes from function parameters (these are potentially untrusted)
        let current: TSESTree.Node | undefined = inputNode;
        while (current) {
          if (current.type === 'FunctionDeclaration' ||
              current.type === 'FunctionExpression' ||
              current.type === 'ArrowFunctionExpression') {
            const func = current as TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
            if (func.params.some((param: TSESTree.Parameter) => {
              if (param.type === 'Identifier') {
                return param.name === inputNode.name;
              }
              return false;
            })) {
              return true; // Function parameters are untrusted
            }
          }
          current = current.parent as TSESTree.Node;
        }
      }

      return false;
    };


    /**
     * True when the call sits inside a function that is itself named
     * `deserialize` / `unserialize` / `fromJSON` — i.e. the file is
     * *implementing* a (de)serialization protocol and delegating to the next
     * layer of it, which is what webpack's whole `lib/serialization` tree and
     * every `static deserialize(context)` factory does:
     *
     *   static deserialize(context) {
     *     const obj = new CssModule({ ... });
     *     obj.deserialize(context);   // ← not attacker-controlled
     *     return obj;
     *   }
     *
     * A rule that cannot see the protocol cannot judge it, and 33 of 35 corpus
     * findings were exactly this shape.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isInsideDeserializerImplementation = (node: TSESTree.Node): boolean => {
      const DESERIALIZER_NAMES = new Set(['deserialize', 'unserialize', 'fromJSON', 'fromBuffer']);
      let current: TSESTree.Node | undefined = node.parent as TSESTree.Node | undefined;
      while (current) {
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          const fn = current as TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
          if ('id' in fn && fn.id?.name && DESERIALIZER_NAMES.has(fn.id.name)) return true;
          const owner = fn.parent as TSESTree.Node | undefined;
          if (owner?.type === 'MethodDefinition' && owner.key.type === 'Identifier' &&
              DESERIALIZER_NAMES.has(owner.key.name)) return true;
          if (owner?.type === 'Property' && owner.key.type === 'Identifier' &&
              DESERIALIZER_NAMES.has(owner.key.name)) return true;
          if (owner?.type === 'VariableDeclarator' && owner.id.type === 'Identifier' &&
              DESERIALIZER_NAMES.has(owner.id.name)) return true;
        }
        current = current.parent as TSESTree.Node | undefined;
      }
      return false;
    };

    /**
     * A sink from {@link ALWAYS_UNSAFE_MODULES}, reached through a resolved
     * import. These report without the untrusted-input gate — see that
     * constant for why the provenance question does not arise for them.
     */
    const isAlwaysUnsafeSink = (
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): boolean => {
      const binding = resolveModuleBinding(
        node.callee,
        sourceCode.getScope(node.callee),
      );
      return binding !== undefined && ALWAYS_UNSAFE_MODULES.has(binding.module);
    };

    const checkCallExpression = (node: TSESTree.CallExpression | TSESTree.NewExpression) => {
      // 1. Check Function Constructor (NewExpression or CallExpression)
      if ((node.type === 'NewExpression' || node.type === 'CallExpression') &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Function') {

          const args: TSESTree.CallExpressionArgument[] = node.arguments;
          const hasUntrustedInput = args.some((arg): boolean => isUntrustedInput(arg));

          if (hasUntrustedInput) {
             if (safetyChecker.isSafe(node, context)) return;
             
             context.report({
               node,
               messageId: 'dangerousFunctionConstructor',
               data: {
                  filePath: context.filename,
                  line: String(node.loc?.start.line ?? 0),
                  severity: 'HIGH',
                  safeAlternative: 'Avoid dynamic function creation',
               }
             });
             return;
          }
      }


      // 2. Check CallExpressions (eval, unserialize, yaml, etc.)
      if (isDangerousDeserialization(node) && !isInsideDeserializerImplementation(node)) {
         const args: TSESTree.CallExpressionArgument[] = node.arguments;
         const hasUntrustedInput =
           args.some((arg): boolean => isUntrustedInput(arg)) ||
           isAlwaysUnsafeSink(node);

         if (hasUntrustedInput) {
            // Basic safety check
            const safe = safetyChecker.isSafe(node, context);
            
            if (!safe) {
               // Determine message ID
               let messageId: MessageIds = 'unsafeDeserialization';
               // Check specifically for YAML
               const calleeText = sourceCode.getText(node.callee);
               if (calleeText.includes('yaml') || calleeText.includes('YAML')) {
                  messageId = 'unsafeYamlParsing';
               }

               // Check for generic dangerous functions
               if (node.callee.type === 'Identifier' && ['eval', 'setTimeout', 'setInterval'].includes(node.callee.name)) {
                  messageId = 'dangerousEvalUsage';
               }

               context.report({
                 node,
                 messageId,
                 data: {
                    library: calleeText,
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                    severity: 'HIGH',
                    safeAlternative: 'Use JSON.parse() or validated safe deserialization libraries',
                 },
                 suggest: messageId === 'dangerousEvalUsage' ? [{
                    messageId: 'useSafeDeserializer' as const,
                    fix: (fixer: TSESLint.RuleFixer) => {
                       return fixer.replaceText(node, `JSON.parse(${sourceCode.getText(node.arguments[0])})`);
                    }
                 }] : undefined
               });


            }
         }
      }   


        // A SAFE deserializer receiving untrusted input is not a finding.
        //
        // This branch used to report `JSON.parse(x)` whenever `x` looked
        // untrusted, under the comment "Even JSON.parse can be unsafe if used
        // on complex objects that get eval'd later". That is speculation about
        // a different sink: if something later evals the result, the eval is
        // the finding, and `dangerousEvalUsage` reports it.
        //
        // JSON.parse cannot instantiate objects, invoke constructors or
        // execute code — it is the REMEDIATION this rule's own message text
        // recommends ("Use JSON.parse() or safe deserialization libraries").
        // Reporting it as CWE-502 at CVSS 9.8 told people to replace the fix
        // with itself. It was 31 of this rule's 33 corpus findings, every one
        // of them a false positive, most on plain `parseJSON(jsonString)`
        // utilities.
        //
        // The same argument covered the rest of what used to be the
        // `safeLibraries` option — yaml.safeLoad, protobuf, msgpack — which
        // were on that list precisely because they do not execute their input.
        // That option has been removed: `create()` never read it, so a
        // consumer registering their own non-executing parser changed nothing.
        // The safe set is the hard-coded exclusion here, and `dangerousFunctions`
        // is the option that actually moves the sink set.
    };

    return {
      // Track variable assignments from untrusted sources
      VariableDeclaration(node: TSESTree.VariableDeclaration) {
        for (const declarator of node.declarations) {
          if (declarator.id.type === 'Identifier' && declarator.init) {
            // Check if the initializer comes from an untrusted source
            if (isUntrustedInput(declarator.init)) {
              untrustedVariables.add(declarator.id.name);
            }

            // Check if it's assigned from fs operations or other untrusted sources
            if (declarator.init.type === 'CallExpression') {
              const callee = declarator.init.callee;
              if (callee.type === 'MemberExpression' &&
                  callee.object.type === 'Identifier' &&
                  callee.object.name === 'fs' &&
                  callee.property.type === 'Identifier' &&
                  ['readFile', 'readFileSync'].includes(callee.property.name)) {
                untrustedVariables.add(declarator.id.name);
                // Track whether the path is a literal — used downstream to skip
                // safe deserializers (JSON.parse) on known-static files.
                const pathArg = declarator.init.arguments[0];
                if (pathArg?.type === 'Literal' && typeof pathArg.value === 'string') {
                  literalPathFileVars.add(declarator.id.name);
                }
              }
            }
          }
        }
      },

      // Track assignment expressions
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type === 'Identifier' && isUntrustedInput(node.right)) {
          untrustedVariables.add(node.left.name);
        }
      },

      // Check dangerous function calls
      CallExpression(node: TSESTree.CallExpression) {
        checkCallExpression(node);
      },
      NewExpression(node: TSESTree.NewExpression) {
        checkCallExpression(node);
      },

      // Check for dangerous require/import patterns
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init) {
          return;
        }

        // Track variables assigned from validation functions
        if (node.id.type === 'Identifier' &&
            node.init.type === 'CallExpression' &&
            node.init.callee.type === 'Identifier' &&
            (validationFunctions.includes(node.init.callee.name) || trustedSanitizers.includes(node.init.callee.name))) {
          validatedVariables.add(node.id.name);
        }

        // A second reporting path for `require`d libraries used to live here.
        //
        // It walked the declared variable's references and reported any
        // `.unserialize` / `.deserialize` / `.load` / `.parse` call on it,
        // WITHOUT asking whether the argument was untrusted, and at CRITICAL.
        // Two defects followed, both reproduced on the corpus:
        //
        //   const serialize = require('node-serialize');
        //   serialize.unserialize(req.cookies.session);   // reported TWICE,
        //   // once here and once from checkCallExpression, at the same range —
        //   // one defect, two findings, two suppression comments to write.
        //
        //   const YAML = require('yaml');
        //   const cfg = YAML.parse(readFileSync('./defaults.yaml', 'utf8'));
        //   // reported at CRITICAL with no untrusted input anywhere: a pure
        //   // YAML 1.2 parser, on a file that ships inside the bundle.
        //
        // Everything it caught that was real is caught by `checkCallExpression`
        // via MODULE_SINKS, which resolves the same `require` through scope
        // analysis and additionally requires untrusted input to reach the sink.
      }
    };
  },
});
