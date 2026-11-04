// Model of eslint-plugin-jwt-security/no-decode-without-verify (CWE-345).
// A decode never checks the signature, so trusting what it returns trusts the
// attacker. Reading only the time claims (the client-side refresh check), the
// header's kid (a forged kid only selects a key the signature then fails
// against), or a token this code fetched itself from the authorization server
// is not trusting it. header.alg / header.jku are: choosing those from the
// token is the attack, unless allowHeaderInspection exempts every header read.
// A token the browser POSTed (request.json()) is the front channel.
module no_decode_without_verify {
  type Spelling =
    | Default | Namespace | Require | Named | Renamed | RequireDestructured | Bracket | NoImport
    | JwtDecodeV3 | JwtDecodeV4 | JoseDecodeJwt
  type Use =
    | ReadSub | WholePayload | ExpOnly | BackChannel | FrontChannel | TextDecoderTwin
    | HeaderKid | HeaderAlg | HeaderJku

  // jsonwebtoken's `decode(token, { complete: true })` is the header API the
  // header uses are written against.
  pure def jsonwebtoken(sp: Spelling): bool =
    not(Set(JwtDecodeV3, JwtDecodeV4, JoseDecodeJwt).contains(sp))

  pure def reports(sp: Spelling, u: Use, allowHeader: bool): bool =
    sp != NoImport and match u {
      | ReadSub => true
      | WholePayload => true
      | ExpOnly => false
      | BackChannel => false
      | FrontChannel => true
      | TextDecoderTwin => false
      | HeaderKid => false
      | HeaderAlg => not(allowHeader)
      | HeaderJku => not(allowHeader)
    }

  var spelling: Spelling
  var use: Use
  var allowHeader: bool
  var verdict: bool

  action step = {
    nondet sp = Set(
      Default, Namespace, Require, Named, Renamed, RequireDestructured, Bracket, NoImport,
      JwtDecodeV3, JwtDecodeV4, JoseDecodeJwt,
    ).oneOf()
    val claimUses = Set(ReadSub, WholePayload, ExpOnly, BackChannel, FrontChannel, TextDecoderTwin)
    nondet u = (if (jsonwebtoken(sp)) claimUses.union(Set(HeaderKid, HeaderAlg, HeaderJku)) else claimUses).oneOf()
    nondet h = Set(true, false).oneOf()
    all {
      spelling' = sp,
      use' = u,
      allowHeader' = h,
      verdict' = reports(sp, u, h),
    }
  }

  action init = step
}
