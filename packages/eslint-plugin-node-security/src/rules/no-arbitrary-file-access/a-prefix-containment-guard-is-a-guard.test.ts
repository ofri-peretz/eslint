/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting popular Express middleware: a directory listing guarded by a
 * hand-written prefix-containment check was reported as an arbitrary file read.
 * The path is normalised under a root that ends at a separator, and the
 * request is answered with 403 before `stat` and `readdir` when the path does
 * not start with that root. It is `startsWith`, written as a slice comparison.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noArbitraryFileAccess } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const serve = (guard: string, root = 'normalize(resolve(root) + sep)') => `
  var fs = require('fs');
  var path = require('path');
  var normalize = require('path').normalize;
  var resolve = require('path').resolve;
  var join = require('path').join;
  var sep = require('path').sep;
  function serveIndex(root) {
    var rootPath = ${root};
    return function (req, res, next) {
      var dir = getRequestedDir(req);
      var path = normalize(join(rootPath, dir));
      ${guard}
      fs.stat(path, function (err, stat) {
        fs.readdir(path, function (err, files) {});
      });
    };
  }
`;

ruleTester.run('a prefix containment guard is a guard', noArbitraryFileAccess, {
  valid: [
    {
      name: 'the serve-index guard: (path + sep).substr(0, root.length) !== root, 403 after a debug call',
      code: serve(`if ((path + sep).substr(0, rootPath.length) !== rootPath) {
        debug('malicious path "%s"', path);
        return next(createError(403));
      }`),
    },
    {
      name: 'slice spelling of the same guard',
      code: serve(
        `if ((path + sep).slice(0, rootPath.length) !== rootPath) return next(createError(403));`,
      ),
    },
    {
      name: 'a bare path (no appended separator) against an anchored root',
      code: serve(
        `if (path.substring(0, rootPath.length) !== rootPath) throw new Error('forbidden');`,
      ),
    },
  ],
  invalid: [
    {
      name: 'no guard at all',
      code: serve(''),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'a root that does not end at a separator lets /safebad through /safe',
      code: serve(
        `if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));`,
        'resolve(root)',
      ),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'a guard on another variable guards nothing',
      code: serve(
        `if ((other + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));`,
      ),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'a guard whose reject path does not leave is not a guard',
      code: serve(
        `if ((path + sep).substr(0, rootPath.length) !== rootPath) { debug('malicious'); }`,
      ),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'a guard after the read is too late',
      code: `
        var fs = require('fs');
        function h(req, root) {
          var rootPath = normalize(resolve(root) + sep);
          var p = normalize(join(rootPath, req.query.dir));
          fs.readFile(p, cb);
          if ((p + sep).substr(0, rootPath.length) !== rootPath) return;
        }
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a plain read of a request path, no guard',
      code: "const fs = require('fs'); function h(req) { return fs.readFileSync(req.query.path); }",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// Each of these changes one thing about the accepted guard, and the guard stops
// being accepted: the read is reported again.
const guarded =
  'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));';

ruleTester.run(
  'a guard that is not the containment test',
  noArbitraryFileAccess,
  {
    valid: [
      {
        name: 'control: the unchanged guard is accepted',
        code: serve(guarded),
      },
    ],
    invalid: [
      {
        name: 'the comparison is === (it guards the wrong branch)',
        code: serve(
          'if ((path + sep).substr(0, rootPath.length) === rootPath) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the test is a plain call, not a comparison',
        code: serve(
          'if (path.substr(0, rootPath.length)) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the method is not a slice',
        code: serve(
          'if ((path + sep).concat(0, rootPath.length) !== rootPath) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the right-hand side is not a name',
        code: serve(
          "if ((path + sep).substr(0, rootPath.length) !== '/srv/') return next(createError(403));",
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the slice does not start at zero',
        code: serve(
          'if ((path + sep).substr(1, rootPath.length) !== rootPath) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the slice length is not a .length read',
        code: serve(
          'if ((path + sep).substr(0, 5) !== rootPath) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the slice length is not read off a name',
        code: serve(
          'if ((path + sep).substr(0, a.b.length) !== rootPath) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the slice length is read off another root',
        code: serve(
          'if ((path + sep).substr(0, other.length) !== rootPath) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the slice has no arguments',
        code: serve(
          'if ((path + sep).substr() !== rootPath) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the guarded value is not a name',
        code: serve(
          'if ((req.url + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the root is reassigned after it was read',
        code: serve(
          'rootPath = req.query.root; if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'the root is a name nothing defines',
        code: serve(
          'if ((path + sep).substr(0, nowhere.length) !== nowhere) return next(createError(403));',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
    ],
  },
);

ruleTester.run(
  'an anchored root, however it is spelled',
  noArbitraryFileAccess,
  {
    valid: [
      {
        name: 'path.normalize(path.resolve(dir) + path.sep)',
        code: serve(
          'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
          'path.normalize(path.resolve(root) + path.sep)',
        ),
      },
      {
        name: 'a template literal ending in a separator',
        code: serve(
          'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
          '`${resolve(root)}/`',
        ),
      },
    ],
    invalid: [
      {
        name: 'a computed callee names nothing',
        code: serve(
          'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
          'path[method](root + sep)',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'a call result used as a callee names nothing',
        code: serve(
          'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
          'make()(root + sep)',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'a call that is not normalize or resolve says nothing about the root',
        code: serve(
          'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
          'lookup(root + sep)',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'normalize with no argument says nothing about the root',
        code: serve(
          'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
          'normalize()',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'a root wrapped four deep is not followed',
        code: serve(
          'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
          'normalize(normalize(normalize(normalize(root + sep))))',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
      {
        name: 'a root that is a member of something is not a literal anchor',
        code: serve(
          'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
          'options.root',
        ),
        errors: [
          { messageId: 'violationDetected' as const },
          { messageId: 'violationDetected' as const },
        ],
      },
    ],
  },
);

const GUARD =
  'if ((path + sep).substr(0, rootPath.length) !== rootPath) return next(createError(403));';

ruleTester.run('what a prefix guard has to prove', noArbitraryFileAccess, {
  valid: [
    {
      name: 'the preamble serve-index really has: sep, normalize and join read off a path binding',
      code: `
        var fs = require('fs')
          , path = require('path')
          , normalize = path.normalize
          , sep = path.sep
          , join = path.join;
        var resolve = require('path').resolve;
        function serveIndex(root) {
          var rootPath = normalize(resolve(root) + sep);
          return function (req, res, next) {
            var dir = getRequestedDir(req);
            var path = normalize(join(rootPath, dir));
            if ((path + sep).substr(0, rootPath.length) !== rootPath) {
              debug('malicious path "%s"', path);
              return next(createError(403));
            }
            fs.stat(path, function () { fs.readdir(path, function () {}); });
          };
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'a path function chosen by a computed key names nothing',
      code: serve(GUARD).replace(
        "var normalize = require('path').normalize;",
        "var normalize = require('path')[kind];",
      ),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'a root built by another operator is not a separator-anchored string',
      code: serve(GUARD, 'base * sep'),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'a root read off an object member is not a separator-anchored string',
      code: serve(GUARD, 'options.root'),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },

    {
      name: 'a root rewritten through a destructuring assignment is not the root that was read',
      code: serve(GUARD).replace(
        'return function',
        "({ rootPath } = { rootPath: '/safe' });\n    return function",
      ),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'a local function named normalize says nothing about its result',
      code: serve(GUARD, "normalize('/safe/')").replace(
        "var normalize = require('path').normalize;",
        "function normalize(x) { return '/safe'; }",
      ),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'resolve strips the trailing separator, so resolve alone is not an anchor',
      code: serve(GUARD, "resolve('/safe/')"),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'appending something that is not a separator proves nothing',
      code: serve(
        'if ((path + suffix).substr(0, rootPath.length) !== rootPath) return next(createError(403));',
      ),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'a path never normalised may still carry .. segments',
      code: serve(GUARD).replace(
        'var path = normalize(join(rootPath, dir));',
        'var path = join(rootPath, dir) + extra;',
      ),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
    {
      name: 'a path rewritten after the check is not the path that was checked',
      code: serve(GUARD).replace(
        'fs.stat(path',
        'path = req.query.other;\n      fs.stat(path',
      ),
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
  ],
});
