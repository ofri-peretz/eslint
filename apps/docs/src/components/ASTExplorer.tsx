'use client';

import { useState, useCallback } from 'react';
import * as acorn from 'acorn';

// Sample code examples for users to explore
const SAMPLE_CODES = {
  simple: `const message = "Hello!";
console.log(message);`,
  sqlInjection: `// ❌ Vulnerable Pattern
const userId = req.params.id;
const query = \`SELECT * FROM users WHERE id = \${userId}\`;
db.query(query);`,
  safe: `// ✅ Safe Pattern
const userId = req.params.id;
db.query("SELECT * FROM users WHERE id = $1", [userId]);`,
  eval: `// ❌ Dangerous eval
const code = userInput;
eval(code);`,
};

// Simplified AST node rendering
interface ASTNode {
  type: string;
  [key: string]: unknown;
}

function getNodeInfo(node: ASTNode): { label: string; color: string; icon: string } {
  // WCAG AAA compliant colors - work in both light and dark modes
  const nodeColors: Record<string, { color: string; icon: string }> = {
    Program: { color: 'text-violet-600 dark:text-violet-400', icon: '📦' },
    VariableDeclaration: { color: 'text-blue-700 dark:text-blue-400', icon: '📝' },
    VariableDeclarator: { color: 'text-blue-600 dark:text-blue-300', icon: '📎' },
    Identifier: { color: 'text-emerald-700 dark:text-emerald-400', icon: '🏷️' },
    Literal: { color: 'text-amber-700 dark:text-amber-400', icon: '💎' },
    TemplateLiteral: { color: 'text-red-700 dark:text-red-400', icon: '⚠️' },
    CallExpression: { color: 'text-purple-700 dark:text-purple-400', icon: '📞' },
    MemberExpression: { color: 'text-cyan-700 dark:text-cyan-400', icon: '🔗' },
    ExpressionStatement: { color: 'text-slate-600 dark:text-slate-400', icon: '📄' },
    BlockStatement: { color: 'text-slate-700 dark:text-slate-300', icon: '📁' },
    FunctionDeclaration: { color: 'text-pink-700 dark:text-pink-400', icon: '⚡' },
  };

  const info = nodeColors[node.type] || { color: 'text-slate-600 dark:text-slate-400', icon: '•' };
  return { label: node.type, ...info };
}

function ASTNodeComponent({ 
  node, 
  depth = 0, 
  selectedNode, 
  onSelect 
}: { 
  node: ASTNode; 
  depth?: number; 
  selectedNode: ASTNode | null;
  onSelect: (node: ASTNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 3);
  const info = getNodeInfo(node);
  
  const childNodes: { key: string; value: ASTNode }[] = [];
  
  // Extract child nodes
  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (item && typeof item === 'object' && 'type' in item) {
            childNodes.push({ key: `${key}[${i}]`, value: item as ASTNode });
          }
        });
      } else if ('type' in value) {
        childNodes.push({ key, value: value as ASTNode });
      }
    }
  }
  
  const isSelected = selectedNode === node;
  const hasChildren = childNodes.length > 0;
  
  const handleRowClick = () => {
    onSelect(node);
    if (hasChildren) {
      setExpanded(!expanded);
    }
  };
  
  return (
    <div className="font-mono text-sm">
      <div 
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-colors ${
          isSelected ? 'bg-violet-500/20 border border-violet-500/50' : 'hover:bg-fd-accent/50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleRowClick}
      >
        {hasChildren && (
          <span className="w-4 h-4 flex items-center justify-center text-xs text-fd-muted-foreground">
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="mr-1">{info.icon}</span>
        <span className={`font-semibold ${info.color}`}>{info.label}</span>
        {node.type === 'Identifier' && (node as unknown as { name: string }).name && (
          <span className="text-fd-muted-foreground ml-2">"{(node as unknown as { name: string }).name}"</span>
        )}
        {node.type === 'Literal' && (
          <span className="text-amber-700 dark:text-amber-300 ml-2">
            {JSON.stringify((node as unknown as { value: unknown }).value)}
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {childNodes.map((child, i) => (
            <ASTNodeComponent 
              key={`${child.key}-${i}`} 
              node={child.value} 
              depth={depth + 1}
              selectedNode={selectedNode}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ASTExplorer() {
  const [code, setCode] = useState(SAMPLE_CODES.simple);
  const [ast, setAst] = useState<ASTNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ASTNode | null>(null);
  
  const parseCode = useCallback((input: string) => {
    try {
      const parsed = acorn.parse(input, {
        ecmaVersion: 2022,
        sourceType: 'module',
      }) as unknown as ASTNode;
      setAst(parsed);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setAst(null);
    }
  }, []);
  
  // Parse on initial load and code change
  useState(() => {
    parseCode(code);
  });
  
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    parseCode(newCode);
    setSelectedNode(null);
  };
  
  return (
    <div className="rounded-xl border border-fd-border bg-fd-card overflow-hidden my-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fd-border bg-fd-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌳</span>
          <span className="font-semibold text-fd-foreground">Interactive AST Explorer</span>
        </div>
        <div className="flex gap-2">
          {Object.entries(SAMPLE_CODES).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleCodeChange(value)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                code === value 
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' 
                  : 'border-fd-border text-fd-muted-foreground hover:text-fd-foreground hover:border-fd-foreground/50'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-fd-border">
        {/* Code Editor */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2 text-xs text-fd-muted-foreground">
            <span>📝</span>
            <span>JavaScript Code</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full min-h-48 h-72 p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-fd-border font-mono text-sm text-fd-foreground resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            spellCheck={false}
          />
          {error && (
            <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              ⚠️ {error}
            </div>
          )}
        </div>
        
        {/* AST Viewer */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2 text-xs text-fd-muted-foreground">
            <span>🌳</span>
            <span>Abstract Syntax Tree</span>
            <span className="ml-auto text-[10px]">Click nodes to inspect</span>
          </div>
          <div className="min-h-48 h-72 max-h-[600px] overflow-auto rounded-lg bg-slate-100 dark:bg-slate-900 border border-fd-border p-2 resize-y">
            {ast ? (
              <ASTNodeComponent 
                node={ast} 
                selectedNode={selectedNode}
                onSelect={setSelectedNode}
              />
            ) : (
              <div className="text-fd-muted-foreground text-sm p-2">
                Enter valid JavaScript to see the AST
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Selected Node Details */}
      {selectedNode && (
        <div className="p-4 border-t border-fd-border bg-fd-muted/30">
          <div className="flex items-center gap-2 mb-2 text-xs text-fd-muted-foreground">
            <span>🔍</span>
            <span>Node Details</span>
          </div>
          <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-32 border border-fd-border">
            <code className="text-fd-foreground">
              {JSON.stringify(selectedNode, (key, value) => {
                if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') return undefined;
                return value;
              }, 2)}
            </code>
          </pre>
        </div>
      )}
      
      {/* Footer tip */}
      <div className="px-4 py-3 border-t border-fd-border bg-violet-500/5 text-xs text-fd-muted-foreground">
        <span className="text-violet-400">💡 Tip:</span> ESLint rules use the AST to find patterns. 
        A <span className="text-red-400">TemplateLiteral</span> with SQL keywords and expressions = potential injection!
      </div>
    </div>
  );
}
