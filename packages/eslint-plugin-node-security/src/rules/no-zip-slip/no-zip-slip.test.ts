/**
 * Comprehensive tests for no-zip-slip rule
 * Security: CWE-22 (Path Traversal/Zip Slip)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noZipSlip } from './index';

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
      valid: [
        // A `../` an author typed into their own source is a relative path, not
        // an attacker-authored archive entry. These three were the shape behind
        // five of the eight corpus findings — a glob in a bundler script, a
        // relative script path in a gulpfile, a minified vendor bundle — none
        // of which involved an archive at all.
        'const maliciousPath = "../../../etc/passwd";',
        'const zipEntry = "../config.json";',
        'const entry = "subdir/../../../root/.ssh/id_rsa";',
        // Shopify/cli packages/cli/bin/bundle.js:28, verbatim shape.
        "const yogafile = glob.sync('../../node_modules/.pnpm/**/yoga.wasm')[0];",
        // okta/okta-auth-js samples/gulpfile.js:37, verbatim.
        "const OKTA_ENV_SCRIPT_PATH = '../env/index.js';",
      ],
      invalid: [
        // Still a finding: the traversal sequence is the DESTINATION of an
        // archive extraction, which is the only place a literal `../` means
        // zip slip.
        {
          code: "zip.extractAllTo('../../output');",
          errors: [{ messageId: 'pathTraversalInArchive' }],
        },
      ],
    });
  });

  describe('Invalid Code - Unvalidated Archive Paths', () => {
    ruleTester.run('invalid - unvalidated archive entry usage', noZipSlip, {
      valid: [
        // Shopify/cli packages/e2e/setup/app.ts:75,78, verbatim shape. `entry`
        // here is an fs.readdirSync Dirent — the local filesystem authored that
        // name, and the file mentions no archive anywhere.
        `const dirs = fs.readdirSync(parentDir, {withFileTypes: true});
         const appEntry = dirs.find((entry) => entry.isDirectory() && fs.existsSync(path.join(parentDir, entry.name, 'shopify.app.toml')));
         const appDir = path.join(parentDir, appEntry.name);`,
        // Shopify/cli bin/bundling/esbuild-plugin-dedup-cli-kit.js:7.
        `const plugin = { setup(build) { build.onResolve({filter: /x/}, (args) => ({path: require.resolve(args.path)})); } };`,
      ],
      invalid: [
        // The archive makes it zip slip. `require('adm-zip')` is the evidence
        // the two shapes above lack.
        {
          code: `const AdmZip = require('adm-zip');
                 fs.writeFileSync(path.join(dest, entry.name), data);`,
          errors: [{ messageId: 'unvalidatedArchivePath' }],
        },
        // An ESM import of an archive module counts the same.
        {
          code: `import unzipper from 'unzipper';
                 const filePath = path.resolve(destDir, entry.path);`,
          errors: [{ messageId: 'unvalidatedArchivePath' }],
        },
        // …and so does a `new AdmZip(…)` with no import in view.
        {
          code: `const zip = new AdmZip(file);
                 const filePath = path.resolve(destDir, entry.path);`,
          errors: [{ messageId: 'unvalidatedArchivePath' }],
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
          code: 'mySafeZipLib.extract(file, dest);',
          options: [{ safeLibraries: ['mySafeZipLib'] }],
        },
        // A bare `.extract()` on a receiver that names no archive is not an
        // extraction at all. `this.extract("id")` on an entity collection and
        // `propagator.extract(ctx, headers, getter)` in OpenTelemetry both
        // matched the old name-only test — 25 findings across two repositories,
        // every one of them wrong.
        'this.extract("id");',
        'propagator.extract(context.active(), msg.req.headers, getter);',
      ],
      invalid: [
        {
          // Named for an archive, so the verb means what it says, and the
          // receiver is outside the configured safe list.
          code: 'unsafeZipLib.extract(file, dest);',
          options: [{ safeLibraries: ['mySafeZipLib'] }],
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
          // Note: Only unsafeArchiveExtraction - /tmp is considered safe destination
          errors: [
            {
              messageId: 'unsafeArchiveExtraction',
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
            const AdmZip = require('adm-zip');
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

  /**
   * The two options no test had ever set, so their branches shipped
   * unexecuted.
   *
   * Each is a PAIR on identical source: the default verdict and the configured
   * verdict, opposite to each other. A case that came out the same either way
   * would execute the line without proving the branch decides anything.
   */
  describe('Options', () => {
    ruleTester.run('archiveModules', noZipSlip, {
      valid: [
        // CONTROL for the widening case: `@my-org/zipkit` is an in-house
        // wrapper, not a built-in archive module, so the file has no archive
        // context and the entry-name shape is not judged at all.
        `
          const zipkit = require('@my-org/zipkit');
          const target = path.join(dir, entry.fileName);
          fs.writeFileSync(target, data);
        `,
        // NARROWING: a list that omits `adm-zip` withdraws archive context from
        // a file that the defaults DO judge — proof the option replaces the
        // built-in list rather than extending it.
        {
          code: `
            const AdmZip = require('adm-zip');
            const target = path.join(dir, entry.fileName);
            fs.writeFileSync(target, data);
          `,
          options: [{ archiveModules: ['@my-org/zipkit'] }],
        },
      ],
      invalid: [
        // WIDENING: naming the in-house wrapper gives the identical first valid
        // case an archive context, and it reports.
        {
          code: `
            const zipkit = require('@my-org/zipkit');
            const target = path.join(dir, entry.fileName);
            fs.writeFileSync(target, data);
          `,
          options: [{ archiveModules: ['@my-org/zipkit'] }],
          errors: [{ messageId: 'unvalidatedArchivePath' }],
        },
        // CONTROL for narrowing: identical source, default options.
        {
          code: `
            const AdmZip = require('adm-zip');
            const target = path.join(dir, entry.fileName);
            fs.writeFileSync(target, data);
          `,
          errors: [{ messageId: 'unvalidatedArchivePath' }],
        },
      ],
    });

    ruleTester.run('pathValidationFunctions', noZipSlip, {
      valid: [
        // The project's own validator, named through the option, suppresses the
        // finding the default reports below.
        {
          code: `
            const AdmZip = require('adm-zip');
            const target = assertInsideDest(path.join(dir, entry.fileName));
            fs.writeFileSync(target, data);
          `,
          options: [{ pathValidationFunctions: ['assertInsideDest'] }],
        },
      ],
      invalid: [
        // CONTROL: identical source, default list — `assertInsideDest` is not
        // one of validatePath/sanitizePath/checkPath/safePath, so it reports.
        {
          code: `
            const AdmZip = require('adm-zip');
            const target = assertInsideDest(path.join(dir, entry.fileName));
            fs.writeFileSync(target, data);
          `,
          errors: [{ messageId: 'unvalidatedArchivePath' }],
        },
        // The option REPLACES the built-in list: naming only the project's own
        // validator means `sanitizePath` no longer suppresses.
        {
          code: `
            const AdmZip = require('adm-zip');
            const target = sanitizePath(path.join(dir, entry.fileName));
            fs.writeFileSync(target, data);
          `,
          options: [{ pathValidationFunctions: ['assertInsideDest'] }],
          errors: [{ messageId: 'unvalidatedArchivePath' }],
        },
      ],
    });
  });
});
