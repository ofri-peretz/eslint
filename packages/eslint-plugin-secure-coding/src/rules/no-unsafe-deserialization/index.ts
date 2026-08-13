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
import { createRule } from '@interlace/eslint-devkit';
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
  | 'useSafeDeserializer'
  | 'validateBeforeDeserialization'
  | 'avoidEval'
  | 'strategySafeLibraries'
  | 'strategyInputValidation'
  | 'strategySandboxing';

export interface Options extends SecurityRuleOptions {
  /** Dangerous deserialization functions to detect */
  dangerousFunctions?: string[];

  /** Safe deserialization libraries */
  safeLibraries?: string[];

  /** Functions that validate input before deserialization */
  validationFunctions?: string[];
}

type RuleOptions = [Options?];

/**
 * Timer functions that double as an implied-`eval` sink — but only when the
 * first argument is a string. `setTimeout(fn, 0)` is a scheduler, not a
 * deserializer.
 */
const TIMER_FUNCTIONS = new Set(['setTimeout', 'setInterval']);

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
      validateBeforeDeserialization: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Before Deserialization',
        description: 'Validate input before deserialization',
        severity: 'LOW',
        fix: 'Implement input validation and length limits',
        documentationLink: 'https://cwe.mitre.org/data/definitions/502.html',
      }),
      avoidEval: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Avoid eval()',
        description: 'Never use eval() for deserialization',
        severity: 'LOW',
        fix: 'Use JSON.parse() for data, vm.Script for code when absolutely necessary',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval',
      }),
      strategySafeLibraries: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Safe Libraries Strategy',
        description: 'Use deserialization libraries with built-in safety',
        severity: 'LOW',
        fix: 'Use JSON.parse, js-yaml.safeLoad, or protobuf libraries',
        documentationLink: 'https://www.npmjs.com/package/js-yaml',
      }),
      strategyInputValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Validation Strategy',
        description: 'Validate input before any deserialization',
        severity: 'LOW',
        fix: 'Implement schema validation and length limits',
        documentationLink: 'https://cwe.mitre.org/data/definitions/502.html',
      }),
      strategySandboxing: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Sandboxing Strategy',
        description: 'Execute deserialization in sandboxed environment',
        severity: 'LOW',
        fix: 'Use vm module or worker threads for untrusted deserialization',
        documentationLink: 'https://nodejs.org/api/vm.html',
      })
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
          safeLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['JSON', 'safe-json-parse', 'js-yaml.safeLoad', 'protobuf', 'msgpack'], description: 'Parsers that do not execute their input'
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
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      dangerousFunctions: ['eval', 'Function', 'setTimeout', 'setInterval', 'unserialize', 'deserialize', 'parseUnsafe'],
      safeLibraries: ['JSON', 'safe-json-parse', 'js-yaml.safeLoad', 'protobuf', 'msgpack'],
      validationFunctions: ['validateInput', 'sanitizeData', 'checkSchema', 'validateSchema'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
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
    }: Options = options;

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
    const isDangerousDeserialization = (node: TSESTree.CallExpression | TSESTree.NewExpression): boolean => {
      const callee = node.callee;

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
         const hasUntrustedInput = args.some((arg): boolean => isUntrustedInput(arg));

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
        // The same argument covers the rest of `safeLibraries`: yaml.safeLoad,
        // protobuf and msgpack are on that list precisely because they do not
        // execute their input.
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

        // Check for require/import of dangerous libraries
        if (node.init.type === 'CallExpression' &&
            node.init.callee.type === 'Identifier' &&
            node.init.callee.name === 'require') {

          const requireArg = node.init.arguments[0];
          if (requireArg?.type === 'Literal' && typeof requireArg.value === 'string') {
            const moduleName = requireArg.value;

            if (['node-serialize', 'serialize-javascript', 'js-yaml', 'yaml'].includes(moduleName)) {
              // Check if this variable is used unsafely later
              if (node.id.type === 'Identifier') {
                // Look ahead to see if this library is used dangerously
                // This is a simplified check - in practice, we'd need more sophisticated analysis
                  const variables = sourceCode.getDeclaredVariables(node);
                  for (const variable of variables) {
                    for (const reference of variable.references) {
                      const refNode = reference.identifier;
                      
                      // Check if reference is part of a call to dangerous method
                      // e.g. serialize.unserialize()
                      if (refNode.parent && refNode.parent.type === 'MemberExpression' &&
                          refNode.parent.object === refNode) {
                        const memberExpr = refNode.parent;
                        const propertyName = memberExpr.property.type === 'Identifier' ? memberExpr.property.name : '';
                        
                        if (['unserialize', 'deserialize', 'load', 'parse'].includes(propertyName)) {
                          const callExpr = memberExpr.parent;
                          if (callExpr && callExpr.type === 'CallExpression' && callExpr.callee === memberExpr) {
                            
                            // FALSE POSITIVE REDUCTION
                            if (safetyChecker.isSafe(callExpr, context)) {
                              continue;
                            }

                            context.report({
                              node: callExpr,
                              messageId: 'unsafeDeserialization',
                              data: {
                                filePath: filename,
                                line: String(callExpr.loc?.start.line ?? 0),
                                severity: 'CRITICAL',
                                safeAlternative: 'Avoid using this library or use safe alternatives',
                              },
                            });
                          }
                        }
                      }
                    }
                }
              }
            }
          }
        }
      }
    };
  },
});
