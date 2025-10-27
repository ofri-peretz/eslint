/**
 * Utilities for generating LLM-optimized context in ESLint rules
 */
import type { TSESTree } from '@forge-js/eslint-plugin-utils';

export interface LLMContext {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  category: 'migration' | 'security' | 'performance' | 'accessibility' | 'deprecation' | 'domain';
  filePath: string;
  location: {
    line: number;
    column: number;
  };
  quickFix?: {
    automated: boolean;
    estimatedEffort?: string;
    changes: string[];
  };
  resources?: {
    docs?: string;
    examples?: string;
    migration?: string;
  };
}

/**
 * Generate standardized LLM context for error messages
 */
export function generateLLMContext(
  ruleId: string,
  context: {
    severity: 'error' | 'warning' | 'info';
    category: LLMContext['category'];
    filePath: string;
    node: TSESTree.Node;
    details: Record<string, unknown>;
    quickFix?: LLMContext['quickFix'];
    resources?: LLMContext['resources'];
  }
): LLMContext {
  return {
    ruleId,
    severity: context.severity,
    category: context.category,
    filePath: context.filePath,
    location: {
      line: context.node.loc?.start.line ?? 0,
      column: context.node.loc?.start.column ?? 0,
    },
    ...context.details,
    quickFix: context.quickFix,
    resources: context.resources,
  };
}

/**
 * Format LLM context as readable message
 */
export function formatLLMMessage(
  message: string,
  llmContext: Partial<LLMContext>
): string {
  const emoji = {
    migration: '🔄',
    security: '🔒',
    performance: '⚡',
    accessibility: '♿',
    deprecation: '⚠️',
    domain: '📝',
  };

  const icon = llmContext.category ? emoji[llmContext.category] : '📌';
  
  return `${icon} ${message} | ${llmContext.filePath}:${llmContext.location?.line ?? 0}`;
}

/**
 * Calculate complexity score for functions
 */
export function calculateComplexity(node: TSESTree.Node): {
  cyclomaticComplexity: number;
  nestingDepth: number;
  linesOfCode: number;
} {
  let complexity = 1; // Base complexity
  let maxDepth = 0;
  let currentDepth = 0;

  const calculateRecursive = (n: TSESTree.Node) => {
    // Increment complexity for decision points
    if (
      n.type === 'IfStatement' ||
      n.type === 'ConditionalExpression' ||
      n.type === 'LogicalExpression' ||
      n.type === 'SwitchCase' ||
      n.type === 'ForStatement' ||
      n.type === 'WhileStatement' ||
      n.type === 'DoWhileStatement' ||
      n.type === 'CatchClause'
    ) {
      complexity++;
    }

    // Track nesting depth
    if (
      n.type === 'BlockStatement' ||
      n.type === 'FunctionDeclaration' ||
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression'
    ) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }

    // Recursively process children (simplified)
    // In real implementation, would properly traverse AST
  };

  calculateRecursive(node);

  const linesOfCode = node.loc
    ? node.loc.end.line - node.loc.start.line + 1
    : 0;

  return {
    cyclomaticComplexity: complexity,
    nestingDepth: maxDepth,
    linesOfCode,
  };
}

/**
 * Extract function signature for documentation
 */
export function extractFunctionSignature(
  node:
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression
): string {
  const params = node.params
    .map((param) => {
      if (param.type === 'Identifier') {
        return param.name;
      }
      return '...';
    })
    .join(', ');

  if (node.type === 'FunctionDeclaration' && node.id) {
    return `function ${node.id.name}(${params})`;
  }

  return `(${params}) => {...}`;
}

/**
 * Check if code contains security-sensitive keywords
 */
export function containsSecurityKeywords(code: string): {
  isSensitive: boolean;
  keywords: string[];
  category?: 'financial' | 'auth' | 'pii' | 'database';
} {
  const keywordCategories = {
    financial: ['payment', 'price', 'charge', 'refund', 'transaction', 'billing', 'invoice'],
    auth: ['password', 'token', 'session', 'login', 'auth', 'credential', 'secret'],
    pii: ['email', 'ssn', 'phone', 'address', 'name', 'dob', 'birthdate'],
    database: ['query', 'exec', 'execute', 'sql', 'delete', 'drop', 'update', 'insert'],
  };

  for (const [category, keywords] of Object.entries(keywordCategories)) {
    const found = keywords.filter((kw) => code.toLowerCase().includes(kw));
    if (found.length > 0) {
      return {
        isSensitive: true,
        keywords: found,
        category: category as 'financial' | 'auth' | 'pii' | 'database',
      };
    }
  }

  return { isSensitive: false, keywords: [] };
}

