/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * ESLint Rule: no-template-injection
 * CWE-94: Improper Control of Generation of Code (Code Injection via Templates)
 *
 * Detects server-side template engine calls where the template argument is
 * dynamic (not a string literal). An attacker who controls the template
 * string can execute arbitrary server-side code.
 *
 * Detection: structural-api + a NAMED untrusted source.
 *   Handlebars.compile(req.body.tpl)      — fires (request data)
 *   Handlebars.compile(userTemplate)      — fires (the name states provenance)
 *   Handlebars.compile('<h1>{{t}}</h1>')  — silent (string literal)
 *   Handlebars.compile(content)           — silent (nothing says where it came from)
 *
 * Covered engines: Handlebars, EJS, Pug/Jade, Mustache, Nunjucks, Swig,
 *   Dust, doT, and their common aliases.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  unwrapTypeSyntax,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'templateInjection';

export interface Options {
  /**
   * Receiver names that denote a server-side template engine. REPLACES the
   * built-in list. Default: DEFAULT_TEMPLATE_ENGINES
   */
  templateEngines?: string[];

  /** Extra template-engine receiver names, ON TOP of `templateEngines`. Default: [] */
  additionalTemplateEngines?: string[];

  /**
   * Identifier roots that denote an inbound request, matched as the exact ROOT
   * of a member chain. REPLACES the built-in list.
   * Default: DEFAULT_REQUEST_ROOTS
   */
  requestRoots?: string[];

  /** Extra request-object root names, ON TOP of `requestRoots`. Default: [] */
  additionalRequestRoots?: string[];

  /**
   * Request properties that carry caller-supplied data. REPLACES the built-in
   * list. Default: DEFAULT_REQUEST_PROPERTIES
   */
  requestProperties?: string[];

  /**
   * Extra request properties, ON TOP of `requestProperties` — hapi's `payload`
   * belongs here. Default: []
   */
  additionalRequestProperties?: string[];

  /**
   * Words with which an author states that a value came from outside, compared
   * as a WHOLE word of the identifier and never as a substring. REPLACES the
   * built-in list. Default: DEFAULT_UNTRUSTED_NAME_WORDS
   */
  untrustedNameWords?: string[];

  /** Extra untrusted-provenance words, ON TOP of `untrustedNameWords`. Default: [] */
  additionalUntrustedNameWords?: string[];
}

type RuleOptions = [Options?];

/** The four tunable word lists, resolved once per `create()`. */
interface Vocabulary {
  requestRoots: ReadonlySet<string>;
  requestProperties: ReadonlySet<string>;
  untrustedNameWords: ReadonlySet<string>;
}

/**
 * The compile-side entry points of the template engines this rule knows.
 *
 * @protocol-constant Each name is a published method on one of those engines —
 * `Handlebars.compile` / `.precompile`, `pug.compile`, `doT.template`,
 * `nunjucks.parse`, `consolidate.create`. The set is read ONLY after the
 * receiver has been matched against `templateEngines`, so it never judges a
 * bare `parse()` or `create()` in a consumer's own code; it is the engines'
 * call signatures, not a vocabulary. Making it editable would let a consumer
 * remove `compile` and go green on `Handlebars.compile(req.body.tpl)`, the
 * canonical CWE-94 shape, while a house engine is added through
 * `templateEngines` / `additionalTemplateEngines` instead.
 */
const TEMPLATE_COMPILE_METHODS = new Set([
  'compile', 'precompile', 'create', 'parse', 'template',
]);

/**
 * The render-side entry points of the same engines.
 *
 * @protocol-constant `render` (Mustache, nunjucks, dust), `renderFile` (ejs,
 * pug), `renderString` (nunjucks), `renderToString` and `renderTemplate` are
 * the published render signatures of the engines in `templateEngines`, and like
 * the compile set they are consulted only once the receiver is one of those
 * engines. A consumer who could edit the list could delete `render` and silence
 * the rule on `ejs.render(userTemplate)` — the shape it exists to find — or add
 * a generic method name and have every `x.build(dynamic)` on an engine object
 * reported as server-side template injection.
 */
const TEMPLATE_RENDER_METHODS = new Set([
  'render', 'renderFile', 'renderString', 'renderToString', 'renderTemplate',
]);

const ALL_TEMPLATE_METHODS = new Set([
  ...TEMPLATE_COMPILE_METHODS,
  ...TEMPLATE_RENDER_METHODS,
]);

/**
 * Receiver names that denote a server-side template engine.
 *
 * The gate is the binding's SPELLING, which is the conventional import name for
 * each of these libraries — so this is a DEFAULT, not a fixed surface. A
 * codebase that imports Handlebars as `hbs` adds it through
 * `additionalTemplateEngines`; one where `dust` or `swig` is an ordinary domain
 * noun drops it through `templateEngines`. Membership is exact either way.
 */
const DEFAULT_TEMPLATE_ENGINES = [
  'Handlebars', 'handlebars',
  'ejs',
  'pug', 'jade',
  'mustache', 'Mustache',
  'nunjucks',
  'swig',
  'dust', 'Dust',
  'doT',
  'consolidate',
];

/**
 * Identifier roots that denote an inbound request.
 *
 * Five English words standing in for provenance, so this is a DEFAULT: a
 * framework that names its request object something else is added through
 * `additionalRequestRoots`, and a codebase where `event` or `message` is an
 * ordinary domain noun drops it through `requestRoots`.
 */
const DEFAULT_REQUEST_ROOTS = [
  'req', 'request', 'ctx', 'event', 'message',
];

/**
 * Properties of a request that carry caller-supplied data.
 *
 * Curated from the Express, Koa and Fastify request objects plus the Lambda
 * proxy event, so it is a DEFAULT: hapi's `request.payload` is added through
 * `additionalRequestProperties`, and `requestProperties` narrows it.
 */
const DEFAULT_REQUEST_PROPERTIES = [
  'query', 'params', 'body', 'headers', 'url', 'path', 'cookies', 'data',
];

/**
 * Calls whose result is bytes from outside the program.
 *
 * @protocol-constant Two published surfaces and nothing else: `readFile` /
 * `readFileSync` from `node:fs`, and `text`, `json`, `arrayBuffer`, `formData`
 * and `blob` — the complete Body-mixin read methods the WHATWG Fetch standard
 * defines on a `Response` or `Request`. Every one returns bytes the program did
 * not author, which is the fact being asserted; a consumer's domain cannot
 * disagree about what `Response.json()` returns. Making the set editable would
 * let a consumer delete `json` and lose `Handlebars.compile(await res.json())`,
 * a taint root the rule was written for, or add an ordinary method and treat
 * everything it returns as attacker-controlled.
 */
const READER_METHODS: ReadonlySet<string> = new Set([
  'readFile', 'readFileSync', 'text', 'json', 'arrayBuffer', 'formData', 'blob',
]);

/**
 * Words with which an author states that a value came from outside.
 *
 * A name is weak evidence in general — `no-hardcoded-credentials` treats a
 * credential-ish name as necessary but not sufficient. Here it is the ONLY
 * evidence available at a call site, and these particular words are not
 * descriptions of a template's role (`content`, `template`, `tpl`, `source`)
 * but claims about its provenance.
 *
 * Eight English words that are the ONLY evidence on this path, so they are a
 * DEFAULT and not a fixed surface: a codebase where `client` means a customer
 * record or `payload` means an internal message body drops those through
 * `untrustedNameWords`, and one with its own provenance convention adds through
 * `additionalUntrustedNameWords`. Neither changes that the comparison is against
 * a WHOLE word of the split identifier.
 */
const DEFAULT_UNTRUSTED_NAME_WORDS = [
  'user', 'untrusted', 'attacker', 'external', 'remote', 'client', 'payload',
  'input',
];

/** Does this identifier or property name state that the value came from outside? */
function nameStatesUntrusted(name: string, vocabulary: Vocabulary): boolean {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  return words.some((word) => vocabulary.untrustedNameWords.has(word));
}

/**
 * Name the untrusted source reaching this expression, or return null.
 *
 * The rule used to report every first argument that was not a string literal.
 * That is the shape of a dynamic template, not the meaning of an injectable
 * one, and it asserted an impact — "an attacker who controls the template can
 * execute arbitrary server-side code" — about an attacker it never located.
 * All three wild-corpus findings were build tooling compiling its own files:
 *
 *   tpl = Handlebars.compile(content)        okta-signin-widget Gruntfile.js:135, :202
 *   Handlebars.precompile(template)          …/babel-plugin-handlebars-inline-precompile/hbs.js:29
 *
 * `content` is a grunt file-processing callback parameter and `template` is a
 * babel-plugin argument. Neither is reachable by any attacker, and neither
 * could be resolved by any edit short of inlining the template.
 *
 * Same shape as `no-unsafe-regex-construction`'s `taintSource`: return the
 * NAME of the source found, so the report can say what it found.
 */
function untrustedSource(
  node: TSESTree.Node,
  vocabulary: Vocabulary,
  depth = 0,
): string | null {
  if (depth > 6) return null;

  // `x as string` reads exactly what `x` reads — the cast is erased at compile
  // time. Without this the walker falls through to its null/false default, and
  // Express types `req.query.q` as `string | string[] | ParsedQs | undefined`,
  // so a TypeScript handler MUST write the cast to compile. Every suite here
  // was written without one, which is why the gap survived review.
  const bare = unwrapTypeSyntax(node);
  if (bare !== node) return untrustedSource(bare, vocabulary, depth + 1);

  if (node.type === AST_NODE_TYPES.Identifier) {
    return nameStatesUntrusted(node.name, vocabulary) ? node.name : null;
  }

  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    for (const expression of node.expressions) {
      const found = untrustedSource(expression, vocabulary, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return (
      untrustedSource(node.left as TSESTree.Node, vocabulary, depth + 1) ??
      untrustedSource(node.right, vocabulary, depth + 1)
    );
  }

  if (node.type === AST_NODE_TYPES.AwaitExpression) {
    return untrustedSource(node.argument, vocabulary, depth + 1);
  }

  if (node.type === AST_NODE_TYPES.MemberExpression) {
    // Walk to the root of `req.body.template` and judge the whole chain.
    let root: TSESTree.Node = node;
    const properties: string[] = [];
    while (root.type === AST_NODE_TYPES.MemberExpression) {
      if (root.property.type === AST_NODE_TYPES.Identifier) {
        properties.unshift(root.property.name);
      }
      root = root.object;
    }
    if (root.type !== AST_NODE_TYPES.Identifier) return null;
    const chain = [root.name, ...properties].join('.');
    if (
      vocabulary.requestRoots.has(root.name) &&
      properties.some((property) => vocabulary.requestProperties.has(property))
    ) {
      return chain;
    }
    if (root.name === 'process' && properties[0] === 'argv') return 'process.argv';
    return [root.name, ...properties].some((part) => nameStatesUntrusted(part, vocabulary))
      ? chain
      : null;
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    const callee = node.callee;
    // Reading a file or a response body yields bytes from outside the program.
    // `has(null)` is false, which is the answer a runtime-keyed member should
    // get — so the cast, not a `?? ''` sentinel whose empty-string arm no
    // input can distinguish from the null one.
    if (
      callee.type === AST_NODE_TYPES.MemberExpression &&
      READER_METHODS.has(propertyName(callee) as string)
    ) {
      return propertyName(callee) as string;
    }
    if (
      callee.type === AST_NODE_TYPES.Identifier &&
      READER_METHODS.has(callee.name)
    ) {
      return callee.name;
    }
    for (const argument of node.arguments) {
      if (argument.type === AST_NODE_TYPES.SpreadElement) continue;
      const found = untrustedSource(argument, vocabulary, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  return null;
}

export const noTemplateInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-template-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-template-injection.md',
      description:
        'Disallow dynamic strings as template arguments to server-side template engines (CWE-94)',
      cwe: 'CWE-94',
      cvss: 9.8,
    },
    messages: {
      templateInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Template Injection (CWE-94)',
        cwe: 'CWE-94',
        description:
          '{{engine}}.{{method}}() receives a dynamic string. An attacker who controls the template can execute arbitrary server-side code.',
        severity: 'CRITICAL',
        fix: 'Pass only string literals as templates. If the template must vary, load it from a trusted file system path, never from user input.',
        documentationLink:
          'https://portswigger.net/web-security/server-side-template-injection',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          templateEngines: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_TEMPLATE_ENGINES,
            description:
              'Receiver names that denote a server-side template engine, compared as an exact identifier name and never as a substring. Replaces the built-in list.',
          },
          additionalTemplateEngines: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra template-engine receiver names, on top of `templateEngines` — an alias import such as `hbs` belongs here.',
          },
          requestRoots: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_REQUEST_ROOTS,
            description:
              'Identifier roots that denote an inbound request, matched as the exact ROOT of a member chain. Replaces the built-in list.',
          },
          additionalRequestRoots: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra request-object root names, on top of `requestRoots`.',
          },
          requestProperties: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_REQUEST_PROPERTIES,
            description:
              'Request properties that carry caller-supplied data, matched as a whole segment of the member chain. Replaces the built-in list.',
          },
          additionalRequestProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              "Extra request properties, on top of `requestProperties` — hapi's `request.payload` belongs here.",
          },
          untrustedNameWords: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_UNTRUSTED_NAME_WORDS,
            description:
              'Words with which an author states a value came from outside, compared as a WHOLE word of the split identifier and never as a substring. Replaces the built-in list.',
          },
          additionalUntrustedNameWords: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra untrusted-provenance words, on top of `untrustedNameWords`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      templateEngines: DEFAULT_TEMPLATE_ENGINES,
      additionalTemplateEngines: [],
      requestRoots: DEFAULT_REQUEST_ROOTS,
      additionalRequestRoots: [],
      requestProperties: DEFAULT_REQUEST_PROPERTIES,
      additionalRequestProperties: [],
      untrustedNameWords: DEFAULT_UNTRUSTED_NAME_WORDS,
      additionalUntrustedNameWords: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Read the raw user options rather than the defaults-merged parameter: the
    // merge always produces every key, so a `?? DEFAULT` on the merged object
    // would have one arm no configuration can reach.
    const options: Options = context.options[0] ?? {};

    const engines = new Set([
      ...(options.templateEngines ?? DEFAULT_TEMPLATE_ENGINES),
      ...(options.additionalTemplateEngines ?? []),
    ]);
    const vocabulary: Vocabulary = {
      requestRoots: new Set([
        ...(options.requestRoots ?? DEFAULT_REQUEST_ROOTS),
        ...(options.additionalRequestRoots ?? []),
      ]),
      requestProperties: new Set([
        ...(options.requestProperties ?? DEFAULT_REQUEST_PROPERTIES),
        ...(options.additionalRequestProperties ?? []),
      ]),
      untrustedNameWords: new Set([
        ...(options.untrustedNameWords ?? DEFAULT_UNTRUSTED_NAME_WORDS),
        ...(options.additionalUntrustedNameWords ?? []),
      ]),
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const { callee, arguments: args } = node;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;

        const { object, property } = callee;
        if (object.type !== AST_NODE_TYPES.Identifier) return;
        if (property.type !== AST_NODE_TYPES.Identifier) return;

        const engineName = object.name;
        const methodName = property.name;

        if (!engines.has(engineName)) return;
        if (!ALL_TEMPLATE_METHODS.has(methodName)) return;

        const firstArg = args[0];
        if (!firstArg) return;

        // A literal and a zero-expression template are both static text, so
        // `untrustedSource` returns null for them anyway — but stopping here
        // keeps the common case out of the walk entirely.
        if (
          firstArg.type === AST_NODE_TYPES.Literal &&
          typeof (firstArg as TSESTree.Literal).value === 'string'
        ) return;

        // Template literal with NO expressions → safe (equivalent to a string literal)
        if (
          firstArg.type === AST_NODE_TYPES.TemplateLiteral &&
          (firstArg as TSESTree.TemplateLiteral).expressions.length === 0
        ) return;

        // Being dynamic is not being attacker-controlled. See untrustedSource.
        if (untrustedSource(firstArg, vocabulary) === null) return;

        context.report({
          node: firstArg,
          messageId: 'templateInjection',
          data: { engine: engineName, method: methodName },
        });
      },
    };
  },
});
