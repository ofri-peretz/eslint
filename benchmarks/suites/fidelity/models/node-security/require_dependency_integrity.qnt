// Model of eslint-plugin-node-security/require-dependency-integrity (CWE-494).
// Contract (docs): a script or stylesheet tag loading from a popular CDN
// (cdnjs, unpkg, jsdelivr) without an integrity hash is reported, whether it
// is written in a string literal, a template literal without expressions, or
// JSX. With integrity + crossorigin it is fine. A self-hosted src is not a CDN
// resource; a bare CDN URL that no tag loads is not a resource load.
module require_dependency_integrity {
  type TagKind = ScriptStr | LinkStr | ScriptTemplate | ScriptJsx | LinkJsx | PlainUrl
  type Host = Cdnjs | Unpkg | Jsdelivr | SelfHosted

  pure def reports(t: TagKind, h: Host, hasIntegrity: bool): bool =
    t != PlainUrl and h != SelfHosted and not(hasIntegrity)

  var tagKind: TagKind
  var host: Host
  var hasIntegrity: bool
  var verdict: bool

  action step = {
    nondet t = Set(ScriptStr, LinkStr, ScriptTemplate, ScriptJsx, LinkJsx, PlainUrl).oneOf()
    nondet h = Set(Cdnjs, Unpkg, Jsdelivr, SelfHosted).oneOf()
    nondet i = Set(true, false).oneOf()
    all { tagKind' = t, host' = h, hasIntegrity' = i, verdict' = reports(t, h, i) }
  }

  action init = step
}
