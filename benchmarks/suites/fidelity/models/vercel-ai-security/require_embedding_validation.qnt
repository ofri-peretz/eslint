// Model of eslint-plugin-vercel-ai-security/require-embedding-validation (CWE-20).
// An embedding produced by an embedding call (embed, createEmbedding, …) and
// written to a vector store (upsert, insert, add) must pass through a
// validator (validate…, normalize, verify…) first. A call chain that merely
// contains a store word (addressService.lookup) is not a store.
module require_embedding_validation {
  type Store = VectorUpsert | IndexInsert | IndexAdd | AddressLookup
  type Value =
    | EmbedDirect        // await embed(text)
    | CreateEmbedding    // await createEmbedding(input)
    | Validated          // validateEmbedding(await embed(text))
    | Normalized         // normalize(await embed(text))
    | ViaLocal           // const e = await embed(text); … e
    | NoEmbedding        // a plain document field
  type Key = EmbeddingKey | VectorKey | QuotedEmbeddingKey

  pure def unvalidated(v: Value): bool = v == EmbedDirect or v == CreateEmbedding or v == ViaLocal

  pure def reports(importsAi: bool, s: Store, v: Value, k: Key): bool =
    importsAi and s != AddressLookup and unvalidated(v)

  var importsAi: bool
  var store: Store
  var value: Value
  var key: Key
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet s = Set(VectorUpsert, IndexInsert, IndexAdd, AddressLookup).oneOf()
    nondet v = Set(EmbedDirect, CreateEmbedding, Validated, Normalized, ViaLocal, NoEmbedding).oneOf()
    nondet k = Set(EmbeddingKey, VectorKey, QuotedEmbeddingKey).oneOf()
    all { importsAi' = i, store' = s, value' = v, key' = k, verdict' = reports(i, s, v, k) }
  }

  action init = step
}
