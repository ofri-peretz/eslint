/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unlimited-resource-allocation
 * Detects unlimited resource allocation vulnerabilities (CWE-770)
 *
 * Unlimited resource allocation can cause denial of service by exhausting
 * system resources like memory, file handles, or network connections.
 * This rule detects patterns where resources are allocated without limits.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe resource allocation patterns
 * - Proper resource limits
 * - JSDoc annotations (@limited-resource, @safe-allocation)
 * - Resource cleanup patterns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, isStaticExpression } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'unlimitedBufferAllocation'
  | 'unlimitedFileOperations'
  | 'unlimitedMemoryAllocation'
  | 'userControlledResourceSize'
  | 'resourceAllocationInLoop';

export interface Options extends SecurityRuleOptions {
  /** Maximum allowed resource size for static analysis */
  maxResourceSize?: number;

  /** Variables that contain user input */
  userInputVariables?: string[];

  /** Safe resource allocation functions */
  safeResourceFunctions?: string[];

  /** Require resource validation */
  requireResourceValidation?: boolean;
}

type RuleOptions = [Options?];

export const noUnlimitedResourceAllocation = createRule<RuleOptions, MessageIds>({
  name: 'no-unlimited-resource-allocation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unlimited-resource-allocation.md',
      description: 'Detects unlimited resource allocation that could cause DoS',
      cwe: 'CWE-770',
    },
    messages: {
      unlimitedBufferAllocation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Buffer Allocation',
        cwe: 'CWE-770',
        description: 'Buffer allocated without size limits',
        severity: 'HIGH',
        fix: 'Set maximum buffer size limits — Not a finding if the size is a constant, or already clamped before this line',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      unlimitedFileOperations: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited File Operations',
        cwe: 'CWE-770',
        description: 'File operations without size limits',
        severity: 'MEDIUM',
        fix: 'Validate file size before operations — Not a finding if the decompressed bytes are counted against a ceiling downstream',
        documentationLink: 'https://nodejs.org/api/fs.html',
      }),
      unlimitedMemoryAllocation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Memory Allocation',
        cwe: 'CWE-770',
        description: 'Memory allocated without limits',
        severity: 'MEDIUM',
        fix: 'Set memory allocation limits — Not a finding if the length comes from data the process already holds',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      userControlledResourceSize: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Resource Size',
        cwe: 'CWE-770',
        description: 'Resource size controlled by user input',
        severity: 'HIGH',
        fix: 'Validate and limit user-controlled resource sizes — Not a finding if the value is content rather than a byte count',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      resourceAllocationInLoop: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Resource Allocation in Loop',
        cwe: 'CWE-770',
        description: 'Resource allocation inside loop without limits',
        severity: 'HIGH',
        fix: 'Move resource allocation outside loop or add iteration limits — Not a finding if the loop bound is a constant or a collection the process already holds',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxResourceSize: {
            type: 'number',
            minimum: 1024,
            default: 1048576, // 1MB
            description: 'Allocation size in bytes above which a call is reported',
          },
          userInputVariables: {
            type: 'array',
            items: { type: 'string' },
            default: ['req', 'request', 'body', 'query', 'params', 'input', 'data'], description: 'Variable names treated as user-controlled input'
          },
          safeResourceFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validateSize', 'checkLimits', 'limitResource', 'safeAlloc'], description: 'Function names that bound an allocation'
          },
          requireResourceValidation: {
            type: 'boolean',
            default: true, description: 'Require an explicit size check before allocating'
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as resource validators',
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
  // §B1 — a fixture's oversized `Buffer.alloc` is the fixture's point, and a
  // test's `for (const c of req.body.items)` is a stub, not a handler. Set on
  // the rule so it holds regardless of how a consumer configures the harness.
  skipTestFiles: true,
  defaultOptions: [
    {
      maxResourceSize: 1048576, // 1MB
      userInputVariables: ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
      safeResourceFunctions: ['validateSize', 'checkLimits', 'limitResource', 'safeAlloc'],
      requireResourceValidation: true,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      maxResourceSize = 1048576,
      userInputVariables = ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
      safeResourceFunctions = ['validateSize', 'checkLimits', 'limitResource', 'safeAlloc'],
      requireResourceValidation = true,
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

    /**
     * Does this expression carry a value the INVOKER supplies?
     *
     * What this replaces was one line —
     *
     *     const exprText = sourceCode.getText(expression);
     *     return patterns.some(pattern => exprText.includes(pattern));
     *
     * — substring matching over printed source against
     * `['req','request','body','query','params','input','data']`. On the
     * 20-repo corpus it failed in BOTH directions at once:
     *
     *   FP  fs.readFileSync(path.join(Database.dataDir, 'db-config.json'))
     *         'data' inside 'dataDir'
     *         uptime-kuma server/database.js:208
     *   FP  databaseOptions.ssl.ca = fs.readFileSync(queryParams.ca)
     *         'query' inside 'queryParams' — which holds the parsed POSTGRES
     *         CONNECTION URI, supplied by the operator's own configuration
     *         parse-server src/Adapters/Storage/Postgres/PostgresConfigParser.js:30
     *   FP  fs.writeFileSync(entryMetadataPath, JSON.stringify(data.metadata))
     *         'data' inside 'Metadata'
     *         strapi packages/core/data-transfer/.../destination/index.ts:175
     *   FP  fs.readFileSync(path.resolve(cwd, inputFile))
     *         'input' inside 'inputFile'
     *         mongoose scripts/website.js:512
     *
     *   FN  const size = Number(url.searchParams.get('size'));
     *       const buf = Buffer.alloc(size);
     *         'size' contains none of the seven patterns, so the rule did not
     *         report benchmarks/corpus/CWE-770/vulnerable/buffer-alloc-user.js
     *         — ITS OWN FIXTURE. Measured 2026-08-18: the rule detected 0 of
     *         the 2 vulnerable CWE-770 fixtures it was written against while
     *         emitting 173 findings across the corpus.
     *
     * The replacement asks where the value CAME FROM, on the AST. A root the
     * invoker owns, proven by a member access naming a request surface, and
     * propagated through local `const`/`let` initializers so a value that has
     * been through `Number(...)` or `new URL(...)` is still recognised.
     *
     * Deliberately the same shape as `node-security/detect-non-literal-fs-filename`:
     * a value is either invoker-supplied or it is not, and two rules in one
     * ecosystem must not answer that question differently.
     */
    /**
     * @protocol-constant These are framework API surfaces, not a tunable
     * vocabulary: `body`, `query`, `params`, `headers` and `cookies` are
     * Express and Koa's own property names, `url`/`originalUrl`/`rawBody`/
     * `files`/`payload` are the request objects of Node's http, Koa, Fastify
     * and hapi, and `searchParams` is WHATWG `URL`. A framework either has
     * them or is not the framework. Making the set editable would let a
     * consumer delete `body` and silence CWE-770 on
     * `Buffer.alloc(req.body.size)` — the canonical finding this rule exists
     * for — while the rule went on reporting elsewhere and looked healthy.
     * The tunable half of the question is the ROOT, which is
     * `userInputVariables`, and taint reaches any local the root flows into.
     *
     * `node-security/detect-non-literal-fs-filename` holds the same set for
     * the same reason. Two rules in one ecosystem must not disagree about
     * what a request looks like.
     */
    const REQUEST_SURFACE: ReadonlySet<string> = new Set([
      'body', 'query', 'params', 'headers', 'cookies',
      'url', 'originalUrl', 'rawBody', 'files', 'payload', 'searchParams',
    ]);

    /**
     * `userInputVariables` names the ROOTS, matched whole and case-insensitively.
     * `dataDir` is not `data`, and `queryParams` is not `query`.
     */
    const requestRoots = new Set(userInputVariables.map((name) => name.toLowerCase()));

    const readsRequestSurface = (node: TSESTree.Node | undefined): boolean =>
      node?.type === AST_NODE_TYPES.MemberExpression &&
      !node.computed &&
      node.property.type === AST_NODE_TYPES.Identifier &&
      REQUEST_SURFACE.has(node.property.name);

    /**
     * The initializer of a local binding, or `undefined`.
     *
     * A PARAMETER deliberately returns `undefined`. A function that takes
     * `data` or `input` proves nothing about its callers — that assumption is
     * what reported mongoose's `website.js` build script and uptime-kuma's
     * base64 encoder. Propagation starts at a binding this file can actually
     * see the value of.
     */
    const initializerOf = (id: TSESTree.Identifier): TSESTree.Expression | undefined => {
      const resolved = context.sourceCode
        .getScope(id)
        .references.find((ref) => ref.identifier === id)?.resolved;
      const def = resolved?.defs[0];
      if (def?.type !== 'Variable') return undefined;
      return def.node.init ?? undefined;
    };

    /**
     * @param depth Guards against a binding cycle (`var a = b; var b = a;`) and
     * caps the walk.
     *
     * Twelve, not six. The budget is spent by AST depth rather than by hops
     * between bindings, and a single ordinary expression eats most of six:
     *
     *   const url  = new URL(req.url, 'http://localhost');
     *   const size = Number(url.searchParams.get('size'));
     *   Buffer.alloc(size)
     *
     * costs 7 — Identifier, Call, Call, Member, Member, Identifier, New — and
     * at a cap of six the rule missed `benchmarks/corpus/CWE-770/vulnerable/
     * buffer-alloc-user.js` by one level while reporting the same shape
     * written on one line.
     */
    const isInvokerControlled = (node: TSESTree.Node, depth = 0): boolean => {
      if (depth > 12) return false;
      switch (node.type) {
        case AST_NODE_TYPES.Identifier: {
          if (
            requestRoots.has(node.name.toLowerCase()) &&
            readsRequestSurface((node as TSESTree.Node & { parent?: TSESTree.Node }).parent)
          ) {
            return true;
          }
          const init = initializerOf(node);
          return init !== undefined && isInvokerControlled(init, depth + 1);
        }
        case AST_NODE_TYPES.MemberExpression:
          // `process` is deliberately NOT a root here, and that is the same
          // answer `node-security/detect-non-literal-fs-filename` gives.
          //
          // `process.env` and `process.argv` are chosen by whoever started the
          // process — already trusted with it. Treating them as hostile input
          // reported a CLI writing its own pidfile and a build script reading
          // the path it was handed:
          //
          //   fs.writeFileSync(pidFile, process.pid.toString())
          //                                    pm2 lib/ProcessContainer.js:70
          //   fs.readFileSync(path.join(process.env.PM2_HOME, 'agent.json5'))
          //                                    pm2 lib/API/Serve.js:216
          //   fs.readFileSync(file, 'utf8')   // file <- process.argv
          //                             webpack tooling/decode-debug-hash.js:7
          //
          // For CWE-770 the argument is airtight: an operator who can set
          // `MAX_HEAP` can equally just not start the process. There is no
          // denial of service in obeying them.
          return (
            isInvokerControlled(node.object, depth + 1) ||
            (node.computed && isInvokerControlled(node.property, depth + 1))
          );
        case AST_NODE_TYPES.CallExpression:
        case AST_NODE_TYPES.NewExpression:
          return (
            isInvokerControlled(node.callee, depth + 1) ||
            node.arguments.some(
              (argument) =>
                argument.type !== AST_NODE_TYPES.SpreadElement &&
                isInvokerControlled(argument, depth + 1),
            )
          );
        case AST_NODE_TYPES.BinaryExpression:
        case AST_NODE_TYPES.LogicalExpression:
          return (
            isInvokerControlled(node.left as TSESTree.Node, depth + 1) ||
            isInvokerControlled(node.right, depth + 1)
          );
        case AST_NODE_TYPES.ConditionalExpression:
          return (
            isInvokerControlled(node.consequent, depth + 1) ||
            isInvokerControlled(node.alternate, depth + 1)
          );
        case AST_NODE_TYPES.TemplateLiteral:
          return node.expressions.some((e) => isInvokerControlled(e, depth + 1));
        case AST_NODE_TYPES.AwaitExpression:
        case AST_NODE_TYPES.UnaryExpression:
          return isInvokerControlled(node.argument, depth + 1);
        case AST_NODE_TYPES.TSAsExpression:
        case AST_NODE_TYPES.TSNonNullExpression:
          return isInvokerControlled(node.expression, depth + 1);
        default:
          return false;
      }
    };

    const isUserInput = (expression: TSESTree.Expression): boolean =>
      isInvokerControlled(expression);

    /**
     * Could this argument be a SIZE?
     *
     * `Buffer.alloc(x)` and `new Array(x)` always read `x` as a length. The
     * deprecated `new Buffer(x)` does not — it is overloaded, and only a
     * NUMBER makes it reserve `x` bytes. Given a string, array or Buffer it
     * copies, allocating exactly what the caller already holds.
     *
     * The rule ignored that and reported uptime-kuma's base64 encoder:
     *
     *   let dataBase64 = Buffer.isBuffer(data)
     *     ? data.toString('base64')
     *     : new Buffer(data).toString('base64');
     *       uptime-kuma server/image-data-uri.js:45
     *
     * — where the ternary guarding the call is itself the proof that `data` is
     * not a number. A conversion is not an allocation the invoker can size.
     */
    const couldBeASize = (node: TSESTree.Node): boolean => {
      switch (node.type) {
        case AST_NODE_TYPES.Literal:
          return typeof node.value === 'number';
        case AST_NODE_TYPES.BinaryExpression:
          return ['+', '-', '*', '/', '%', '**', '<<', '>>'].includes(node.operator);
        case AST_NODE_TYPES.UnaryExpression:
          return node.operator === '+' || node.operator === '-' || node.operator === '~';
        case AST_NODE_TYPES.CallExpression: {
          const callee = node.callee;
          if (callee.type === AST_NODE_TYPES.Identifier) {
            return ['Number', 'parseInt', 'parseFloat', 'BigInt'].includes(callee.name);
          }
          return (
            callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.object.type === AST_NODE_TYPES.Identifier &&
            callee.object.name === 'Math'
          );
        }
        case AST_NODE_TYPES.MemberExpression:
          return (
            !node.computed &&
            node.property.type === AST_NODE_TYPES.Identifier &&
            ['length', 'size', 'byteLength', 'count'].includes(node.property.name)
          );
        case AST_NODE_TYPES.Identifier: {
          const init = initializerOf(node);
          // A binding this file cannot see the value of is left ALONE rather
          // than assumed numeric: `new Buffer(param)` is a conversion far more
          // often than it is an allocation.
          return init !== undefined && couldBeASize(init);
        }
        case AST_NODE_TYPES.LogicalExpression:
          return couldBeASize(node.left as TSESTree.Node) || couldBeASize(node.right);
        case AST_NODE_TYPES.ConditionalExpression:
          return couldBeASize(node.consequent) || couldBeASize(node.alternate);
        case AST_NODE_TYPES.TSAsExpression:
        case AST_NODE_TYPES.TSNonNullExpression:
          return couldBeASize(node.expression);
        default:
          return false;
      }
    };


    /**
     * Check if resource allocation has size validation
     */
    // All call sites invoke this only after already confirming `args.length > 0`,
    // so the "no arguments" case is unreachable and intentionally not handled here.
    const hasSizeValidation = (node: TSESTree.CallExpression | TSESTree.NewExpression): boolean => {
      const args = node.arguments;

      // Check if size argument is a validated expression
      const sizeArg = args[0];

      // The clamp is almost never written AT the allocation. It is written one
      // line above it:
      //
      //   const size = Math.min(Math.max(requested, 0), MAX_BYTES);
      //   const buf = Buffer.alloc(size);
      //
      // — benchmarks/corpus/CWE-770/safe/buffer-alloc-clamped.js, the fixture
      // that exists to say this MUST NOT be reported. Reading only the text of
      // `sizeArg` sees the four characters `size` and no clamp at all, so once
      // taint began propagating through initializers the safe fixture started
      // reporting. The validation has to follow the binding the taint follows.
      //
      // No `?? sizeArg` fallback on the lookup: every caller reaches here
      // through `isUserInput(sizeArg) && !hasSizeValidation(node)`, and an
      // Identifier is invoker-controlled ONLY through its initializer — a bare
      // root cannot qualify, because the evidence a root needs is a
      // request-surface member access, which would make `sizeArg` the member
      // expression instead. So the binding always resolves here, and a
      // fallback would be a branch no test could enter.
      const sizeText =
        sizeArg.type === AST_NODE_TYPES.Identifier
          ? `${sourceCode.getText(sizeArg)} ${sourceCode.getText(initializerOf(sizeArg)!)}`
          : sourceCode.getText(sizeArg);

      // Look for validation patterns
      return sizeText.includes('Math.min(') ||
             sizeText.includes('Math.max(') ||
             sizeText.includes('Math.clamp(') ||
             safeResourceFunctions.some(func => sizeText.includes(func));
    };

    /**
     * Estimate resource size from static analysis
     */
    const estimateResourceSize = (sizeExpression: TSESTree.Expression): number | null => {
      if (sizeExpression.type === 'Literal' && typeof sizeExpression.value === 'number') {
        return sizeExpression.value;
      }

      // Handle binary expressions like 1024 * 1024 * 100
      if (sizeExpression.type === 'BinaryExpression') {
        const left = estimateResourceSize(sizeExpression.left as TSESTree.Expression);
        const right = estimateResourceSize(sizeExpression.right as TSESTree.Expression);

        if (left !== null && right !== null) {
          switch (sizeExpression.operator) {
            case '*':
              return left * right;
            case '+':
              return left + right;
            case '-':
              return left - right;
            case '/':
              return right !== 0 ? left / right : null;
            default:
              return null;
          }
        }
      }

      return null;
    };

    /**
     * Local names bound to a decompression module. Populated from imports and
     * requires so an aliased binding (`const unzip = require('unzipper')`)
     * resolves, while an unrelated identifier that merely reads like one does
     * not.
     */
    const ARCHIVE_MODULES = /^(unzipper|tar|tar-stream|yauzl|adm-zip|node:zlib|zlib)$/;
    const archiveBindings = new Set<string>(['zlib']);

    const noteArchiveBinding = (local: string, source: string): void => {
      if (ARCHIVE_MODULES.test(source)) archiveBindings.add(local);
    };



    /**
     * A call that actually allocates, sized by something non-constant, inside a
     * loop BODY.
     *
     * Three separate requirements, each of which the old substring heuristic
     * lacked:
     *
     * 1. The callee is an allocation, matched exactly — not text that contains
     *    'Array'. `Buffer.byteLength` and `Array.isArray` are not allocations.
     * 2. There is a size argument and it is not a numeric literal. A zero-arg
     *    `new Set()` allocates a constant, and `Buffer.alloc(512)` is bounded.
     * 3. It is in the loop's BODY, not its init. `for (var e = Array(t), u = 0; …)`
     *    runs once, however dynamic `t` is.
     *
     * @protocol-constant Every entry is a built-in global: the ECMAScript
     * collection constructors (`Array`, `Map`, `Set`, `WeakMap`, `WeakSet`) and
     * Node's `Buffer` allocation API (`Buffer.alloc`, `Buffer.allocUnsafe`,
     * `Buffer.allocUnsafeSlow`, and `Buffer` itself). Those are the only calls
     * in the language that take a size argument and reserve memory for it, so
     * the set is closed by the platform rather than curated from a domain — a
     * consumer's own allocator is a wrapper around one of these, and the
     * wrapped call is where the loop bound is missing. Making it editable would
     * let a consumer delete `Buffer.allocUnsafe` and silence CWE-770 on exactly
     * the unbounded per-iteration allocation the rule exists to find, or add an
     * ordinary factory and report every `new Thing(n)` inside a loop.
     */
    const ALLOCATORS: ReadonlySet<string> = new Set([
      'Buffer.alloc', 'Buffer.allocUnsafe', 'Buffer.allocUnsafeSlow',
      'Buffer', 'Array', 'Map', 'Set', 'WeakMap', 'WeakSet',
    ]);

    /**
     * The loop whose body this node sits in, or `undefined`. Reached through
     * the BODY — `for (var e = Array(t), u = 0; …)` runs its init once, however
     * dynamic `t` is.
     */
    const enclosingLoop = (
      node: TSESTree.Node,
    ): TSESTree.ForStatement | TSESTree.ForOfStatement | TSESTree.ForInStatement
      | TSESTree.WhileStatement | TSESTree.DoWhileStatement | undefined => {
      let child: TSESTree.Node = node;
      let current: TSESTree.Node | undefined = node.parent;
      // `!= null`, not `!== undefined`: at Program the parent is `null`, and a
      // strict-undefined loop walks straight past it into a TypeError. The
      // corpus fixture crashed the rule on the first run because of it.
      while (current != null) {
        switch (current.type) {
          case AST_NODE_TYPES.ForStatement:
            return current.init === child ? undefined : current;
          case AST_NODE_TYPES.ForOfStatement:
          case AST_NODE_TYPES.ForInStatement:
            return current.right === child ? undefined : current;
          case AST_NODE_TYPES.WhileStatement:
          case AST_NODE_TYPES.DoWhileStatement:
            return current;
          default:
            break;
        }
        child = current;
        current = current.parent;
      }
      return undefined;
    };

    /**
     * An allocation inside a loop THE INVOKER DECIDES THE LENGTH OF.
     *
     * The predicate this replaces asked only: is the callee one of the
     * allocators, is the first argument something other than a numeric
     * literal, and is it inside a loop. That shape is ordinary JavaScript, and
     * it produced 132 of this rule's 173 findings on the 20-repo corpus —
     * 107 of them a single expression:
     *
     *   const sccSet = new Set(scc);                directus build-import-plan.ts:124
     *   sourceTypes = new Set(sourceTypes);         webpack lib/ChunkGraph.js:769
     *   const bd = new Set(pkg.bundleDependencies || [])   npm/cli add-rm-pkg-deps.js:65
     *
     * Not one of them is a resource-exhaustion vulnerability, and the reason is
     * structural rather than a matter of taste. `Set`, `Map`, `WeakSet` and
     * `WeakMap` do not take a SIZE — they take an iterable that the program is
     * already holding in memory. Copying it allocates O(data you already have),
     * which cannot be amplified by anyone. There is no input that makes
     * `new Set(scc)` allocate more than `scc` already costs.
     *
     * What CWE-770 actually describes is an allocation the invoker can make
     * arbitrarily large. Two shapes do that, and the rule already reports the
     * first one (`userControlledResourceSize`): a size argument under the
     * invoker's control. The second is this path's reason to exist and cannot
     * be seen at the allocation at all —
     *
     *   const reportCount = parseInt(req.query.count) || 1;
     *   for (let i = 0; i < reportCount; i++) {
     *     const reportBuffer = Buffer.alloc(1024 * 1024);   // a FIXED 1 MB
     *   }
     *
     * — where every individual allocation is bounded and the TRIP COUNT is not.
     * So the evidence this path requires is on the loop, not on the argument,
     * and a literal size no longer excuses the allocation: a fixed 1 MB taken
     * an invoker-chosen number of times is the finding.
     */
    const isAllocationInLoopBody = (
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): boolean => {
      const callee = node.callee;
      let name: string | undefined;
      if (callee.type === 'Identifier') {
        name = callee.name;
      } else if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.property.type === 'Identifier'
      ) {
        name = `${callee.object.name}.${callee.property.name}`;
      }
      if (name === undefined || !ALLOCATORS.has(name)) return false;

      const loop = enclosingLoop(node);
      if (loop === undefined) return false;

      // The bound: what the loop iterates over, or what its test compares
      // against. `for (const x of req.body.items)` and
      // `for (let i = 0; i < count; i++)` are the same finding.
      const bound =
        loop.type === AST_NODE_TYPES.ForOfStatement || loop.type === AST_NODE_TYPES.ForInStatement
          ? loop.right
          : loop.test ?? undefined;
      return bound !== undefined && isInvokerControlled(bound);
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier') {
            noteArchiveBinding(spec.local.name, String(node.source.value));
          }
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === 'Identifier' &&
          node.init?.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          node.init.callee.name === 'require' &&
          node.init.arguments[0]?.type === 'Literal'
        ) {
          noteArchiveBinding(node.id.name, String(node.init.arguments[0].value));
        }

      },

      // Check Buffer allocation
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        // No `calleeText` here any more. Printing the callee and testing the
        // string was the last decision in this handler taken on source text
        // rather than structure, and it went with the cache path below.

        // Check for Buffer.alloc(), Buffer.allocUnsafe() or new Buffer()
        const isBufferAlloc =
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Buffer' &&
          callee.property.type === 'Identifier' &&
          (callee.property.name === 'alloc' || callee.property.name === 'allocUnsafe');

        const isNewBuffer =
          callee.type === 'NewExpression' &&
          callee.callee.type === 'Identifier' &&
          callee.callee.name === 'Buffer';

        if (isBufferAlloc || isNewBuffer) {

          const args = node.arguments;
          if (args.length > 0) {
            const sizeArg = args[0];

            // Check if size comes from user input (but skip if validated).
            // When `requireResourceValidation` is disabled, callers have opted
            // out of the "must call a validator" requirement entirely, so this
            // branch is skipped regardless of whether validation is present.
            if (
              requireResourceValidation &&
              sizeArg.type !== 'SpreadElement' &&
              isUserInput(sizeArg) &&
              !hasSizeValidation(node)
            ) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'userControlledResourceSize',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
              return;
            }

            // Check if size exceeds limits
            const estimatedSize = sizeArg.type === 'SpreadElement' ? null : estimateResourceSize(sizeArg);
            if (estimatedSize && estimatedSize > maxResourceSize) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedBufferAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
              return;
            }

            // NOTE: a `missingResourceLimits` check previously lived here for
            // "non-literal, user-input sizes with no validation" — but that
            // condition is a strict subset of the userControlledResourceSize
            // check above (same `isUserInput(sizeArg) && !hasSizeValidation(node)`
            // predicate), which already reports and returns first. It was
            // therefore unreachable dead code and has been removed
            // (behavior-neutral: no observable path changes).
          }
        }

        // Check for multer configuration without limits
        if (callee.type === 'Identifier' && callee.name === 'multer') {
          const args = node.arguments;
          if (args.length > 0 && args[0].type === 'ObjectExpression') {
            const props = args[0].properties as TSESTree.ObjectLiteralElement[];
            
            // Check for valid limits definition
            const hasValidLimits = props.some((prop: TSESTree.ObjectLiteralElement): boolean => {
              if (prop.type !== 'Property' || prop.key.type !== 'Identifier') {
                return false;
              }

              // Direct fileSize (not standard but maybe used?)
              if (prop.key.name === 'fileSize') return true;

              // Limits object
              if (prop.key.name === 'limits' && prop.value.type === 'ObjectExpression') {
                return prop.value.properties.some(
                  (limitProp: TSESTree.ObjectLiteralElement): limitProp is TSESTree.Property =>
                    limitProp.type === 'Property' &&
                    limitProp.key.type === 'Identifier' &&
                    limitProp.key.name === 'fileSize'
                );
              }

              return false;
            });

            if (!hasValidLimits) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'unlimitedFileOperations',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
          return;
        }

        // Check for fs operations
        if (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'fs' &&
            callee.property.type === 'Identifier' &&
            ['readFile', 'writeFile', 'readFileSync', 'writeFileSync'].includes(callee.property.name)) {

          const args = node.arguments;
          if (args.length > 0) {
            // Check if file path comes from user input (potential for large files)
            const pathArg = args[0];
            
            // A path nothing can steer cannot open a file of attacker-chosen size.
            // This was a bespoke `path.join(__dirname, ...literals)` special case, so
            // `path.resolve`, a `const` holding the path, and
            // `require.resolve('eslint/package.json')` all fell through to the
            // user-input check and reported. `isStaticExpression` covers all of them,
            // and every rule in the ecosystem shares the same answer.
            if (
              pathArg.type !== 'SpreadElement' &&
              isStaticExpression({ node: pathArg, scope: context.sourceCode.getScope(pathArg) })
            ) {
              return;
            }

            if (pathArg.type !== 'SpreadElement' && isUserInput(pathArg)) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: pathArg,
                messageId: 'unlimitedFileOperations',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
        }

        // Check for Array constructor with user input
        if (callee.type === 'Identifier' && callee.name === 'Array') {
          const args = node.arguments;
          if (args.length === 1) {
            const sizeArg = args[0];
            if (sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg)) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
        }

        // ZIP bomb detection — unlimited decompression.
        //
        // This was `calleeText.includes('unzipper') || calleeText.includes('Extract')`
        // over the callee's printed text, reporting unconditionally. The bare
        // substring 'Extract' matched passport-jwt's standard configuration —
        //
        //   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
        //
        // — so four separate repos in the wild corpus were told their bearer
        // token extractor was an unbounded decompression. Nine findings, none
        // of them touching an archive.
        //
        // Match the decompression APIs on the AST instead: the receiver must
        // be a known archive library, or the callee a known stream factory.
        const isDecompression = (): boolean => {
          if (callee.type !== 'MemberExpression') return false;
          const member = callee as TSESTree.MemberExpression;
          const receiver =
            member.object.type === 'Identifier' ? member.object.name : '';
          // Resolve the receiver to what it was imported from, not to what it
          // is called. `const unzip = require('unzipper')` is the ordinary
          // spelling, and matching the variable name would miss it — the same
          // names-are-not-evidence mistake this fix exists to correct.
          if (!archiveBindings.has(receiver)) return false;
          const method =
            member.property.type === 'Identifier' ? member.property.name : '';
          return /^(Extract|Parse|extract|createGunzip|createUnzip|createInflate|open)$/.test(
            method,
          );
        };

        /**
         * `zlib.createGunzip({ maxOutputLength: 50 * 1024 * 1024 })` is the
         * fix this report asks for, so a call that already carries it must
         * stop reporting — otherwise the only remedy on offer is the one the
         * author already applied.
         */
        const hasDecompressionLimit = (): boolean =>
          node.arguments.some(
            (argument) =>
              argument.type === 'ObjectExpression' &&
              argument.properties.some(
                (property) =>
                  property.type === 'Property' &&
                  property.key.type === 'Identifier' &&
                  ['maxOutputLength', 'maxSize', 'limit'].includes(property.key.name),
              ),
          );

        /**
         * Does the enclosing function COUNT the decompressed bytes and stop?
         *
         * `maxOutputLength` is one way to bound a decompression stream. It is
         * not the only one, and the rule reporting a file that already
         * implements a bound is the failure mode this rule has committed once
         * before (it flagged a size cap as an unbounded allocation).
         *
         * axios pipes the unzip stream and then counts what comes out of it:
         *
         *   streams.push(zlib.createUnzip(zlibOptions));        http.js:1193
         *   …
         *   totalResponseBytes += chunk.length;                 http.js:1241
         *   if (totalResponseBytes > limit) throw new AxiosError(…)
         *
         * That is an output bound, spelled differently. Both axios findings on
         * the 20-repo corpus were this, and the other three sites — nodemailer
         * `lib/fetch/index.js:282`, directus `api/src/services/files.ts:551`,
         * strapi `.../file/providers/source/index.ts:260` — contain no such
         * accumulator anywhere in the file.
         *
         * Matched on the AST, in two halves that must BOTH be present: an
         * accumulator incremented by the length of something, and a relational
         * comparison naming that accumulator. Neither half alone is evidence —
         * `total += x.length` on its own is just a byte count.
         */
        const countsOutputBytes = (): boolean => {
          // `variableScope.block` is the enclosing function, or Program at the
          // top level. Walking `node.parent` by hand needs a "ran off the top"
          // branch that a real tree can never take, and an unreachable branch
          // is a permanent hole in a package held at 100% coverage.
          const scope = context.sourceCode.getScope(node).variableScope.block;

          const accumulators = new Set<string>();
          const compared = new Set<string>();
          const visit = (current: unknown): void => {
            if (current === null || typeof current !== 'object') return;
            if (Array.isArray(current)) {
              for (const item of current) visit(item);
              return;
            }
            const candidate = current as TSESTree.Node;
            if (typeof candidate.type !== 'string') return;
            if (
              candidate.type === AST_NODE_TYPES.AssignmentExpression &&
              candidate.operator === '+=' &&
              candidate.left.type === AST_NODE_TYPES.Identifier &&
              candidate.right.type === AST_NODE_TYPES.MemberExpression &&
              !candidate.right.computed &&
              candidate.right.property.type === AST_NODE_TYPES.Identifier &&
              (candidate.right.property.name === 'length' ||
                candidate.right.property.name === 'byteLength')
            ) {
              accumulators.add(candidate.left.name);
            }
            if (
              candidate.type === AST_NODE_TYPES.BinaryExpression &&
              ['>', '>=', '<', '<='].includes(candidate.operator)
            ) {
              for (const side of [candidate.left, candidate.right]) {
                if (side.type === AST_NODE_TYPES.Identifier) compared.add(side.name);
              }
            }
            for (const [key, value] of Object.entries(candidate)) {
              if (key === 'parent') continue;
              visit(value);
            }
          };
          visit(scope);
          return [...accumulators].some((name) => compared.has(name));
        };

        if (isDecompression() && !hasDecompressionLimit() && !countsOutputBytes()) {
          context.report({
            node,
            messageId: 'unlimitedFileOperations',
            data: {
              filePath: filename,
              line: String(node.loc.start.line),
            },
          });
        }

        // The XML entity-expansion ("billion laughs") path was removed here.
        //
        // It reported `parseString(...)` / `parseStringPromise(...)` on a
        // binding resolved to one of `xml2js`, `fast-xml-parser`, `xmldom`,
        // `libxmljs`. Those method names are the xml2js API and no other, so
        // xml2js was the only library it could ever fire on — 24 findings on
        // the 20-repo corpus, every one of them in n8n.
        //
        // xml2js parses through sax-js, which does not expand custom entities
        // at all. Measured directly against xml2js 0.6.2 / sax 1.6.1 on
        // 2026-08-18, all three payloads answering `Invalid character entity`
        // before any expansion:
        //
        //   <!DOCTYPE d [<!ENTITY a "HELLO">]><d>&a;</d>              ERR
        //   two-level nested entity                                    ERR
        //   <!ENTITY xxe SYSTEM "file:///etc/passwd">                  ERR
        //   nine-level billion laughs        ERR in 1 ms, 0 chars expanded
        //
        // So the finding named a vulnerability that cannot exist in the only
        // parser it matched. Removed rather than narrowed: there is no
        // remaining library in XML_MODULES that this path reaches, and a
        // narrower version of a premise measured false is still false.
        //
        // If an entity-expansion check returns, it belongs to a rule that
        // checks the parser's ACTUAL entity handling — libxmljs `noent: true`
        // is the real sink, and it is a different API on a different module.

        // A "cache with unlimited growth" path was removed here. It was
        //
        //   calleeText.includes('set') && sourceCode.getText(node).includes('Buffer.alloc')
        //
        // — `String.includes('set')` over the printed callee, which matches
        // `offset`, `reset`, `dataset`, `setTimeout` and `unset` as readily as
        // `cache.set`, and a second `includes` scanning the whole call through
        // its comments and string literals. It produced 0 findings on the
        // 20-repo corpus, so nothing is lost by deleting it and nothing was
        // ever gained: `AST, not printed source` is the standing rule, and this
        // was the last site in the file breaking it.

        // Allocation in a loop the invoker decides the length of. `Array(n)`
        // and `Buffer.alloc(n)` are the call spellings of it; the `new Array`
        // / `new Set` spellings are handled on the NewExpression path below.
        if (isAllocationInLoopBody(node)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }
          context.report({
            node,
            messageId: 'resourceAllocationInLoop',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check new expressions for resource allocation
      NewExpression(node: TSESTree.NewExpression) {
        const callee = node.callee;

        // Check for new Buffer() with user input
        if (callee.type === 'Identifier' && callee.name === 'Buffer') {
          const args = node.arguments;
          if (args.length > 0) {
            const sizeArg = args[0];

            // Check if size comes from user input (but skip if validated).
            // Disabling `requireResourceValidation` opts out of this check
            // entirely, mirroring the CallExpression Buffer.alloc() branch.
            // `new Buffer(x, 'utf8')` is the string overload — Node reads the
            // second argument as an encoding, so `x` is content and the call
            // allocates exactly what the caller already has. `+` is in
            // `couldBeASize`'s operator list because it is arithmetic, and it
            // is also string concatenation; the encoding argument is what
            // tells the two apart.
            const hasEncodingArgument = args.length > 1;
            if (
              requireResourceValidation &&
              sizeArg.type !== 'SpreadElement' &&
              !hasEncodingArgument &&
              couldBeASize(sizeArg) &&
              isUserInput(sizeArg) &&
              !hasSizeValidation(node)
            ) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'userControlledResourceSize',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
              return;
            }

            // Check if size exceeds limits
            const estimatedSize = sizeArg.type === 'SpreadElement' ? null : estimateResourceSize(sizeArg);
            if (estimatedSize && estimatedSize > maxResourceSize) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedBufferAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
              return;
            }

            // NOTE: same unreachable `missingResourceLimits` pattern as the
            // CallExpression Buffer.alloc handler above — removed for the
            // identical reason (subset of the userControlledResourceSize
            // check, which already reports and returns first).
          }
        }

        // Check for new Array() with user input
        if (callee.type === 'Identifier' && callee.name === 'Array') {
          const args = node.arguments;
          if (args.length === 1) {
            const sizeArg = args[0];
            if (sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg)) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
        }


        // Same allocation-in-loop check as the CallExpression path — `new
        // Array(n)` and `new Set(x)` are the constructor spellings of it.
        if (isAllocationInLoopBody(node)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }
          context.report({
            node,
            messageId: 'resourceAllocationInLoop',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      }
    };
  },
});
