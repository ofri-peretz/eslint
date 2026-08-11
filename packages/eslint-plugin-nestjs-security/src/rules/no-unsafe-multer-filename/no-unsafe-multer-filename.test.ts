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
const nest = <T,>(cases: T[]): T[] =>
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
    // Destructured parameters: there is no `file` binding to track.
    `
      diskStorage({
        filename: (req, { originalname }, cb) => { cb(null, originalname); },
      });
    `,
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
    // A computed callee is not provably `diskStorage`.
    `storage['diskStorage']({ filename(req, file, cb) { cb(null, file.originalname); } });`,
    // Test files are exempt by default.
    {
      code: `diskStorage({ filename(req, file, cb) { cb(null, file.originalname); } });`,
      filename: 'upload.spec.ts',
    },
  ]),
  invalid: nest([
    // nestjs-course-code/nest-multer-upload/src/my-file-storage.ts — the exact
    // shape three separate course projects ship, and the reason this rule
    // exists: a timestamp prefix reads as a mitigation and is not one.
    {
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
