/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed, written against the rule as
 * it stands. Cases marked `Rule fix` were wrong verdicts the survivors led to.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noArbitraryFileAccess } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const error = { messageId: 'violationDetected' as const };

ruleTester.run('mutation-guided edges', noArbitraryFileAccess, {
  valid: [
    // Sanitisers
    {
      name: 'path.basename on the global path object launders a request value',
      code: 'fs.readFileSync(path.basename(req.query.file));',
    },
    {
      name: 'a basename imported from path launders a request value',
      code: "import { basename } from 'path';\nfs.readFileSync(basename(req.query.file));",
    },
    {
      name: 'a destructured request value reduced by basename is sanitised',
      code: `function handler(req, res) {
  const { file } = req.query;
  const name = path.basename(file);
  res.send(fs.readFileSync(path.join('/srv/files', name)));
}`,
    },
    // What is and is not user input
    {
      name: 'a parameter named process shadows the global, so its argv is not CLI input',
      code: 'function readArg(process) { return fs.readFileSync(process.argv[2]); }',
    },
    {
      name: 'an argv property on some other object is not process.argv',
      code: 'fs.readFileSync(settings.argv[0]);',
    },
    {
      name: 'a concatenation of __dirname and a literal reads no user input',
      code: "fs.readFileSync(__dirname + '/config.json');",
    },
    {
      name: 'readFile on an object that is not fs is not this rule’s sink',
      code: 'cache.readFile(req.query.key);',
    },
    // Parameters attributed by their callers
    {
      name: 'a parameter is judged by the argument at its own position, not the first',
      code: "function load(base, file) { return fs.readFileSync(file); }\nload(req.query.dir, 'a.txt');",
    },
    {
      name: 'a request passed to an unnamed callee steers no inline callback parameter',
      code: 'files.forEach((file) => fs.readFileSync(file));\nhandlers[kind](req.query.file);',
    },
    // startsWith guards
    {
      name: 'a negated separator-anchored startsWith guard whose block throws protects the read',
      code: `function handler(req, res) {
  const file = req.query.name;
  if (!file.startsWith('/srv/files/')) {
    throw new Error('bad');
  }
  res.send(fs.readFileSync(file));
}`,
    },
    {
      name: 'a read that is the whole braceless consequent of a startsWith guard is protected',
      code: `function handler(req) {
  const file = req.query.name;
  if (file.startsWith('/srv/files/')) fs.readFileSync(file)
}`,
    },
  ],
  invalid: [
    // Rule fix (FN): `const { file } = req.query` binds req.query.file; only
    // the `const file = req.query.file` spelling was followed.
    {
      name: 'a path destructured from req.query is user input',
      code: `function handler(req, res) {
  const { file } = req.query;
  res.send(fs.readFileSync(file));
}`,
      errors: [error],
    },
    // Rule fix (FN): the same destructuring, renamed and defaulted, reaching
    // the sink through a join.
    {
      name: 'a renamed, defaulted path destructured from req.query and joined is user input',
      code: `function handler(req, res) {
  const { name: file = 'index.html' } = req.query;
  res.send(fs.readFileSync(path.join('/srv/files', file)));
}`,
      errors: [error],
    },
    // Rule fix (FN): path.join(ROOT, '../../etc', 'passwd') is /etc/passwd. A
    // basename on the last segment does not contain a request segment before it.
    {
      name: 'a join is not sanitised by one basename argument when another argument is a request value',
      code: `function handler(req, res) {
  const name = path.basename(req.query.file);
  const full = path.join(UPLOAD_ROOT, req.query.folder, name);
  res.send(fs.readFileSync(full));
}`,
      errors: [error],
    },
    // Tracing through expressions and scopes
    {
      name: 'one request value in a template literal is enough',
      code: 'fs.readFileSync(`${BASE_DIR}/${req.query.file}`);',
      errors: [error],
    },
    {
      name: 'an arrow function parameter is attributed through its variable name',
      code: 'const load = (file) => fs.readFileSync(file);\nload(req.query.file);',
      errors: [error],
    },
    {
      name: 'an anonymous function expression parameter is attributed through its variable name',
      code: 'const load = function (file) { return fs.readFileSync(file); };\nload(req.query.file);',
      errors: [error],
    },
    {
      name: 'a nested callback without that parameter keeps resolving outward to the request local',
      code: `app.get('/download', (req, res) => {
  const file = req.query.name;
  stream.on('end', () => res.send(fs.readFileSync(file)));
});`,
      errors: [error],
    },
    {
      name: 'an unrelated declaration earlier in the block does not answer for the path',
      code: `function handler(req, res) {
  const root = '/srv/files/';
  const file = req.query.name;
  res.send(fs.readFileSync(file));
}`,
      errors: [error],
    },
    {
      name: 'a name that merely contains "safe" (unsafePath) is not the safe-name convention',
      code: `function handler(req, res) {
  const unsafePath = path.join(UPLOAD_ROOT, req.query.file);
  res.send(fs.readFileSync(unsafePath));
}`,
      errors: [error],
    },
    // Guards that do not hold
    {
      name: 'an includes check is not a startsWith containment guard',
      code: `function handler(req, res) {
  const file = req.query.name;
  if (!file.includes('/uploads/')) throw new Error('bad');
  res.send(fs.readFileSync(file));
}`,
      errors: [error],
    },
    {
      name: 'a guard whose block only logs lets the read through',
      code: `function handler(req, res) {
  const file = req.query.name;
  if (!file.startsWith('/srv/files/')) {
    console.warn('outside root');
  }
  res.send(fs.readFileSync(file));
}`,
      errors: [error],
    },
    {
      name: 'a guard with an empty block lets the read through',
      code: `function handler(req, res) {
  const file = req.query.name;
  if (!file.startsWith('/srv/files/')) {}
  res.send(fs.readFileSync(file));
}`,
      errors: [error],
    },
    {
      name: 'a read in the else branch of a startsWith guard is unprotected',
      code: `function handler(req) {
  const file = req.query.name;
  if (file.startsWith('/srv/files/')) {
    log(file);
  } else {
    fs.readFileSync(file);
  }
}`,
      errors: [error],
    },
  ],
});
