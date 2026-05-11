/**
 * @interlace/vscode — VS Code extension for the Interlace ESLint ecosystem.
 *
 * Roadmap item 6.A. Bundles four user-facing surfaces:
 *
 *   1. Audit on save / on demand → diagnostics in the Problems panel
 *   2. Right-click "Audit Current File" / "Audit Workspace"
 *   3. Status-bar indicator showing finding count
 *   4. "Start MCP Server" command — spawns one of the 11 plugin MCP servers
 *      so an in-editor agent (Claude Code, Cursor, GitHub Copilot Workspace)
 *      can call audit_file / find_rule_violations / suggest_fix as tools
 *
 * The extension is intentionally a thin shim over the `interlace` CLI — it
 * doesn't reimplement linting or rule logic. That keeps the VS Code surface
 * in lockstep with the underlying packages without parallel maintenance.
 */

import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const COLLECTION_NAME = 'interlace';
let diagnostics: vscode.DiagnosticCollection;
let statusBar: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

interface EslintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  fix?: { range: [number, number]; text: string };
}

interface EslintResult {
  filePath: string;
  messages: EslintMessage[];
  errorCount: number;
  warningCount: number;
}

function cliPath(): string {
  return vscode.workspace.getConfiguration('interlace').get<string>('cliPath', 'interlace');
}
function pluginsArg(): string {
  return vscode.workspace.getConfiguration('interlace').get<string>('plugins', 'secure-coding,node-security,browser-security');
}
function failOn(): 'error' | 'warning' | 'none' {
  return vscode.workspace.getConfiguration('interlace').get<'error' | 'warning' | 'none'>('failOn', 'warning');
}
function runOnSave(): boolean {
  return vscode.workspace.getConfiguration('interlace').get<boolean>('runOnSave', true);
}

function workspaceCwd(uri?: vscode.Uri): string {
  if (uri) {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (folder) return folder.uri.fsPath;
  }
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

async function runAudit(targetPath: string, cwd: string): Promise<EslintResult[]> {
  const args = ['audit', '--json', targetPath];
  // The plugin filter is honored by the CLI via env var (see interlace-cli/src/index.mjs).
  const env = { ...process.env, INTERLACE_FILTER_PLUGIN: pluginsArg() };
  try {
    const { stdout } = await execFileAsync(cliPath(), args, { cwd, env, maxBuffer: 32 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (err: any) {
    // The CLI exits non-zero when findings are present; the JSON is still on stdout.
    if (err?.stdout) {
      try { return JSON.parse(err.stdout.toString()); } catch { /* intentionally empty */ }
    }
    outputChannel.appendLine(`[interlace] audit failed: ${err?.message ?? err}`);
    throw err;
  }
}

function toDiagnostic(m: EslintMessage): vscode.Diagnostic {
  const start = new vscode.Position(Math.max(0, (m.line ?? 1) - 1), Math.max(0, (m.column ?? 1) - 1));
  const end = new vscode.Position(
    Math.max(start.line, (m.endLine ?? m.line ?? 1) - 1),
    Math.max(start.character + 1, (m.endColumn ?? (m.column ?? 1) + 1) - 1),
  );
  const range = new vscode.Range(start, end);
  const severity = m.severity === 2 ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
  const diag = new vscode.Diagnostic(range, m.message, severity);
  diag.source = 'interlace';
  diag.code = m.ruleId ?? undefined;
  return diag;
}

function applyResults(results: EslintResult[]): { errors: number; warnings: number } {
  diagnostics.clear();
  let errors = 0;
  let warnings = 0;
  for (const r of results) {
    const uri = vscode.Uri.file(r.filePath);
    const diags = (r.messages ?? []).filter((m) => m.ruleId).map(toDiagnostic);
    diagnostics.set(uri, diags);
    errors += r.errorCount ?? diags.filter((d) => d.severity === vscode.DiagnosticSeverity.Error).length;
    warnings += r.warningCount ?? diags.filter((d) => d.severity === vscode.DiagnosticSeverity.Warning).length;
  }
  return { errors, warnings };
}

function updateStatusBar(errors: number, warnings: number) {
  if (errors === 0 && warnings === 0) {
    statusBar.text = '$(shield) Interlace: clean';
    statusBar.backgroundColor = undefined;
  } else {
    const fail = failOn();
    const failed = (fail === 'error' && errors > 0) || (fail === 'warning' && (errors + warnings) > 0);
    statusBar.text = `$(shield) Interlace: ${errors}E · ${warnings}W`;
    statusBar.backgroundColor = failed ? new vscode.ThemeColor('statusBarItem.errorBackground') : undefined;
  }
  statusBar.show();
}

async function auditCommand(uri?: vscode.Uri) {
  const target = uri?.fsPath ?? vscode.window.activeTextEditor?.document.uri.fsPath;
  if (!target) {
    vscode.window.showInformationMessage('Interlace: no file to audit. Open a file or right-click one in the Explorer.');
    return;
  }
  outputChannel.appendLine(`[interlace] audit ${target}`);
  await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Interlace: auditing…' }, async () => {
    const results = await runAudit(target, workspaceCwd(uri));
    const { errors, warnings } = applyResults(results);
    updateStatusBar(errors, warnings);
    if (errors + warnings === 0) vscode.window.setStatusBarMessage('Interlace: no findings', 3000);
  });
}

async function auditWorkspaceCommand() {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    vscode.window.showInformationMessage('Interlace: no workspace folder open.');
    return;
  }
  await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Interlace: auditing workspace…' }, async () => {
    const results = await runAudit(root, root);
    const { errors, warnings } = applyResults(results);
    updateStatusBar(errors, warnings);
    vscode.window.showInformationMessage(`Interlace: ${errors} errors · ${warnings} warnings across the workspace.`);
  });
}

async function initCommand() {
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!cwd) { vscode.window.showInformationMessage('Interlace: open a workspace first.'); return; }
  try {
    await execFileAsync(cliPath(), ['init'], { cwd });
    vscode.window.showInformationMessage('Interlace: wrote eslint.config.mjs. Run "Interlace: Audit Workspace" to lint.');
  } catch (err: any) {
    vscode.window.showErrorMessage(`Interlace init failed: ${err?.message ?? err}`);
  }
}

async function startMcpCommand() {
  const PLUGINS = [
    'secure-coding', 'browser-security', 'node-security', 'crypto', 'jwt',
    'express-security', 'lambda-security', 'mongodb-security', 'nestjs-security',
    'vercel-ai-security', 'pg',
  ];
  const pick = await vscode.window.showQuickPick(PLUGINS, { placeHolder: 'Pick a plugin to expose as an MCP server' });
  if (!pick) return;

  const term = vscode.window.createTerminal({ name: `Interlace MCP: ${pick}` });
  // The MCP server runs on stdio inside the terminal. An MCP client (Claude
  // Code, Cursor, custom agent) connects to this stdio channel.
  term.sendText(`npx --yes @interlace/${pick}-mcp`);
  term.show();
  vscode.window.showInformationMessage(`Started @interlace/${pick}-mcp on stdio. Wire it into your agent's MCP server list.`);
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Interlace');
  diagnostics  = vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  statusBar    = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  statusBar.command = 'interlace.audit';
  statusBar.tooltip = 'Interlace: click to audit the current file';
  statusBar.text = '$(shield) Interlace';
  statusBar.show();

  context.subscriptions.push(
    diagnostics, statusBar, outputChannel,
    vscode.commands.registerCommand('interlace.audit',          auditCommand),
    vscode.commands.registerCommand('interlace.auditWorkspace', auditWorkspaceCommand),
    vscode.commands.registerCommand('interlace.init',           initCommand),
    vscode.commands.registerCommand('interlace.startMcp',       startMcpCommand),
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      if (!runOnSave()) return;
      const langs = vscode.workspace.getConfiguration('interlace').get<string[]>('supportedLanguages', []);
      if (!langs.includes(doc.languageId)) return;
      try { await auditCommand(doc.uri); } catch { /* shown in output */ }
    }),
  );

  outputChannel.appendLine('[interlace] extension activated');
}

export function deactivate() {
  diagnostics?.dispose();
  statusBar?.dispose();
  outputChannel?.dispose();
}
