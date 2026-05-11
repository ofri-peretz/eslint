/**
 * ESLint Configuration for Interlace Security Ecosystem
 * Full security fleet: 11 plugins, 201 security rules
 */

import secureCoding from "eslint-plugin-secure-coding";
import nodeSecurity from "eslint-plugin-node-security";
import pg from "eslint-plugin-pg";
import jwt from "eslint-plugin-jwt";
import browserSecurity from "eslint-plugin-browser-security";
import crypto from "eslint-plugin-crypto";
import mongodbSecurity from "eslint-plugin-mongodb-security";
import expressSecurity from "eslint-plugin-express-security";
import nestjsSecurity from "eslint-plugin-nestjs-security";
import lambdaSecurity from "eslint-plugin-lambda-security";
import vercelAiSecurity from "eslint-plugin-vercel-ai-security";

export default [
  // Core security rules (23 rules)
  secureCoding.configs.recommended,

  // Node.js security rules — fs, child_process, vm, etc. (31 rules)
  nodeSecurity.configs.recommended,

  // PostgreSQL security rules — SQL injection, connection hygiene (13 rules)
  pg.configs.recommended,

  // JWT security rules — algorithm confusion, secrets (13 rules)
  jwt.configs.recommended,

  // Browser security rules — XSS, redirects, CORS, CSP (45 rules)
  browserSecurity.configs.recommended,

  // Cryptography rules — weak algorithms, insecure random (11 rules)
  crypto.configs.recommended,

  // MongoDB security rules — NoSQL injection, operator injection (16 rules)
  mongodbSecurity.configs.recommended,

  // Express.js security rules — helmet, CORS, sessions (10 rules)
  expressSecurity.configs.recommended,

  // NestJS security rules — guards, pipes, decorators (6 rules)
  nestjsSecurity.configs.recommended,

  // Lambda/serverless security rules — IAM, cold starts, secrets (14 rules)
  lambdaSecurity.configs.recommended,

  // Vercel AI SDK security rules — prompt injection, output validation (19 rules)
  vercelAiSecurity.configs.recommended,
];
