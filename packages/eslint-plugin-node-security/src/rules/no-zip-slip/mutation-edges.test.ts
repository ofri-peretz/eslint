/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed, written against the rule as
 * it stands.
 *
 * Most `unvalidatedArchivePath` cases import `adm-zip` on purpose. Without
 * archive context the rule stays silent before it ever asks whether the path
 * was validated, so a validation fixture with no archive in the file proves
 * nothing about the validation check.
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
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const ADM = `import AdmZip from 'adm-zip';\nimport path from 'path';\n`;

ruleTester.run('mutation-guided edges', noZipSlip, {
  valid: [
    // isPathValidated: enclosing if-tests, with archive context present
    {
      name: 'a join in the else branch of an includes("..") rejection is validated',
      code: `${ADM}for (const entry of zip.getEntries()) {
  if (entry.entryName.includes('..')) {
    throw new Error('zip slip');
  } else {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
    },
    {
      name: 'a resolve that IS the negated startsWith containment check is validated',
      code: `${ADM}for (const entry of zip.getEntries()) {
  if (!path.resolve(dest, entry.entryName).startsWith(dest)) throw new Error('zip slip');
}`,
    },
    {
      name: 'a resolve inside a startsWith containment check and its guarded branch is validated',
      code: `${ADM}for (const entry of zip.getEntries()) {
  if (path.resolve(dest, entry.entryName).startsWith(dest + path.sep)) {
    fs.writeFileSync(path.resolve(dest, entry.entryName), entry.getData());
  }
}`,
    },
    // isPathValidated: wrappers around the join
    {
      name: 'a join wrapped in a configured validation function is validated',
      code: `${ADM}for (const entry of zip.getEntries()) {
  fs.writeFileSync(validatePath(path.join(dest, entry.entryName)), entry.getData());
}`,
    },
    {
      name: 'a join reduced to its basename by path.basename is validated',
      code: `${ADM}for (const entry of zip.getEntries()) {
  console.log(path.basename(path.join(dest, entry.entryName)));
}`,
    },
    // Archive context: only archive evidence establishes it
    {
      name: 'constructing an unrelated class does not make a Dirent walk an archive',
      code: `import path from 'path';
const startedAt = new Date();
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) path.join(dir, entry.name);`,
    },
    {
      name: 'an archive module name passed to a non-require function is not archive context',
      code: `import path from 'path';
if (isInstalled('tar')) console.log('tar available');
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) path.join(dir, entry.name);`,
    },
    // isSafeLibrary
    {
      name: 'a call on the unzipper module itself is trusted as a safe library',
      code: `unzipper.unzip(dest);`,
    },
    {
      name: 'a configured safe library name is matched case-insensitively inside a bare extractor name',
      code: `safeZipExtract(src, '/var/data');`,
      options: [
        {
          archiveFunctions: ['safeZipExtract'],
          safeLibraries: ['SafeZip'],
        },
      ],
    },
    {
      name: 'any one configured safe library is enough to trust a bare extractor',
      code: `safeZipExtract(src, '/var/data');`,
      options: [
        {
          archiveFunctions: ['safeZipExtract'],
          safeLibraries: ['other-lib', 'SafeZip'],
        },
      ],
    },
  ],
  invalid: [
    // isPathValidated: if-tests that validate nothing
    {
      name: 'a join inside an if (entry.isFile()) test is still unvalidated',
      code: `${ADM}for (const entry of zip.getEntries()) {
  if (entry.isFile()) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
      errors: [{ messageId: 'unvalidatedArchivePath' }],
    },
    {
      name: 'a join inside a negated property test is still unvalidated',
      code: `${ADM}for (const entry of zip.getEntries()) {
  if (!entry.isDirectory) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
      errors: [{ messageId: 'unvalidatedArchivePath' }],
    },
    {
      name: 'a join inside an if guarded by a plain function call is still unvalidated',
      code: `${ADM}for (const entry of zip.getEntries()) {
  if (isWanted(entry)) {
    fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());
  }
}`,
      errors: [{ messageId: 'unvalidatedArchivePath' }],
    },
    {
      name: 'a call whose callee names a zip establishes archive context',
      code: `import path from 'path';
const entries = readZipEntries(file);
for (const entry of entries) path.join(dest, entry.entryName);`,
      errors: [{ messageId: 'unvalidatedArchivePath' }],
    },
    // namesArchive through member receivers
    {
      name: 'an ambiguous extract on a this.zip receiver names an archive by its property',
      code: `this.zip.extract(dest);`,
      errors: [{ messageId: 'unsafeArchiveExtraction' }],
    },
    {
      name: 'an ambiguous extract on zipFile.reader names an archive by its object',
      code: `zipFile.reader.extract(dest);`,
      errors: [{ messageId: 'unsafeArchiveExtraction' }],
    },
    // Destination argument position and danger
    {
      name: 'extract(file, dest) reads the destination from the second argument',
      code: `archive.extract(file, '/var/www/html');`,
      errors: [
        { messageId: 'unsafeArchiveExtraction' },
        { messageId: 'dangerousArchiveDestination' },
      ],
    },
    {
      name: 'a destination under /var alone is dangerous',
      code: `zip.extractAllTo('/var/www');`,
      errors: [
        { messageId: 'unsafeArchiveExtraction' },
        { messageId: 'dangerousArchiveDestination' },
      ],
    },
    {
      name: 'a /tmp destination is not dangerous even when a later segment contains /home',
      code: `zip.extractAllTo('/tmp/homework-uploads');`,
      errors: [{ messageId: 'unsafeArchiveExtraction' }],
    },
    // Traversal literal inside the extraction call
    {
      name: 'a leading ../ destination is a traversal literal though not an unsafe extraction',
      code: `zip.extractAllTo('../out');`,
      errors: [{ messageId: 'pathTraversalInArchive' }],
    },
    // @safe annotation scan
    {
      name: 'an ordinary block comment such as a license header does not mark the file @safe',
      code: `/* Copyright 2025 Acme */\nzip.extractAllTo(dest);`,
      errors: [{ messageId: 'unsafeArchiveExtraction' }],
    },
  ],
});
