const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-zip-slip',
  domain: 54, // 9 shapes x 3 import forms x 2 option values
  traces: 700,
  key: (s) => `${tag(s.shape)}|${tag(s.imp)}|withoutCtx=${s.withoutCtx}`,
  config: (s) => ({ reportWithoutArchiveContext: s.withoutCtx }),
  code: (s) => {
    const sh = tag(s.shape);
    const imp = tag(s.imp);
    const isTar = sh === 'TarExtract';
    const head = isTar
      ? {
          EsmImport: "import tar from 'tar';",
          CjsRequire: "const tar = require('tar');",
          NoArchiveImport: '',
        }[imp]
      : {
          EsmImport: "import AdmZip from 'adm-zip';",
          CjsRequire: "const AdmZip = require('adm-zip');",
          NoArchiveImport: '',
        }[imp];
    // No archive in the file: the same shapes over a directory listing (Dirent.name)
    // and over unrelated objects that happen to have extract-named methods.
    const noArc = imp === 'NoArchiveImport';
    const field = noArc ? 'name' : 'entryName';
    const loop = (inner) =>
      (noArc
        ? `for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {\n    `
        : `const zip = new AdmZip(file);\n  for (const entry of zip.getEntries()) {\n    `) +
      inner
        .replace(/entryName/g, field)
        .replace(/entry\.getData\(\)/g, noArc ? 'file' : 'entry.getData()') +
      '\n  }';
    const zipNew = noArc
      ? 'const zip = { extractAllTo: (d: string) => d };'
      : 'const zip = new AdmZip(file);';
    const body = {
      ExtractAllTo: `${zipNew}\n  zip.extractAllTo(dest);`,
      TarExtract: noArc
        ? 'const parser = { extract: (o: object) => o };\n  parser.extract({ file, cwd: dest });'
        : 'tar.extract({ file, cwd: dest });',
      EntryJoin: loop(
        'const outputPath = path.join(dest, entry.entryName);\n    fs.writeFileSync(outputPath, entry.getData());',
      ),
      EntryResolveChecked: loop(
        "const outputPath = path.resolve(dest, entry.entryName);\n    if (!outputPath.startsWith(dest + path.sep)) {\n      throw new Error('Zip Slip');\n    }\n    fs.writeFileSync(outputPath, entry.getData());",
      ),
      EntryRelativeChecked: loop(
        "const outputPath = path.resolve(dest, entry.entryName);\n    const rel = path.relative(dest, outputPath);\n    if (rel.startsWith('..') || path.isAbsolute(rel)) continue;\n    fs.writeFileSync(outputPath, entry.getData());",
      ),
      EntryFailedBranch: loop(
        'const outputPath = path.resolve(dest, entry.entryName);\n    if (!outputPath.startsWith(dest + path.sep)) {\n      fs.writeFileSync(path.join(dest, entry.entryName), entry.getData());\n    }',
      ),
      EntryValidateFn: loop(
        'const outputPath = safePath(dest, entry.entryName);\n    fs.writeFileSync(outputPath, entry.getData());',
      ),
      SafeComment: `${zipNew}\n  // @safe: entries were verified by the upload service\n  zip.extractAllTo(dest);`,
      SafeLib:
        "const safeExtract = require('safe-archive-extract');\n  safeExtract(file, dest);",
    }[sh];
    return `import fs from 'node:fs';\nimport path from 'node:path';\n${head}\ndeclare function safePath(d: string, n: string): string;\nexport function unpack(file: string, dest: string) {\n  ${body}\n}\n`;
  },
  model: (s) => s.verdict,
};
