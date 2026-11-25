// import-next/imports-first — true positive
// @origin       hand-written
// @caution      A deprecated alias of `first`: its reports are `first`'s. This
//               fixture cannot measure precision, it pins that the alias fires
//               on the same code `first` does.
// This MUST be flagged by import-next/imports-first
const a = 1; import foo from 'foo'; import bar from 'bar';
