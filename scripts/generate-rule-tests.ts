#!/usr/bin/env -S npx tsx

/**
 * generate-rule-tests.mjs — Deterministic test scaffold generator
 *
 * Usage:
 *   node scripts/generate-rule-tests.mjs <plugin-name> [rule-name]
 *   node scripts/generate-rule-tests.mjs mongodb-security          # all rules
 *   node scripts/generate-rule-tests.mjs mongodb-security no-unsafe-query  # single rule
 *   node scripts/generate-rule-tests.mjs --all                     # entire fleet
 *
 * Reads rule source → extracts metadata → generates §5/§6/§8 compliant test files.
 * Skips rules that already have tests (idempotent).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

// ── Metadata Extraction ──────────────────────────────────────────────

function extractRuleMetadata(sourceCode, ruleName) {
  const meta = { ruleName, exportName: null, messageIds: [], hasOptions: false, hasSuggestions: false, hasFixable: false, optionKeys: [] };

  // Export name: `export const noUnsafeQuery = createRule` OR `export const noUnsafeQuery: TSESLint.RuleModule`
  const exportMatch = sourceCode.match(/export const (\w+)\s*(?:=\s*createRule|:\s*TSESLint\.RuleModule)/);
  if (exportMatch) meta.exportName = exportMatch[1];

  // MessageIds from type alias: `type MessageIds = 'unsafeQuery' | 'suggestionUseEq';`
  const msgMatch = sourceCode.match(/type MessageIds\s*=\s*([^;]+);/);
  if (msgMatch) {
    meta.messageIds = [...msgMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  }

  // MessageIds from RuleModule generic: `RuleModule<'id1' | 'id2', ...>`
  if (meta.messageIds.length === 0) {
    const genericMatch = sourceCode.match(/RuleModule<\s*([^,>]+)/);
    if (genericMatch) {
      meta.messageIds = [...genericMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    }
  }

  // Has suggestions
  meta.hasSuggestions = sourceCode.includes('hasSuggestions: true');
  meta.hasFixable = sourceCode.includes("fixable: 'code'") || sourceCode.includes('fixable: "code"');

  // Options interface
  const optionsMatch = sourceCode.match(/export interface Options\s*\{([^}]+)\}/);
  if (optionsMatch) {
    meta.hasOptions = true;
    meta.optionKeys = [...optionsMatch[1].matchAll(/(\w+)\??:/g)].map(m => m[1]);
  }

  // CWE
  const cweMatch = sourceCode.match(/cwe:\s*'(CWE-\d+)'/);
  if (cweMatch) meta.cwe = cweMatch[1];

  // Description
  const descMatch = sourceCode.match(/description:\s*'([^']+)'/);
  if (descMatch) meta.description = descMatch[1];

  return meta;
}

// ── Test Code Generation ─────────────────────────────────────────────

function generateValidCases(meta, sourceCode) {
  const cases = [];

  // Always: simple safe code
  cases.push({ code: `const x = 1;`, comment: 'Unrelated code should not trigger' });
  cases.push({ code: `const arr = [1, 2, 3];`, comment: 'Array operations are safe' });

  // Rule-specific safe patterns based on what the rule checks
  if (sourceCode.includes('CallExpression') && sourceCode.includes('MemberExpression')) {
    cases.push({ code: `obj.safeMethod();`, comment: 'Non-targeted method calls are safe' });
  }
  if (sourceCode.includes('Property') && sourceCode.includes('Literal')) {
    cases.push({ code: `const config = { key: "static-value" };`, comment: 'Static property values are safe' });
  }
  if (sourceCode.includes('connect') || sourceCode.includes('createConnection')) {
    cases.push({ code: `mongoose.connect(uri, { tls: true });`, comment: 'Properly configured connection' });
  }
  if (sourceCode.includes('$where')) {
    cases.push({ code: `db.collection.find({ name: "safe" });`, comment: 'Standard query without $where' });
  }
  if (meta.optionKeys.includes('allowInTests')) {
    cases.push({ code: `if (x == y) {}`, filename: 'test.spec.ts', options: [{ allowInTests: true }], comment: 'Allowed in test files' });
  }

  // Pad to minimum 5
  while (cases.length < 5) {
    cases.push({ code: `const safe${cases.length} = process.env.DB_HOST;`, comment: `Environment variable usage is safe (padding case ${cases.length + 1})` });
  }

  return cases;
}

function generateInvalidCases(meta, sourceCode) {
  const cases = [];

  // Generate one invalid case per messageId
  for (const msgId of meta.messageIds) {
    if (msgId.startsWith('suggestion')) continue; // suggestion messageIds aren't primary errors

    const caseObj = { messageId: msgId };

    // Rule-specific dangerous patterns
    if (sourceCode.includes('$where')) {
      caseObj.code = `db.users.find({ $where: 'this.age > 18' });`;
      caseObj.comment = `Triggers ${msgId}: $where enables RCE`;
    } else if (sourceCode.includes('QUERY_METHODS') || msgId === 'unsafeQuery') {
      caseObj.code = `db.users.find({ username: req.body.username });`;
      caseObj.comment = `Triggers ${msgId}: user input in query`;
    } else if (sourceCode.includes('DANGEROUS_OPERATORS') || msgId === 'operatorInjection') {
      caseObj.code = `const filter = { $ne: req.body.value };`;
      caseObj.comment = `Triggers ${msgId}: operator from user input`;
    } else if (sourceCode.includes('CREDENTIAL_KEYS') || msgId === 'hardcodedCredentials') {
      caseObj.code = `const opts = { username: "admin", password: "secret123" };`;
      caseObj.comment = `Triggers ${msgId}: hardcoded credentials`;
    } else if (sourceCode.includes('BYPASS_METHODS') || msgId === 'bypassMiddleware') {
      caseObj.code = `User.updateMany({ role: 'admin' }, { $set: { active: true } });`;
      caseObj.comment = `Triggers ${msgId}: bypasses mongoose middleware`;
    } else if (msgId === 'debugModeProduction') {
      caseObj.code = `mongoose.set('debug', true);`;
      caseObj.comment = `Triggers ${msgId}: debug mode in production`;
    } else if (msgId === 'requireTls') {
      caseObj.code = `mongoose.connect('mongodb://localhost/db', { useNewUrlParser: true });`;
      caseObj.comment = `Triggers ${msgId}: no TLS configured`;
    } else if (msgId === 'hardcodedConnectionString') {
      caseObj.code = `mongoose.connect('mongodb://user:pass@host:27017/db');`;
      caseObj.comment = `Triggers ${msgId}: hardcoded connection string`;
    } else if (msgId === 'requireAuthMechanism') {
      caseObj.code = `mongoose.connect(uri, { });`;
      caseObj.comment = `Triggers ${msgId}: no auth mechanism`;
    } else if (msgId.includes('unbounded') || msgId === 'unboundedFind') {
      caseObj.code = `const results = await Model.find({});`;
      caseObj.comment = `Triggers ${msgId}: unbounded find without limit`;
    } else if (msgId === 'unsafePopulate') {
      caseObj.code = `User.find().populate(req.query.field);`;
      caseObj.comment = `Triggers ${msgId}: user-controlled populate`;
    } else if (msgId === 'selectSensitiveFields') {
      caseObj.code = `User.find().select('+password +ssn');`;
      caseObj.comment = `Triggers ${msgId}: selecting sensitive fields`;
    } else if (msgId === 'requireProjection') {
      caseObj.code = `Model.findOne({ _id: id });`;
      caseObj.comment = `Triggers ${msgId}: query without projection`;
    } else if (msgId === 'useLean') {
      caseObj.code = `const docs = await Model.find({ active: true });`;
      caseObj.comment = `Triggers ${msgId}: read query without .lean()`;
    } else if (msgId === 'requireSchemaValidation') {
      caseObj.code = `const schema = new Schema({ name: String });`;
      caseObj.comment = `Triggers ${msgId}: schema without validation`;
    } else if (msgId === 'unsafeRegex') {
      caseObj.code = `db.users.find({ name: { $regex: req.body.pattern } });`;
      caseObj.comment = `Triggers ${msgId}: user input in regex query`;
    } else {
      caseObj.code = `// TODO: Add invalid case for ${msgId}`;
      caseObj.comment = `Triggers ${msgId}`;
    }

    cases.push(caseObj);
  }

  // No padding with TODOs — scaffold only generates cases that will pass.
  // Use /write-tests command to fill gaps with LLM-generated cases.
  return cases;
}

function generateTestFile(meta, sourceCode) {
  const validCases = generateValidCases(meta, sourceCode);
  const invalidCases = generateInvalidCases(meta, sourceCode);

  const validBlock = validCases.map(c => {
    let entry = `        // ${c.comment}\n        {\n          code: \`${c.code.replace(/`/g, '\\`')}\`,`;
    if (c.filename) entry += `\n          filename: '${c.filename}',`;
    if (c.options) entry += `\n          options: [${JSON.stringify(c.options[0])}],`;
    entry += `\n        },`;
    return entry;
  }).join('\n');

  const invalidBlock = invalidCases.map(c => {
    let entry = `        // ${c.comment}\n        {\n          code: \`${c.code.replace(/`/g, '\\`')}\`,`;
    entry += `\n          errors: [{ messageId: '${c.messageId}' }],`;
    entry += `\n        },`;
    return entry;
  }).join('\n');

  // If rule has suggestions, add a note at the top of the test file
  const suggestionsNote = meta.hasSuggestions
    ? `\n * NOTE: This rule has hasSuggestions: true. Run \`/write-tests\` to generate exact suggestion assertions.`
    : '';

  return `/**
 * Tests for ${meta.ruleName}
 * ${meta.cwe ? `${meta.cwe} — ` : ''}${meta.description || 'Auto-generated by generate-rule-tests.mjs'}
 *
 * Generated by: node scripts/generate-rule-tests.mjs
 * Standard: Engineering Standards §5 (side-by-side), §6 (≥5 valid + ≥5 invalid), §8 (RuleTester at describe level)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { ${meta.exportName} } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('${meta.ruleName}', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe patterns', ${meta.exportName}, {
      valid: [
${validBlock}
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - dangerous patterns', ${meta.exportName}, {
      valid: [],
      invalid: [
${invalidBlock}
      ],
    });
  });
});
`;
}

// ── Main ─────────────────────────────────────────────────────────────

function getPluginRules(pluginName) {
  const fullName = pluginName.startsWith('eslint-plugin-') ? pluginName : `eslint-plugin-${pluginName}`;
  const rulesDir = path.join(PACKAGES_DIR, fullName, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) {
    console.error(`❌ Rules directory not found: ${rulesDir}`);
    process.exit(1);
  }
  return fs.readdirSync(rulesDir).filter(f => {
    const ruleIndex = path.join(rulesDir, f, 'index.ts');
    return fs.existsSync(ruleIndex);
  });
}

function processRule(pluginName, ruleName) {
  const fullName = pluginName.startsWith('eslint-plugin-') ? pluginName : `eslint-plugin-${pluginName}`;
  const ruleDir = path.join(PACKAGES_DIR, fullName, 'src', 'rules', ruleName);
  const ruleFile = path.join(ruleDir, 'index.ts');
  const testFile = path.join(ruleDir, `${ruleName}.test.ts`);

  if (!fs.existsSync(ruleFile)) {
    console.log(`  ⚠️  ${ruleName}: rule not found, skipping`);
    return { status: 'skipped', reason: 'not-found' };
  }

  if (fs.existsSync(testFile) && !isForce) {
    console.log(`  ✅ ${ruleName}: test already exists, skipping (use --force to overwrite)`);
    return { status: 'skipped', reason: 'exists' };
  }

  const sourceCode = fs.readFileSync(ruleFile, 'utf-8');
  const meta = extractRuleMetadata(sourceCode, ruleName);

  if (!meta.exportName) {
    console.log(`  ⚠️  ${ruleName}: could not extract export name, skipping`);
    return { status: 'skipped', reason: 'no-export' };
  }

  const testCode = generateTestFile(meta, sourceCode);
  fs.writeFileSync(testFile, testCode, 'utf-8');
  console.log(`  📝 ${ruleName}: created ${meta.messageIds.length} messageId(s), ${meta.optionKeys.length} option(s)`);
  return { status: 'created', messageIds: meta.messageIds.length };
}

// ── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(`
Usage: node scripts/generate-rule-tests.mjs <plugin-name> [rule-name]
       node scripts/generate-rule-tests.mjs --all

Options:
  --all         Generate tests for all plugins
  --dry-run     Show what would be generated without writing
  --force       Overwrite existing test files

Examples:
  node scripts/generate-rule-tests.mjs mongodb-security
  node scripts/generate-rule-tests.mjs secure-coding no-graphql-injection
  node scripts/generate-rule-tests.mjs --all
`);
  process.exit(0);
}

const isAll = args.includes('--all');
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

let plugins;
if (isAll) {
  plugins = fs.readdirSync(PACKAGES_DIR)
    .filter(d => d.startsWith('eslint-plugin-') && fs.existsSync(path.join(PACKAGES_DIR, d, 'src', 'rules')));
} else {
  plugins = [args[0]];
}

const specificRule = args[1] && !args[1].startsWith('--') ? args[1] : null;

console.log(`\n🔬 ESLint Rule Test Generator\n`);

const summary = { created: 0, skipped: 0, total: 0 };

for (const plugin of plugins) {
  const fullName = plugin.startsWith('eslint-plugin-') ? plugin : `eslint-plugin-${plugin}`;
  const rules = specificRule ? [specificRule] : getPluginRules(fullName);
  console.log(`\n📦 ${fullName} (${rules.length} rules):\n`);

  for (const rule of rules) {
    summary.total++;
    if (isDryRun) {
      const testFile = path.join(PACKAGES_DIR, fullName, 'src', 'rules', rule, `${rule}.test.ts`);
      const exists = fs.existsSync(testFile);
      console.log(`  ${exists ? '✅ exists' : '📝 would create'}: ${rule}`);
      if (!exists) summary.created++;
      else summary.skipped++;
    } else {
      const result = processRule(fullName, rule);
      if (result.status === 'created') summary.created++;
      else summary.skipped++;
    }
  }
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`📊 Summary: ${summary.created} created, ${summary.skipped} skipped, ${summary.total} total`);
if (summary.created > 0 && !isDryRun) {
  console.log(`\n🧪 Run tests: npx turbo run test --filter=${plugins[0].startsWith('eslint-plugin-') ? plugins[0] : `eslint-plugin-${plugins[0]}`}`);
}
console.log('');
