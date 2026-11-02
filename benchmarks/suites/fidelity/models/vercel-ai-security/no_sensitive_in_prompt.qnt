// Model of eslint-plugin-vercel-ai-security/no-sensitive-in-prompt (CWE-200).
// A sensitive value (whole-word name match: password, apiKey, ssn, …), or a
// record built in the file with a sensitive key, interpolated into a prompt or
// a message's content is reported. Redaction helpers, references (userId),
// counts of tokens and non-sensitive fields are not.
module no_sensitive_in_prompt {
  type Value =
    | PasswordVar     // ${userPassword}
    | ApiKeyVar       // ${apiKey}
    | MemberPassword  // ${user.password}
    | BracketPassword // ${user['password']}
    | BusinessName    // ${businessName} — no `ssn` word
    | MaxTokens       // ${maxTokens} — a count, not a token
    | UserId          // ${userId}
    | Redacted        // ${redact(userPassword)}
    | LiteralRedacted // [REDACTED] in the text
    | UserName        // ${user.name}
    | RecordWithSecret // const creds = { password: pw }; ${JSON.stringify(creds)}
    | CustomTerm      // ${favoriteColor}, sensitive only when configured
  type Loc = PromptLoc | MessageContent

  pure def sensitive(v: Value, custom: bool): bool = match v {
    | PasswordVar => true
    | ApiKeyVar => true
    | MemberPassword => true
    | BracketPassword => true
    | BusinessName => false
    | MaxTokens => false
    | UserId => false
    | Redacted => false
    | LiteralRedacted => false
    | UserName => false
    | RecordWithSecret => true
    | CustomTerm => custom
  }

  pure def reports(importsAi: bool, v: Value, l: Loc, custom: bool): bool =
    importsAi and sensitive(v, custom)

  var importsAi: bool
  var value: Value
  var loc: Loc
  var custom: bool
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet v = Set(PasswordVar, ApiKeyVar, MemberPassword, BracketPassword, BusinessName, MaxTokens,
                   UserId, Redacted, LiteralRedacted, UserName, RecordWithSecret, CustomTerm).oneOf()
    nondet l = Set(PromptLoc, MessageContent).oneOf()
    nondet c = Set(true, false).oneOf()
    all { importsAi' = i, value' = v, loc' = l, custom' = c, verdict' = reports(i, v, l, c) }
  }

  action init = step
}
