/**
 * @fileoverview Tests for no-arbitrary-file-access
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noArbitraryFileAccess } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-arbitrary-file-access', noArbitraryFileAccess, {
  valid: [
    // Static file paths
    { code: "fs.readFileSync('./config.json')" },
    { code: "fs.writeFile('/app/data/log.txt', data, cb)" },
    { code: "fs.readdir('/safe/path')" },
    { code: "fs.stat('/known/file.txt')" },
    // Non-fs code
    { code: "const x = 1" },
    { code: "other.readFile(path)" },
    
    // ============================================
    // FALSE POSITIVE PREVENTION TESTS
    // ============================================
    
    // FP-1: path.basename() sanitization
    {
      code: `
        const safeName = path.basename(userFilename);
        fs.readFileSync(safeName);
      `,
    },
    
    // FP-2: path.basename() + path.join() with safe base
    {
      code: `
        const safeName = path.basename(userFilename);
        const safePath = path.join(SAFE_DIR, safeName);
        fs.readFileSync(safePath);
      `,
    },
    
    // FP-3: startsWith() validation guard with throw
    {
      code: `
        function readFile(userPath) {
          const filePath = path.join('/uploads', userPath);
          if (!filePath.startsWith('/uploads')) {
            throw new Error('Invalid path');
          }
          return fs.readFileSync(filePath);
        }
      `,
    },
    
    // FP-4: startsWith() validation guard with return
    {
      code: `
        function readFile(userPath) {
          const filePath = path.join(baseDir, userPath);
          if (!filePath.startsWith(baseDir)) {
            return null;
          }
          return fs.readFileSync(filePath);
        }
      `,
    },
    
    // FP-5: Variables with safe naming conventions
    { code: "fs.readFileSync(safePath)" },
    { code: "fs.readFileSync(sanitizedPath)" },
    { code: "fs.readFileSync(validatedFilename)" },
    { code: "fs.readFileSync(cleanPath)" },
    
    // FP-6: Combined pattern (real-world safe pattern from safe-patterns.js)
    {
      code: `
        const SAFE_DIR = path.resolve(__dirname, 'uploads');
        function safeReadFile(userFilename) {
          const safeName = path.basename(userFilename);
          const safePath = path.join(SAFE_DIR, safeName);
          if (!safePath.startsWith(SAFE_DIR)) {
            throw new Error('Invalid path');
          }
          return fs.readFileSync(safePath);
        }
      `,
    },
  ],

  invalid: [
    // Variable file paths - all fs read methods
    { code: "fs.readFileSync(filePath)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.readFile(userFile, cb)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.readdir(userDir)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.readdirSync(scanPath)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.stat(targetPath)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.statSync(checkPath)", errors: [{ messageId: 'violationDetected' }] },
    // Variable file paths - all fs write methods
    { code: "fs.writeFile(outputPath, data, cb)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.writeFileSync(destPath, content)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.appendFile(logPath, text, cb)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.appendFileSync(filePath, data)", errors: [{ messageId: 'violationDetected' }] },
    // User input from req object
    { code: "fs.readFile(req.file, cb)", errors: [{ messageId: 'violationDetected' }] },
    // User input from request object
    { code: "fs.readFile(request.path, cb)", errors: [{ messageId: 'violationDetected' }] },
    // User input from params object
    { code: "fs.readFileSync(params.filename)", errors: [{ messageId: 'violationDetected' }] },
    // User input from query object
    { code: "fs.readFile(query.file, cb)", errors: [{ messageId: 'violationDetected' }] },
    // User input from body object
    { code: "fs.writeFile(body.path, data, cb)", errors: [{ messageId: 'violationDetected' }] },
  ],
});
