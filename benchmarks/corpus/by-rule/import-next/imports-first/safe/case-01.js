// import-next/imports-first — true negative
// @origin       hand-written
// @caution      A deprecated alias of `first`: its reports are `first`'s. This
//               fixture cannot measure precision, it pins that the alias fires
//               on the same code `first` does.
// This MUST NOT be flagged by import-next/imports-first
import foo from 'foo'; import bar from 'bar'; const a = 1;
