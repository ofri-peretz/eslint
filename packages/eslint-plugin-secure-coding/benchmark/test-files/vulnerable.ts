/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, @typescript-eslint/no-non-null-assertion */
// TypeScript version of the same vulnerabilities
// These unused variables are intentional - they're test patterns for security linting
import * as fs from 'node:fs';
import { exec, spawn, execSync } from 'node:child_process';
import * as crypto from 'node:crypto';

// ============================================
// 1. Command Injection Patterns
// ============================================
function runUserCommand(userInput: string): void {
  exec(`ls -la ${userInput}`, (err, stdout) => {
    console.log(stdout);
  });

  const result = execSync('echo ' + userInput);
  spawn('bash', ['-c', userInput]);
}

// ============================================
// 2. Path Traversal Patterns
// ============================================
function readUserFile(filename: string): void {
  fs.readFile(filename, 'utf8', (err, data) => {
    console.log(data);
  });
  
  fs.writeFile(filename, 'data', () => {});
  const content = fs.readFileSync(filename);
}

// ============================================
// 3. Object Injection / Prototype Pollution
// ============================================
interface DataObject {
  [key: string]: unknown;
  config?: Record<string, unknown>;
}

function processData(data: DataObject, key: string, value: unknown): void {
  const obj: DataObject = {};
  obj[key] = value;
  const nested = obj.config?.[key];
}

// Type-safe union access (should NOT be flagged by type-aware rules)
type SafeKey = 'name' | 'email' | 'age';
function safeAccess(obj: Record<SafeKey, string>, key: SafeKey): string {
  return obj[key]; // Type-safe - should be allowed
}

// ============================================
// 4. SQL Injection Patterns
// ============================================
function queryDatabase(userId: string, orderBy: string): void {
  const db = { query: (s: string) => s };
  db.query('SELECT * FROM users WHERE id = ' + userId);
  db.query(`SELECT * FROM orders WHERE user_id = ${userId} ORDER BY ${orderBy}`);
}

// ============================================
// 5. eval() and Dynamic Code Execution
// ============================================
function executeCode(code: string): void {
  eval(code);
  const fn = new Function(code);
  fn();
}

// ============================================
// 6. Regex DoS Patterns
// ============================================
function validateInput(input: string): boolean {
  const evilRegex = /^(a+)+$/;
  const pattern = new RegExp(input);
  return evilRegex.test(input) && pattern.test('test');
}

// ============================================
// 7. Weak Cryptography
// ============================================
function hashPassword(password: string): string {
  const md5Hash = crypto.createHash('md5').update(password).digest('hex');
  const token = Math.random().toString(36);
  const apiKey = 'sk_live_abc123secret456';
  return md5Hash + token;
}

// ============================================
// 8. Timing Attacks
// ============================================
function authenticate(inputToken: string, storedToken: string): boolean {
  if (inputToken === storedToken) {
    return true;
  }
  return false;
}

// ============================================
// 9. XSS / Unsanitized HTML
// ============================================
function renderHTML(userContent: string): { __html: string } {
  document.getElementById('output')!.innerHTML = userContent;
  return { __html: userContent };
}

// ============================================
// 10. Dynamic require (CommonJS in TS)
// ============================================
function loadModule(moduleName: string): unknown {
  return require(moduleName);
}

export {
  runUserCommand,
  readUserFile,
  processData,
  safeAccess,
  queryDatabase,
  executeCode,
  validateInput,
  hashPassword,
  authenticate,
  renderHTML,
  loadModule
};
