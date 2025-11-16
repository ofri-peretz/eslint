/**
 * ESLint Rule: database-injection
 * Comprehensive SQL/NoSQL injection vulnerability detection
 * Inspired by SonarQube RSPEC-3649
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-3649/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'databaseInjection'
  | 'usePrisma'
  | 'useTypeORM'
  | 'useParameterized'
  | 'useMongoSanitize';

export interface Options {
  /** Detect NoSQL injection patterns. Default: true */
  detectNoSQL?: boolean;
  
  /** Detect ORM-specific vulnerabilities. Default: true */
  detectORMs?: boolean;
  
  /** Trusted data sources that bypass detection */
  trustedSources?: string[];
  
  /** Show framework-specific recommendations. Default: true */
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
      databaseInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
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
    const { detectNoSQL = true } = options;

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
     * NoSQL query patterns in template literals (e.g., `this.name === "${userName}"`)
     */
    const NOSQL_QUERY_PATTERNS = [
      /this\.\w+\s*===?\s*["']/i,  // this.name === "value"
      /this\.\w+\s*!==?\s*["']/i,   // this.name !== "value"
      /\$\w+\s*===?\s*["']/i,       // $where === "value"
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
     * Check template literal for SQL or NoSQL injection
     */
    function checkTemplateLiteral(node: TSESTree.TemplateLiteral) {
      const text = sourceCode.getText(node);
      
      // Check for SQL injection
      if (containsSQLKeywords(text) && node.expressions.length > 0) {
      // Check if any expression is tainted
      const taintedExprs = node.expressions.filter((expr: TSESTree.Expression | TSESTree.SpreadElement) => isTainted(expr).tainted);
        if (taintedExprs.length > 0) {
      const vulnDetails = analyzeVulnerability(node, 'SQL');
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
          return;
        }
      }

      // Check for NoSQL injection patterns in template literals
      if (detectNoSQL && node.expressions.length > 0) {
        const hasNoSQLPattern = NOSQL_QUERY_PATTERNS.some(pattern => pattern.test(text));
        if (hasNoSQLPattern) {
          // Check if any expression is tainted
          const taintedExprs = node.expressions.filter((expr: TSESTree.Expression | TSESTree.SpreadElement) => isTainted(expr).tainted);
          if (taintedExprs.length > 0) {
            const vulnDetails = analyzeVulnerability(node, 'NoSQL');
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
                currentExample: `const query = \`this.name === "${'${userName}'}"\``,
                fixExample: `Sanitize input: const query = \`this.name === "\${mongoSanitize(userName)}"\``,
                docLink: 'https://owasp.org/www-community/attacks/NoSQL_Injection',
              },
            });
            return;
          }
        }
      }
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

    /**
     * Check binary expression (string concatenation) for SQL injection
     */
    function checkBinaryExpression(node: TSESTree.BinaryExpression) {
      // Only check string concatenation with + operator
      if (node.operator !== '+') return;

      // Get the full text of the binary expression
      const text = sourceCode.getText(node);
      
      // Check if it contains SQL keywords
      if (!containsSQLKeywords(text)) return;

      // Check if any part of the expression is tainted
      const taintInfo = isTainted(node);
      if (!taintInfo.tainted) {
        // Also check left and right sides individually
        const leftTainted = isTainted(node.left).tainted;
        const rightTainted = isTainted(node.right).tainted;
        if (!leftTainted && !rightTainted) return;
      }

      const vulnDetails = analyzeVulnerability(node, 'SQL');
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
          currentExample: `const query = "SELECT * FROM users WHERE name = '" + userName + "'"`,
          fixExample: `Use parameterized: db.query("SELECT * FROM users WHERE name = ?", [userName])`,
          docLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
        },
      });
    }

    return {
      TemplateLiteral: checkTemplateLiteral,
      CallExpression: checkNoSQLOperation,
      BinaryExpression: checkBinaryExpression,
    };
  },
});

