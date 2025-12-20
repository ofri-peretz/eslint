/* eslint-disable @typescript-eslint/no-unused-vars, no-undef, @typescript-eslint/no-empty-function, no-empty */
// Test file with various security vulnerabilities (JavaScript - no TypeScript)
// These unused variables are intentional - they're test patterns for security linting
const fs = require('node:fs');
const { exec, spawn, execSync } = require('node:child_process');
const crypto = require('node:crypto');

// ============================================
// 1. Command Injection Patterns
// ============================================
function runUserCommand(userInput) {
  // Pattern 1: exec with template literal
  exec(`ls -la ${userInput}`, (err, stdout) => {
    console.log(stdout);
  });

  // Pattern 2: execSync with concatenation
  const result = execSync('echo ' + userInput);
  
  // Pattern 3: spawn with shell
  spawn('bash', ['-c', userInput]);
  
  // Pattern 4: Child process with dynamic require
  const cp = require('node:child_process');
  cp.exec(`cat ${userInput}`);
}

// ============================================
// 2. Path Traversal Patterns
// ============================================
function readUserFile(filename) {
  // Pattern 1: fs.readFile with user input
  fs.readFile(filename, 'utf8', (err, data) => {
    console.log(data);
  });
  
  // Pattern 2: fs.writeFile with user input
  fs.writeFile(filename, 'data', () => {});
  
  // Pattern 3: fs.readFileSync
  const content = fs.readFileSync(filename);
  
  // Pattern 4: fs.stat
  fs.stat(filename, (err, stats) => {});
  
  // Pattern 5: createReadStream
  fs.createReadStream(filename);
}

// ============================================
// 3. Object Injection / Prototype Pollution
// ============================================
function processData(data, key, value) {
  const obj = {};
  
  // Pattern 1: Dynamic property assignment
  obj[key] = value;
  
  // Pattern 2: Nested property access
  const nested = obj.config[key];
  
  // Pattern 3: Array-like access
  const items = [];
  items[key] = value;
  
  // Pattern 4: Multiple bracket notations
  data[key][value] = 'test';
}

// ============================================
// 4. SQL Injection Patterns
// ============================================
function queryDatabase(userId, orderBy) {
  const mysql = require('mysql');
  const db = mysql.createConnection({});
  
  // Pattern 1: String concatenation
  db.query('SELECT * FROM users WHERE id = ' + userId);
  
  // Pattern 2: Template literal
  db.query(`SELECT * FROM orders WHERE user_id = ${userId} ORDER BY ${orderBy}`);
  
  // Pattern 3: Multiple injections
  const query = 'SELECT * FROM ' + tableName + ' WHERE id = ' + id;
}

// ============================================
// 5. eval() and Dynamic Code Execution
// ============================================
function executeCode(code) {
  // Pattern 1: Direct eval
  eval(code);
  
  // Pattern 2: Function constructor
  const fn = new Function(code);
  fn();
  
  // Pattern 3: setTimeout with string
  setTimeout(code, 1000);
  
  // Pattern 4: setInterval with string
  setInterval(code, 1000);
}

// ============================================
// 6. Regex DoS Patterns
// ============================================
function validateInput(input) {
  // Pattern 1: Evil regex
  const evilRegex = /^(a+)+$/;
  evilRegex.test(input);
  
  // Pattern 2: Dynamic regex
  const pattern = new RegExp(input);
  pattern.test('test');
  
  // Pattern 3: Catastrophic backtracking
  const dangerous = /([a-zA-Z]+)*$/;
}

// ============================================
// 7. Weak Cryptography
// ============================================
function hashPassword(password) {
  // Pattern 1: MD5
  const md5Hash = crypto.createHash('md5').update(password).digest('hex');
  
  // Pattern 2: SHA1
  const sha1Hash = crypto.createHash('sha1').update(password).digest('hex');
  
  // Pattern 3: Math.random for security
  const token = Math.random().toString(36);
  
  // Pattern 4: Hardcoded secret
  const apiKey = 'sk_live_abc123secret456';
  const password2 = 'admin123';
}

// ============================================
// 8. Timing Attacks
// ============================================
function authenticate(inputToken, storedToken) {
  // Pattern 1: Direct comparison
  if (inputToken === storedToken) {
    return true;
  }
  
  // Pattern 2: Variable named password
  if (password === userPassword) {
    return true;
  }
  
  // Pattern 3: Secret comparison
  return secret == inputSecret;
}

// ============================================
// 9. XSS / Unsanitized HTML
// ============================================
function renderHTML(userContent) {
  // Pattern 1: innerHTML
  document.getElementById('output').innerHTML = userContent;
  
  // Pattern 2: document.write
  document.write(userContent);
  
  // Pattern 3: React dangerouslySetInnerHTML
  return { __html: userContent };
}

// ============================================
// 10. Insecure Cookie Settings
// ============================================
function setCookie(name, value) {
  // Pattern 1: No secure flag
  document.cookie = `${name}=${value}`;
  
  // Pattern 2: Missing HttpOnly
  res.cookie('session', token, { secure: false });
}

// ============================================
// 11. Dynamic require
// ============================================
function loadModule(moduleName) {
  // Pattern 1: Dynamic require
  const module = require(moduleName);
  
  // Pattern 2: Computed require
  require('./modules/' + moduleName);
}

// ============================================
// 12. Buffer Issues
// ============================================
function processBuffer(size) {
  // Pattern 1: new Buffer (deprecated)
  const buf1 = new Buffer(size);
  
  // Pattern 2: Buffer with noAssert
  const buf2 = Buffer.alloc(100);
  buf2.readUInt32LE(0, true); // noAssert = true
}

// Export for linting
module.exports = {
  runUserCommand,
  readUserFile,
  processData,
  queryDatabase,
  executeCode,
  validateInput,
  hashPassword,
  authenticate,
  renderHTML,
  setCookie,
  loadModule,
  processBuffer
};
