/**
 * no-zip-slip — the canonical containment guard, failure branches, and the
 * scope of a `@safe` annotation.
 *
 * Owner decisions of 2026-10-18 (benchmarks/audits/2026-10-18-fp-fn-quint-stryker.md,
 * "no-zip-slip still reports resolve followed by a startsWith check"):
 *
 *   - `const p = path.resolve(dest, entry.name); if (!p.startsWith(dest + path.sep))
 *     throw …;` followed by a use of `p` is THE documented fix, and is safe —
 *     so are the `path.resolve(dest) + path.sep` and `path.relative()` spellings;
 *   - a join inside the branch a check FAILS into is not validated by it;
 *   - `@safe` covers the statement it annotates, not the whole file, and a
 *     line comment counts the same as a block comment.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noZipSlip } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const ADM = `import AdmZip from 'adm-zip';\nimport path from 'path';\nimport fs from 'fs';\n`;

describe('the canonical containment guard', () => {
  ruleTester.run('resolve, then check, then use', noZipSlip, {
    valid: [
      {
        name: 'resolve + !startsWith(dest + path.sep) + throw, then write p',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  if (!p.startsWith(dest + path.sep)) throw new Error('zip slip');
  fs.writeFileSync(p, entry.getData());
}`,
      },
      {
        name: 'resolve + !startsWith(path.resolve(dest) + path.sep) + continue',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const target = path.join(dest, entry.entryName);
  if (!target.startsWith(path.resolve(dest) + path.sep)) {
    continue;
  }
  fs.writeFileSync(target, entry.getData());
}`,
      },
      {
        name: 'resolve + path.relative() check + return',
        code: `${ADM}function write(entry) {
  const p = path.resolve(dest, entry.entryName);
  const rel = path.relative(dest, p);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return;
  fs.writeFileSync(p, entry.getData());
}`,
      },
      {
        name: 'a generic early-exit guard covers the join that follows it',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (entry.entryName.includes('..')) continue;
  fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
}`,
      },
      {
        name: 'a positive check whose else exits covers the join after it',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  if (p.startsWith(dest + path.sep)) {
    console.log('ok');
  } else {
    throw new Error('zip slip');
  }
  fs.writeFileSync(p, entry.getData());
}`,
      },
    ],
    invalid: [
      {
        name: 'p used BEFORE the check is not covered by it',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  fs.writeFileSync(p, entry.getData());
  if (!p.startsWith(dest + path.sep)) throw new Error('zip slip');
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a check that logs instead of leaving is not a guard',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  if (!p.startsWith(dest + path.sep)) console.warn('suspicious');
  fs.writeFileSync(p, entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a check on a different value does not cover p',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  if (!other.length) throw new Error('empty');
  fs.writeFileSync(p, entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
    ],
  });
});

describe('a join in the failure branch is not validated', () => {
  ruleTester.run('failure branches', noZipSlip, {
    valid: [],
    invalid: [
      {
        name: 'the then-branch of a negated startsWith is where the check failed',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (!target.startsWith(dest + path.sep)) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: "the then-branch of includes('..') is where traversal was found",
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (entry.entryName.includes('..')) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'the else-branch of a positive startsWith is where the check failed',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (target.startsWith(dest + path.sep)) {
    console.log('inside');
  } else {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: "a relative() check that found '..' guards nothing in its own branch",
        code: `${ADM}function write(entry, rel) {
  if (rel.startsWith('..')) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
    ],
  });
});

describe('@safe is scoped to the next statement', () => {
  ruleTester.run('annotation scope', noZipSlip, {
    valid: [
      {
        name: 'a block @safe directly above the extraction',
        code: `const zip = new AdmZip(file);
/** @safe */
zip.extractAllTo(dest);`,
      },
      {
        name: 'a line // @safe directly above the extraction',
        code: `const zip = new AdmZip(file);
// @safe — entries were checked by the upload service
zip.extractAllTo(dest);`,
      },
      {
        name: '@safe on the function that performs the extraction',
        code: `const zip = new AdmZip(file);
/** @safe — every entry is validated by the caller */
function unpack() {
  zip.extractAllTo(dest);
}`,
      },
    ],
    invalid: [
      {
        name: 'a file-header @safe does not silence an extraction further down',
        code: `/** @safe */
const AdmZip = require('adm-zip');
const zip = new AdmZip(file);
zip.extractAllTo(dest);`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: '@safe covers one statement, not the one after it',
        code: `const zip = new AdmZip(file);
/* @safe */
zip.extractAllTo('./vetted');
zip.extractAllTo(dest);`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
    ],
  });
});

describe('compound containment tests', () => {
  ruleTester.run('&& and ||', noZipSlip, {
    valid: [
      {
        name: 'a containment check conjoined with anything else still contains',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (target.startsWith(dest + path.sep) && !entry.isDirectory) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
      },
      {
        name: "the then-branch of !includes('..') is where no traversal was found",
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (!entry.entryName.includes('..')) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
      },
      {
        name: 'a guard clause inside a switch case covers the join after it',
        code: `${ADM}for (const entry of zip.getEntries()) {
  switch (entry.type) {
    case 'file':
      if (entry.entryName.includes('..')) break;
      fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
      break;
  }
}`,
      },
    ],
    invalid: [
      {
        name: 'a containment guard on another value, then a use of p',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  if (!other.startsWith(dest + path.sep)) throw new Error('zip slip');
  fs.writeFileSync(p, entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'either of two allowlists passing proves neither',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (A.includes(entry.entryName) || B.includes(other)) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a conjunction with no containment check in it proves nothing',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (ready && !entry.isDirectory) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a join bound to a name nothing checks afterwards',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a join bound in a for-loop header is not a guarded binding',
        code: `${ADM}for (let p = path.join(dest, entry.entryName); p; p = null) {
  if (!p.startsWith(dest)) throw new Error('zip slip');
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
    ],
  });
});

// Boundaries pinned by mutation testing (Stryker, 2026-10-18): each case is an
// input on which a surviving mutant of the guard logic and the rule disagreed.
describe('guard-logic edges', () => {
  ruleTester.run('edges', noZipSlip, {
    valid: [
      {
        name: 'a guard clause whose block logs before it continues',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (entry.entryName.includes('..')) {
    console.warn('skipping', entry.entryName);
    continue;
  }
  fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
}`,
      },
      {
        name: 'a containment prefix that merely contains ".." in the middle',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (target.startsWith('/srv/a..b/')) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
      },
      {
        name: 'a guard clause at module top level covers the join after it',
        code: `${ADM}const entry = zip.getEntries()[0];
if (entry.entryName.includes('..')) throw new Error('zip slip');
fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());`,
      },
      {
        name: 'an unrelated statement between the binding and its guard',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  const data = entry.getData();
  if (!p.startsWith(dest + path.sep)) throw new Error('zip slip');
  fs.writeFileSync(p, data);
}`,
      },
    ],
    invalid: [
      {
        name: 'void is not a negation: its else branch is not the safe one',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (void target.startsWith(dest + path.sep)) {
    console.log('?');
  } else {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a traversal check conjoined with anything says nothing when false',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (entry.entryName.includes('..') && strict) {
    throw new Error('zip slip');
  } else {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: "includes('/../') found traversal in its then-branch",
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (entry.entryName.includes('/../')) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: "startsWith('../') found traversal in its then-branch",
        code: `${ADM}function write(entry, rel) {
  if (rel.startsWith('../')) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'an if with no containment test whose else exits is not a guard',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (ready) {
    console.log('go');
  } else {
    continue;
  }
  fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'an if with no containment test and no else is not a guard',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (ready) console.log('go');
  fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a positive containment check with no else is not a guard clause',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (target.startsWith(dest + path.sep)) console.log('inside');
  fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a destructured piece of the join is not the join',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const { length } = path.join(dest, entry.entryName);
  if (!length.startsWith(dest)) throw new Error('zip slip');
  fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
}`,
        // The second join sits after an exiting containment check, so only
        // the destructured binding is reported.
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a statement that ends on p, before the guard, uses p unchecked',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName)
  last = p
  if (!p.startsWith(dest + path.sep)) throw new Error('zip slip')
  fs.writeFileSync(p, entry.getData())
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a guard on a value derived by join (not relative) does not cover p',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  const q = path.join(p, 'x');
  if (!q.startsWith(dest)) throw new Error('zip slip');
  fs.writeFileSync(p, entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a guard on a value from a bare helper call does not cover p',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  const q = resolveLink(p);
  if (!q.startsWith(dest)) throw new Error('zip slip');
  fs.writeFileSync(p, entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a guard on a concatenation of p does not cover p',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  const q = p + path.sep;
  if (!q.startsWith(dest)) throw new Error('zip slip');
  fs.writeFileSync(p, entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a declaration list whose first name has no initialiser',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const p = path.resolve(dest, entry.entryName);
  let note, copy = p;
  if (!copy.startsWith(dest)) throw new Error('zip slip');
  fs.writeFileSync(p, entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a join inside a test that is not a containment check',
        code: `${ADM}for (const entry of zip.getEntries()) {
  if (fs.existsSync(path.join(dest, entry.entryName))) console.log('exists');
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
    ],
  });
});
