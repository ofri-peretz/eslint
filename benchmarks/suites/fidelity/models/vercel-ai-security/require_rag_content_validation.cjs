const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'require-rag-content-validation',
  domain: 100, // 2 importsAi x 5 retrievals x 5 uses x 2 targets
  traces: 1300,
  key: (s) =>
    ['importsAi', 'retrieval', 'use', 'target']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  code: (s) => {
    const call = {
      VectorSearch: 'vectorStore.search(question)',
      RetrieveCall: 'retrieve(question)',
      SimilaritySearch: 'similaritySearch(embedding)',
      ResearchTopic: 'researchTopic(question)',
      LoadContext: 'loadContext(question)',
    }[tag(s.retrieval)];
    const u = tag(s.use);
    const pre =
      u === 'MapJoin'
        ? ["const context = docs.map((d) => d.pageContent).join('\\n');"]
        : [];
    const tpl = {
      TemplateDirect: '`Based on these documents: ${docs}`',
      MapJoin: '`Context: ${context}`',
      Validated: '`Context: ${validateContent(docs)}`',
      Sanitized: '`Context: ${sanitize(docs)}`',
      FilterDocs: '`Context: ${filterDocs(docs)}`',
    }[u];
    const opts =
      tag(s.target) === 'PromptKey'
        ? `prompt: ${tpl}`
        : `system: ${tpl}, prompt: question`;
    return [
      s.importsAi
        ? "import { generateText } from 'ai';"
        : "import { generateText } from './llm';",
      "import { vectorStore, retrieve, similaritySearch, researchTopic, loadContext, validateContent, sanitize, filterDocs, m } from './rag';",
      'export async function answer(question, embedding) {',
      `  const docs = await ${call};`,
      ...pre.map((l) => `  ${l}`),
      `  return generateText({ model: m, ${opts} });`,
      '}',
      '',
    ].join('\n');
  },
};
