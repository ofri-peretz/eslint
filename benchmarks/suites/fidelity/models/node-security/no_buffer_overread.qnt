// Model of eslint-plugin-node-security/no-buffer-overread (CWE-126).
// Contract (docs): an index/offset into a buffer (Buffer/Uint8Array visible from
// the initializer, or a parameter spelled buf/buffer/bytes) is reported when it
// is request-controlled (roots req/request/event/ctx/context) and not bounds-
// checked. Both the inline and the documented `const index = parseInt(req...)`
// spelling are user-controlled. A dominating range check
// (`i >= 0 && i < buf.length`) or an early-exit boundsCheckFunctions call
// (checkBounds) validates it. A literal index is fine; an unresolved one is
// reported only under reportUnvalidatedIndices. Non-buffers are out of scope.
module no_buffer_overread {
  type Recv = BufFrom | BufAlloc | U8Array | ParamBuf | PlainArray | ParamOther
  type Access = IndexAccess | ReadUInt32 | Slice
  type Index = Literal | ReqInline | ReqViaConst | Unresolved | ReqRangeGuard | ReqCheckFn

  pure def isBuffer(r: Recv): bool = match r {
    | BufFrom => true
    | BufAlloc => true
    | U8Array => true
    | ParamBuf => true
    | PlainArray => false
    | ParamOther => false
  }

  pure def reports(r: Recv, a: Access, i: Index, strictOpt: bool): bool =
    isBuffer(r) and match i {
      | Literal => false
      | ReqInline => true
      | ReqViaConst => true
      | Unresolved => strictOpt
      | ReqRangeGuard => false
      | ReqCheckFn => false
    }

  var recv: Recv
  var access: Access
  var index: Index
  var strictOpt: bool
  var verdict: bool

  action step = {
    nondet r = Set(BufFrom, BufAlloc, U8Array, ParamBuf, PlainArray, ParamOther).oneOf()
    nondet a = Set(IndexAccess, ReadUInt32, Slice).oneOf()
    nondet i = Set(Literal, ReqInline, ReqViaConst, Unresolved, ReqRangeGuard, ReqCheckFn).oneOf()
    nondet o = Set(true, false).oneOf()
    all { recv' = r, access' = a, index' = i, strictOpt' = o, verdict' = reports(r, a, i, o) }
  }

  action init = step
}
