// Model of eslint-plugin-node-security/no-unsafe-buffer-alloc (CWE-908 / CWE-789).
// Contract (docs): allocUnsafe / allocUnsafeSlow is reported unless the buffer
// is zeroed in the same expression (.fill) or bound to a local whose first touch
// is a covering write (one-arg copy/set/write, fill, or a moving-offset write in
// a loop). A fixed-offset write or an index write does not cover, so the read
// that follows reports. A value the rule cannot bind to a local (return of the
// call) reports. Buffer.alloc is zero-filled and fine for memory disclosure.
// CWE-789 half: any allocation sized by a request-supplied length reports,
// unless a guard caps it from ABOVE first (`if (n > MAX) throw`). A guard that
// only rejects small sizes (`if (n < 1) throw`) is not a cap.
module no_unsafe_buffer_alloc {
  type Alloc = AllocUnsafe | AllocUnsafeSlow | AllocSafe
  type Use = SentDirect | ChainedFill | CopyCover | SetCover | FixedWriteOnly
           | FixedThenFill | ReturnDirect | LoopWrite | IndexWrite
  type Size = Lit | Param | ReqLength | ReqUpperGuarded | ReqLowerGuarded

  pure def covered(u: Use): bool = match u {
    | SentDirect => false
    | ChainedFill => true
    | CopyCover => true
    | SetCover => true
    | FixedWriteOnly => false
    | FixedThenFill => true
    | ReturnDirect => false
    | LoopWrite => true
    | IndexWrite => false
  }

  pure def reports(a: Alloc, u: Use, z: Size): bool =
    (a != AllocSafe and not(covered(u))) or Set(ReqLength, ReqLowerGuarded).contains(z)

  var alloc: Alloc
  var use: Use
  var allocSize: Size
  var verdict: bool

  action step = {
    nondet a = Set(AllocUnsafe, AllocUnsafeSlow, AllocSafe).oneOf()
    nondet u = Set(SentDirect, ChainedFill, CopyCover, SetCover, FixedWriteOnly,
                   FixedThenFill, ReturnDirect, LoopWrite, IndexWrite).oneOf()
    nondet z = Set(Lit, Param, ReqLength, ReqUpperGuarded, ReqLowerGuarded).oneOf()
    all { alloc' = a, use' = u, allocSize' = z, verdict' = reports(a, u, z) }
  }

  action init = step
}
