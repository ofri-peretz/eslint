/**
 * Security Edge Cases: False Positives & False Negatives
 *
 * Consolidated from:
 *   - Unit tests across eslint-plugin-node-security, eslint-plugin-secure-coding, eslint-plugin-lambda-security
 *   - Benchmark fixtures (fn-fp-comparison/fixtures/safe + vulnerable)
 *   - KI: remediation_tdd_patterns.md & interlace_fp_remediation_roadmap.md
 *
 * Each entry documents:
 *   type        – "FP" (should NOT flag) or "FN" (should flag but was missed)
 *   rule        – the rule ID that applies
 *   cwe         – CWE identifier
 *   category    – vulnerability category
 *   description – what this case tests
 *   code        – the code snippet
 *   source      – where this edge case was identified
 */

// =============================================================================
// FALSE POSITIVES (FP) — Safe code incorrectly flagged
// =============================================================================

export const FALSE_POSITIVES = [
  // ---------------------------------------------------------------------------
  // detect-child-process (CWE-78)
  // ---------------------------------------------------------------------------
  {
    rule: "node-security/detect-child-process",
    cwe: "CWE-78",
    category: "Command Injection",
    description:
      "execFile with literal command AND literal args array — no injection vector exists",
    code: `
      const { execFile } = require('child_process');
      execFile('git', ['clone', 'https://github.com/user/repo.git'], (err, stdout) => {
        console.log(stdout);
      });
    `,
    source: "unit-test:detect-child-process FP Fix #1",
  },
  {
    rule: "node-security/detect-child-process",
    cwe: "CWE-78",
    category: "Command Injection",
    description:
      "execFile with allowlist-validated variable arg — ALLOWED_BRANCHES.includes() guard",
    code: `
      const { execFile } = require('child_process');
      const ALLOWED_BRANCHES = ['main', 'develop', 'staging'];
      function checkoutBranch(branch) {
        if (ALLOWED_BRANCHES.includes(branch)) {
          execFile('git', ['checkout', branch], (err) => { if (err) throw err; });
        }
      }
    `,
    source: "unit-test:detect-child-process FP Fix #2",
  },
  {
    rule: "node-security/detect-child-process",
    cwe: "CWE-78",
    category: "Command Injection",
    description:
      "spawn with shell: false and literal args — shell defaults to false, inherently safe",
    code: `
      const { spawn } = require('child_process');
      const ls = spawn('ls', ['-la', '/tmp'], { shell: false });
    `,
    source:
      "unit-test:detect-child-process FP Fix #3 + benchmark:safe_cmd_spawn_noshell",
  },
  {
    rule: "node-security/detect-child-process",
    cwe: "CWE-78",
    category: "Command Injection",
    description:
      "execFile with allowlist guard clause + template literal in args (format validated)",
    code: `
      const { execFile } = require('child_process');
      const ALLOWED_FORMATS = ['png', 'jpg', 'gif'];
      function convert(format) {
        if (!ALLOWED_FORMATS.includes(format)) {
          throw new Error('Invalid format');
        }
        return execFile('convert', ['input.img', \`output.\${format}\`]);
      }
    `,
    source: "unit-test:benchmark FP safe_cmd_validated",
  },

  // ---------------------------------------------------------------------------
  // detect-non-literal-fs-filename (CWE-22)
  // ---------------------------------------------------------------------------
  {
    rule: "node-security/detect-non-literal-fs-filename",
    cwe: "CWE-22",
    category: "Path Traversal",
    description:
      "path.resolve + startsWith guard — industry-standard path traversal prevention",
    code: `
      const SAFE_DIR = '/var/app/uploads';
      function readUserFile(filename) {
        const safePath = path.resolve(SAFE_DIR, path.basename(filename));
        if (!safePath.startsWith(SAFE_DIR + path.sep)) {
          throw new Error('Path traversal detected');
        }
        return fs.readFileSync(safePath, 'utf8');
      }
    `,
    source:
      "unit-test:detect-non-literal-fs FP Fix #1 + benchmark:safe_path_validated",
  },
  {
    rule: "node-security/detect-non-literal-fs-filename",
    cwe: "CWE-22",
    category: "Path Traversal",
    description:
      "Allowlist validation (ALLOWED_FILES.includes) before fs.readFileSync",
    code: `
      const ALLOWED_FILES = ['config.json', 'readme.txt', 'data.csv'];
      function readConfig(filename) {
        if (!ALLOWED_FILES.includes(filename)) {
          throw new Error('File not allowed');
        }
        return fs.readFileSync(path.join('./config', filename));
      }
    `,
    source: "unit-test:benchmark FP safe_path_allowlist",
  },
  {
    rule: "node-security/detect-non-literal-fs-filename",
    cwe: "CWE-22",
    category: "Path Traversal",
    description:
      "Regex character validation before file access — only safe chars allowed",
    code: `
      function readUpload(filename) {
        if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
          throw new Error('Invalid filename characters');
        }
        return fs.readFileSync(path.join('./uploads', filename));
      }
    `,
    source: "unit-test:benchmark FP safe_path_regex",
  },
  {
    rule: "node-security/detect-non-literal-fs-filename",
    cwe: "CWE-22",
    category: "Path Traversal",
    description: "fs.realpathSync + startsWith — symlink-safe path validation",
    code: `
      const realPath = fs.realpathSync(userPath);
      if (realPath.startsWith(allowedDir)) {
        fs.readFile(realPath, callback);
      }
    `,
    source: "unit-test:detect-non-literal-fs FP Fix #3",
  },
  {
    rule: "node-security/detect-non-literal-fs-filename",
    cwe: "CWE-22",
    category: "Path Traversal",
    description: "path.join with ALL literal segments — no dynamic input",
    code: `fs.readFile(path.join(__dirname, 'data', 'config.json'), callback);`,
    source: "unit-test:detect-non-literal-fs FP Fix #4",
  },

  // ---------------------------------------------------------------------------
  // detect-object-injection (CWE-915 / CWE-1321)
  // ---------------------------------------------------------------------------
  {
    rule: "secure-coding/detect-object-injection",
    cwe: "CWE-1321",
    category: "Prototype Pollution",
    description:
      "Object.create(null) — null-prototype objects are immune to prototype pollution",
    code: `
      function safeStore(entries) {
        const obj = Object.create(null);
        for (const [key, value] of entries) {
          obj[key] = value;
        }
        return obj;
      }
    `,
    source: "unit-test:benchmark FP safe_proto_nullproto",
  },
  {
    rule: "secure-coding/detect-object-injection",
    cwe: "CWE-1321",
    category: "Prototype Pollution",
    description:
      "Fisher-Yates shuffle — numeric array index bracket access is not prototype pollution",
    code: `
      function shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }
    `,
    source: "unit-test:benchmark FP safe_random_shuffle",
  },
  {
    rule: "secure-coding/detect-object-injection",
    cwe: "CWE-1321",
    category: "Prototype Pollution",
    description:
      "Allowlist includes() guard before bracket assignment — validated key is safe",
    code: `
      const VALID_KEYS = ['name', 'email', 'age'];
      function getField(obj, key) {
        if (VALID_KEYS.includes(key)) {
          return obj[key];
        }
      }
    `,
    source: "unit-test:detect-object-injection valid",
  },
  {
    rule: "secure-coding/detect-object-injection",
    cwe: "CWE-1321",
    category: "Prototype Pollution",
    description: "hasOwnProperty check before bracket access",
    code: `
      function safeGet(obj, key) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          return obj[key];
        }
      }
    `,
    source: "unit-test:detect-object-injection valid",
  },
  {
    rule: "secure-coding/detect-object-injection",
    cwe: "CWE-1321",
    category: "Prototype Pollution",
    description: "Object.hasOwn (ES2022) check before bracket access",
    code: `
      function safeGet(obj, key) {
        if (Object.hasOwn(obj, key)) {
          return obj[key];
        }
      }
    `,
    source: "unit-test:detect-object-injection valid",
  },
  {
    rule: "secure-coding/detect-object-injection",
    cwe: "CWE-1321",
    category: "Prototype Pollution",
    description: "'in' operator check before bracket access",
    code: `
      function safeGet(obj, key) {
        if (key in obj) {
          return obj[key];
        }
      }
    `,
    source: "unit-test:detect-object-injection valid",
  },
  {
    rule: "secure-coding/detect-object-injection",
    cwe: "CWE-1321",
    category: "Prototype Pollution",
    description: "Map/WeakMap usage — immune to prototype pollution by design",
    code: `
      function safeStore(entries) {
        const map = new Map();
        for (const [key, value] of entries) { map.set(key, value); }
        return map;
      }
    `,
    source: "benchmark:safe_proto_map + KI:remediation",
  },

  // ---------------------------------------------------------------------------
  // no-graphql-injection (CWE-89 / CWE-400)
  // ---------------------------------------------------------------------------
  {
    rule: "secure-coding/no-graphql-injection",
    cwe: "CWE-89",
    category: "GraphQL Injection",
    description:
      "Template literal used for logging — NOT a GraphQL query, no structural markers",
    code: `
      function logUser(username) {
        console.log(\`User logged in: \${username}\`);
        return { message: \`Welcome, \${username}\` };
      }
    `,
    source: "unit-test:benchmark FP safe_template_logging",
  },
  {
    rule: "secure-coding/no-graphql-injection",
    cwe: "CWE-89",
    category: "GraphQL Injection",
    description:
      "Template literal in execFile args — not GraphQL, just command arg interpolation",
    code: `
      const { execFile } = require('child_process');
      execFile('convert', ['input.img', \`output.\${format}\`]);
    `,
    source: "unit-test:benchmark FP safe_cmd_validated template",
  },
  {
    rule: "secure-coding/no-graphql-injection",
    cwe: "CWE-89",
    category: "GraphQL Injection",
    description: "URL constructor with template literal — not a GraphQL query",
    code: `
      function redirect(req, res) {
        const target = req.query.returnTo;
        const url = new URL(target, \`https://\${req.headers.host}\`);
        if (url.host !== req.headers.host) { return res.redirect('/'); }
        res.redirect(url.pathname);
      }
    `,
    source: "unit-test:benchmark FP safe_redirect_sameorigin",
  },
  {
    rule: "secure-coding/no-graphql-injection",
    cwe: "CWE-89",
    category: "GraphQL Injection",
    description:
      "Sanitized/validated input before interpolation in GraphQL query",
    code: `
      const cleanId = validate(userId);
      const query = \`query { user(id: "\${cleanId}") { name } }\`;
    `,
    source: "unit-test:no-graphql-injection valid FP reduced",
  },

  // ---------------------------------------------------------------------------
  // no-xpath-injection (CWE-643)
  // ---------------------------------------------------------------------------
  {
    rule: "secure-coding/no-xpath-injection",
    cwe: "CWE-643",
    category: "XPath Injection",
    description: "CSS selectors — forward slashes in non-XPath context",
    code: `document.querySelector("[data-id='test']");`,
    source: "KI:remediation_tdd_patterns XPath semantic context",
  },
  {
    rule: "secure-coding/no-xpath-injection",
    cwe: "CWE-643",
    category: "XPath Injection",
    description: "File paths — /home/, /usr/, /tmp/ are not XPath",
    code: `const configPath = "/config/database";`,
    source: "unit-test:no-xpath-injection valid + KI:remediation",
  },
  {
    rule: "secure-coding/no-xpath-injection",
    cwe: "CWE-643",
    category: "XPath Injection",
    description: "URL/API paths — https:// and /api/ are not XPath",
    code: `fetch('https://api.example.com/users/123');`,
    source: "KI:remediation_tdd_patterns XPath URL path exclusion",
  },
  {
    rule: "secure-coding/no-xpath-injection",
    cwe: "CWE-643",
    category: "XPath Injection",
    description: "Validated XPath input with escapeXPath() sanitizer",
    code: `
      const safeId = validateXPathInput(userId);
      const xpath = \`/users/user[@id="\${safeId}"]\`;
    `,
    source: "unit-test:no-xpath-injection valid FP reduced",
  },

  // ---------------------------------------------------------------------------
  // no-insecure-comparison (CWE-697 / CWE-208)
  // ---------------------------------------------------------------------------
  {
    rule: "secure-coding/no-insecure-comparison",
    cwe: "CWE-208",
    category: "Timing Attack",
    description:
      ".length comparison before timingSafeEqual — leaks only length, acceptable pattern",
    code: `
      function safeCompare(input, secret) {
        const crypto = require('crypto');
        const inputBuffer = Buffer.from(input);
        const secretBuffer = Buffer.from(secret);
        if (inputBuffer.length !== secretBuffer.length) { return false; }
        return crypto.timingSafeEqual(inputBuffer, secretBuffer);
      }
    `,
    source: "unit-test:benchmark FP safe_timing_compare",
  },

  // ---------------------------------------------------------------------------
  // no-sensitive-data-exposure
  // ---------------------------------------------------------------------------
  {
    rule: "secure-coding/no-sensitive-data-exposure",
    cwe: "CWE-200",
    category: "Sensitive Data Exposure",
    description:
      "'Invalid key' in error — 'key' refers to object property, not API key",
    code: `
      function validateKey(obj, key, value) {
        const VALID_KEYS = ['name', 'email', 'age', 'status'];
        if (!VALID_KEYS.includes(key)) {
          throw new Error('Invalid key');
        }
        obj[key] = value;
      }
    `,
    source: "unit-test:benchmark FP safe_proto_allowlist",
  },
  {
    rule: "secure-coding/no-sensitive-data-exposure",
    cwe: "CWE-200",
    category: "Sensitive Data Exposure",
    description: "'Press any key' — 'key' in UI context is not sensitive data",
    code: `console.log('Press any key to continue');`,
    source: "unit-test:no-sensitive-data-exposure FP",
  },
  {
    rule: "secure-coding/no-sensitive-data-exposure",
    cwe: "CWE-200",
    category: "Sensitive Data Exposure",
    description:
      "Password hashing/comparison — bcrypt.hash is a security operation, not exposure",
    code: `
      const bcrypt = require('bcrypt');
      async function hashPassword(password) {
        return bcrypt.hash(password, 12);
      }
    `,
    source: "KI:remediation_tdd_patterns no-sensitive-data safe patterns",
  },

  // ---------------------------------------------------------------------------
  // no-zip-slip (CWE-22)
  // ---------------------------------------------------------------------------
  {
    rule: "node-security/no-zip-slip",
    cwe: "CWE-22",
    category: "Zip Slip",
    description:
      "Extraction to /tmp or os.tmpdir() — safe by policy for scratch space",
    code: `
      const os = require('os');
      zip.extractAllTo(os.tmpdir());
    `,
    source: "KI:remediation_tdd_patterns no-zip-slip safe destinations",
  },
  {
    rule: "node-security/no-zip-slip",
    cwe: "CWE-22",
    category: "Zip Slip",
    description: "path.basename sanitization on entry name strips traversal",
    code: `
      const safeName = path.basename(entry.name);
      fs.writeFileSync(path.join(dest, safeName), data);
    `,
    source: "KI:remediation_tdd_patterns no-zip-slip basename",
  },
  {
    rule: "node-security/no-zip-slip",
    cwe: "CWE-22",
    category: "Zip Slip",
    description: "path.normalize + includes('..') check before write",
    code: `
      const normalized = path.normalize(entry.name);
      if (normalized.includes('..')) throw new Error('Zip slip detected');
      fs.writeFileSync(path.join(dest, normalized), data);
    `,
    source: "KI:remediation_tdd_patterns no-zip-slip normalization",
  },

  // ---------------------------------------------------------------------------
  // no-ssrf (CWE-918)
  // ---------------------------------------------------------------------------
  {
    rule: "node-security/no-ssrf",
    cwe: "CWE-918",
    category: "SSRF",
    description:
      "URL allowlist with ALLOWED_HOSTS.includes() guard before fetch",
    code: `
      const ALLOWED_HOSTS = ["api.stripe.com", "api.twilio.com"];
      const url = new URL(endpoint);
      if (!ALLOWED_HOSTS.includes(url.host)) {
        throw new Error("Host not allowed");
      }
      fetch(endpoint);
    `,
    source: "unit-test:no-ssrf benchmark FP safe_ssrf_allowlist",
  },
  {
    rule: "node-security/no-ssrf",
    cwe: "CWE-918",
    category: "SSRF",
    description:
      "Internal IP regex blocking before fetch — internalPatterns.some(.test())",
    code: `
      const url = new URL(userUrl);
      const hostname = url.hostname;
      const internalPatterns = [/^localhost$/i, /^127\\./, /^192\\.168\\./];
      if (internalPatterns.some((p) => p.test(hostname))) {
        throw new Error("Internal hosts not allowed");
      }
      fetch(userUrl);
    `,
    source: "unit-test:no-ssrf benchmark FP safe_ssrf_block_internal",
  },
];

// =============================================================================
// FALSE NEGATIVES (FN) — Vulnerable code NOT detected
// =============================================================================

export const FALSE_NEGATIVES = [
  // ---------------------------------------------------------------------------
  // SQL Injection (CWE-89) — NOT caught by Interlace in benchmark
  // ---------------------------------------------------------------------------
  {
    rule: "MISSING",
    cwe: "CWE-89",
    category: "SQL Injection",
    description: "Classic string concatenation in SQL query — missed entirely",
    code: `
      function getUser(userId) {
        const query = "SELECT * FROM users WHERE id = " + userId;
        return db.query(query);
      }
    `,
    source: "benchmark:vuln_sql_string_concat + KI:fn_remediation",
  },
  {
    rule: "MISSING",
    cwe: "CWE-89",
    category: "SQL Injection",
    description: "Template literal in SQL query — modern injection pattern",
    code: `
      function getUser(email) {
        const query = \`SELECT * FROM users WHERE email = '\${email}'\`;
        return db.query(query);
      }
    `,
    source: "benchmark:vuln_sql_template_literal",
  },
  {
    rule: "MISSING",
    cwe: "CWE-89",
    category: "SQL Injection",
    description:
      "Dynamic column/table name — less obvious but equally dangerous",
    code: `
      function sortUsers(sortColumn) {
        const query = \`SELECT * FROM users ORDER BY \${sortColumn}\`;
        return db.query(query);
      }
    `,
    source: "benchmark:vuln_sql_dynamic_column",
  },
  {
    rule: "MISSING",
    cwe: "CWE-89",
    category: "SQL Injection",
    description: "Conditional query building with concat — complex injection",
    code: `
      function search(filters) {
        let query = "SELECT * FROM products WHERE 1=1";
        if (filters.name) { query += \` AND name = '\${filters.name}'\`; }
        return db.query(query);
      }
    `,
    source: "benchmark:vuln_sql_conditional",
  },

  // ---------------------------------------------------------------------------
  // SSRF (CWE-918) — Was missing, now partially covered by no-ssrf
  // ---------------------------------------------------------------------------
  {
    rule: "node-security/no-ssrf",
    cwe: "CWE-918",
    category: "SSRF",
    description: "fetch with user-controlled URL — basic SSRF",
    code: `
      async function proxy(userUrl) {
        const response = await fetch(userUrl);
        return response.json();
      }
    `,
    source: "benchmark:vuln_ssrf_fetch",
  },
  {
    rule: "node-security/no-ssrf",
    cwe: "CWE-918",
    category: "SSRF",
    description: "axios.get with user-controlled endpoint",
    code: `
      async function callApi(endpoint) {
        return axios.get(endpoint);
      }
    `,
    source: "benchmark:vuln_ssrf_axios",
  },

  // ---------------------------------------------------------------------------
  // NoSQL Injection (CWE-943) — NOT caught
  // ---------------------------------------------------------------------------
  {
    rule: "MISSING",
    cwe: "CWE-943",
    category: "NoSQL Injection",
    description: "MongoDB $where with user input — code injection via operator",
    code: `
      async function findUsers(userInput) {
        return db.collection('users').find({ $where: userInput });
      }
    `,
    source: "benchmark:vuln_nosql_where + KI:fn_remediation",
  },
  {
    rule: "MISSING",
    cwe: "CWE-943",
    category: "NoSQL Injection",
    description:
      "MongoDB query with unsanitized user input — operator injection",
    code: `
      async function findUser(username) {
        return db.collection('users').findOne({ username });
      }
    `,
    source: "benchmark:vuln_nosql_mongo",
  },

  // ---------------------------------------------------------------------------
  // Insecure Randomness (CWE-330) — NOT caught
  // ---------------------------------------------------------------------------
  {
    rule: "MISSING",
    cwe: "CWE-330",
    category: "Insecure Randomness",
    description:
      "Math.random() for security token generation — predictable output",
    code: `
      function generateToken() {
        return Math.random().toString(36).substring(2);
      }
    `,
    source: "benchmark:vuln_random_token + KI:fn_remediation",
  },
  {
    rule: "MISSING",
    cwe: "CWE-330",
    category: "Insecure Randomness",
    description: "Math.random() for session ID — predictable session",
    code: `
      function generateSessionId() {
        return 'session_' + Math.floor(Math.random() * 1000000);
      }
    `,
    source: "benchmark:vuln_random_session",
  },

  // ---------------------------------------------------------------------------
  // Open Redirect (CWE-601) — NOT caught
  // ---------------------------------------------------------------------------
  {
    rule: "MISSING",
    cwe: "CWE-601",
    category: "Open Redirect",
    description: "Express res.redirect with unvalidated user input",
    code: `
      function handleRedirect(req, res) {
        const returnUrl = req.query.returnTo;
        res.redirect(returnUrl);
      }
    `,
    source: "benchmark:vuln_redirect + KI:fn_remediation",
  },

  // ---------------------------------------------------------------------------
  // Static Analysis Structural Limitations (Cross-cutting FNs)
  // ---------------------------------------------------------------------------
  {
    rule: "ANY",
    cwe: "N/A",
    category: "Cross-File Data Flow",
    description:
      "Imported value from another module — ESLint analyzes single files",
    code: `
      import { buildQuery } from './query-builder';
      db.query(buildQuery(userInput));
    `,
    source: "workflow:fn-documentation category 4",
  },
  {
    rule: "ANY",
    cwe: "N/A",
    category: "Wrapped/Aliased Functions",
    description:
      "Function alias — rule matches specific method names, aliases bypass detection",
    code: `
      const executeQuery = db.query.bind(db);
      executeQuery(unsafeInput);
    `,
    source: "workflow:fn-documentation category 2",
  },
  {
    rule: "ANY",
    cwe: "N/A",
    category: "Destructured References",
    description:
      "Destructured DB method — loses object context for rule matching",
    code: `
      const { query } = pool;
      query(unsafeInput);
    `,
    source: "workflow:fn-documentation category 3",
  },
  {
    rule: "ANY",
    cwe: "N/A",
    category: "Dynamic Variable Resolution",
    description: "Dynamic key lookup from object — value unknown at lint time",
    code: `
      const queries = { getUser: 'SELECT * FROM users WHERE id = ' + userId };
      db.query(queries[action]);
    `,
    source: "workflow:fn-documentation category 1",
  },
];

// =============================================================================
// Summary & Stats
// =============================================================================

export const EDGE_CASE_SUMMARY = {
  totalFalsePositives: FALSE_POSITIVES.length,
  totalFalseNegatives: FALSE_NEGATIVES.length,
  fpByRule: Object.entries(
    FALSE_POSITIVES.reduce((acc, c) => {
      acc[c.rule] = (acc[c.rule] || 0) + 1;
      return acc;
    }, {}),
  ),
  fnByCategory: Object.entries(
    FALSE_NEGATIVES.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {}),
  ),
  fnMissingRules: [
    "SQL Injection (no-sql-injection / detect-sql-injection)",
    "NoSQL Injection (no-nosql-injection)",
    "Insecure Randomness (no-insecure-randomness)",
    "Open Redirect (no-open-redirect)",
  ],
};
