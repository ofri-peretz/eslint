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

ruleTester.run('mutation-guided edges, batch 6', noArbitraryFileAccess, {
  valid: [
    {
      name: 'a safe-named parameter copied elsewhere is still trusted when no caller passes a request',
      code: `function load(safePath) {
  lastPath = safePath;
  return fs.readFileSync(safePath);
}
load(config.file);`,
    },
    {
      name: 'a safe-named declared global keeps the naming convention',
      code: '/* global safePath */\nfs.readFileSync(safePath);',
    },
    {
      name: 'a guard written with no space before the read still guards it',
      code: "function h(req){const file=req.query.name;if(!file.startsWith('/srv/files/'))return;fs.readFileSync(file)}",
    },
    {
      name: 'a local named query holding a basename result is a basename, not a request',
      code: `function handler(req, res) {
  const query = path.basename(req.query.file);
  res.send(fs.readFileSync(query));
}`,
    },
    {
      name: 'a basename result is sanitised even when it is the only write',
      code: `function handler(req, res) {
  const name = path.basename(req.query.file);
  res.send(fs.readFileSync(name));
}`,
    },
  ],
  invalid: [
    {
      name: 'a safe-named parameter copied elsewhere is contradicted by a caller passing a request',
      code: `function load(safePath) {
  lastPath = safePath;
  return fs.readFileSync(safePath);
}
load(req.query.file);`,
      errors: [error],
    },
    {
      name: 'a basename method on an object that is not path does not launder',
      code: 'fs.readFileSync(helpers.basename(req.query.file));',
      errors: [error],
    },
    {
      name: 'process.argv is CLI input when process is a configured global',
      code: 'fs.readFileSync(process.argv[2]);',
      languageOptions: { globals: { process: 'readonly' } },
      errors: [error],
    },
    {
      name: 'one name of a multi-name destructure from req.query is user input',
      code: `function handler(req, res) {
  const { file, encoding } = req.query;
  res.send(fs.readFileSync(file, encoding));
}`,
      errors: [error],
    },
    {
      name: 'a custom validator call is not a startsWith guard',
      code: `function handler(req, res) {
  const file = req.query.name;
  if (!isAllowed(file)) throw new Error('bad');
  res.send(fs.readFileSync(file));
}`,
      errors: [error],
    },
    {
      name: 'BUG: an alias chain longer than six hops still reaches the request',
      code: `function handler(req) {
  const a1 = req.query.file;
  const a2 = a1;
  const a3 = a2;
  const a4 = a3;
  const a5 = a4;
  const a6 = a5;
  const a7 = a6;
  const a8 = a7;
  return fs.readFileSync(path.join('/srv/files', a8));
}`,
      errors: [error],
    },
    {
      name: 'BUG: a request array spread into path.join is user input',
      code: "fs.readFileSync(path.join('/srv/files', ...req.body.segments));",
      errors: [error],
    },
    {
      name: 'BUG: a request array spread into a helper reaches its parameter',
      code: 'function load(file) { return fs.readFileSync(file); }\nload(...req.body.files);',
      errors: [error],
    },
    {
      name: 'BUG: a string-keyed method is reachable by its key',
      code: "const files = { 'load': (file) => fs.readFileSync(file) };\nfiles.load(req.query.file);",
      errors: [error],
    },
    {
      name: 'BUG: a function assigned to an object property is reachable by that property name',
      code: 'exports.load = function (file) { return fs.readFileSync(file); };\nexports.load(req.query.file);',
      errors: [error],
    },
    {
      name: 'BUG: a class method is reachable by its name',
      code: 'class Files { load(file) { return fs.readFileSync(file); } }\nnew Files().load(req.query.file);',
      errors: [error],
    },
    {
      name: 'BUG: a basename result later overwritten with a request value is not sanitised',
      code: `function handler(req, res) {
  let name = path.basename(req.query.file);
  name = req.query.raw;
  res.send(fs.readFileSync(name));
}`,
      errors: [error],
    },
    {
      name: 'BUG: a loop variable over a request array is user input',
      code: 'for (const file of req.body.files) fs.readFileSync(file);',
      errors: [error],
    },
    {
      name: 'BUG: a loop key over the request query is user input',
      code: 'for (const key in req.query) fs.readFileSync(key);',
      errors: [error],
    },
  ],
});

ruleTester.run(
  'mutation-guided edges, batch 6 (cycles)',
  noArbitraryFileAccess,
  {
    valid: [
      {
        name: 'a cycle of assignments between two locals terminates',
        code: 'let a = b; let b = a;\na = b;\nfs.readFileSync(`${a}`);',
      },
    ],
    invalid: [],
  },
);

ruleTester.run(
  'mutation-guided edges, batch 6 (names)',
  noArbitraryFileAccess,
  {
    valid: [
      {
        name: 'a method under a computed key has no name a caller can be matched by',
        code: 'const handlers = { [kind]: (file) => fs.readFileSync(file) };\nhandlers[kind](req.query.file);',
      },
      {
        name: 'a function assigned through a computed member has no static name',
        code: 'handlers[kind] = (file) => fs.readFileSync(file);\nhandlers[kind](req.query.file);',
      },
    ],
    invalid: [],
  },
);
