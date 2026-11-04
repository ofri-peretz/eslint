// Model of eslint-plugin-modernization/prefer-at.
// `xs[xs.length - n]` reads the n-th element from the end; `xs.at(-n)` says
// so directly. The rule reports a computed read whose index is the SAME
// receiver's `.length` minus a positive literal or a variable offset:
//   - the receiver may be an identifier, a static member path (`this.rows`,
//     `c['path']` read as `c.path['length']`), or either behind a TS non-null
//     assertion (`xs![xs!.length - 1]`) - the assertion erases at runtime;
//   - it is still a read when the element is called (`fns[fns.length - 1]()`),
//     so it reports there too (without a fix);
// It does not report:
//   - a write target (`xs[xs.length - 1] = v`): `.at()` returns a value, not a
//     reference, so there is no `.at` spelling of the write;
//   - the implicit `arguments` object: it has no `.at` method, so the
//     suggested rewrite would throw;
//   - another receiver's length (`a[b.length - 1]`), a zero offset (one past
//     the end) or a plain index.
// `checkLastElement` (default true) - false stops reporting the last-element
// form `xs[xs.length - 1]`; other offsets still report.
// Left out: `xs[-1]` - reported because it is "almost always a mistake", but
// nothing proves `xs` is an array (a Record with a `-1` key reads a real
// value): candidate for change (fires on a guess).
module prefer_at {
  type Receiver = Ident | Member | Subscript | NonNull | Arguments | Mismatch
  type Index = LastLit | OffsetLit | VarOffset | ZeroOffset | Plain
  type Pos = Read | Write | Callee

  pure def fromEnd(i: Index): bool = Set(LastLit, OffsetLit, VarOffset).contains(i)
  pure def sameArray(r: Receiver): bool = Set(Ident, Member, Subscript, NonNull).contains(r)
  pure def reports(r: Receiver, i: Index, p: Pos, cle: bool): bool =
    sameArray(r) and fromEnd(i) and p != Write and (cle or i != LastLit)

  var receiver: Receiver
  var index: Index
  var pos: Pos
  var checkLastElement: bool
  var verdict: bool

  action step = {
    nondet r = Set(Ident, Member, Subscript, NonNull, Arguments, Mismatch).oneOf()
    nondet i = Set(LastLit, OffsetLit, VarOffset, ZeroOffset, Plain).oneOf()
    nondet p = Set(Read, Write, Callee).oneOf()
    nondet c = Set(true, false).oneOf()
    all { receiver' = r, index' = i, pos' = p, checkLastElement' = c,
          verdict' = reports(r, i, p, c) }
  }

  action init = step
}
