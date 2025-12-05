/**
 * Comprehensive tests for no-zip-slip rule
 * Security: CWE-22 (Path Traversal/Zip Slip)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noZipSlip } from '../../rules/security/no-zip-slip';

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

describe('no-zip-slip', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe archive operations', noZipSlip, {
      valid: [
        // Safe archive extraction with validation
        {
          code: 'const safeExtract = require("safe-archive-extract"); safeExtract(file, dest);',
        },
        // Validated paths
        {
          code: 'const safePath = validatePath(entry.name); fs.writeFileSync(path.join(dest, safePath), data);',
        },
        // Safe libraries
        {
          code: 'const yauzl = require("yauzl"); yauzl.open(zipFile, callback);',
        },
        // Non-archive operations
        {
          code: 'const data = fs.readFileSync(filePath);',
        },
        // Safe file paths
        {
          code: 'const filePath = "safe-file.txt";',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe Archive Extraction', () => {
    ruleTester.run('invalid - unsafe archive extraction', noZipSlip, {
      valid: [],
      invalid: [
        {
          code: 'archive.unzip(dest);',
          errors: [
            {
              messageId: 'unsafeArchiveExtraction',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Path Traversal', () => {
    ruleTester.run('invalid - path traversal in archives', noZipSlip, {
      valid: [],
      invalid: [
        {
          code: 'const maliciousPath = "../../../etc/passwd";',
          errors: [
            {
              messageId: 'pathTraversalInArchive',
            },
          ],
        },
        {
          code: 'const zipEntry = "../config.json";',
          errors: [
            {
              messageId: 'pathTraversalInArchive',
            },
          ],
        },
        {
          code: 'const entry = "subdir/../../../root/.ssh/id_rsa";',
          errors: [
            {
              messageId: 'pathTraversalInArchive',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unvalidated Archive Paths', () => {
    ruleTester.run('invalid - unvalidated archive entry usage', noZipSlip, {
      valid: [],
      invalid: [
        {
          code: 'fs.writeFileSync(path.join(dest, entry.name), data);',
          errors: [
            {
              messageId: 'unvalidatedArchivePath',
            },
          ],
        },
        {
          code: 'const filePath = path.resolve(destDir, entry.path);',
          errors: [
            {
              messageId: 'unvalidatedArchivePath',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Dangerous Destinations', () => {
    ruleTester.run('invalid - dangerous extraction destinations', noZipSlip, {
      valid: [],
      invalid: [
        {
          code: 'unzip(zipFile, "/root/backups");',
          errors: [
            {
              messageId: 'dangerousArchiveDestination',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noZipSlip, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @safe */
            const AdmZip = require("adm-zip");
            const zip = new AdmZip(file);
            zip.extractAllTo(dest);
          `,
        },
        // Validated paths
        {
          code: `
            const safeName = validatePath(entry.name);
            fs.writeFileSync(path.join(dest, safeName), data);
          `,
        },
        // Sanitized paths
        {
          code: `
            const cleanPath = sanitizePath(file.name);
            const outputPath = path.join(destDir, cleanPath);
            fs.writeFileSync(outputPath, content);
          `,
        },
        // Safe destinations
        {
          code: 'zip.extractAllTo("./uploads/extracted");',
        },
        // Internal operations
        {
          code: 'const configPath = "./config/backup.zip";',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom archive functions', noZipSlip, {
      valid: [
        {
          code: 'myExtractor.extract(zipFile, dest);',
          options: [{ archiveFunctions: ['myExtractor.extract'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('config - custom safe libraries', noZipSlip, {
      valid: [
        {
          code: 'mySafeLib.extract(file, dest);',
          options: [{ safeLibraries: ['mySafeLib'] }],
        },
      ],
      invalid: [
        {
          code: 'unsafeLib.extract(file, dest);',
          options: [{ safeLibraries: ['mySafeLib'] }],
          errors: [
            {
              messageId: 'unsafeArchiveExtraction',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Zip Slip Attack Scenarios', () => {
    ruleTester.run('complex - real-world zip slip patterns', noZipSlip, {
      valid: [],
      invalid: [
        {
          code: `
            function extractZip(zipFile, destDir) {
              // DANGEROUS: Manual extraction without path validation
              const zip = new AdmZip(zipFile);

              zip.getEntries().forEach(entry => {
                const filePath = path.join(destDir, entry.entryName); // No validation!
                if (!entry.isDirectory) {
                  fs.writeFileSync(filePath, zip.readFile(entry));
                }
              });
            }
          `,
          errors: [
            {
              messageId: 'unvalidatedArchivePath',
            },
          ],
        },
        {
          code: `
            // Zip slip with directory traversal
            const maliciousZip = Buffer.from([
              // ZIP file with entry named "../../../etc/passwd"
            ]);

            const zip = new AdmZip(maliciousZip);
            zip.extractAllTo('/tmp/extracted'); // This could overwrite /etc/passwd
          `,
          errors: [
            {
              messageId: 'unsafeArchiveExtraction',
            },
            {
              messageId: 'dangerousArchiveDestination',
            },
          ],
        },
        {
          code: `
            const yauzl = require('yauzl');

            function extractWithYauzl(zipPath, extractTo) {
              yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                  // DANGEROUS: No path validation
                  const outputPath = path.join(extractTo, entry.fileName);
                  if (entry.fileName.endsWith('/')) {
                    fs.mkdirSync(outputPath);
                  } else {
                    zipfile.openReadStream(entry, (err, readStream) => {
                      const writeStream = fs.createWriteStream(outputPath); // Could write anywhere!
                      readStream.pipe(writeStream);
                    });
                  }
                  zipfile.readEntry();
                });
              });
            }
          `,
          errors: [
            {
              messageId: 'unvalidatedArchivePath',
            },
          ],
        },
        {
          code: `
            // Windows zip slip
            const entry = {
              fileName: "..\\..\\..\\..\\..\\..\\Windows\\System32\\config\\SAM"
            };

            const safePath = path.join(extractDir, entry.fileName); // Still dangerous on Windows
            fs.writeFileSync(safePath, data);
          `,
          errors: [
            {
              messageId: 'unvalidatedArchivePath',
            },
          ],
        },
      ],
    });
  });
});
