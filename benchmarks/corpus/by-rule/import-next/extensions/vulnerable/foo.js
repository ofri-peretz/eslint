// import-next/extensions: the module case-01.js imports. It must exist,
// because a specifier that resolves to nothing is not judged. It has a
// default export, so import-next/default has nothing to say about it.
//
// The named export used to share the default import's name (`foo`), which
// made `import-next/no-named-as-default` fire on case-01.js too — this
// fixture's own header says no OTHER rule may fire on it (#1649). Renamed
// the named export so the two no longer collide; the default export still
// exists, which is all `import-next/extensions` needs resolved.
const value = 1;
export default value;
