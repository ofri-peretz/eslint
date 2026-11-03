/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noXpathInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = "import xpath from 'xpath';";
const dangerousOn: [{ reportDangerousConstructs: boolean }] = [
  { reportDangerousConstructs: true },
];
const concat = [{ messageId: 'unsafeXpathConcatenation' as const }];
const injection = [{ messageId: 'xpathInjection' as const }];
const unvalidated = [{ messageId: 'unvalidatedXpathInput' as const }];
const dangerous = [{ messageId: 'dangerousXpathExpression' as const }];

/** Template skip lists: a path prefix skips only at the start, after optional spaces. */
const prefixCases = ['/home/', '/usr/', '/tmp/'].flatMap((prefix) => [
  {
    valid: true,
    name: `a template starting with ${prefix} is a file path`,
    code: `const p = \`${prefix}\${req.query.u}/x[1]\`;`,
  },
  {
    valid: true,
    name: `a template starting with spaces then ${prefix} is a file path`,
    code: `const p = \`  ${prefix}\${req.query.u}/x[1]\`;`,
  },
  {
    valid: false,
    name: `${prefix} in the middle of a template is not a file-path prefix`,
    code: `const p = \`/srv${prefix}\${req.query.u}/x[1]\`;`,
  },
]);

describe('no-xpath-injection (mutation edges)', () => {
  ruleTester.run('no-xpath-injection', noXpathInjection, {
    valid: [
      {
        name: 'a built query used only as a ternary test does not reach the evaluator',
        code: `${IMPORT} function f(id) { const q = "//u[@id='" + id + "']"; log(q); return xpath.select(q ? '//a' : '//b', doc); }`,
      },
      {
        name: 'a bare select without an xpath import is not an evaluator',
        code: `select("//user[@id='" + rec.id + "']");`,
      },
      {
        name: 'a call on a call result is not an evaluator',
        code: `getEvaluator()("//user[@id='" + rec.id + "']");`,
      },
      {
        name: 'only the first argument of an evaluator is the expression',
        code: `${IMPORT} xpath.select(doc, "//user[@id='" + rec.id + "']");`,
      },
      {
        name: 'a constant template bound to a later argument does not reach the evaluator',
        options: dangerousOn,
        code: `${IMPORT} const q = \`//user\`; xpath.select(doc, q);`,
      },
      {
        name: 'select on a non-XPath receiver is not XPath',
        code: 'query.select(userFields);',
      },
      {
        name: 'a non-XPath method is not an evaluator',
        code: 'logger.info(userQuery);',
      },
      {
        name: 'a bare select without an import is not an evaluator for an identifier argument',
        code: 'select(userQuery);',
      },
      {
        name: 'a query field off a non-req object is not a request value',
        code: "const q = `//user[@id='${config.query.id}']`;",
      },
      {
        name: 'a field off a non-req object is not a request value',
        code: "const q = `//user[@id='${config.id}']`;",
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a block-local binding is not the parameter it shadows',
        code: `${IMPORT} function f(id) { { const id = 5; return xpath.select(\`//u[@id='\${id}']\`, doc); } }`,
      },
      {
        name: 'an xpath module with no pending wildcard templates reports nothing',
        code: `${IMPORT} xpath.select('//a', doc);`,
      },
      {
        name: 'a wildcard template in a module with no XPath import is a router path',
        code: "import React from 'react'; const p = `/${req.params.locale}/*`;",
      },
      {
        name: 'an @safe argument is not reported',
        code: `${IMPORT} xpath.select(/** @safe */ userQuery, doc);`,
      },
      {
        name: 'an http:// URL template is not XPath',
        code: 'const u = `http://api.x.com/v1/items[${req.query.i}]`;',
      },
      {
        name: 'an /api/ template is an endpoint',
        code: 'const u = `/api/items[${req.query.i}]`;',
      },
      {
        name: 'an indented /api/ template is an endpoint',
        code: 'const u = `  /api/items[${req.query.i}]`;',
      },
      ...prefixCases
        .filter((c) => c.valid)
        .map(({ name, code }) => ({ name, code })),
      {
        name: 'a [data-*] selector is CSS',
        code: "const s = `//div[data-id='${req.query.id}']`;",
      },
      {
        name: 'a [class=] selector is CSS',
        code: "const s = `//div[class='${req.query.c}']`;",
      },
      {
        name: 'an [id=] selector is CSS',
        code: "const s = `//div[id='${req.query.c}']`;",
      },
      {
        name: 'a query string is not XPath',
        code: 'const s = `//search?query=${req.query.q}`;',
      },
      {
        name: 'a validated untrusted-named binding is not untrusted',
        code: "const userId = escapeXPath(req.query.id); const q = `//u[@id='${userId}']`;",
      },
      {
        name: 'arithmetic on a request value yields a number, not XPath text',
        code: `const q = "//u[" + (req.query.n - 1) + "]";`,
      },
      {
        name: 'a numeric literal assigned to a path-named binding is not XPath',
        code: 'const pathCount = 5;',
      },
      {
        name: 'a constant XPath literal is not dangerous by default',
        code: "const xpathQuery = '//users/user';",
      },
      {
        name: 'a relative file path is not XPath even with dangerous constructs on',
        options: dangerousOn,
        code: "const filePath = '../env/index.js';",
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a TS cast between the built query and the evaluator still reaches it',
        // @found mutation testing
        code: `${IMPORT} function f(id) { const q = "//u[@id='" + id + "']"; return xpath.select(q as string, doc); }`,
        errors: injection,
      },
      {
        name: 'FN: a ternary between the built query and the evaluator still reaches it',
        // @found mutation testing
        code: `${IMPORT} function f(id) { const q = "//u[@id='" + id + "']"; return xpath.select(ok ? q : '//a', doc); }`,
        errors: injection,
      },
      {
        name: 'FN: a non-null assertion between the built query and the evaluator still reaches it',
        // @found mutation testing
        code: `${IMPORT} function f(id) { const q = "//u[@id='" + id + "']"; return xpath.select(q!, doc); }`,
        errors: injection,
      },
      {
        name: 'a unary plus operand is part of the concatenation',
        code: `${IMPORT} xpath.select("//user[@id=" + +req.query.id + "]", doc);`,
        errors: injection,
      },
      {
        name: 'a template inside a concatenation reaches the evaluator',
        options: dangerousOn,
        code: `${IMPORT} xpath.select(\`//a\` + '[1]', doc);`,
        errors: dangerous,
      },
      {
        name: 'a template nested in a template reaches the evaluator',
        options: dangerousOn,
        code: `${IMPORT} xpath.select(\`\${\`//a\`}\`, doc);`,
        errors: dangerous,
      },
      {
        name: 'document.evaluate is an evaluator without a receiver check',
        code: 'document.evaluate(userQuery, document);',
        errors: unvalidated,
      },
      {
        name: 'select on an xpath property is XPath',
        code: 'this.xpath.select(userQuery, doc);',
        errors: unvalidated,
      },
      {
        name: 'a wildcard predicate is a dangerous construct',
        options: dangerousOn,
        code: `${IMPORT} xpath.select("/a[@id=*]", doc);`,
        errors: dangerous,
      },
      {
        name: 'a direct req field is a request value',
        code: "const q = `//site[@host='${req.hostname}']`;",
        errors: concat,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a destructured parameter is a parameter',
        code: `${IMPORT} function f({ id }) { return xpath.select(\`//u[@id='\${id}']\`, doc); }`,
        errors: concat,
      },
      {
        name: 'an arrow parameter is a parameter',
        code: `${IMPORT} const f = (id) => xpath.select(\`//u[@id='\${id}']\`, doc);`,
        errors: concat,
      },
      {
        name: 'a function-expression parameter is a parameter',
        code: `${IMPORT} const f = function (id) { return xpath.select(\`//u[@id='\${id}']\`, doc); };`,
        errors: concat,
      },
      {
        name: 'a line comment is not an @xpath-safe annotation',
        code: "// @xpath-safe\nconst q = `//u[@id='${req.query.id}']`;",
        errors: concat,
      },
      {
        name: 'a declaration among others still reaches its sink',
        code: 'const other = 1; const xpathVar = req.query.q; document.evaluate(xpathVar, document);',
        errors: injection,
      },
      {
        name: 'one sink among other uses is enough',
        code: 'const xpathVar = req.query.q; console.log(xpathVar); document.evaluate(xpathVar, document);',
        errors: injection,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a request field passed straight to the evaluator is unvalidated input',
        code: `${IMPORT} xpath.select(req.query.q, doc);`,
        errors: unvalidated,
      },
      {
        name: 'a wildcard template in a module importing xpath is reported',
        code: `${IMPORT} const p = \`/\${req.params.locale}/*\`;`,
        errors: concat,
      },
      {
        name: '/api/ in the middle of a template is not an endpoint prefix',
        code: 'const u = `/v1/api/items[${req.query.i}]`;',
        errors: concat,
      },
      ...prefixCases
        .filter((c) => !c.valid)
        .map(({ name, code }) => ({ name, code, errors: concat })),
      {
        name: 'one untrusted slot among others is enough',
        code: "const q = `//u[@id='${req.query.id}'][${idx}]`;",
        errors: concat,
      },
      {
        name: 'a concatenation compared to another string is still judged',
        code: `if ("//u[@id='" + req.query.id + "']" === cached) { run(); }`,
        errors: injection,
      },
    ],
  });
});
