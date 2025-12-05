/**
 * Comprehensive tests for no-unlimited-resource-allocation rule
 * Security: CWE-770 (Allocation of Resources Without Limits or Throttling)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnlimitedResourceAllocation } from '../../rules/security/no-unlimited-resource-allocation';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-unlimited-resource-allocation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe resource allocation', noUnlimitedResourceAllocation, {
      valid: [
        // Safe buffer allocation with limits
        {
          code: 'const buf = Buffer.alloc(1024);',
        },
        {
          code: 'const limitedBuf = Buffer.alloc(Math.min(userSize, 1024 * 1024));',
        },
        // Safe array allocation
        {
          code: 'const arr = new Array(10);',
        },
        // Validated file operations
        {
          code: 'if (stats.size < MAX_FILE_SIZE) { fs.readFile(path, callback); }',
        },
        // Resource allocation outside loops
        {
          code: `
            const buffer = Buffer.alloc(1024);
            for (let i = 0; i < 10; i++) {
              // Use buffer safely
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unlimited Buffer Allocation', () => {
    ruleTester.run('invalid - unlimited buffer allocation', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          code: 'const buf = Buffer.alloc(req.query.size);',
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
        {
          code: 'const buffer = new Buffer(req.query.size);',
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
        {
          code: 'const largeBuf = Buffer.alloc(1024 * 1024 * 100);', // 100MB
          errors: [
            {
              messageId: 'unlimitedBufferAllocation',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unlimited Memory Allocation', () => {
    ruleTester.run('invalid - unlimited memory allocation', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          code: 'const arr = new Array(req.body.size);',
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
          ],
        },
        {
          code: 'const bigArray = Array(req.body.size);',
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unlimited File Operations', () => {
    ruleTester.run('invalid - unlimited file operations', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          code: 'fs.readFile(req.query.file, callback);',
          errors: [
            {
              messageId: 'unlimitedFileOperations',
            },
          ],
        },
        {
          code: 'fs.writeFileSync(req.query.file, data);',
          errors: [
            {
              messageId: 'unlimitedFileOperations',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Resource Allocation in Loops', () => {
    ruleTester.run('invalid - resource allocation inside loops', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          code: `
            for (let i = 0; i < 10; i++) {
              const buf = Buffer.alloc(1024); // Allocates in loop
            }
          `,
          errors: [
            {
              messageId: 'resourceAllocationInLoop',
            },
          ],
        },
        {
          code: `
            while (condition) {
              const arr = new Array(100); // Allocates in loop
            }
          `,
          errors: [
            {
              messageId: 'resourceAllocationInLoop',
            },
          ],
        },
        {
          code: `
            for (const item of items) {
              const buffer = Buffer.alloc(512); // Allocates in loop
            }
          `,
          errors: [
            {
              messageId: 'resourceAllocationInLoop',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Resource Limits', () => {
    ruleTester.run('invalid - missing resource validation', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          code: 'const buf = Buffer.alloc(req.body.size);',
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
        {
          code: 'const arr = new Array(inputSize);',
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noUnlimitedResourceAllocation, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @limited-resource */
            function allocateBuffer() {
              const buf = Buffer.alloc(userSize);
            }
          `,
          options: [{ trustedAnnotations: ['@limited-resource'] }],
        },
        // Validated sizes
        {
          code: 'const buf = Buffer.alloc(validateSize(req.body.size));',
        },
        // Limited allocations
        {
          code: 'const buf = Buffer.alloc(Math.min(userSize, MAX_BUFFER_SIZE));',
        },
        // Pre-allocated resources outside loops
        {
          code: `
            const buffers = [];
            for (let i = 0; i < 10; i++) {
              buffers[i] = Buffer.alloc(1024); // Pre-allocated outside main logic
            }
          `,
        },
        // Safe resource functions
        {
          code: `
            const buf = safeAlloc(userSize);
          `,
        },
        // Disabled validation requirement
        {
          code: 'const buf = Buffer.alloc(someSize);',
          options: [{ requireResourceValidation: false }],
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom max resource size', noUnlimitedResourceAllocation, {
      valid: [
        {
          code: 'const buf = Buffer.alloc(500000);', // 500KB, under 1MB default
        },
      ],
      invalid: [
        {
          code: 'const buf = Buffer.alloc(2000000);', // 2MB, over 1MB default
          options: [{ maxResourceSize: 1000000 }],
          errors: [
            {
              messageId: 'unlimitedBufferAllocation',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - custom user input variables', noUnlimitedResourceAllocation, {
      valid: [
        {
          code: 'const buf = Buffer.alloc(customSize);',
          options: [{ userInputVariables: ['otherSize'] }],
        },
      ],
      invalid: [
        {
          code: 'const buf = Buffer.alloc(customSize);',
          options: [{ userInputVariables: ['customSize'] }],
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Resource Allocation Scenarios', () => {
    ruleTester.run('complex - real-world DoS through resource exhaustion', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          code: `
            // ZIP bomb vulnerability - unlimited decompression
            const unzip = require('unzipper');

            app.post('/upload-zip', (req, res) => {
              const zipStream = unzip.Extract({ path: '/tmp' });

              // DANGEROUS: No size limits on zip extraction
              req.pipe(zipStream);

              zipStream.on('finish', () => {
                res.json({ extracted: true });
              });
            });
          `,
          errors: [
            {
              messageId: 'unlimitedFileOperations',
            },
          ],
        },
        {
          code: `
            // Billion laughs attack - XML expansion
            const xml2js = require('xml2js');

            function parseXML(xmlString) {
              // DANGEROUS: XML parser with no limits can expand exponentially
              const parser = new xml2js.Parser();
              parser.parseString(xmlString, (err, result) => {
                // Process result
              });
            }
          `,
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
          ],
        },
        {
          code: `
            // Resource exhaustion through user-controlled loops
            app.get('/generate-report', (req, res) => {
              const reportCount = parseInt(req.query.count) || 1;

              // DANGEROUS: User controls loop iterations
              for (let i = 0; i < reportCount; i++) {
                const reportBuffer = Buffer.alloc(1024 * 1024); // 1MB per iteration
                generateReport(i, reportBuffer);
              }

              res.json({ generated: reportCount });
            });
          `,
          errors: [
            {
              messageId: 'resourceAllocationInLoop',
            },
          ],
        },
        {
          code: `
            // Memory exhaustion through recursive data structures
            function processUserData(data) {
              // DANGEROUS: Creates arrays based on user input depth
              if (Array.isArray(data)) {
                return data.map(item => {
                  if (typeof item === 'object') {
                    // Creates new arrays for nested objects
                    return Object.keys(item).map(key => [key, item[key]]);
                  }
                  return item;
                });
              }
              return data;
            }
          `,
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
          ],
        },
        {
          code: `
            // File upload without size limits
            const multer = require('multer');
            const upload = multer({
              dest: 'uploads/',
              // DANGEROUS: No file size limits
            });

            app.post('/upload', upload.single('file'), (req, res) => {
              res.json({ uploaded: req.file.filename });
            });
          `,
          errors: [
            {
              messageId: 'unlimitedFileOperations',
            },
          ],
        },
        {
          code: `
            // Cache with unlimited growth
            const userCache = new Map();

            function cacheUserData(userId, data) {
              // DANGEROUS: Cache grows without bounds
              userCache.set(userId, {
                data,
                timestamp: Date.now(),
                largeBuffer: Buffer.alloc(data.length * 2) // Grows with data size
              });
            }
          `,
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
      ],
    });
  });
});
