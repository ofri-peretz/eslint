// Model of eslint-plugin-vercel-ai-security/require-rag-content-validation (CWE-74).
// Content from a retrieval call (whole word: search, retrieve, query,
// similaritySearch, …) that reaches `prompt` or `system` — directly, through a
// template, or derived via map/join — is reported unless a configured
// validator (validate…, sanitize, filterDocs…) wraps it. `researchTopic` is
// not a search; `context` is not a retrieval word.
module require_rag_content_validation {
  type Retrieval = VectorSearch | RetrieveCall | SimilaritySearch | ResearchTopic | LoadContext
  type Use =
    | TemplateDirect   // `Based on these documents: ${docs}`
    | MapJoin          // const context = docs.map((d) => d.pageContent).join('\n'); `${context}`
    | Validated        // `${validateContent(docs)}`
    | Sanitized        // `${sanitize(docs)}`
    | FilterDocs       // `${filterDocs(docs)}`
  type Target = PromptKey | SystemKey

  pure def isRetrieval(r: Retrieval): bool = r != ResearchTopic and r != LoadContext
  pure def unvalidated(u: Use): bool = u == TemplateDirect or u == MapJoin

  pure def reports(importsAi: bool, r: Retrieval, u: Use, t: Target): bool =
    importsAi and isRetrieval(r) and unvalidated(u)

  var importsAi: bool
  var retrieval: Retrieval
  var use: Use
  var target: Target
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet r = Set(VectorSearch, RetrieveCall, SimilaritySearch, ResearchTopic, LoadContext).oneOf()
    nondet u = Set(TemplateDirect, MapJoin, Validated, Sanitized, FilterDocs).oneOf()
    nondet t = Set(PromptKey, SystemKey).oneOf()
    all { importsAi' = i, retrieval' = r, use' = u, target' = t, verdict' = reports(i, r, u, t) }
  }

  action init = step
}
