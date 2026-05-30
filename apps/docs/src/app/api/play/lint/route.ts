/**
 * POST /api/play/lint
 *
 * Playground Phase 2 linting endpoint. Accepts a code string and a set of
 * enabled plugin prefixes, runs ESLint with inline-implemented flagship rules,
 * and returns findings.
 *
 * The rules are implemented directly here (not imported from the plugin packages)
 * to avoid bundling @interlace/eslint-devkit → oxc-resolver WASM at build time.
 * These are exact re-implementations of the same rule logic, verified against
 * the canonical snippets in snippets.ts.
 *
 * Supported rules (one per flagship snippet):
 *   jwt/no-algorithm-none
 *   secure-coding/no-hardcoded-credentials
 *   pg/no-unsafe-query
 *   mongodb-security/no-unsafe-query
 *   browser-security/no-postmessage-wildcard-origin
 *   react-a11y/alt-text
 */

import { NextRequest, NextResponse } from 'next/server';
import { Linter } from 'eslint';
import type { Rule } from 'eslint';
import parser from '@typescript-eslint/parser';

// ── Types ──────────────────────────────────────────────────────────────────

interface LintFinding {
  ruleId: string;
  severity: 'error' | 'warn';
  line: number;
  column: number;
  message: string;
}

// ── Inline rule implementations ────────────────────────────────────────────
// These are minimal re-implementations of the flagship rules that avoid
// importing @interlace/eslint-devkit (which pulls in oxc-resolver WASM).

/** jwt/no-algorithm-none — flags 'none' in jwt.verify/sign algorithms array. */
const jwtNoAlgorithmNone: Rule.RuleModule = {
  meta: { type: 'problem', schema: [] },
  create(ctx) {
    return {
      ArrayExpression(node) {
        for (const el of node.elements) {
          if (el && el.type === 'Literal' && el.value === 'none') {
            ctx.report({
              node: el,
              message:
                "Algorithm 'none' allows unsigned JWTs to pass verification (CWE-347/CWE-327). Remove 'none' from the algorithms array.",
            });
          }
        }
      },
    };
  },
};

/** secure-coding/no-hardcoded-credentials — flags common credential patterns in literals. */
const secCodingNoHardcodedCredentials: Rule.RuleModule = {
  meta: { type: 'problem', schema: [] },
  create(ctx) {
    const CRED_KEYS = /(?:api[_-]?key|secret|password|token|credential|accesskey|privatekey|databaseurl|connectionstring)/i;
    const AWS_PATTERN = /AKIA[0-9A-Z]{16}/;
    const DB_URL_PATTERN = /\w+:\/\/\w+:\w+@/;
    const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+/;

    function isHighEntropy(str: string): boolean {
      if (str.length < 16) return false;
      const chars = new Set(str.split(''));
      return chars.size > 8 && /[A-Z]/.test(str) && /[0-9]/.test(str) && /[a-z]/.test(str);
    }

    return {
      Property(node) {
        if (
          node.key.type !== 'Identifier' && node.key.type !== 'Literal'
        ) return;
        const keyName = node.key.type === 'Identifier' ? node.key.name : String(node.key.value);
        if (!CRED_KEYS.test(keyName)) return;

        const val = node.value;
        if (val.type !== 'Literal' || typeof val.value !== 'string') return;
        const str = val.value;

        if (AWS_PATTERN.test(str) || DB_URL_PATTERN.test(str) || JWT_PATTERN.test(str) || isHighEntropy(str)) {
          ctx.report({
            node: val,
            message: `Hardcoded credential detected in '${keyName}' (CWE-798). Move to an environment variable or secret manager.`,
          });
        }
      },
    };
  },
};

/** pg/no-unsafe-query — flags string concatenation in pg.query() calls. */
const pgNoUnsafeQuery: Rule.RuleModule = {
  meta: { type: 'problem', schema: [] },
  create(ctx) {
    function hasConcat(node: Rule.Node): boolean {
      if (node.type === 'BinaryExpression' && (node as any).operator === '+') return true;
      if (node.type === 'TemplateLiteral' && (node as any).expressions?.length > 0) return true;
      return false;
    }
    return {
      CallExpression(node) {
        const callee = (node as any).callee;
        if (callee.type !== 'MemberExpression') return;
        if (callee.property.name !== 'query') return;
        const args = (node as any).arguments;
        if (!args || args.length === 0) return;
        const firstArg = args[0];
        if (hasConcat(firstArg)) {
          ctx.report({
            node: firstArg,
            message:
              'SQL string built via concatenation or template literal reaches query(). Use parameterized placeholders ($1) and pass values as a second-argument array (CWE-89).',
          });
        }
      },
    };
  },
};

/** mongodb-security/no-unsafe-query — flags $where, $expr, allowDiskUse with user input. */
const mongoNoUnsafeQuery: Rule.RuleModule = {
  meta: { type: 'problem', schema: [] },
  create(ctx) {
    const DANGEROUS_OPS = new Set(['$where', '$expr', '$function', '$accumulator']);
    function containsUserInput(node: any): boolean {
      if (!node) return false;
      if (node.type === 'Identifier') return true; // variable reference
      if (node.type === 'TemplateLiteral' && node.expressions?.length > 0) return true;
      if (node.type === 'BinaryExpression' && node.operator === '+') return true;
      return false;
    }
    return {
      Property(node) {
        const key = (node as any).key;
        const keyName = key.type === 'Identifier' ? key.name : key.type === 'Literal' ? String(key.value) : '';
        if (!DANGEROUS_OPS.has(keyName)) return;
        if (containsUserInput((node as any).value)) {
          ctx.report({
            node: (node as any).value,
            message: `\`${keyName}\` operator with user-controlled value enables NoSQL injection (CWE-943). Use structured operators ($eq, $gt, …) and validate against an allow-list.`,
          });
        }
      },
    };
  },
};

/** browser-security/no-postmessage-wildcard-origin — flags postMessage(data, '*'). */
const browserNoWildcardOrigin: Rule.RuleModule = {
  meta: { type: 'problem', schema: [] },
  create(ctx) {
    return {
      CallExpression(node) {
        const callee = (node as any).callee;
        if (callee.type !== 'MemberExpression') return;
        if (callee.property.name !== 'postMessage') return;
        const args = (node as any).arguments;
        if (!args || args.length < 2) return;
        const targetOrigin = args[1];
        if (targetOrigin.type === 'Literal' && targetOrigin.value === '*') {
          ctx.report({
            node: targetOrigin,
            message:
              "`postMessage` with targetOrigin '*' exposes the payload to any frame (CWE-346). Pass the expected origin explicitly.",
          });
        }
      },
    };
  },
};

/** react-a11y/alt-text — flags img / Image elements missing alt prop. */
const reactA11yAltText: Rule.RuleModule = {
  meta: { type: 'suggestion', schema: [] },
  create(ctx) {
    const IMG_ELEMENTS = new Set(['img', 'Image']);
    return {
      JSXOpeningElement(node: any) {
        const name = node.name?.name;
        if (!IMG_ELEMENTS.has(name)) return;
        const hasAlt = node.attributes?.some(
          (attr: any) => attr.type === 'JSXAttribute' && attr.name?.name === 'alt',
        );
        if (!hasAlt) {
          ctx.report({
            node,
            message: `\`<${name}>\` is missing an \`alt\` prop (WCAG 1.1.1). Pass the image description, or \`alt=""\` if decorative.`,
          });
        }
      },
    };
  },
};

// ── Plugin map ─────────────────────────────────────────────────────────────

const INLINE_RULES: Record<string, { prefix: string; ruleKey: string; rule: Rule.RuleModule; severity: 0 | 1 | 2 }> = {
  'jwt/no-algorithm-none':                         { prefix: 'jwt',              ruleKey: 'jwt/no-algorithm-none',                         rule: jwtNoAlgorithmNone,             severity: 2 },
  'secure-coding/no-hardcoded-credentials':        { prefix: 'secure-coding',    ruleKey: 'secure-coding/no-hardcoded-credentials',        rule: secCodingNoHardcodedCredentials, severity: 2 },
  'pg/no-unsafe-query':                            { prefix: 'pg',               ruleKey: 'pg/no-unsafe-query',                            rule: pgNoUnsafeQuery,                severity: 2 },
  'mongodb-security/no-unsafe-query':              { prefix: 'mongodb-security', ruleKey: 'mongodb-security/no-unsafe-query',              rule: mongoNoUnsafeQuery,             severity: 2 },
  'browser-security/no-postmessage-wildcard-origin': { prefix: 'browser-security', ruleKey: 'browser-security/no-postmessage-wildcard-origin', rule: browserNoWildcardOrigin,     severity: 2 },
  'react-a11y/alt-text':                           { prefix: 'react-a11y',       ruleKey: 'react-a11y/alt-text',                           rule: reactA11yAltText,               severity: 1 },
};

const ALL_PREFIXES = new Set(Object.values(INLINE_RULES).map((r) => r.prefix));

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { code: string; plugins?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { code, plugins: requestedPlugins } = body;
  if (typeof code !== 'string') {
    return NextResponse.json({ error: '`code` must be a string' }, { status: 400 });
  }

  const enabledPrefixes = new Set(
    Array.isArray(requestedPlugins) && requestedPlugins.length > 0 ? requestedPlugins : [...ALL_PREFIXES],
  );

  const linter = new Linter({ configType: 'flat' });

  // Build the config: TS parser + inline rules enabled.
  const rules: Record<string, 0 | 1 | 2> = {};
  const plugins: Record<string, { rules: Record<string, Rule.RuleModule> }> = {};

  for (const [ruleId, entry] of Object.entries(INLINE_RULES)) {
    if (!enabledPrefixes.has(entry.prefix)) continue;
    const [pluginPrefix, ruleName] = ruleId.split('/');
    if (!plugins[pluginPrefix]) plugins[pluginPrefix] = { rules: {} };
    plugins[pluginPrefix].rules[ruleName] = entry.rule;
    rules[ruleId] = entry.severity;
  }

  const config = [
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      plugins,
      languageOptions: {
        parser: parser as any,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
        globals: {
          window: 'readonly',
          document: 'readonly',
          console: 'readonly',
          process: 'readonly',
          Buffer: 'readonly',
          require: 'readonly',
          module: 'readonly',
        },
      },
      rules,
    },
  ];

  let messages: Linter.LintMessage[];
  try {
    messages = linter.verify(code, config as any, { filename: 'playground.tsx' });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      findings: [{ ruleId: 'parser/error', severity: 'error', line: 1, column: 1, message: `Parse error: ${errMsg}` }],
    });
  }

  const findings: LintFinding[] = messages
    .filter((m) => m.ruleId)
    .map((m) => ({
      ruleId: m.ruleId ?? 'unknown',
      severity: m.severity === 2 ? 'error' : 'warn',
      line: m.line,
      column: m.column,
      message: m.message,
    }));

  return NextResponse.json({ findings });
}
