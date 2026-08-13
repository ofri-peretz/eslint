/**
 * @fileoverview Tests for require-stream-error-handler (CWE-248)
 *
 * The two `invalid` cases are the labelled corpus fixtures at
 * benchmarks/corpus/CWE-248/vulnerable/, and the first two `valid` cases are
 * their safe counterparts at benchmarks/corpus/CWE-248/safe/. Before this rule
 * existed, all four were "detected" by
 * node-security/detect-non-literal-fs-filename firing on the non-literal path
 * in each — 2 true positives and 2 false positives from a rule that has nothing
 * to do with stream lifetimes. Inverting that rule to a taint model correctly
 * removed all four, which is why CWE-248 needed a rule that actually reads the
 * thing the fixtures are about.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireStreamErrorHandler } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-stream-error-handler', requireStreamErrorHandler, {
  valid: [
    // benchmarks/corpus/CWE-248/safe/pipe-with-error-listener.js — named, and
    // the name carries an 'error' listener.
    `
      function download(req, res) {
        const stream = fs.createReadStream('./uploads/' + req.params.id);
        stream.on('error', () => {
          if (!res.headersSent) res.status(404).end();
        });
        stream.pipe(res);
      }
    `,
    // benchmarks/corpus/CWE-248/safe/pipeline-promises.js — pipeline() destroys
    // every stream and rejects. This is the fix the rule recommends, so
    // reporting it would be reporting the mitigation.
    `
      async function download(req, res) {
        try {
          await pipeline(fs.createReadStream('./uploads/' + req.params.id), res);
        } catch {
          if (!res.headersSent) res.status(404).end();
        }
      }
    `,
    // The listener may be registered after the pipe: the file is judged whole,
    // so statement order is not the criterion.
    `
      const s = fs.createWriteStream('/tmp/out');
      s.pipe(next);
      s.on('error', log);
    `,
    // `once` and `addListener` register the same handler.
    "const s = fs.createReadStream(p); s.once('error', log); s.pipe(res);",
    "const s = fs.createReadStream(p); s.addListener('error', log); s.pipe(res);",
    // Test files are exempt by default.
    {
      code: 'fs.createReadStream(p).pipe(res);',
      filename: '/proj/stream.test.ts',
    },
    // A destructured constructor is a bare identifier callee, and a handled
    // name is still handled however the constructor was imported.
    "const s = createReadStream(p); s.on('error', log); s.pipe(res);",
    // A bare identifier with no visible binding: the handler may be attached in
    // another module. Unproven is not unhandled.
    'incoming.pipe(outgoing);',
    // A name bound to something that is not a stream constructor.
    'const s = getStream(); s.pipe(res);',
    // A computed callee names no method statically, so it constructs nothing
    // this rule can identify.
    'const s = factories[kind](p); s.pipe(res);',
    // A property access is neither an inline construction nor a name this file
    // binds, so there is nothing to attribute a missing listener to.
    'this.request.pipe(res);',
    // Not a pipe at all.
    'fs.createReadStream(p).setEncoding("utf8");',
    // A computed or non-member callee is not `.pipe`.
    'pipe(fs.createReadStream(p));',
    'obj[fn](fs.createReadStream(p));',
    // `.pipe()` with no destination argument, and with a spread.
    'const s = getStream(); s.pipe();',
    'const s = getStream(); s.pipe(...targets);',
    // An 'error' listener on a non-identifier receiver is not attributable to a
    // name, and must not throw.
    "getStream().on('error', log);",
    // A listener call with no arguments at all.
    'const s = getStream(); s.on();',
  ],

  invalid: [
    // benchmarks/corpus/CWE-248/vulnerable/pipe-no-error-listener.js
    // The source is constructed inline, so no 'error' listener can ever have
    // been attached to it. A missing file emits 'error' and exits the process.
    {
      code: `
        function download(req, res) {
          const filePath = './uploads/' + req.params.id;
          fs.createReadStream(filePath).pipe(res);
        }
      `,
      errors: [{ messageId: 'unhandledStreamError' }],
    },
    // benchmarks/corpus/CWE-248/vulnerable/multipart-pipe-no-handler.js
    // Here it is the DESTINATION that is constructed inline — the write stream
    // has no name either, and a disk error on it is equally fatal.
    {
      code: `
        function upload(req, res) {
          const busboy = Busboy({ headers: req.headers });
          busboy.on('file', (name, file) => {
            file.pipe(fs.createWriteStream('./tmp/' + name));
          });
          req.pipe(busboy);
        }
      `,
      errors: [{ messageId: 'unhandledStreamError' }],
    },
    // Named, resolvable, and never handled anywhere in the file. This is the
    // case that makes the first `valid` fixture pass for the RIGHT reason: drop
    // the listener from it and it lands here.
    {
      code: `
        const stream = fs.createReadStream('/etc/hosts');
        stream.pipe(res);
      `,
      errors: [{ messageId: 'unhandledStreamError' }],
    },
    // A listener for a DIFFERENT event is not an error handler. Registering
    // 'close' is the commonest way to look handled while still crashing.
    {
      code: "const s = fs.createReadStream(p); s.on('close', log); s.pipe(res);",
      errors: [{ messageId: 'unhandledStreamError' }],
    },
    // A compression stream constructed inline is the same fact.
    {
      code: 'input.pipe(zlib.createGzip());',
      errors: [{ messageId: 'unhandledStreamError' }],
    },
  ],
});
