/* eslint-disable @typescript-eslint/no-unused-vars */
// Safe patterns that should NOT trigger security warnings
// These are all false-positive tests - unused variables are intentional test patterns

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// ============================================
// SAFE: Literal strings (not user input)
// ============================================

// Safe: Hardcoded file path (not user input)
fs.readFileSync('./config/app.json');
fs.readFileSync(path.join(__dirname, 'data', 'users.json'));

// Safe: Literal command (not dynamic)
// const result = execSync('ls -la'); // Can't test - will always flag

// ============================================
// SAFE: Object access with literal keys
// ============================================

const config = { theme: 'dark', language: 'en' };

// Safe: Literal string key
const theme = config['theme'];
const lang = config['language'];

// Safe: Numeric index (array access)
const items = ['a', 'b', 'c'];
const first = items[0];
const second = items[1];

// Safe: Typed union access (TypeScript pattern in JS)
const VALID_KEYS = ['name', 'email', 'age'];
function getField(obj, key) {
  if (VALID_KEYS.includes(key)) {
    return obj[key]; // Should be safe - validated key
  }
}

// Safe: hasOwnProperty check
function safeGet(obj, key) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return obj[key];
  }
}

// ============================================
// SAFE: Parameterized queries (not injection)
// ============================================

// Safe: Parameterized SQL
function safeQuery(db, userId) {
  return db.query('SELECT * FROM users WHERE id = ?', [userId]);
}

// Safe: Named parameters
function safeQueryNamed(db, email) {
  return db.query('SELECT * FROM users WHERE email = :email', { email });
}

// ============================================
// SAFE: crypto with strong algorithms
// ============================================

// Safe: SHA256 (strong)
const sha256Hash = crypto.createHash('sha256').update('data').digest('hex');

// Safe: SHA512 (strong)
const sha512Hash = crypto.createHash('sha512').update('data').digest('hex');

// Safe: crypto.randomBytes (secure random)
const secureToken = crypto.randomBytes(32).toString('hex');

// Safe: crypto.randomUUID (secure)
const uuid = crypto.randomUUID();

// ============================================
// SAFE: Timing-safe comparison
// ============================================

// Safe: Using crypto.timingSafeEqual
function safeCompare(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ============================================
// SAFE: Path with validation
// ============================================

const SAFE_DIR = path.resolve(__dirname, 'uploads');

function safeReadFile(userFilename) {
  // Safe: basename strips directory traversal
  const safeName = path.basename(userFilename);
  const safePath = path.join(SAFE_DIR, safeName);
  
  // Safe: Additional validation
  if (!safePath.startsWith(SAFE_DIR)) {
    throw new Error('Invalid path');
  }
  
  return fs.readFileSync(safePath);
}

// ============================================
// SAFE: Validated regex
// ============================================

// Safe: Literal regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Safe: Simple character class (no catastrophic backtracking)
const alphanumeric = /^[a-zA-Z0-9]+$/;

// ============================================
// SAFE: Cookie with secure settings
// ============================================

function setSecureCookie(res, name, value) {
  res.cookie(name, value, {
    secure: true,
    httpOnly: true,
    sameSite: 'strict'
  });
}

// ============================================
// SAFE: HTML with sanitization
// ============================================

const DOMPurify = require('dompurify');

function safeRender(userContent) {
  const clean = DOMPurify.sanitize(userContent);
  document.getElementById('output').innerHTML = clean;
}

// ============================================
// SAFE: Validated user input before use
// ============================================

const ALLOWED_THEMES = ['light', 'dark', 'system'];

function setTheme(userTheme) {
  if (!ALLOWED_THEMES.includes(userTheme)) {
    throw new Error('Invalid theme');
  }
  config[userTheme] = true; // Safe: validated against whitelist
}

module.exports = {
  getField,
  safeGet,
  safeQuery,
  safeQueryNamed,
  safeCompare,
  safeReadFile,
  setSecureCookie,
  safeRender,
  setTheme
};
