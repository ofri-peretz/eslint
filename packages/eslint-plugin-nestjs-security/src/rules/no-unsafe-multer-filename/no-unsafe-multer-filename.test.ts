/**
 * @fileoverview Tests for no-unsafe-multer-filename
 *
 * Every `valid` entry below is a shape measured in the corpus, not an invented
 * counter-example. The rule's whole claim is that it abstains whenever the
 * author did *anything* to the name, so the abstentions are the part worth
 * testing hardest — a rule that only ever fires is easy to write and useless.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeMulterFilename } from './index';

/**
 * Every fixture imports from NestJS, because the rules now abstain in files
 * that use no NestJS at all. Wrapping the arrays rather than editing each
 * fixture means one cannot be left behind — a fixture missing the import would
 * pass vacuously on the gate instead of exercising the detection it was written
 * for. A SIDE-EFFECT import, so it reserves no binding a fixture might declare.
 * `output` and errors[].suggestions[].output are prefixed too, because autofix
 * fixtures assert the whole file back.
 */
const asNest = (code: string): string => `import '@nestjs/common';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const nest = <T>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asNest(c) as T;
    const t = c as Case;
    return {
      ...c,
      code: asNest(t.code),
      ...(typeof t.output === 'string' ? { output: asNest(t.output) } : {}),
      ...(t.errors
        ? {
            errors: t.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asNest(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-unsafe-multer-filename', noUnsafeMulterFilename, {
  valid: nest([
    // truthy/src/common/helper/multer-options.helper.ts — the correct fix.
    // `extname` cannot return a path separator, so the client controls at most
    // the suffix of a name we chose.
    `
      diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          cb(null, \`\${uuid()}\${extname(file.originalname)}\`);
        },
      });
    `,
    // brocoders-bp — `.split('.').pop()` is not a sanitiser, but it is a call,
    // and judging whether it is *enough* means reasoning this rule declines to
    // do. Abstain rather than argue.
    `
      diskStorage({
        filename: (request, file, callback) => {
          callback(null, \`\${randomStringGenerator()}.\${file.originalname.split('.').pop()}\`);
        },
      });
    `,
    // meimei-admin/meimei-prisma-vue3 — the concatenation happens inside
    // `resetName`, another function in another part of the file. Following it
    // is cross-function reasoning; staying quiet is the documented line.
    `
      diskStorage({
        filename: async function (req, file, cd) {
          const name = resetName(file);
          cd(null, Date.now() + '-' + name);
        },
      });
    `,
    // A name built entirely from values we control.
    `
      diskStorage({
        filename(req, file, cb) {
          cb(null, randomUUID() + '.bin');
        },
      });
    `,
    // Not multer.
    `
      createStorage({
        filename(req, file, cb) { cb(null, file.originalname); },
      });
    `,
    // `filename` given as a reference, not a literal function: the body is
    // elsewhere and there is nothing local to read.
    `diskStorage({ filename: myFilenameFn });`,
    // No options object at all.
    `diskStorage();`,
    // Options object with no `filename` key — multer then generates a random
    // name itself, which is the safe default.
    `diskStorage({ destination: './uploads' });`,
    // Computed and non-identifier keys are not the `filename` property.
    `
      diskStorage({
        [filename]: (req, file, cb) => { cb(null, file.originalname); },
      });
    `,
    {
      name: 'a destructured file parameter that never binds originalname',
      code: `
      diskStorage({
        filename: (req, { mimetype }, cb) => { cb(null, mimetype); },
      });
    `,
    },
    // A nested callback has its own `file`; following it would mean guessing
    // when it runs and against which value.
    `
      diskStorage({
        filename(req, file, cb) {
          lookup(file, (err, meta) => { cb(null, meta.safeName); });
        },
      });
    `,
    // The tainted value goes somewhere that is not the storage callback.
    `
      diskStorage({
        filename(req, file, cb) {
          logger.debug(file.originalname);
          cb(null, randomUUID());
        },
      });
    `,
    // Non-concatenating operator: a comparison cannot carry a path separator.
    `
      diskStorage({
        filename(req, file, cb) {
          cb(null, (file.originalname === 'x') + '.bin');
        },
      });
    `,
    // A spread in the options object is not a `filename` property.
    `diskStorage({ ...base, destination: './uploads' });`,
    // `cb(null)` — the callback is invoked with no name at all, so there is no
    // second argument to judge. Multer treats that as an error path.
    `
      diskStorage({
        filename(req, file, cb) {
          if (!file) { cb(new Error('no file')); return; }
          cb(null, randomUUID());
        },
      });
    `,
    // Destructuring a tainted value does not produce a tracked binding: there
    // is no single identifier to follow, and guessing which property carries
    // the path is exactly the kind of inference this rule refuses.
    `
      diskStorage({
        filename(req, file, cb) {
          const [head] = file.originalname;
          cb(null, randomUUID());
        },
      });
    `,
    // Test files are exempt by default.
    {
      name: 'a spec file is exempt by default',
      code: `diskStorage({ filename(req, file, cb) { cb(null, file.originalname); } });`,
      filename: 'upload.spec.ts',
    },
  ]),
  invalid: nest([
    // nestjs-course-code/nest-multer-upload/src/my-file-storage.ts — the exact
    // shape three separate course projects ship, and the reason this rule
    // exists: a timestamp prefix reads as a mitigation and is not one.
    {
      name: 'a timestamp prefix reads as a mitigation and is not one — the client name still lands on disk',
      code: `
        diskStorage({
          destination: './uploads',
          filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname;
            cb(null, file.fieldname + '-' + uniqueSuffix);
          },
        });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    // book-management-system-backend / meeting_room_booking_system_backend —
    // the local is handed straight to the callback.
    {
      code: `
        diskStorage({
          filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + file.originalname;
            cb(null, uniqueSuffix);
          },
        });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    // meimei-admin — reassignment through `let`, and the callback is spelled
    // `cd`. Read by position, or two of the five real findings are missed.
    {
      code: `
        diskStorage({
          filename: async (req, file, cd) => {
            let originalname = file.originalname;
            if (file.originalname.lastIndexOf('.') < 0) {
              originalname = 'x';
            }
            cd(null, Date.now() + '-' + originalname);
          },
        });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    // Straight through, no decoration.
    {
      code: `diskStorage({ filename(req, file, cb) { cb(null, file.originalname); } });`,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    // Namespaced call — `multer.diskStorage` is the same function.
    {
      code: `multer.diskStorage({ filename(req, file, cb) { cb(null, \`\${Date.now()}-\${file.originalname}\`); } });`,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    // Ternary: both arms have to be checked, not just the first.
    {
      code: `
        diskStorage({
          filename(req, file, cb) {
            cb(null, req.safe ? randomUUID() : file.originalname);
          },
        });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    // Logical fallback — the same shape with `||`.
    {
      code: `
        diskStorage({
          filename(req, file, cb) {
            cb(null, req.body.name || file.originalname);
          },
        });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    // Reported once per handler: two callback paths are one defect and one fix.
    {
      code: `
        diskStorage({
          filename(req, file, cb) {
            if (req.x) { cb(null, file.originalname); }
            cb(null, file.originalname);
          },
        });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    // Assignment to a previously-clean local still taints it.
    {
      code: `
        diskStorage({
          filename(req, file, cb) {
            let name = 'safe';
            name = file.originalname;
            cb(null, name);
          },
        });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    // Explicitly opted in on a test file.
    {
      code: `diskStorage({ filename(req, file, cb) { cb(null, file.originalname); } });`,
      filename: 'upload.spec.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'clientControlledFilename' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Quint fidelity model (benchmarks/suites/fidelity/models/nestjs-security)
// These fixtures are NOT wrapped in `nest()`: the file-level gate is the claim.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-unsafe-multer-filename (fidelity)', noUnsafeMulterFilename, {
  valid: [
    {
      name: 'a handler with no callback parameter hands nothing to multer',
      code: `
        import { diskStorage } from 'multer';
        diskStorage({ filename(req, file) { return file.originalname; } });
      `,
    },
    {
      name: 'a file importing neither NestJS nor multer is not checked',
      code: `
        export const storage = diskStorage({
          filename(req, file, cb) { cb(null, file.originalname); },
        });
      `,
    },
  ],
  invalid: [
    {
      name: "the doc's ❌ example — a multer-only storage module — is reported",
      code: `
        import { diskStorage } from 'multer';
        export const storage = diskStorage({
          filename(req, file, cb) { cb(null, file.originalname); },
        });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    {
      name: 'a destructured originalname arrives from the wire untouched',
      code: `
        import '@nestjs/common';
        diskStorage({ filename(req, { originalname }, cb) { cb(null, originalname); } });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    {
      name: 'a rest element beside a destructured originalname does not hide it',
      code: `
        import { diskStorage } from 'multer';
        diskStorage({ filename(req, { originalname, ...rest }, cb) { cb(null, originalname); } });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
    {
      name: 'a renamed destructured originalname with a default is still tracked',
      code: `
        import multer from 'multer';
        multer.diskStorage({
          filename: (req, { originalname: name = 'upload' }, cb) => cb(null, 'x-' + name),
        });
      `,
      errors: [{ messageId: 'clientControlledFilename' }],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutation audit 2026-11-02: each case pins one claim a surviving mutant broke.
// ─────────────────────────────────────────────────────────────────────────────
const storage = (handler: string): string =>
  `diskStorage({ filename(req, file, cb) { ${handler} } });`;
ruleTester.run(
  'no-unsafe-multer-filename (mutation audit)',
  noUnsafeMulterFilename,
  {
    valid: nest([
      {
        name: 'a conditional choosing between two server-made names is safe',
        code: storage(`cb(null, isImage ? 'image.bin' : 'file.bin');`),
      },
      {
        name: 'a fallback between two server-made names is safe',
        code: storage(`cb(null, customName || 'upload.bin');`),
      },
      {
        name: 'a server-side file field is not the client name',
        code: storage('cb(null, `${Date.now()}-${file.size}`);'),
      },
      {
        name: "another object's originalname is not the uploaded file's",
        code: storage(`cb(null, saved.originalname);`),
      },
      {
        name: 'concatenating the client name onto a local does not taint that local',
        code: storage(
          `const stored = base + file.originalname; log(stored); cb(null, base);`,
        ),
      },
      {
        name: 'passing the client name to another function is not storing it',
        code: storage(
          `audit('upload', file.originalname); cb(null, randomUUID());`,
        ),
      },
      {
        name: 'a nested function that rebinds the file parameter reads a different file',
        code: storage(`others.forEach((file) => cb(null, file.originalname));`),
      },
      {
        name: 'a nested function that rebinds the callback calls a different callback',
        code: storage(
          `save(file, (err, cb) => cb(null, file.originalname)); cb(null, randomUUID());`,
        ),
      },
    ]),
    invalid: nest([
      {
        // @found mutation testing
        name: 'FN: a bracketed diskStorage is the same call',
        code: `storage['diskStorage']({ filename(req, file, cb) { cb(null, file.originalname); } });`,
        errors: [{ messageId: 'clientControlledFilename' }],
      },
      {
        // @found mutation testing
        name: "FN: a string-literal 'filename' key is the same handler",
        code: `diskStorage({ 'filename': (req, file, cb) => cb(null, file.originalname) });`,
        errors: [{ messageId: 'clientControlledFilename' }],
      },
      {
        // @found mutation testing
        name: 'FN: cb called inside a callback after mkdir still stores the client name',
        code: storage(
          `fs.mkdir(dest, { recursive: true }, () => cb(null, file.originalname));`,
        ),
        errors: [{ messageId: 'clientControlledFilename' }],
      },
      {
        // @found mutation testing
        name: 'FN: a tainted local inside a conditional is still the client name',
        code: storage(
          `const name = file.originalname; cb(null, keep ? name : 'upload.bin');`,
        ),
        errors: [{ messageId: 'clientControlledFilename' }],
      },
      {
        name: 'a tainted local interpolated into a template is still the client name',
        code: storage(
          'const name = file.originalname; cb(null, `${Date.now()}-${name}`);',
        ),
        errors: [{ messageId: 'clientControlledFilename' }],
      },
      {
        name: 'an array pattern with a hole in the handler does not stop the walk',
        code: storage(
          `const [, ext] = file.mimetype.split('/'); cb(null, file.originalname);`,
        ),
        errors: [{ messageId: 'clientControlledFilename' }],
      },
    ]),
  },
);
ruleTester.run(
  'no-unsafe-multer-filename (mutation audit, rebinding)',
  noUnsafeMulterFilename,
  {
    valid: nest([
      {
        name: 'a nested function that rebinds a tainted local reads its own value',
        code: storage(
          `const name = file.originalname; pick(names, (name) => cb(null, name));`,
        ),
      },
      {
        // @found mutation testing
        name: 'FP: a nested function that destructures its own file reads a different file',
        code: storage(
          `others.forEach(({ file }) => cb(null, file.originalname));`,
        ),
      },
      {
        // @found mutation testing
        name: 'FP: a nested function whose callback parameter has a default calls a different callback',
        code: storage(
          `save(file, (err, cb = noop) => cb(null, file.originalname)); cb(null, randomUUID());`,
        ),
      },
      {
        name: 'a nested pattern under originalname binds a piece of the name, not the name',
        code: `diskStorage({ filename(req, { originalname: { length } }, cb) { cb(null, 'upload-' + length); } });`,
      },
      {
        name: 'destructuring the client name binds its pieces, not the name',
        code: storage(
          `const { length } = file.originalname; cb(null, 'upload-' + length);`,
        ),
      },
      {
        name: 'storing the client name on an object does not taint the object',
        code: storage(`meta.name = file.originalname; cb(null, meta);`),
      },
      {
        name: 'assigning a server-made name to a local does not taint it',
        code: storage(`let name; name = randomUUID(); cb(null, name);`),
      },
      {
        name: 'storing the client name on this taints no local',
        code: storage(`this.last = file.originalname; cb(null, randomUUID());`),
      },
      {
        name: 'storing the client name on a property does not taint a local of the same name',
        code: storage(`meta.name = file.originalname; cb(null, name);`),
      },
    ]),
    invalid: [],
  },
);
ruleTester.run(
  'no-unsafe-multer-filename (mutation audit, untracked params)',
  noUnsafeMulterFilename,
  {
    valid: [],
    invalid: nest([
      {
        name: 'a nested callback whose parameters rebind nothing tracked still stores the client name',
        code: storage(`fs.mkdir(dest, (err) => cb(null, file.originalname));`),
        errors: [{ messageId: 'clientControlledFilename' }],
      },
    ]),
  },
);
