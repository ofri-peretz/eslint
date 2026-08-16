/**
 * Comprehensive tests for detect-non-literal-fs-filename rule
 * Security: CWE-22 (Path Traversal)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNonLiteralFsFilename } from './index';

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

describe('detect-non-literal-fs-filename', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe fs operations', detectNonLiteralFsFilename, {
      valid: [
        // Literal file paths
        {
          code: 'fs.readFile("/path/to/file.txt", callback);',
        },
        {
          code: 'fs.writeFile("./config.json", data, callback);',
        },
        {
          code: 'fs.stat("/var/log/app.log", callback);',
        },
        {
          code: 'fs.readdir("./src", callback);',
        },
        // Note: Template literals without expressions may still trigger the rule
        // Only pure string literals are safe
        // Not fs methods
        {
          code: 'myFunction.readFile(filename);',
        },
        {
          code: 'obj.readFile(userPath);',
        },
        // Guard clause validation - path validated with startsWith() before use
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
        // Static path construction with path.join(__dirname, ...literals)
        {
          code: `fs.readFileSync(path.join(__dirname, 'data', 'users.json'));`,
        },
      ],
      invalid: [],
    });
  });

  // A path assembled entirely from literals, `__dirname` and `const` bindings
  // of the same cannot be steered by an attacker. The safe-construction check
  // already knew this shape but only ever saw the DIRECT argument — one hop
  // through a `const` was enough to lose it, which is why every build script,
  // rollup config and gulpfile in the corpus reported.
  describe('Valid Code - paths fixed at build time', () => {
    ruleTester.run('valid - build-time constant paths', detectNonLiteralFsFilename, {
      valid: [
        // The okta/okta-auth-js build.js shape, minus the `..` segments — the
        // rule's pre-existing doctrine treats ANY hardcoded `..` as traversal
        // (see the invalid cases below), so `path.resolve(__dirname, '../..')`
        // still reports. That is a separate, older judgement call about
        // relative navigation; this change is only about not losing the
        // safe-construction verdict across a `const` hop.
        "const BUILD_DIR = path.resolve(__dirname, 'build');\nfs.readFileSync(`${BUILD_DIR}/package.json`);",
        "const OUT = path.join(__dirname, 'dist');\nfs.writeFileSync(OUT, data);",
        // A const chain, not just one hop.
        "const ROOT = path.resolve(__dirname, '..');\nconst SRC = path.join(ROOT, 'src');\nfs.readFileSync(SRC);",
        // process.cwd() is where the build was launched, not user input.
        "const HERE = process.cwd();\nfs.readFileSync(path.join(HERE, 'package.json'));",
        "fs.readFileSync(__filename);",
        // String concatenation of constants is the same thing spelled longhand.
        "const DIR = path.join(__dirname, 'data');\nfs.readFileSync(DIR + '/config.json');",
      ],
      invalid: [
        // Constant does NOT mean harmless: this one is fixed at build time and
        // is still a traversal. "Not attacker-steerable" and "safe" are
        // different claims.
        { options: [{ reportUnresolvedPaths: true }],           code: "const ESCAPE = path.join(__dirname, '../../etc/passwd');\nfs.readFileSync(ESCAPE);",
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: "const DIR = path.join(__dirname, 'x');\nfs.readFileSync(`${DIR}/../../../etc/passwd`);",
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // `let` can be reassigned between the binding and the call, so proving
        // its initializer constant proves nothing about the value read.
        { options: [{ reportUnresolvedPaths: true }],           code: "let DIR = path.join(__dirname, 'data');\nDIR = req.query.dir;\nfs.readFileSync(DIR);",
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // A const bound to a call we cannot see through is not constant.
        { options: [{ reportUnresolvedPaths: true }],           code: "const P = getPath(name);\nfs.readFileSync(P);",
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // Mutually-referential consts must terminate, not hang.
        { options: [{ reportUnresolvedPaths: true }],           code: "const A = B;\nconst B = A;\nfs.readFileSync(A);",
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  // The validation escapes only matter once a path is TAINTED — an untainted
  // path is already silent, so these must be written with a real source to
  // exercise them at all.
  describe('Valid Code - tainted but validated', () => {
    ruleTester.run('validated taint', detectNonLiteralFsFilename, {
      valid: [
        "const p = process.argv[2];\nif (ALLOWED.includes(p)) { fs.readFile(p); }",
        "const p = process.argv[2];\nif (/^[a-z]+$/.test(p)) { fs.readFile(p); }",
        "const p = process.env.OUT;\nif (p.startsWith('/safe')) { fs.readFile(p); }",
      ],
      invalid: [
        // The same taint without the guard, COMPOSED into a path: `p` extends
        // a base directory the code chose, which is what traversal means.
        {
          code: "const p = process.argv[2];\nfs.readFile(path.join('/uploads', p));",
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });

    // ── FP lock: taint used WHOLE is not traversal ────────────────────────
    //
    // Corpus: twilio/twilio-node `src/base/RequestClient.ts:128`
    //   agentOpts.ca = fs.readFileSync(process.env.TWILIO_CA_BUNDLE);
    //
    // Reported at HIGH as path traversal. There is no base directory to escape
    // and nothing to append to: whoever sets the variable names a file
    // outright, which is a capability they already have over the process.
    //
    // Fails on the old predicate, which was `if (readsTaintSource(pathNode))
    // return true` with no composition test — every one of these was a report.
    ruleTester.run('whole taint value is not traversal', detectNonLiteralFsFilename, {
      valid: [
        // The corpus line itself.
        'fs.readFileSync(process.env.TWILIO_CA_BUNDLE);',
        // Through a binding, the way the same idiom is usually written.
        'const ca = process.env.TWILIO_CA_BUNDLE;\nfs.readFileSync(ca);',
        // argv, used entire.
        'const p = process.argv[2];\nfs.readFile(p);',
        // `path.resolve` of one whole value normalises it; it adds no part.
        'fs.readFileSync(path.resolve(process.env.CONFIG));',
      ],
      invalid: [
        // A prefix the value can walk out of — still a finding.
        {
          code: "fs.readFileSync('/etc/app/' + process.env.NAME);",
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        {
          code: 'fs.readFileSync(`${BASE}/${process.env.NAME}`);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // Corpus: Shopify/cli `bin/update-bugsnag.js:36` — a two-part join
        // whose tail comes off argv. This one must keep reporting.
        {
          code:
            "const sourceDirectory = path.join(__dirname, '..', 'packages', process.argv[2]);\n" +
            'fs.cpSync(sourceDirectory, dest, {recursive: true});',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });

    // After the inversion a literal path can only report via traversal, so
    // `allowLiterals` now gates exactly that — without this its only use site
    // was gone and the option silently did nothing.
    ruleTester.run('allowLiterals gates hardcoded traversal', detectNonLiteralFsFilename, {
      valid: [
        {
          code: "fs.readFile('../../etc/passwd');",
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        {
          code: "fs.readFile('../../etc/passwd');",
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  describe('Invalid Code - readFile', () => {
    ruleTester.run('invalid - dynamic filename in readFile', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.readFile(userPath, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.readFile(`./uploads/${filename}`, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.readFileSync(userInput, "utf8");',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: `
            const filePath = getUserInput();
            fs.readFile(filePath, callback);
          `,
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  describe('Invalid Code - writeFile', () => {
    ruleTester.run('invalid - dynamic filename in writeFile', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.writeFile(userPath, data, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.writeFileSync(`./output/${filename}`, data);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.writeFile(config.outputPath, data, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  describe('Invalid Code - stat', () => {
    ruleTester.run('invalid - dynamic filename in stat', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.stat(userPath, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.statSync(`./files/${filename}`);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  describe('Invalid Code - readdir', () => {
    ruleTester.run('invalid - dynamic directory in readdir', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.readdir(userDir, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.readdirSync(`./directories/${dirName}`);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.readFile(userPath, callback);',
          errors: [
            {
              messageId: 'fsPathTraversal',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', detectNonLiteralFsFilename, {
      valid: [
        // Literal strings (if allowLiterals is true)
        {
          code: 'fs.readFile("/path/to/file.txt", callback);',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        // Path traversal patterns in literals should still be flagged as CRITICAL
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.readFile("../../../etc/passwd", callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.readFile("../config.json", callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // Note: Rule only checks fs.method() directly, not imported/aliased calls
        // These would need rule enhancement to detect
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', detectNonLiteralFsFilename, {
      valid: [
        {
          code: 'fs.readFile("/path/to/file.txt", callback);',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        {
          code: 'fs.readFile(userPath, callback);',
          options: [{ allowLiterals: true, reportUnresolvedPaths: true }],
          errors: [
            {
              messageId: 'fsPathTraversal',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
        // Note: Rule only checks fs.method() directly, not imported calls
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Line 297: Default case in generateRefactoringSteps - triggered when method is not readFile, writeFile, stat, or readdir
    ruleTester.run('line 297 - default case in generateRefactoringSteps', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.unlink(userPath);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.mkdir(userDir, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.rmdir(userDir);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });

    // Line 319: Default case in determineRiskLevel - triggered when operation is not defined or riskLevel is not 'high'
    ruleTester.run('line 319 - default case in determineRiskLevel', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.access(userPath, callback);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        { options: [{ reportUnresolvedPaths: true }],           code: 'fs.appendFile(userPath, data);',
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });

    // Line 338: Early return in checkFsCall when method is not in dangerousMethods
    ruleTester.run('line 338 - early return when method not dangerous', detectNonLiteralFsFilename, {
      valid: [
        // These methods might not be considered dangerous by the rule
        {
          code: 'fs.constants.F_OK;',
        },
        {
          code: 'fs.createReadStream("/safe/path");',
        },
      ],
      invalid: [],
    });
  });

  /**
   * TDD Tests: False Positive Reduction
   * These tests define expected behavior for safe patterns that should NOT trigger warnings.
   * Currently these tests may fail - the rule needs to be updated to pass them.
   * 
   * Issue: Benchmark revealed FPs on validated path patterns
   * Benchmark: eslint-benchmark-suite/benchmarks/fn-fp-comparison
   */
  describe('False Positive Reduction (TDD)', () => {
    ruleTester.run('validated paths with startsWith should not trigger', detectNonLiteralFsFilename, {
      valid: [
        // FP Fix #1: Path validated with path.resolve + startsWith check
        {
          code: `
            const fs = require('fs');
            const path = require('path');
            
            const SAFE_DIR = '/var/app/uploads';
            
            function readUserFile(filename) {
              const safePath = path.resolve(SAFE_DIR, path.basename(filename));
              if (!safePath.startsWith(SAFE_DIR + path.sep)) {
                throw new Error('Path traversal detected');
              }
              return fs.readFileSync(safePath, 'utf8');
            }
          `,
        },
        // FP Fix #2: Path validated inline before fs call
        {
          code: `
            const userPath = path.resolve(baseDir, userInput);
            if (userPath.startsWith(baseDir)) {
              fs.readFile(userPath, callback);
            }
          `,
        },
        // FP Fix #3: Path validated with realpath (symlink-safe)
        {
          code: `
            const realPath = fs.realpathSync(userPath);
            if (realPath.startsWith(allowedDir)) {
              fs.readFile(realPath, callback);
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('path.join with only literals should not trigger', detectNonLiteralFsFilename, {
      valid: [
        // FP Fix #4: path.join with all literal segments
        {
          code: `
            fs.readFile(path.join(__dirname, 'data', 'config.json'), callback);
          `,
        },
        // FP Fix #5: path.resolve with literal paths
        {
          code: `
            fs.writeFile(path.resolve('/app', 'logs', 'app.log'), data, callback);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('dangerous patterns should still be flagged', detectNonLiteralFsFilename, {
      valid: [],
      invalid: [
        // No validation - should still be flagged
        { options: [{ reportUnresolvedPaths: true }],           code: `
            fs.readFile(userPath, callback);
          `,
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // Validation on wrong path - should still be flagged
        { options: [{ reportUnresolvedPaths: true }],           code: `
            if (otherPath.startsWith(baseDir)) {
              fs.readFile(userPath, callback);
            }
          `,
          errors: [{ messageId: 'fsPathTraversal' }],
        },
        // Dynamic segments in path.join
        { options: [{ reportUnresolvedPaths: true }],           code: `
            fs.readFile(path.join(__dirname, userInput, 'file.txt'), callback);
          `,
          errors: [{ messageId: 'fsPathTraversal' }],
        },
      ],
    });
  });

  /**
   * Benchmark FP Regression Tests
   * Source: eslint-benchmark-suite/benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js
   */
  describe('Benchmark FP Regression', () => {
    ruleTester.run('benchmark FP: safe_path_allowlist', detectNonLiteralFsFilename, {
      valid: [
        // Allowlist validation before file access is SAFE
        {
          code: `
            const fs = require('fs');
            const path = require('path');
            const ALLOWED_FILES = ['config.json', 'readme.txt', 'data.csv'];
            function readConfig(filename) {
              if (!ALLOWED_FILES.includes(filename)) {
                throw new Error('File not allowed');
              }
              return fs.readFileSync(path.join('./config', filename));
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('benchmark FP: safe_path_regex', detectNonLiteralFsFilename, {
      valid: [
        // Regex validation of filename characters is SAFE
        {
          code: `
            const fs = require('fs');
            const path = require('path');
            function readUpload(filename) {
              if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
                throw new Error('Invalid filename characters');
              }
              return fs.readFileSync(path.join('./uploads', filename));
            }
          `,
        },
      ],
      invalid: [],
    });
  });
});


describe('module-binding fallback', () => {
  ruleTester.run('binding shapes', detectNonLiteralFsFilename, {
    valid: [
      // Resolves to fs but the path is a namespace, not a method — nothing to check.
      `const p = require('fs').promises; use(p);`,
      // Resolves to a different module entirely.
      `const os = require('node:os'); os.hostname(userInput);`,
      // Deeper than fs.promises.<method> — not a recognised sink shape.
      `const x = require('fs').promises.constants.COPYFILE_EXCL; use(x);`,
    ],
    invalid: [
      // Method plucked onto a variable.
      { code: `var one = require('fs').readFile; one(filename);`, errors: 1 },
      { code: `var one = require('node:fs').readFile; one(filename);`, errors: 1 },
      // promises namespace bound through a variable.
      { code: `var p = require('fs').promises; p.readFile(filename);`, errors: 1 },
      // Drop-in module.
      { code: `var fse = require('fs-extra'); fse.readFile(filename);`, errors: 1 },
    ],
  });
});

/**
 * Regression lock — composed free variables.
 *
 * `isFreeVariable` inspects a bare Identifier only, so a path ASSEMBLED around an
 * unresolvable name — a template interpolation, a `path.resolve` argument, a `+`
 * concatenation — fell through to `reportUnresolvedPaths` (default false) and stayed
 * silent. These were the last two open cases on eslint-plugin-security's own corpus;
 * closing them took weighted parity from 96.1% to 100%.
 *
 * Both invalid cases below PASS (i.e. report nothing) on the unfixed rule.
 */
ruleTester.run('lock: a path composed from a free variable is reported', detectNonLiteralFsFilename, {
  valid: [
    // Everything provably constant must stay silent — the guard against over-firing.
    { code: "const fs = require('fs'); fs.readFile('./config.json');" },
    { code: "const fs = require('fs'); const NAME = 'a.txt'; fs.readFile(`./data/${NAME}`);" },
    { code: "const fs = require('fs'); const path = require('path'); fs.readFileSync(path.join(__dirname, 'x.txt'));" },
  ],
  invalid: [
    {
      // Free variable inside a template interpolation.
      code: "const fs = require('fs'); fs.readFile(`template with ${filename}`);",
      errors: 1,
    },
    {
      // Free variable as a call argument.
      code: "import fs from 'fs'; import path from 'path'; const key = fs.readFileSync(path.resolve(__dirname, foo));",
      errors: 1,
    },
  ],
});

/**
 * Regression lock — build-time constants must survive the free-variable walk.
 *
 * ESLint resolves no Node globals by default, so a bare `__dirname` reads as an
 * unresolved free variable. Without an isBuildTimeConstant short-circuit inside
 * containsFreeVariable, `path.join(__dirname, '../templates')` — a path fixed at build
 * time — was reported. Found by hand-reading a sample of real-source findings; it was a
 * false positive introduced by the fix that closed the last two parity cases.
 */
ruleTester.run('lock: __dirname-rooted constant paths stay silent', detectNonLiteralFsFilename, {
  valid: [
    { code: "const fs = require('fs'); const path = require('path'); fs.readdir(path.join(__dirname, '../templates'), cb);" },
    { code: "const fs = require('fs'); const path = require('path'); fs.readFileSync(path.resolve(__dirname, 'x.txt'));" },
    { code: "const fs = require('fs'); fs.readFile(`./config/app.json`);" },
  ],
  invalid: [
    {
      // The free variable is still caught when it is genuinely free.
      code: "const fs = require('fs'); const path = require('path'); fs.readFileSync(path.resolve(__dirname, foo));",
      errors: 1,
    },
  ],
});

/**
 * Regression lock — concatenation is a composition path too.
 *
 * containsFreeVariable recurses through template interpolations, call arguments AND `+`
 * concatenation. The concatenation arm closes `readFile('./' + filename)`, which is the same
 * unknowable path as the template and call forms.
 */
ruleTester.run('lock: a free variable reached through concatenation', detectNonLiteralFsFilename, {
  valid: [
    { code: "const fs = require('fs'); fs.readFile('./data/' + 'app.json');" },
  ],
  invalid: [
    { code: "const fs = require('fs'); fs.readFile('./data/' + filename);", errors: 1 },
    { code: "const fs = require('fs'); fs.readFile(filename + '.json');", errors: 1 },
  ],
});

/**
 * Regression lock — the recursion depth guard.
 *
 * containsFreeVariable stops at depth 4, mirroring isBuildTimeConstant. A path nested more
 * deeply than that is not walked, so an unresolvable name buried six calls down does not
 * report — a deliberate bound on how far provenance is chased, not an oversight.
 */
ruleTester.run('lock: composition depth is bounded', detectNonLiteralFsFilename, {
  valid: [
    { code: "const fs = require('fs'); fs.readFile(a(b(c(d(e(f(deepName)))))));" },
  ],
  invalid: [
    // Within the bound, the free name is still found.
    { code: "const fs = require('fs'); fs.readFile(a(b(shallowName)));", errors: 1 },
  ],
});

/**
 * `taintSources` and `additionalMethods` — the two live options no test had
 * ever set, so their branches shipped unexecuted. (A third,
 * `allowedExtensions`, was declared in the schema alone and read by nothing;
 * it is deleted, see the note in the rule source.)
 *
 * Each is a PAIR on identical source: default verdict and configured verdict,
 * opposite to each other.
 *
 * `taintSources` REPLACES the built-in `['process']` rather than extending it,
 * which the narrowing case pins. That matters more here than elsewhere: the
 * default is deliberately `process` ONLY, because request roots belong to
 * `no-arbitrary-file-access` and listing them in both rules double-reports one
 * line at two severities.
 */
ruleTester.run('detect-non-literal-fs-filename — taintSources', detectNonLiteralFsFilename, {
  valid: [
    // CONTROL for widening: `job` is not a root, so the concatenation carries
    // no attacker-reachable part.
    "fs.readFileSync('/etc/app/' + job.env.NAME);",
    // NARROWING: a root list without `process` silences the case the default
    // reports — proof the option replaces rather than extends.
    {
      code: "fs.readFileSync('/etc/app/' + process.env.NAME);",
      options: [{ taintSources: ['job'] }],
    },
  ],
  invalid: [
    // WIDENING: naming the queue payload as a root makes the identical first
    // valid case report.
    {
      code: "fs.readFileSync('/etc/app/' + job.env.NAME);",
      options: [{ taintSources: ['job'] }],
      errors: [{ messageId: 'fsPathTraversal' }],
    },
    // CONTROL for narrowing: identical source, default roots.
    {
      code: "fs.readFileSync('/etc/app/' + process.env.NAME);",
      errors: [{ messageId: 'fsPathTraversal' }],
    },
  ],
});

ruleTester.run('detect-non-literal-fs-filename — additionalMethods', detectNonLiteralFsFilename, {
  valid: [
    // CONTROL: `slurpSync` is not a built-in fs method, so the same traversal
    // through the same fs binding is not judged.
    "const fs = require('fs'); fs.slurpSync('/etc/app/' + process.env.NAME);",
  ],
  invalid: [
    // Naming the method makes the identical source report. This is the whole
    // point of the option: a project whose fs surface includes helpers the
    // rule has never heard of is otherwise invisible to it.
    //
    // Note the receiver still has to resolve to the fs module — the option
    // extends the METHOD list, it does not make every call on every object a
    // filesystem write. `myFs.slurpSync(...)` with no `require('fs')` in view
    // stays quiet even with the option set, which is the correct trade: this
    // rule reports at CRITICAL and must not fire on an arbitrary method call
    // that happens to share a name.
    {
      code: "const fs = require('fs'); fs.slurpSync('/etc/app/' + process.env.NAME);",
      options: [{ additionalMethods: ['slurpSync'] }],
      errors: [{ messageId: 'fsPathTraversal' }],
    },
    {
      code: "import fs from 'node:fs'; fs.slurpSync('/etc/app/' + process.env.NAME);",
      options: [{ additionalMethods: ['slurpSync'] }],
      errors: [{ messageId: 'fsPathTraversal' }],
    },
  ],
});
