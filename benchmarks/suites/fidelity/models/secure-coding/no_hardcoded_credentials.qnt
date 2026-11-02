// Model of eslint-plugin-secure-coding/no-hardcoded-credentials (CWE-798).
// Contract: the VALUE's shape decides. Tier 1 (structural: prefixed API keys,
// AWS AKIA ids, JWTs, credentialed connection strings, 32+ char high-entropy
// mixed-case-with-digits blobs) is reported in any slot. Tier 2 (a 20-31 char
// random blob, a common weak password, a multi-class secret-shaped value) needs a
// credential-named slot; the weak name `key` counts only for a value that is
// already a random blob. Natural-word strings (i18n keys), sentences,
// placeholders and repeated characters are never reported. A charset constant is
// excluded from Tier 1 by the ascending-run check, but it still satisfies the
// literal Tier 2 test (>= 2 character classes, no whitespace, not natural words),
// so it is reported in a credential-named slot.
// (The test-file skip is not modelled: the harness lints one filename per model.)
module no_hardcoded_credentials {
  type Value = StripeLive | GithubPat | AwsAkia | Jwt | DbUrl | Blob32
             | Blob25 | WeakPwd | MixedClass
             | I18nKey | Sentence | Placeholder | Repeated | Charset
  type Slot = CredVar | NeutralVar | CredProp | WeakKeyProp

  pure def structural(v: Value): bool = Set(StripeLive, GithubPat, AwsAkia, Jwt, DbUrl, Blob32).contains(v)

  pure def reports(v: Value, s: Slot): bool =
    structural(v)
      or (Set(CredVar, CredProp).contains(s) and Set(Blob25, WeakPwd, MixedClass, Charset).contains(v))
      or (s == WeakKeyProp and v == Blob25)

  var value: Value
  var slot: Slot
  var verdict: bool

  action step = {
    nondet v = Set(StripeLive, GithubPat, AwsAkia, Jwt, DbUrl, Blob32, Blob25, WeakPwd, MixedClass,
                   I18nKey, Sentence, Placeholder, Repeated, Charset).oneOf()
    nondet s = Set(CredVar, NeutralVar, CredProp, WeakKeyProp).oneOf()
    all { value' = v, slot' = s, verdict' = reports(v, s) }
  }

  action init = step
}
