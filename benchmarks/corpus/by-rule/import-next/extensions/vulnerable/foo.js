// import-next/extensions: the module case-01.js imports. It must exist,
// because a specifier that resolves to nothing is not judged. It has a
// default export, so import-next/default has nothing to say about it.
export const foo = 1;
export default foo;
