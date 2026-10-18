// Samples every Quint model in ./models and writes the distinct cases, each
// stamped with the model's own `expected` verdict, to ./cases/<name>.json.
//
//   node benchmarks/quint/generate.mjs [name-filter]
//
// Quint is fetched on demand (npx), so the repo carries no dependency on it;
// the committed case files are what the lock test reads.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const QUINT = '@informalsystems/quint@0.33.0';
const SAMPLES = 8000;
const SEED = '0x1d10';
const filter = process.argv[2] ?? '';

for (const file of fs
  .readdirSync(path.join(HERE, 'models'))
  .filter((f) => f.endsWith('.qnt') && f.includes(filter))) {
  const name = file.replace(/\.qnt$/, '');
  const { dimensions } = await import(
    path.join(HERE, 'renderers', `${name}.mjs`)
  );
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'quint-'));
  execFileSync(
    'npx',
    [
      '-y',
      QUINT,
      'run',
      path.join(HERE, 'models', file),
      '--max-steps=0',
      `--max-samples=${SAMPLES}`,
      `--n-traces=${SAMPLES}`,
      `--seed=${SEED}`,
      `--out-itf=${path.join(out, 't_{seq}.itf.json')}`,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const cases = new Map();
  for (const t of fs.readdirSync(out)) {
    const st = JSON.parse(fs.readFileSync(path.join(out, t), 'utf8')).states[0];
    const key = dimensions.map((d) => st[d].tag).join('/');
    if (!cases.has(key)) cases.set(key, st.expected);
  }
  fs.rmSync(out, { recursive: true, force: true });
  const sorted = [...cases.entries()].sort(([a], [b]) => a.localeCompare(b));
  // One case per line: `[key, expected]`, the key's segments in `dimensions` order.
  const body = sorted.map((c) => `  ${JSON.stringify(c)}`).join(',\n');
  fs.writeFileSync(
    path.join(HERE, 'cases', `${name}.json`),
    `{\n "command": ${JSON.stringify(`node benchmarks/quint/generate.mjs ${name}`)},\n` +
      ` "model": ${JSON.stringify(`benchmarks/quint/models/${file}`)},\n "quint": "${QUINT}", "seed": "${SEED}", "samples": ${SAMPLES},\n` +
      ` "dimensions": ${JSON.stringify(dimensions)},\n "cases": [\n${body}\n ]\n}\n`,
  );
  // Format with the repo's own prettier so a regenerated file is byte-for-byte
  // what format-drift expects, not a diff waiting to happen.
  execFileSync(
    'npx',
    ['--no', 'prettier', '--write', path.join(HERE, 'cases', `${name}.json`)],
    {
      stdio: 'ignore',
    },
  );
  console.log(`${name}: ${sorted.length} distinct cases`);
}
