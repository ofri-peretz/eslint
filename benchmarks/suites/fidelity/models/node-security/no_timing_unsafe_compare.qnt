// Model of eslint-plugin-node-security/no-timing-unsafe-compare (CWE-208).
// An equality operator over a secret-named operand is a timing oracle when the
// other side can be attacker-controlled (req / request / ctx / event roots).
// reportUnverifiedComparisons drops the attacker-controlled requirement; a
// string literal comparand is skipped unless reportLiteralComparands is on.
// nonSecretWords / nonSecretTails exclude collisions (authorId, tokenCount).
// A name ending in Id is a record key (localAuthId) unless a secret pattern
// ends in it too (sessionId). An If-None-Match header is attacker input that
// is not itself a secret: against the etag it is silent, against a secret-named
// value it still reports. crypto.timingSafeEqual is the safe twin.
module no_timing_unsafe_compare {
  // left: req.body.token | req.body.value | ctx.request.body.signature | userToken | submitted | req.headers['if-none-match']
  type Left = ReqBodyToken | ReqBodyValue | CtxSignature | UserToken | Submitted | IfNoneMatch
  // right: storedToken | expectedHmac | tokenCount | authorId | 'access' | expected | localAuthId | sessionId
  type Right = StoredToken | ExpectedHmac | TokenCount | AuthorId | Literal | Plain | LocalAuthId | SessionId
  type Op = StrictEq | LooseNe | TimingSafe
  type Opt = Default | Unverified | Literals

  pure def leftSecret(l: Left): bool = match l {
    | ReqBodyToken => true
    | CtxSignature => true
    | UserToken => true
    | _ => false
  }
  pure def leftUntrusted(l: Left): bool = match l {
    | ReqBodyToken => true
    | ReqBodyValue => true
    | CtxSignature => true
    | IfNoneMatch => true
    | _ => false
  }
  pure def rightSecret(r: Right): bool = match r {
    | StoredToken => true
    | ExpectedHmac => true
    | SessionId => true
    | _ => false
  }

  pure def reports(l: Left, r: Right, op: Op, o: Opt): bool =
    if (op == TimingSafe) false
    else if (r == Literal) (o == Literals and leftSecret(l))
    else (leftSecret(l) or rightSecret(r)) and (leftUntrusted(l) or o == Unverified)

  var left: Left
  var right: Right
  var op: Op
  var opt: Opt
  var verdict: bool

  action step = {
    nondet l = Set(ReqBodyToken, ReqBodyValue, CtxSignature, UserToken, Submitted, IfNoneMatch).oneOf()
    nondet r = Set(StoredToken, ExpectedHmac, TokenCount, AuthorId, Literal, Plain, LocalAuthId, SessionId).oneOf()
    nondet p = Set(StrictEq, LooseNe, TimingSafe).oneOf()
    nondet o = Set(Default, Unverified, Literals).oneOf()
    all { left' = l, right' = r, op' = p, opt' = o, verdict' = reports(l, r, p, o) }
  }

  action init = step
}
