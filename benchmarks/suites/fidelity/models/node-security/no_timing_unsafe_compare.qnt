// Model of eslint-plugin-node-security/no-timing-unsafe-compare (CWE-208).
// An equality operator over a secret-named operand is a timing oracle when the
// other side can be attacker-controlled (req / request / ctx / event roots).
// reportUnverifiedComparisons drops the attacker-controlled requirement; a
// string literal comparand is skipped unless reportLiteralComparands is on.
// nonSecretWords / nonSecretTails exclude collisions (authorId, tokenCount).
// crypto.timingSafeEqual is the safe twin.
module no_timing_unsafe_compare {
  // left: req.body.token | req.body.value | ctx.request.body.signature | userToken | submitted
  type Left = ReqBodyToken | ReqBodyValue | CtxSignature | UserToken | Submitted
  // right: storedToken | expectedHmac | tokenCount | authorId | 'access' | expected
  type Right = StoredToken | ExpectedHmac | TokenCount | AuthorId | Literal | Plain
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
    | _ => false
  }
  pure def rightSecret(r: Right): bool = match r {
    | StoredToken => true
    | ExpectedHmac => true
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
    nondet l = Set(ReqBodyToken, ReqBodyValue, CtxSignature, UserToken, Submitted).oneOf()
    nondet r = Set(StoredToken, ExpectedHmac, TokenCount, AuthorId, Literal, Plain).oneOf()
    nondet p = Set(StrictEq, LooseNe, TimingSafe).oneOf()
    nondet o = Set(Default, Unverified, Literals).oneOf()
    all { left' = l, right' = r, op' = p, opt' = o, verdict' = reports(l, r, p, o) }
  }

  action init = step
}
