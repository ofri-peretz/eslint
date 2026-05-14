/**
 * Canonical playground snippets — one per flagship rule.
 *
 * Phase 1a (static demo): the playground renders these snippets with a
 * hardcoded findings list per example. Phase 2 swaps the hardcoded list
 * for live in-browser ESLint output (eslint-linter-browserify).
 *
 * Spec: PLAYGROUND_SPEC.md § "The minimum viable cut".
 * Flagship rules: .agent/flagship-rules.md.
 */

export type PlaygroundFinding = {
  /** ESLint ruleId — `<plugin-prefix>/<rule-name>`. */
  ruleId: string;
  /** Severity as shown in the right pane. */
  severity: 'error' | 'warn';
  /** 1-indexed line in the snippet's `code`. */
  line: number;
  /** 1-indexed column. */
  column: number;
  /** Human-readable finding text — shown in the right pane. */
  message: string;
  /** Path under `/docs` to the rule's documentation page. */
  ruleDocsPath: string;
};

export type PlaygroundSnippet = {
  /** Stable URL slug — used in `?example=` query param. */
  slug: string;
  /** Headline title shown in the example picker. */
  title: string;
  /** One-line summary shown below the title. */
  description: string;
  /** Short tag for the CWE / OWASP framing. */
  tag: string;
  /** Source code (JavaScript / TypeScript). */
  code: string;
  /** Hardcoded findings for Phase 1a. */
  findings: PlaygroundFinding[];
};

export const PLAYGROUND_SNIPPETS: readonly PlaygroundSnippet[] = [
  {
    slug: 'jwt-algorithm-none',
    title: 'jwt/no-algorithm-none',
    description: 'JWT algorithm confusion — accepting tokens with `alg: "none"` lets attackers forge any payload.',
    tag: 'CWE-327 · Algorithm confusion',
    code: `import jwt from 'jsonwebtoken';

// Endpoint receives a token from an untrusted client.
export function verifyToken(token: string, secret: string) {
  // BUG: 'none' lets an attacker submit an unsigned token and pass verify.
  return jwt.verify(token, secret, {
    algorithms: ['HS256', 'none'],
  });
}
`,
    findings: [
      {
        ruleId: 'jwt/no-algorithm-none',
        severity: 'error',
        line: 7,
        column: 17,
        message: "Algorithm 'none' allows unsigned JWTs to pass verification (CWE-327). Drop 'none' from the algorithms allow-list.",
        ruleDocsPath: '/docs/security/plugin-jwt/rules/no-algorithm-none',
      },
    ],
  },
  {
    slug: 'secure-coding-hardcoded-credentials',
    title: 'secure-coding/no-hardcoded-credentials',
    description: 'Credential literals in source — entropy plus context (`apiKey =`, `password =`) makes the detection precise.',
    tag: 'CWE-798 · Hardcoded credentials',
    code: `// Real-world pattern from accidental commits.

const config = {
  apiKey: 'AKIAIOSFODNN7EXAMPLE',
  databaseUrl: 'postgres://admin:hunter2@db.example.com:5432/prod',
  jwtSecret: 'super-secret-do-not-commit-1234567890abcdef',
};

export default config;
`,
    findings: [
      {
        ruleId: 'secure-coding/no-hardcoded-credentials',
        severity: 'error',
        line: 4,
        column: 11,
        message: 'Hardcoded AWS access-key pattern detected in identifier named `apiKey` (CWE-798). Move to an environment variable or secret manager.',
        ruleDocsPath: '/docs/security/plugin-secure-coding/rules/no-hardcoded-credentials',
      },
      {
        ruleId: 'secure-coding/no-hardcoded-credentials',
        severity: 'error',
        line: 5,
        column: 16,
        message: 'Database URL with embedded credentials in identifier named `databaseUrl` (CWE-798).',
        ruleDocsPath: '/docs/security/plugin-secure-coding/rules/no-hardcoded-credentials',
      },
      {
        ruleId: 'secure-coding/no-hardcoded-credentials',
        severity: 'error',
        line: 6,
        column: 14,
        message: 'High-entropy string in identifier named `jwtSecret` (CWE-798). Confidence: structural.',
        ruleDocsPath: '/docs/security/plugin-secure-coding/rules/no-hardcoded-credentials',
      },
    ],
  },
  {
    slug: 'pg-unsafe-query',
    title: 'pg/no-unsafe-query',
    description: 'SQL injection via string concatenation in `pg`/`postgres`/`knex` query calls.',
    tag: 'CWE-89 · SQL injection',
    code: `import { Pool } from 'pg';

const pool = new Pool();

export async function findUser(userId: string) {
  // BUG: 'userId' is concatenated into the SQL string.
  return pool.query('SELECT * FROM users WHERE id = ' + userId);
}

// Safe pattern for contrast:
export async function findUserSafe(userId: string) {
  return pool.query('SELECT * FROM users WHERE id = $1', [userId]);
}
`,
    findings: [
      {
        ruleId: 'pg/no-unsafe-query',
        severity: 'error',
        line: 7,
        column: 22,
        message: 'SQL string built via concatenation reaches `pool.query(...)` (CWE-89). Use parameterized placeholders (`$1`) and pass values as a second-argument array.',
        ruleDocsPath: '/docs/security/plugin-pg/rules/no-unsafe-query',
      },
    ],
  },
  {
    slug: 'mongodb-unsafe-query',
    title: 'mongodb-security/no-unsafe-query',
    description: 'NoSQL operator injection — `$where` accepts a JavaScript string evaluated on the server.',
    tag: 'CWE-943 · NoSQL injection',
    code: `import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URL!);

export async function findByUserCondition(condition: string) {
  const db = client.db('app');
  // BUG: condition is user input passed straight to $where.
  return db.collection('users').find({ $where: condition }).toArray();
}
`,
    findings: [
      {
        ruleId: 'mongodb-security/no-unsafe-query',
        severity: 'error',
        line: 8,
        column: 42,
        message: '`$where` operator evaluates the provided string as server-side JavaScript (CWE-943). Pass structured operators (`$eq`, `$gt`, …) and validate against an allow-list.',
        ruleDocsPath: '/docs/security/plugin-mongodb-security/rules/no-unsafe-query',
      },
    ],
  },
  {
    slug: 'browser-postmessage-wildcard',
    title: 'browser-security/no-postmessage-wildcard-origin',
    description: '`window.postMessage(data, "*")` lets any frame intercept the message — there is no legitimate use case.',
    tag: 'CWE-346 · Origin spoofing',
    code: `// Cross-iframe message handler in a third-party widget.

export function notifyParent(payload: unknown) {
  // BUG: wildcard targetOrigin means any frame can read 'payload'.
  window.parent.postMessage(payload, '*');
}

// Safe equivalent:
export function notifyParentSafe(payload: unknown, expectedOrigin: string) {
  window.parent.postMessage(payload, expectedOrigin);
}
`,
    findings: [
      {
        ruleId: 'browser-security/no-postmessage-wildcard-origin',
        severity: 'error',
        line: 5,
        column: 30,
        message: "`postMessage` with targetOrigin '*' exposes the payload to any frame mounted at the parent (CWE-346). Pass the expected origin explicitly.",
        ruleDocsPath: '/docs/security/plugin-browser-security/rules/no-postmessage-wildcard-origin',
      },
    ],
  },
  {
    slug: 'react-a11y-alt-text',
    title: 'react-a11y/alt-text',
    description: 'Missing alt text on rendered images — element-type coverage includes `<img>`, `<Image>` (Next), `<object>`, `<area>`, `<input type="image">`.',
    tag: 'WCAG 1.1.1 · Non-text content',
    code: `import Image from 'next/image';

export function ProductCard({ src, title }: { src: string; title: string }) {
  return (
    <div>
      <Image src={src} width={320} height={180} />
      <h3>{title}</h3>
      <img src={\`/thumbnails/\${src}\`} />
    </div>
  );
}
`,
    findings: [
      {
        ruleId: 'react-a11y/alt-text',
        severity: 'warn',
        line: 6,
        column: 7,
        message: 'Next.js `<Image>` is rendered without an `alt` prop (WCAG 1.1.1). Pass the product title, or `alt=""` if decorative.',
        ruleDocsPath: '/docs/quality/plugin-react-a11y/rules/alt-text',
      },
      {
        ruleId: 'react-a11y/alt-text',
        severity: 'warn',
        line: 8,
        column: 7,
        message: '`<img>` rendered without `alt`. Required for screen-reader users.',
        ruleDocsPath: '/docs/quality/plugin-react-a11y/rules/alt-text',
      },
    ],
  },
];

/**
 * Look up a snippet by slug. Used by the URL state contract
 * (`/play?example=<slug>`).
 */
export function getSnippetBySlug(slug: string | undefined): PlaygroundSnippet {
  if (!slug) return PLAYGROUND_SNIPPETS[0];
  return PLAYGROUND_SNIPPETS.find((s) => s.slug === slug) ?? PLAYGROUND_SNIPPETS[0];
}
