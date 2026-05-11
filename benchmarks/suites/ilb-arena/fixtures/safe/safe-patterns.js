/**
 * FN/FP Benchmark: Safe Code Fixtures
 *
 * Each fixture contains SECURE patterns that should NOT trigger warnings.
 * False Positives occur when a linter incorrectly flags these patterns.
 */

// =============================================================================
// CATEGORY 1: SAFE SQL PATTERNS
// =============================================================================

/**
 * Parameterized query - SAFE SQL pattern
 * Should NOT trigger: SQL injection warnings
 */
export async function safe_sql_parameterized(userId) {
  const query = "SELECT id, name, email FROM users WHERE id = $1";
  return pool.query(query, [userId]);
}

/**
 * Prepared statement with multiple params - SAFE SQL pattern
 * Should NOT trigger: SQL injection warnings
 */
export async function safe_sql_prepared(email, status) {
  const query = "SELECT * FROM users WHERE email = $1 AND status = $2";
  return pool.query(query, [email, status]);
}

/**
 * Named parameters (pg-promise style) - SAFE SQL pattern
 * Should NOT trigger: SQL injection warnings
 */
export async function safe_sql_named(params) {
  const query = "INSERT INTO users (name, email) VALUES (${name}, ${email})";
  return db.none(query, params);
}

/**
 * ORM usage (Prisma) - SAFE SQL pattern
 * Should NOT trigger: SQL injection warnings
 */
export async function safe_sql_prisma(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

/**
 * TypeORM query builder - SAFE SQL pattern
 * Should NOT trigger: SQL injection warnings
 */
export async function safe_sql_typeorm(email) {
  return userRepository
    .createQueryBuilder("user")
    .where("user.email = :email", { email })
    .getOne();
}

// =============================================================================
// CATEGORY 2: SAFE COMMAND EXECUTION
// =============================================================================

/**
 * execFile with static command and literal args - SAFE command pattern
 * Should NOT trigger: Command injection warnings
 */
export function safe_cmd_execfile_literal() {
  const { execFile } = require("child_process");
  return execFile("ls", ["-la", "/tmp"]);
}

/**
 * spawn without shell - SAFE command pattern
 * Should NOT trigger: Command injection warnings
 */
export function safe_cmd_spawn_noshell() {
  const { spawn } = require("child_process");
  return spawn("convert", ["input.png", "output.jpg"], { shell: false });
}

/**
 * Validated arguments with allowlist - SAFE command pattern
 * Should NOT trigger: Command injection warnings
 */
export function safe_cmd_validated(format) {
  const { execFile } = require("child_process");
  const ALLOWED_FORMATS = ["png", "jpg", "gif"];
  if (!ALLOWED_FORMATS.includes(format)) {
    throw new Error("Invalid format");
  }
  return execFile("convert", ["input.img", `output.${format}`]);
}

// =============================================================================
// CATEGORY 3: SAFE FILE OPERATIONS
// =============================================================================

/**
 * path.resolve with startsWith validation - SAFE path pattern
 * Should NOT trigger: Path traversal warnings
 */
export function safe_path_validated(filename) {
  const path = require("path");
  const fs = require("fs");

  const baseDir = path.resolve("./uploads");
  const filepath = path.resolve(baseDir, path.basename(filename));

  if (!filepath.startsWith(baseDir + path.sep)) {
    throw new Error("Path traversal detected");
  }

  return fs.readFileSync(filepath);
}

/**
 * Allowlist validation before file access - SAFE path pattern
 * Should NOT trigger: Path traversal warnings
 */
export function safe_path_allowlist(filename) {
  const fs = require("fs");
  const path = require("path");

  const ALLOWED_FILES = ["config.json", "readme.txt", "data.csv"];
  if (!ALLOWED_FILES.includes(filename)) {
    throw new Error("File not allowed");
  }

  return fs.readFileSync(path.join("./config", filename));
}

/**
 * Regex validation of filename - SAFE path pattern
 * Should NOT trigger: Path traversal warnings
 */
export function safe_path_regex(filename) {
  const fs = require("fs");
  const path = require("path");

  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    throw new Error("Invalid filename characters");
  }

  return fs.readFileSync(path.join("./uploads", filename));
}

// =============================================================================
// CATEGORY 4: SAFE CREDENTIAL HANDLING
// =============================================================================

/**
 * Environment variable for credentials - SAFE credential pattern
 * Should NOT trigger: Hardcoded credential warnings
 */
export function safe_creds_env() {
  const { Pool } = require("pg");
  return new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

/**
 * Config file reference (no hardcoded values) - SAFE credential pattern
 * Should NOT trigger: Hardcoded credential warnings
 */
export function safe_creds_config() {
  const config = require("./config.json");
  const { Pool } = require("pg");
  return new Pool(config.database);
}

/**
 * Secret manager (AWS Secrets Manager pattern) - SAFE credential pattern
 * Should NOT trigger: Hardcoded credential warnings
 */
export async function safe_creds_secrets_manager() {
  const AWS = require("aws-sdk");
  const secretsManager = new AWS.SecretsManager();
  const secret = await secretsManager
    .getSecretValue({ SecretId: "db-creds" })
    .promise();
  return JSON.parse(secret.SecretString);
}

// =============================================================================
// CATEGORY 5: SAFE JWT PATTERNS
// =============================================================================

/**
 * JWT with explicit algorithm restriction - SAFE JWT pattern
 * Should NOT trigger: JWT algorithm confusion warnings
 */
export function safe_jwt_algorithm(token) {
  const jwt = require("jsonwebtoken");
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["RS256"],
    issuer: "myapp",
    audience: "users",
  });
}

/**
 * JWT with expiration - SAFE JWT pattern
 * Should NOT trigger: Missing expiration warnings
 */
export function safe_jwt_expiry(user) {
  const jwt = require("jsonwebtoken");
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: "1h",
    algorithm: "RS256",
  });
}

// =============================================================================
// CATEGORY 6: SAFE XSS PATTERNS
// =============================================================================

/**
 * DOMPurify sanitization before innerHTML - SAFE XSS pattern
 * Should NOT trigger: XSS warnings
 */
export function safe_xss_dompurify(userContent) {
  const DOMPurify = require("dompurify");
  const sanitized = DOMPurify.sanitize(userContent);
  document.getElementById("output").innerHTML = sanitized;
}

/**
 * textContent instead of innerHTML - SAFE XSS pattern
 * Should NOT trigger: XSS warnings
 */
export function safe_xss_textcontent(userInput) {
  document.getElementById("output").textContent = userInput;
}

/**
 * Template literal in non-DOM context - SAFE pattern (not XSS)
 * Should NOT trigger: XSS warnings
 */
export function safe_template_logging(username) {
  console.log(`User logged in: ${username}`);
  return { message: `Welcome, ${username}` };
}

// =============================================================================
// CATEGORY 7: SAFE OBJECT MANIPULATION
// =============================================================================

/**
 * Allowlist validation before bracket access - SAFE prototype pattern
 * Should NOT trigger: Prototype pollution warnings
 */
export function safe_proto_allowlist(obj, key, value) {
  const VALID_KEYS = ["name", "email", "age", "status"];
  if (!VALID_KEYS.includes(key)) {
    throw new Error("Invalid key");
  }
  obj[key] = value;
  return obj;
}

/**
 * hasOwnProperty check before access - SAFE prototype pattern
 * Should NOT trigger: Prototype pollution warnings
 */
export function safe_proto_hasownproperty(obj, key) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return obj[key];
  }
  return undefined;
}

/**
 * Object.hasOwn check (ES2022) - SAFE prototype pattern
 * Should NOT trigger: Prototype pollution warnings
 */
export function safe_proto_hasown(obj, key) {
  if (Object.hasOwn(obj, key)) {
    return obj[key];
  }
  return undefined;
}

/**
 * Prototype-less object (Object.create(null)) - SAFE prototype pattern
 * Should NOT trigger: Prototype pollution warnings
 */
export function safe_proto_nullproto(entries) {
  const obj = Object.create(null);
  for (const [key, value] of entries) {
    obj[key] = value;
  }
  return obj;
}

/**
 * Map instead of object - SAFE prototype pattern
 * Should NOT trigger: Prototype pollution warnings
 */
export function safe_proto_map(entries) {
  const map = new Map();
  for (const [key, value] of entries) {
    map.set(key, value);
  }
  return map;
}

// =============================================================================
// CATEGORY 8: SAFE RANDOMNESS
// =============================================================================

/**
 * crypto.randomBytes for token generation - SAFE randomness
 * Should NOT trigger: Insecure randomness warnings
 */
export function safe_random_token() {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * crypto.randomUUID for identifiers - SAFE randomness
 * Should NOT trigger: Insecure randomness warnings
 */
export function safe_random_uuid() {
  const crypto = require("crypto");
  return crypto.randomUUID();
}

/**
 * Math.random for non-security contexts - SAFE pattern
 * Should NOT trigger: Insecure randomness (UI shuffle is not security-critical)
 */
export function safe_random_shuffle(array) {
  // Fisher-Yates shuffle for UI - not security sensitive
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// =============================================================================
// CATEGORY 9: SAFE CRYPTOGRAPHY
// =============================================================================

/**
 * SHA-256 for hashing - SAFE crypto pattern
 * Should NOT trigger: Weak hash warnings
 */
export function safe_crypto_sha256(data) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * bcrypt for password hashing - SAFE crypto pattern
 * Should NOT trigger: Any crypto warnings
 */
export async function safe_crypto_bcrypt(password) {
  const bcrypt = require("bcrypt");
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * AES-256-GCM for encryption - SAFE crypto pattern
 * Should NOT trigger: Weak encryption warnings
 */
export function safe_crypto_aes_gcm(plaintext, key) {
  const crypto = require("crypto");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { iv, encrypted, authTag };
}

// =============================================================================
// CATEGORY 10: SAFE TIMING-SAFE COMPARISONS
// =============================================================================

/**
 * crypto.timingSafeEqual for secret comparison - SAFE timing pattern
 * Should NOT trigger: Timing attack warnings
 */
export function safe_timing_compare(input, secret) {
  const crypto = require("crypto");
  const inputBuffer = Buffer.from(input);
  const secretBuffer = Buffer.from(secret);

  if (inputBuffer.length !== secretBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, secretBuffer);
}

/**
 * HMAC comparison (via timingSafeEqual) - SAFE timing pattern
 * Should NOT trigger: Timing attack warnings
 */
export function safe_timing_hmac(signature, expectedSignature) {
  const crypto = require("crypto");
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex"),
  );
}

// =============================================================================
// CATEGORY 11: SAFE URL/REDIRECT PATTERNS
// =============================================================================

/**
 * Allowlist for redirects - SAFE redirect pattern
 * Should NOT trigger: Open redirect warnings
 */
export function safe_redirect_allowlist(req, res) {
  const ALLOWED_REDIRECTS = ["/dashboard", "/profile", "/settings"];
  const target = req.query.returnTo;

  if (!ALLOWED_REDIRECTS.includes(target)) {
    return res.redirect("/");
  }

  res.redirect(target);
}

/**
 * Same-origin check for redirects - SAFE redirect pattern
 * Should NOT trigger: Open redirect warnings
 */
export function safe_redirect_sameorigin(req, res) {
  const target = req.query.returnTo;

  try {
    const url = new URL(target, `https://${req.headers.host}`);
    if (url.host !== req.headers.host) {
      return res.redirect("/");
    }
    res.redirect(url.pathname);
  } catch {
    res.redirect("/");
  }
}

// =============================================================================
// CATEGORY 12: SAFE SSRF PATTERNS
// =============================================================================

/**
 * URL allowlist for external requests - SAFE SSRF pattern
 * Should NOT trigger: SSRF warnings
 */
export async function safe_ssrf_allowlist(endpoint) {
  const ALLOWED_HOSTS = ["api.stripe.com", "api.twilio.com"];

  const url = new URL(endpoint);
  if (!ALLOWED_HOSTS.includes(url.host)) {
    throw new Error("Host not allowed");
  }

  return fetch(endpoint);
}

/**
 * Internal IP blocking - SAFE SSRF pattern
 * Should NOT trigger: SSRF warnings
 */
export async function safe_ssrf_block_internal(userUrl) {
  const url = new URL(userUrl);
  const hostname = url.hostname;

  // Block internal IPs
  const internalPatterns = [
    /^localhost$/i,
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^0\.0\.0\.0$/,
  ];

  if (internalPatterns.some((p) => p.test(hostname))) {
    throw new Error("Internal hosts not allowed");
  }

  return fetch(userUrl);
}

// =============================================================================
// CATEGORY 13: SAFE REGEX PATTERNS
// =============================================================================

/**
 * Simple, non-backtracking regex - SAFE regex pattern
 * Should NOT trigger: ReDoS warnings
 */
export function safe_regex_simple(input) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

/**
 * Validator library instead of custom regex - SAFE pattern
 * Should NOT trigger: ReDoS warnings
 */
export function safe_regex_validator(email) {
  const validator = require("validator");
  return validator.isEmail(email);
}

// =============================================================================
// METADATA: Expected No-Detections (All should pass with 0 warnings)
// =============================================================================

export const EXPECTED_NO_DETECTIONS = [
  // SQL
  "safe_sql_parameterized",
  "safe_sql_prepared",
  "safe_sql_named",
  "safe_sql_prisma",
  "safe_sql_typeorm",

  // Command
  "safe_cmd_execfile_literal",
  "safe_cmd_spawn_noshell",
  "safe_cmd_validated",

  // Path
  "safe_path_validated",
  "safe_path_allowlist",
  "safe_path_regex",

  // Credentials
  "safe_creds_env",
  "safe_creds_config",
  "safe_creds_secrets_manager",

  // JWT
  "safe_jwt_algorithm",
  "safe_jwt_expiry",

  // XSS
  "safe_xss_dompurify",
  "safe_xss_textcontent",
  "safe_template_logging",

  // Prototype
  "safe_proto_allowlist",
  "safe_proto_hasownproperty",
  "safe_proto_hasown",
  "safe_proto_nullproto",
  "safe_proto_map",

  // Random
  "safe_random_token",
  "safe_random_uuid",
  "safe_random_shuffle",

  // Crypto
  "safe_crypto_sha256",
  "safe_crypto_bcrypt",
  "safe_crypto_aes_gcm",

  // Timing
  "safe_timing_compare",
  "safe_timing_hmac",

  // Redirect
  "safe_redirect_allowlist",
  "safe_redirect_sameorigin",

  // SSRF
  "safe_ssrf_allowlist",
  "safe_ssrf_block_internal",

  // Regex
  "safe_regex_simple",
  "safe_regex_validator",
];

export const TOTAL_SAFE_PATTERNS = EXPECTED_NO_DETECTIONS.length;
