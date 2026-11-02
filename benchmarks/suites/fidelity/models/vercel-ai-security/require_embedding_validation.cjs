const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'require-embedding-validation',
  domain: 144, // 2 importsAi x 4 stores x 6 values x 3 keys
  traces: 1800,
  key: (s) =>
    ['importsAi', 'store', 'value', 'key']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  code: (s) => {
    const v = tag(s.value);
    const pre = v === 'ViaLocal' ? ['const vec = await embed(text);'] : [];
    const value = {
      EmbedDirect: 'await embed(text)',
      CreateEmbedding: 'await createEmbedding(text)',
      Validated: 'validateEmbedding(await embed(text))',
      Normalized: 'normalize(await embed(text))',
      ViaLocal: 'vec',
      NoEmbedding: 'doc.title',
    }[v];
    const k = {
      EmbeddingKey: 'embedding',
      VectorKey: 'vector',
      QuotedEmbeddingKey: "'embedding'",
    }[tag(s.key)];
    const call = {
      VectorUpsert: 'vectorStore.upsert',
      IndexInsert: 'index.insert',
      IndexAdd: 'index.add',
      AddressLookup: 'addressService.lookup',
    }[tag(s.store)];
    return [
      s.importsAi
        ? "import { embed } from 'ai';"
        : "import { embed } from './embedder';",
      "import { createEmbedding, validateEmbedding, normalize, vectorStore, index, addressService } from './vectors';",
      'export async function ingest(doc, text) {',
      ...pre.map((l) => `  ${l}`),
      `  await ${call}({ id: doc.id, ${k}: ${value} });`,
      '}',
      '',
    ].join('\n');
  },
};
