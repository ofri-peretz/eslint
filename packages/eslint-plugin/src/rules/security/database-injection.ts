/**
 * ESLint Rule: database-injection
 * Comprehensive SQL/NoSQL injection vulnerability detection
 * Inspired by SonarQube RSPEC-3649
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-3649/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext, containsSecurityKeywords } from '../../utils/llm-context';

type MessageIds =
  | 'databaseInjection'
  | 'usePrisma'
  | 'useTypeORM'
  | 'useParameterized'
  | 'useMongoSanitize';

export interface Options {
  detectNoSQL?: boolean;
  detectORMs?: boolean;
  trustedSources?: string[];
  frameworkHints?: boolean;
}

type RuleOptions = [Options?];

interface VulnerabilityDetails {
  type: 'SQL' | 'NoSQL';
  pattern: string;
  severity: 'critical' | 'high' | 'medium';
  exploitability: string;
  cwe: string;
  owasp: string;
}

export const databaseInjection = createRule<RuleOptions, MessageIds>({
  name: 'database-injection',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects SQL and NoSQL injection vulnerabilities with framework-specific fixes',
    },
    messages: {
      // 🎯 Token optimization: 42% reduction (52→30 tokens) by removing ❌/✅ labels
      // This compact format: same clarity, faster LLM processing, lower API costs
      databaseInjection:
        '🔒 CWE-89 | SQL Injection detected | CRITICAL\n' +
        '   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection',
      usePrisma: '✅ Use Prisma ORM (recommended)',
      useTypeORM: '✅ Use TypeORM with QueryBuilder',
      useParameterized: '✅ Use parameterized query',
      useMongoSanitize: '✅ Use mongo-sanitize',
    },
    schema: [
      {
        type: 'object',
        properties: {
          detectNoSQL: {
            type: 'boolean',
            default: true,
          },
          detectORMs: {
            type: 'boolean',
            default: true,
            description: 'Detect unsafe ORM usage',
          },
          trustedSources: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          frameworkHints: {
            type: 'boolean',
            default: true,
            description: 'Provide framework-specific suggestions',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      detectNoSQL: true,
      detectORMs: true,
      trustedSources: [],
      frameworkHints: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { detectNoSQL = true, frameworkHints = true } = options;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    /**
     * SQL keywords for detection
     */
    const SQL_KEYWORDS = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 
      'EXEC', 'EXECUTE', 'TRUNCATE', 'GRANT', 'REVOKE', 'WHERE', 'FROM', 'JOIN'
    ];

    /**
     * NoSQL patterns
     */
    const NOSQL_PATTERNS = [
      'find', 'findOne', 'findById', 'updateOne', 'updateMany', 'deleteOne', 
      'deleteMany', 'aggregate', '$where', '$regex'
    ];

    /**
     * Check if text contains SQL keywords
     */
    function containsSQLKeywords(text: string): boolean {
      const upperText = text.toUpperCase();
      return SQL_KEYWORDS.some(keyword => upperText.includes(keyword));
    }

    /**
     * Check if code is using NoSQL operations
     */
    function isNoSQLOperation(node: TSESTree.Node): boolean {
      const text = sourceCode.getText(node);
      return NOSQL_PATTERNS.some(pattern => text.includes(pattern));
    }

    /**
     * Check if expression is tainted (contains user input)
     */
    function isTainted(node: TSESTree.Node): {
      tainted: boolean;
      source?: string;
      confidence: 'high' | 'medium' | 'low';
    } {
      const text = sourceCode.getText(node);

      // High confidence taint sources
      const highConfidenceSources = [
        'req.body', 'req.query', 'req.params', 'request.body',
        'params.', 'query.', 'body.', 'input.', 'userInput'
      ];

      // Medium confidence taint sources
      const mediumConfidenceSources = [
        'props.', 'state.', 'context.', 'event.', 'data.'
      ];

      for (const source of highConfidenceSources) {
        if (text.includes(source)) {
          return { tainted: true, source, confidence: 'high' };
        }
      }

      for (const source of mediumConfidenceSources) {
        if (text.includes(source)) {
          return { tainted: true, source, confidence: 'medium' };
        }
      }

      // Check if it's a variable (low confidence)
      if (node.type === 'Identifier' && !text.match(/^[A-Z_]+$/)) {
        return { tainted: true, source: 'variable', confidence: 'low' };
      }

      return { tainted: false, confidence: 'low' };
    }

    /**
     * Detect framework being used
     */
    function detectFramework(): {
      name: string;
      confidence: number;
    } | null {
      const fullText = sourceCode.getText();

      const frameworks = [
        { name: 'Prisma', pattern: /@prisma\/client|prisma\./i, confidence: 0.9 },
        { name: 'TypeORM', pattern: /typeorm|@Entity|Repository/i, confidence: 0.85 },
        { name: 'Sequelize', pattern: /sequelize|Sequelize/i, confidence: 0.85 },
        { name: 'Mongoose', pattern: /mongoose|Schema\.Types/i, confidence: 0.85 },
        { name: 'Knex', pattern: /knex|\.table\(/i, confidence: 0.8 },
        { name: 'Raw SQL', pattern: /query\(|execute\(|raw\(/i, confidence: 0.7 },
      ];

      for (const framework of frameworks) {
        if (framework.pattern.test(fullText)) {
          return framework;
        }
      }

      return null;
    }

    /**
     * Generate framework-specific secure alternative
     */
    function generateSecureAlternative(
      vulnType: 'SQL' | 'NoSQL'
    ): {
      framework: string;
      code: string;
      explanation: string;
      confidence: 'high' | 'medium' | 'low';
    }[] {
      const alternatives = [];

      if (vulnType === 'SQL') {
        // Prisma
        alternatives.push({
          framework: 'Prisma (Recommended)',
          code: `const user = await prisma.user.findUnique({
  where: { email: userEmail }
});`,
          explanation: 'Prisma automatically parameterizes all queries, preventing SQL injection',
          confidence: 'high' as const,
        });

        // TypeORM
        alternatives.push({
          framework: 'TypeORM',
          code: `const user = await userRepository.findOne({
  where: { email: userEmail }
});`,
          explanation: 'TypeORM QueryBuilder safely parameterizes queries',
          confidence: 'high' as const,
        });

        // Raw parameterized
        alternatives.push({
          framework: 'Parameterized Query (pg/mysql2)',
          code: `const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
);`,
          explanation: 'Parameterized queries separate SQL from data',
          confidence: 'high' as const,
        });
      }

      if (vulnType === 'NoSQL') {
        // Mongoose with sanitization
        alternatives.push({
          framework: 'Mongoose + mongo-sanitize',
          code: `import mongoSanitize from 'mongo-sanitize';
const cleanInput = mongoSanitize(userInput);
const user = await User.findOne({ email: cleanInput });`,
          explanation: 'Sanitizes user input to prevent NoSQL injection operators',
          confidence: 'high' as const,
        });

        // Validation approach
        alternatives.push({
          framework: 'Input Validation',
          code: `// Validate email format
if (!/^[\\w.%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$/.test(userEmail)) {
  throw new Error('Invalid email');
}
const user = await User.findOne({ email: userEmail });`,
          explanation: 'Strict validation prevents injection operators',
          confidence: 'medium' as const,
        });
      }

      return alternatives;
    }

    /**
     * Analyze vulnerability and provide detailed report
     */
    function analyzeVulnerability(
      node: TSESTree.Node,
      vulnType: 'SQL' | 'NoSQL'
    ): VulnerabilityDetails {
      const taintInfo = isTainted(node);

      return {
        type: vulnType,
        pattern: taintInfo.tainted
          ? `User input (${taintInfo.source}) in query`
          : 'Dynamic query construction',
        severity: taintInfo.confidence === 'high' ? 'critical' : taintInfo.confidence === 'medium' ? 'high' : 'medium',
        exploitability: taintInfo.confidence === 'high'
          ? 'Easily exploitable via API parameters'
          : 'Exploitable with access to input sources',
        cwe: vulnType === 'SQL' ? 'CWE-89' : 'CWE-943',
        owasp: 'A03:2021 - Injection',
      };
    }

    /**
     * Check template literal for SQL injection
     */
    function checkTemplateLiteral(node: TSESTree.TemplateLiteral) {
      const text = sourceCode.getText(node);
      
      if (!containsSQLKeywords(text)) return;
      if (node.expressions.length === 0) return;

      // Check if any expression is tainted
      const taintedExprs = node.expressions.filter((expr: TSESTree.Expression | TSESTree.SpreadElement) => isTainted(expr).tainted);
      if (taintedExprs.length === 0) return;

      const vulnDetails = analyzeVulnerability(node, 'SQL');
      const framework = detectFramework();
      const alternatives = generateSecureAlternative('SQL');
      const securityContext = containsSecurityKeywords(text);

      const llmContext = generateLLMContext('security/database-injection', {
        severity: 'error',
        category: 'security',
        filePath: filename,
        node,
        details: {
          vulnerability: vulnDetails,
          detectedFramework: framework?.name || 'Unknown',
          sensitiveContext: securityContext.isSensitive
            ? {
                category: securityContext.category,
                keywords: securityContext.keywords,
                riskLevel: 'CRITICAL',
              }
            : undefined,
          attack: {
            vector: 'SQL Injection via template literal interpolation',
            examples: [
              `Input: ' OR '1'='1`,
              `Input: '; DROP TABLE users--`,
              `Input: ' UNION SELECT password FROM admin--`,
            ],
            impact: [
              'Complete database access',
              'Data theft (PII, credentials, payment info)',
              'Data modification/deletion',
              'Privilege escalation',
              'Remote code execution (in some cases)',
            ],
            realWorldCost: '$4.24M average data breach cost (IBM 2023)',
          },
          insecurePattern: {
            code: text.length > 150 ? text.substring(0, 150) + '...' : text,
            why: 'User input directly interpolated into SQL query string',
            dataFlow: taintedExprs.map((expr: TSESTree.Expression | TSESTree.SpreadElement) => ({
              source: isTainted(expr).source,
              sink: 'SQL Query',
              vulnerable: true,
            })),
          },
          secureAlternatives: alternatives,
          bestPractice: {
            primary: 'Use ORM with parameterized queries (Prisma, TypeORM)',
            fallback: 'Use parameterized/prepared statements',
            validation: 'Add input validation as defense-in-depth',
            never: [
              'Never concatenate user input into SQL',
              'Never trust client-side validation only',
              'Never use dynamic column/table names without whitelist',
            ],
          },
          compliance: {
            pciDss: 'Requirement 6.5.1 - Injection flaws',
            hipaa: 'Security Rule - Access Controls',
            gdpr: 'Article 32 - Security of processing',
            owasp: 'A03:2021 - Injection (3rd most critical)',
            cwe: vulnDetails.cwe,
            cvss: '9.8 Critical (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)',
          },
          testing: {
            manualTests: [
              "Try input: ' OR 1=1--",
              "Try input: '; DROP TABLE test--",
              'Use SQLMap or similar tools',
            ],
            automatedTools: ['SQLMap', 'Burp Suite', 'OWASP ZAP'],
            unitTest: 'Add test with malicious SQL input',
          },
        },
        quickFix: {
          automated: true,
          estimatedEffort: '5-15 minutes',
          changes: [
            'Replace template literal with parameterized query',
            'Use ORM query builder',
            'Add input validation',
            'Add integration test',
          ],
        },
        resources: {
          docs: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
          examples: 'https://rules.sonarsource.com/javascript/RSPEC-3649/',
          migration: framework?.name
            ? `https://www.prisma.io/docs/getting-started`
            : 'https://node-postgres.com/features/queries#parameterized-query',
        },
      });

      context.report({
        node,
        messageId: 'databaseInjection',
        data: {
          type: vulnDetails.type,
          severity: vulnDetails.severity.toUpperCase(),
          filePath: filename,
          line: String(node.loc?.start.line ?? 0),
          cwe: vulnDetails.cwe,
          cweCode: vulnDetails.cwe.replace('CWE-', ''),
          currentExample: `db.query(\`SELECT * FROM users WHERE id = ${'${userId}'}\`)`,
          fixExample: `Use parameterized: db.query("SELECT * FROM users WHERE id = ?", [userId])`,
          docLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
        },
      });
    }

    /**
     * Check NoSQL operations
     */
    function checkNoSQLOperation(node: TSESTree.CallExpression) {
      if (!detectNoSQL) return;
      if (!isNoSQLOperation(node)) return;

      // Check if arguments contain user input
      const taintedArgs = node.arguments.filter((arg: TSESTree.CallExpressionArgument) => isTainted(arg).tainted);
      if (taintedArgs.length === 0) return;

      const vulnDetails = analyzeVulnerability(node, 'NoSQL');
      const alternatives = generateSecureAlternative('NoSQL');

      const llmContext = generateLLMContext('security/database-injection', {
        severity: 'error',
        category: 'security',
        filePath: filename,
        node,
        details: {
          vulnerability: vulnDetails,
          attack: {
            vector: 'NoSQL Injection via query operators',
            examples: [
              `Input: { "$ne": null } bypasses authentication`,
              `Input: { "$gt": "" } returns all records`,
              `Input: { "$where": "malicious code" }`,
            ],
            impact: [
              'Authentication bypass',
              'Unauthorized data access',
              'Data extraction',
              'Denial of service',
            ],
          },
          insecurePattern: {
            code: sourceCode.getText(node),
            why: 'User input can inject NoSQL operators ($ne, $gt, $where, etc.)',
          },
          secureAlternatives: alternatives,
          compliance: {
            owasp: 'A03:2021 - Injection',
            cwe: 'CWE-943: NoSQL Injection',
          },
        },
        quickFix: {
          automated: false,
          estimatedEffort: '5-10 minutes',
          changes: ['Add mongo-sanitize', 'Validate input types', 'Use strict schemas'],
        },
        resources: {
          docs: 'https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html',
        },
      });

      context.report({
        node,
        messageId: 'databaseInjection',
        data: {
          type: vulnDetails.type,
          severity: vulnDetails.severity.toUpperCase(),
          filePath: filename,
          line: String(node.loc?.start.line ?? 0),
          cwe: vulnDetails.cwe,
          cweCode: vulnDetails.cwe.replace('CWE-', ''),
          currentExample: `User.findOne({ email: req.body.email })`,
          fixExample: `Sanitize input: User.findOne({ email: mongoSanitize(req.body.email) })`,
          docLink: 'https://owasp.org/www-community/attacks/NoSQL_Injection',
        },
      });
    }

    return {
      TemplateLiteral: checkTemplateLiteral,
      CallExpression: checkNoSQLOperation,
    };
  },
});

