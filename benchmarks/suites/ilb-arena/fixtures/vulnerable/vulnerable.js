/**
 * FN/FP Benchmark: Vulnerable Code Fixtures
 *
 * Each fixture contains KNOWN vulnerabilities that security linters SHOULD detect.
 * False Negatives occur when a linter fails to flag these patterns.
 */

// =============================================================================
// CATEGORY 1: SQL INJECTION (CWE-89)
// =============================================================================

/**
 * String concatenation in SQL query - Classic SQL injection
 * Detection: REQUIRED
 */
export function vuln_sql_string_concat(userId) {
  const query = "SELECT * FROM users WHERE id = '" + userId + "'";
  return db.query(query);
}

/**
 * Template literal in SQL query - Modern SQL injection
 * Detection: REQUIRED
 */
export function vuln_sql_template_literal(email) {
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  return db.query(query);
}

/**
 * Dynamic column/table name - Less obvious SQL injection
 * Detection: REQUIRED
 */
export function vuln_sql_dynamic_column(sortColumn) {
  const query = `SELECT * FROM users ORDER BY ${sortColumn}`;
  return db.query(query);
}

/**
 * Conditional query building - Complex SQL injection
 * Detection: REQUIRED
 */
export function vuln_sql_conditional(filters) {
  let query = "SELECT * FROM products WHERE 1=1";
  if (filters.name) {
    query += ` AND name = '${filters.name}'`;
  }
  if (filters.category) {
    query += ` AND category = '${filters.category}'`;
  }
  return db.query(query);
}

// =============================================================================
// CATEGORY 2: COMMAND INJECTION (CWE-78)
// =============================================================================

/**
 * exec() with string concatenation - Classic command injection
 * Detection: REQUIRED
 */
export function vuln_cmd_exec_concat(filename) {
  const { exec } = require("child_process");
  exec("ls -la " + filename, callback);
}

/**
 * exec() with template literal - Modern command injection
 * Detection: REQUIRED
 */
export function vuln_cmd_exec_template(filename) {
  const { exec } = require("child_process");
  exec(`convert ${filename} output.png`, callback);
}

/**
 * execSync() with user input - Synchronous command injection
 * Detection: REQUIRED
 */
export function vuln_cmd_execsync(command) {
  const { execSync } = require("child_process");
  return execSync(command).toString();
}

/**
 * spawn() with shell: true - Shell injection via spawn
 * Detection: REQUIRED
 */
export function vuln_cmd_spawn_shell(userCommand) {
  const { spawn } = require("child_process");
  return spawn(userCommand, { shell: true });
}

// =============================================================================
// CATEGORY 3: PATH TRAVERSAL (CWE-22)
// =============================================================================

/**
 * Direct path.join with user input - Classic path traversal
 * Detection: REQUIRED
 */
export function vuln_path_join(filename) {
  const path = require("path");
  const fs = require("fs");
  const filepath = path.join("./uploads", filename);
  return fs.readFileSync(filepath);
}

/**
 * String concatenation in path - Path traversal
 * Detection: REQUIRED
 */
export function vuln_path_concat(userId) {
  const fs = require("fs");
  return fs.readFileSync("./data/" + userId + "/profile.json");
}

/**
 * No validation before fs operation - Path traversal
 * Detection: REQUIRED
 */
export async function vuln_path_no_validation(userDir) {
  const fs = require("fs/promises");
  return fs.readdir(`./storage/${userDir}`);
}

/**
 * URL.pathname used in file path - Path traversal via URL
 * Detection: REQUIRED
 */
export function vuln_path_url_pathname(url) {
  const fs = require("fs");
  const parsedUrl = new URL(url);
  return fs.readFileSync(`./static${parsedUrl.pathname}`);
}

// =============================================================================
// CATEGORY 4: HARDCODED CREDENTIALS (CWE-798)
// =============================================================================

/**
 * Hardcoded database password - Classic credential exposure
 * Detection: REQUIRED
 */
export function vuln_creds_db_password() {
  const { Pool } = require("pg");
  return new Pool({
    host: "localhost",
    user: "admin",
    password: "secretPassword123",
    database: "myapp",
  });
}

/**
 * Hardcoded API key - API key exposure
 * Detection: REQUIRED
 */
export function vuln_creds_api_key() {
  const apiKey = "sk-prod-abc123def456ghi789jkl012mno345pqr678";
  return fetch("https://api.example.com", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

/**
 * Hardcoded AWS credentials - Cloud credential exposure
 * Detection: REQUIRED
 */
export function vuln_creds_aws() {
  const AWS = require("aws-sdk");
  AWS.config.update({
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  });
}

/**
 * Hardcoded JWT secret - JWT secret exposure
 * Detection: REQUIRED
 */
export function vuln_creds_jwt_secret(user) {
  const jwt = require("jsonwebtoken");
  return jwt.sign(user, "my-super-secret-jwt-key-12345");
}

// =============================================================================
// CATEGORY 5: JWT VULNERABILITIES (CWE-757, CWE-347)
// =============================================================================

/**
 * JWT with algorithm 'none' - Algorithm confusion attack
 * Detection: REQUIRED
 */
export function vuln_jwt_alg_none(token) {
  const jwt = require("jsonwebtoken");
  return jwt.verify(token, "secret", { algorithms: ["none", "HS256"] });
}

/**
 * JWT without algorithm restriction - Algorithm confusion
 * Detection: REQUIRED
 */
export function vuln_jwt_no_algorithm(token, secret) {
  const jwt = require("jsonwebtoken");
  return jwt.verify(token, secret); // No algorithms specified
}

/**
 * JWT with missing expiration - Token never expires
 * Detection: REQUIRED
 */
export function vuln_jwt_no_expiry(user) {
  const jwt = require("jsonwebtoken");
  return jwt.sign(user, process.env.JWT_SECRET); // No expiresIn
}

// =============================================================================
// CATEGORY 6: XSS VULNERABILITIES (CWE-79)
// =============================================================================

/**
 * innerHTML with user input - DOM-based XSS
 * Detection: REQUIRED
 */
export function vuln_xss_innerhtml(userContent) {
  document.getElementById("output").innerHTML = userContent;
}

/**
 * document.write with user input - Document write XSS
 * Detection: REQUIRED
 */
export function vuln_xss_document_write(userInput) {
  document.write("<div>" + userInput + "</div>");
}

/**
 * eval() with user input - Arbitrary code execution
 * Detection: REQUIRED
 */
export function vuln_xss_eval(userCode) {
  return eval(userCode);
}

/**
 * new Function() with user input - Dynamic function creation
 * Detection: REQUIRED
 */
export function vuln_xss_new_function(userCode) {
  const fn = new Function(userCode);
  return fn();
}

// =============================================================================
// CATEGORY 7: PROTOTYPE POLLUTION (CWE-1321)
// =============================================================================

/**
 * Direct object bracket notation with user key - Prototype pollution
 * Detection: REQUIRED
 */
export function vuln_proto_bracket(obj, key, value) {
  obj[key] = value;
  return obj;
}

/**
 * Nested object manipulation - Deep prototype pollution
 * Detection: REQUIRED
 */
export function vuln_proto_nested(obj, path, value) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Object.assign with user-controlled source - Merge pollution
 * Detection: REQUIRED (if user controls source)
 */
export function vuln_proto_assign(userInput) {
  const config = {};
  Object.assign(config, JSON.parse(userInput));
  return config;
}

// =============================================================================
// CATEGORY 8: INSECURE RANDOMNESS (CWE-330)
// =============================================================================

/**
 * Math.random() for security-sensitive operation - Predictable random
 * Detection: REQUIRED
 */
export function vuln_random_token() {
  return Math.random().toString(36).substring(2);
}

/**
 * Math.random() for session ID - Predictable session
 * Detection: REQUIRED
 */
export function vuln_random_session() {
  return "session_" + Math.floor(Math.random() * 1000000);
}

// =============================================================================
// CATEGORY 9: WEAK CRYPTOGRAPHY (CWE-328)
// =============================================================================

/**
 * MD5 for password hashing - Weak hash algorithm
 * Detection: REQUIRED
 */
export function vuln_crypto_md5(password) {
  const crypto = require("crypto");
  return crypto.createHash("md5").update(password).digest("hex");
}

/**
 * SHA1 for security-sensitive data - Weak hash algorithm
 * Detection: REQUIRED
 */
export function vuln_crypto_sha1(sensitiveData) {
  const crypto = require("crypto");
  return crypto.createHash("sha1").update(sensitiveData).digest("hex");
}

/**
 * DES encryption - Weak encryption algorithm
 * Detection: REQUIRED
 */
export function vuln_crypto_des(plaintext) {
  const crypto = require("crypto");
  const cipher = crypto.createCipher("des", "password");
  return cipher.update(plaintext, "utf8", "hex") + cipher.final("hex");
}

// =============================================================================
// CATEGORY 10: TIMING ATTACKS (CWE-208)
// =============================================================================

/**
 * Direct string comparison for secret - Timing attack
 * Detection: REQUIRED
 */
export function vuln_timing_direct(input, secret) {
  return input === secret;
}

/**
 * Token comparison with === - Timing attack
 * Detection: REQUIRED
 */
export function vuln_timing_token(userToken, storedToken) {
  if (userToken === storedToken) {
    return { authenticated: true };
  }
  return { authenticated: false };
}

// =============================================================================
// CATEGORY 11: NoSQL INJECTION (CWE-943)
// =============================================================================

/**
 * MongoDB query with user input - NoSQL injection
 * Detection: REQUIRED
 */
export async function vuln_nosql_mongo(username) {
  const db = getMongoClient();
  return db.collection("users").findOne({ username });
}

/**
 * MongoDB $where operator - Code injection
 * Detection: REQUIRED
 */
export async function vuln_nosql_where(userInput) {
  const db = getMongoClient();
  return db.collection("users").find({ $where: userInput });
}

// =============================================================================
// CATEGORY 12: SSRF (CWE-918)
// =============================================================================

/**
 * Fetch with user-controlled URL - SSRF
 * Detection: REQUIRED
 */
export async function vuln_ssrf_fetch(userUrl) {
  const response = await fetch(userUrl);
  return response.json();
}

/**
 * Axios with user-controlled URL - SSRF
 * Detection: REQUIRED
 */
export async function vuln_ssrf_axios(endpoint) {
  const axios = require("axios");
  return axios.get(endpoint);
}

// =============================================================================
// CATEGORY 13: UNVALIDATED REDIRECT (CWE-601)
// =============================================================================

/**
 * Express redirect with user input - Open redirect
 * Detection: REQUIRED
 */
export function vuln_redirect(req, res) {
  const returnUrl = req.query.returnTo;
  res.redirect(returnUrl);
}

// =============================================================================
// CATEGORY 14: REGEX DOS (CWE-1333)
// =============================================================================

/**
 * Evil regex pattern - ReDoS
 * Detection: REQUIRED
 */
export function vuln_redos_evil(input) {
  const evilRegex = /^(a+)+$/;
  return evilRegex.test(input);
}

/**
 * User-controlled regex - ReDoS via user input
 * Detection: REQUIRED
 */
export function vuln_redos_user(pattern, input) {
  const regex = new RegExp(pattern);
  return regex.test(input);
}

// =============================================================================
// METADATA: Expected Detections
// =============================================================================

export const EXPECTED_DETECTIONS = {
  // SQL Injection
  vuln_sql_string_concat: { cwe: "CWE-89", severity: "CRITICAL" },
  vuln_sql_template_literal: { cwe: "CWE-89", severity: "CRITICAL" },
  vuln_sql_dynamic_column: { cwe: "CWE-89", severity: "CRITICAL" },
  vuln_sql_conditional: { cwe: "CWE-89", severity: "CRITICAL" },

  // Command Injection
  vuln_cmd_exec_concat: { cwe: "CWE-78", severity: "CRITICAL" },
  vuln_cmd_exec_template: { cwe: "CWE-78", severity: "CRITICAL" },
  vuln_cmd_execsync: { cwe: "CWE-78", severity: "CRITICAL" },
  vuln_cmd_spawn_shell: { cwe: "CWE-78", severity: "CRITICAL" },

  // Path Traversal
  vuln_path_join: { cwe: "CWE-22", severity: "HIGH" },
  vuln_path_concat: { cwe: "CWE-22", severity: "HIGH" },
  vuln_path_no_validation: { cwe: "CWE-22", severity: "HIGH" },
  vuln_path_url_pathname: { cwe: "CWE-22", severity: "HIGH" },

  // Hardcoded Credentials
  vuln_creds_db_password: { cwe: "CWE-798", severity: "CRITICAL" },
  vuln_creds_api_key: { cwe: "CWE-798", severity: "CRITICAL" },
  vuln_creds_aws: { cwe: "CWE-798", severity: "CRITICAL" },
  vuln_creds_jwt_secret: { cwe: "CWE-798", severity: "CRITICAL" },

  // JWT
  vuln_jwt_alg_none: { cwe: "CWE-757", severity: "CRITICAL" },
  vuln_jwt_no_algorithm: { cwe: "CWE-757", severity: "HIGH" },
  vuln_jwt_no_expiry: { cwe: "CWE-347", severity: "MEDIUM" },

  // XSS
  vuln_xss_innerhtml: { cwe: "CWE-79", severity: "HIGH" },
  vuln_xss_document_write: { cwe: "CWE-79", severity: "HIGH" },
  vuln_xss_eval: { cwe: "CWE-94", severity: "CRITICAL" },
  vuln_xss_new_function: { cwe: "CWE-94", severity: "CRITICAL" },

  // Prototype Pollution
  vuln_proto_bracket: { cwe: "CWE-1321", severity: "HIGH" },
  vuln_proto_nested: { cwe: "CWE-1321", severity: "HIGH" },
  vuln_proto_assign: { cwe: "CWE-1321", severity: "MEDIUM" },

  // Insecure Random
  vuln_random_token: { cwe: "CWE-330", severity: "MEDIUM" },
  vuln_random_session: { cwe: "CWE-330", severity: "MEDIUM" },

  // Weak Crypto
  vuln_crypto_md5: { cwe: "CWE-328", severity: "HIGH" },
  vuln_crypto_sha1: { cwe: "CWE-328", severity: "MEDIUM" },
  vuln_crypto_des: { cwe: "CWE-327", severity: "HIGH" },

  // Timing Attacks
  vuln_timing_direct: { cwe: "CWE-208", severity: "MEDIUM" },
  vuln_timing_token: { cwe: "CWE-208", severity: "MEDIUM" },

  // NoSQL Injection
  vuln_nosql_mongo: { cwe: "CWE-943", severity: "HIGH" },
  vuln_nosql_where: { cwe: "CWE-943", severity: "CRITICAL" },

  // SSRF
  vuln_ssrf_fetch: { cwe: "CWE-918", severity: "HIGH" },
  vuln_ssrf_axios: { cwe: "CWE-918", severity: "HIGH" },

  // Open Redirect
  vuln_redirect: { cwe: "CWE-601", severity: "MEDIUM" },

  // ReDoS
  vuln_redos_evil: { cwe: "CWE-1333", severity: "MEDIUM" },
  vuln_redos_user: { cwe: "CWE-1333", severity: "HIGH" },
};

export const TOTAL_EXPECTED_VULNERABILITIES =
  Object.keys(EXPECTED_DETECTIONS).length;
