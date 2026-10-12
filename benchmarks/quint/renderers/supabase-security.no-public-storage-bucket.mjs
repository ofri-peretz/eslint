// Renders one state of models/supabase-security.no-public-storage-bucket.qnt.
// Spells the shape only; the verdict is the model's `expected`.

export const plugin = 'supabase-security';
export const rule = 'no-public-storage-bucket';
export const dimensions = ['method', 'flag', 'carrier'];

const FLAG = {
  TrueInline: ['', 'public: true'],
  TrueConst: ['const yes = true;\n', 'public: yes'],
  FalseFlag: ['', 'public: false'],
  RuntimeFlag: ['', 'public: isPublic'],
  NoFlag: ['', ''],
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const [top, prop] = FLAG[c.flag];
  const method = c.method === 'CreateBucket' ? 'createBucket' : 'updateBucket';
  const props = (rest) => `{ ${[prop, rest].filter(Boolean).join(', ')} }`;
  let pre = '';
  let options;
  switch (c.carrier) {
    case 'InlineOptions':
      options = props('fileSizeLimit: 1024');
      break;
    case 'OptionsConst':
      pre = `  const options = ${props('fileSizeLimit: 1024')};\n`;
      options = 'options';
      break;
    case 'SpreadOfConst':
      pre = `  const base = ${props('')};\n`;
      options = '{ ...base, fileSizeLimit: 1024 }';
      break;
    case 'UnknownSpreadAfter':
      options = props('...overrides');
      break;
    default:
      throw new Error(c.carrier);
  }
  return [
    "import { createClient } from '@supabase/supabase-js';",
    "const db = createClient('u', process.env.SUPABASE_SERVICE_ROLE_KEY!);",
    top,
    'export async function setup(isPublic: boolean, overrides: object) {',
    `${pre}  return db.storage.${method}('avatars', ${options});`,
    '}',
    '',
  ]
    .filter((l) => l !== '')
    .join('\n');
}
