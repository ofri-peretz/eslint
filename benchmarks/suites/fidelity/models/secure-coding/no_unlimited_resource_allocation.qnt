// Model of eslint-plugin-secure-coding/no-unlimited-resource-allocation (CWE-770).
// Contract: an allocation (Buffer.alloc / allocUnsafe, new Array, new
// ArrayBuffer) sized by user input with no bound, or by a literal above
// maxResourceSize (1 MiB), is reported. A size clamped with Math.min, validated
// against a maximum before use, or a small literal is not.
module no_unlimited_resource_allocation {
  type Alloc = BufferAlloc | BufferAllocUnsafe | NewArray | NewArrayBuffer
  type Size = ReqQuery | ParseIntReq | Clamped | Checked | SmallLit | HugeLit

  pure def reports(s: Size): bool = Set(ReqQuery, ParseIntReq, HugeLit).contains(s)

  var alloc: Alloc
  var amount: Size
  var verdict: bool

  action step = {
    nondet a = Set(BufferAlloc, BufferAllocUnsafe, NewArray, NewArrayBuffer).oneOf()
    nondet s = Set(ReqQuery, ParseIntReq, Clamped, Checked, SmallLit, HugeLit).oneOf()
    all { alloc' = a, amount' = s, verdict' = reports(s) }
  }

  action init = step
}
