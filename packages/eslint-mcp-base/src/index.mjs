/**
 * @interlace/eslint-mcp-base — generic MCP server base for any Interlace
 * ESLint plugin (roadmap item 3.4). Plugin-specific MCP servers import this
 * and configure with their plugin name; they inherit the four standard tools
 * agents call (list_rules / audit_file / find_rule_violations / suggest_fix).
 *
 * Usage in a plugin-specific MCP package:
 *
 *   #!/usr/bin/env node
 *   import { startMcpServer } from '@interlace/eslint-mcp-base';
 *   await startMcpServer({
 *     pluginName:    'browser-security',
 *     packageDir:    'eslint-plugin-browser-security',
 *     rulePrefix:    'browser-security',
 *     serverName:    'browser-security-mcp',
 *     serverVersion: '0.1.0',
 *   });
 *
 * Why one base and N skinny adapters:
 *   - 11 security plugins × 4 tools each = 44 endpoints. Without a base,
 *     each MCP server is 200+ lines of duplicated boilerplate. With this
 *     base, each plugin-specific MCP is < 10 lines.
 *   - When the contract evolves (new tool, new field), we change it once.
 *   - Future Interlace plugins outside the security vertical (quality,
 *     react-*, etc.) get MCP wrappers for free.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

/**
 * Build the four tool descriptors for a given plugin. The schemas are
 * identical across plugins; only the `description` strings reference the
 * plugin name to give agents a clear signal of which server they're calling.
 */
function buildToolDescriptors(pluginName) {
  return [
    {
      name: 'list_rules',
      description: `Enumerate every rule in @interlace/eslint-plugin-${pluginName}. Returns id, description, CWE, fixable. Call this BEFORE other tools when you don't yet know the rule catalog.`,
      inputSchema: { type: 'object', properties: { filter: { type: 'string', description: 'Optional substring filter applied to rule id, description, or CWE.' } }, additionalProperties: false },
    },
    {
      name: 'audit_file',
      description: `Run the ${pluginName} ESLint plugin against a single file. Returns findings (rule, severity, line, column, message, fixable). Use to triage a file before commit.`,
      inputSchema: { type: 'object', required: ['filePath'], properties: { filePath: { type: 'string' } }, additionalProperties: false },
    },
    {
      name: 'find_rule_violations',
      description: `Run a single ${pluginName} rule across a directory and return only its violations. Cheaper than audit_file when you already know the rule.`,
      inputSchema: { type: 'object', required: ['ruleId', 'targetPath'], properties: { ruleId: { type: 'string' }, targetPath: { type: 'string' } }, additionalProperties: false },
    },
    {
      name: 'suggest_fix',
      description: `Return the auto-fix patch for a specific finding (filePath + line, optionally narrowed by ruleId). Output: replacement text + range + confidence.`,
      inputSchema: { type: 'object', required: ['filePath', 'line'], properties: { filePath: { type: 'string' }, line: { type: 'integer', minimum: 1 }, ruleId: { type: 'string' } }, additionalProperties: false },
    },
  ];
}

async function findRepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      const pkg = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'));
      if (Array.isArray(pkg.workspaces)) return dir;
    } catch { /* intentionally empty */ }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

async function runEslint(repoRoot, args) {
  const eslintBin = path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');
  const config = path.join(repoRoot, 'eslint.benchmark.config.mjs');
  try {
    const { stdout } = await execFileAsync('npx', ['tsx', eslintBin, '--no-error-on-unmatched-pattern', '--format', 'json', '--config', config, ...args], {
      cwd: repoRoot, maxBuffer: 32 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.stdout) {
      try { return JSON.parse(err.stdout.toString()); } catch { /* intentionally empty */ }
    }
    throw err;
  }
}

function shapeFindings(eslintResults, rulePrefix, ruleFilter) {
  const out = [];
  for (const r of eslintResults) {
    for (const m of r.messages ?? []) {
      if (!m.ruleId) continue;
      if (rulePrefix && !m.ruleId.startsWith(`${rulePrefix}/`)) continue;
      if (ruleFilter && m.ruleId !== `${rulePrefix}/${ruleFilter}` && m.ruleId !== ruleFilter) continue;
      out.push({
        ruleId: m.ruleId,
        severity: m.severity === 2 ? 'error' : 'warn',
        line: m.line, column: m.column, endLine: m.endLine, endColumn: m.endColumn,
        message: m.message,
        fixable: !!m.fix,
        fix: m.fix ? { range: m.fix.range, text: m.fix.text } : null,
        filePath: r.filePath,
      });
    }
  }
  return out;
}

async function listRulesFromSource(repoRoot, packageDir, rulePrefix) {
  const rulesDir = path.join(repoRoot, 'packages', packageDir, 'src', 'rules');
  const out = [];
  let entries;
  try { entries = await fs.readdir(rulesDir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    for (const f of ['index.ts', 'index.js']) {
      const p = path.join(rulesDir, entry.name, f);
      try {
        // oxlint-disable-next-line no-await-in-loop
        const src = await fs.readFile(p, 'utf8');
        const desc = src.match(/description\s*[:=]\s*['"`]([^'"`]+)['"`]/)?.[1] ?? '';
        const cwe = src.match(/\bcwe\s*[:=]\s*['"`](CWE-\d+)['"`]/)?.[1] ?? null;
        const fixable = /\bfixable\s*[:=]\s*['"`](code|whitespace)['"`]/.test(src);
        out.push({ ruleId: `${rulePrefix}/${entry.name}`, description: desc, cwe, fixable });
        break;
      } catch { /* intentionally empty */ }
    }
  }
  return out;
}

/**
 * Boot an MCP server for a specific Interlace plugin.
 *
 * @param {object} cfg
 * @param {string} cfg.pluginName    short plugin name (e.g. "secure-coding")
 * @param {string} cfg.packageDir    workspace dirname (e.g. "eslint-plugin-secure-coding")
 * @param {string} cfg.rulePrefix    rule-id namespace (e.g. "secure-coding")
 * @param {string} cfg.serverName    e.g. "secure-coding-mcp"
 * @param {string} cfg.serverVersion semver
 */
export async function startMcpServer(cfg) {
  const { pluginName, packageDir, rulePrefix, serverName, serverVersion } = cfg;
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = await findRepoRoot(HERE);
  const tools = buildToolDescriptors(pluginName);

  const handlers = {
    async list_rules({ filter }) {
      const rules = await listRulesFromSource(repoRoot, packageDir, rulePrefix);
      const filtered = filter
        ? rules.filter((r) => r.ruleId.includes(filter) || (r.description ?? '').toLowerCase().includes(filter.toLowerCase()) || (r.cwe ?? '').includes(filter))
        : rules;
      return { rules: filtered, totalCount: filtered.length };
    },
    async audit_file({ filePath }) {
      return { findings: shapeFindings(await runEslint(repoRoot, [filePath]), rulePrefix) };
    },
    async find_rule_violations({ ruleId, targetPath }) {
      return { findings: shapeFindings(await runEslint(repoRoot, [targetPath]), rulePrefix, ruleId) };
    },
    async suggest_fix({ filePath, line, ruleId }) {
      const findings = shapeFindings(await runEslint(repoRoot, [filePath]), rulePrefix, ruleId).filter((f) => f.line === line);
      if (findings.length === 0) return { fix: null, reason: 'No matching finding at that line.' };
      const fixable = findings.filter((f) => f.fixable);
      if (fixable.length === 0) return { fix: null, reason: 'Finding present but rule is not auto-fixable.' };
      const f = fixable[0];
      return { fix: { range: f.fix.range, replacement: f.fix.text, confidence: 'high', ruleId: f.ruleId, message: f.message } };
    },
  };

  const server = new Server({ name: serverName, version: serverVersion }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    const handler = handlers[name];
    if (!handler) throw new Error(`Unknown tool: ${name}`);
    const result = await handler(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`${serverName}@${serverVersion} ready · stdio · plugin=${pluginName}\n`);
}

export default { startMcpServer };
