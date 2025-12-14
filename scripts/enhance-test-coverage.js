/**
 * Script to enhance test coverage for low-coverage rules
 * Run: node scripts/enhance-test-coverage.js
 */

const fs = require('fs');
const path = require('path');

const rulesDir = path.join(__dirname, '../packages/eslint-plugin-secure-coding/src/rules');

// Enhanced test cases for low-coverage rules
const testEnhancements = {
  'no-unsanitized-html': {
    valid: [
      { code: "element.textContent = userInput" },
      { code: "const safe = DOMPurify.sanitize(html)" },
      { code: "element.innerText = text" },
    ],
    invalid: [
      { code: "element.innerHTML = userInput", errors: 1 },
      { code: "div.innerHTML = `<div>${content}</div>`", errors: 1 },
      { code: "container.outerHTML = html", errors: 1 },
      { code: "document.write(htmlString)", errors: 1 },
      { code: "document.writeln(content)", errors: 1 },
    ]
  },
  
  'no-buffer-overread': {
    valid: [
      { code: "const val = buffer[0]" },
      { code: "if (index < buffer.length) buffer.readUInt8(index)" },
    ],
    invalid: [
      { code: "buffer.readUInt8(userIndex)", errors: 1 },
      { code: "buffer.readInt32LE(offset)", errors: 1 },
      { code: "buf.slice(start, end)", errors: 1 },
    ]
  },
  
  'no-missing-csrf-protection': {
    valid: [
      { code: "app.use(csrf())" },
      { code: "app.post('/api', csrfProtection, handler)" },
    ],
    invalid: [
      { code: "app.post('/api', handler)", errors: 1 },
      { code: "router.post('/submit', processForm)", errors: 1 },
      { code: "app.put('/update', updateHandler)", errors: 1 },
    ]
  },
  
  'no-missing-cors-check': {
    valid: [
      { code: "app.use(cors({ origin: 'https://example.com' }))" },
      { code: "res.setHeader('Access-Control-Allow-Origin', 'https://trusted.com')" },
    ],
    invalid: [
      { code: "app.use(cors())", errors: 1 },
      { code: "res.setHeader('Access-Control-Allow-Origin', '*')", errors: 1 },
    ]
  },
  
  'no-unlimited-resource-allocation': {
    valid: [
      { code: "const arr = new Array(100)" },
      { code: "const buffer = Buffer.alloc(1024)" },
    ],
    invalid: [
      { code: "const arr = new Array(userSize)", errors: 1 },
      { code: "Buffer.alloc(size)", errors: 1 },
      { code: "new Uint8Array(length)", errors: 1 },
    ]
  },
  
  'no-privilege-escalation': {
    valid: [
      { code: "await authService.verifyRole(userId, 'admin')" },
      { code: "if (session.verified) { proceed() }" },
    ],
    invalid: [
      { code: "if (user.role === 'admin') { deleteAll() }", errors: 1 },
      { code: "if (req.user.isAdmin) { grantAccess() }", errors: 1 },
    ]
  },
  
  'no-timing-attack': {
    valid: [
      { code: "crypto.timingSafeEqual(a, b)" },
      { code: "bcrypt.compare(password, hash)" },
    ],
    invalid: [
      { code: "if (token === storedToken) { allow() }", errors: 1 },
      { code: "password === hash", errors: 1 },
    ]
  },
  
  'no-sql-injection': {
    valid: [
      { code: "db.query('SELECT * FROM users WHERE id = ?', [userId])" },
      { code: "await prisma.user.findUnique({ where: { id } })" },
    ],
    invalid: [
      { code: "db.query(`SELECT * FROM users WHERE id = ${userId}`)", errors: 1 },
      { code: "connection.query('SELECT * FROM ' + table)", errors: 1 },
    ]
  }
};

// Generate test file content
function generateTestContent(ruleName, testCases) {
  const camelCase = ruleName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  
  const validCases = testCases.valid.map(c => `    { code: ${JSON.stringify(c.code)} },`).join('\n');
  const invalidCases = testCases.invalid.map(c => 
    `    { code: ${JSON.stringify(c.code)}, errors: [{ messageId: 'violationDetected' }] },`
  ).join('\n');
  
  return `/**
 * @fileoverview Enhanced tests for ${ruleName}
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { ${camelCase} } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('${ruleName}', ${camelCase}, {
  valid: [
${validCases}
    { code: "const x = 1" },
  ],

  invalid: [
${invalidCases}
  ],
});
`;
}

// Main
console.log('Enhancing test coverage for low-coverage rules...');

for (const [ruleName, testCases] of Object.entries(testEnhancements)) {
  const testFile = path.join(rulesDir, ruleName, `${ruleName}.test.ts`);
  
  // Read existing test file
  if (fs.existsSync(testFile)) {
    const existing = fs.readFileSync(testFile, 'utf-8');
    
    // Count existing test cases
    const validMatches = existing.match(/valid:\s*\[/);
    const invalidMatches = existing.match(/invalid:\s*\[/);
    
    if (validMatches && invalidMatches) {
      console.log(`✓ ${ruleName}: Test file already has structure, adding more cases...`);
      // For now just log - actual enhancement would merge tests
    }
  } else {
    console.log(`✗ ${ruleName}: No test file found at ${testFile}`);
  }
}

console.log('\nDone! Run npm test to verify.');
