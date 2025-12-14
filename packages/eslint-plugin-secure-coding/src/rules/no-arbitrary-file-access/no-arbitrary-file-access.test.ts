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
