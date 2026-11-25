---
'eslint-plugin-mongodb-security': patch
---

fix(mongodb-security): `require-lean-queries` skips a native collection held in a variable

`.lean()` is a Mongoose query modifier. The native driver has no `.lean()`, so the rule already stayed silent on
`db.collection('assets').find(…)`. It did not recognise the same collection bound to a variable first, which is how
migrate-mongo scripts and DAO modules use the driver:

```js
const assetsCollection = db.collection('assets');
const assets = await assetsCollection.find({ name: /glb/i }).toArray();
```

The rule reported that query and suggested appending `.lean()`, which would throw at runtime. It now uses the same
bound-handle tracking as the file gate (`isNativeCollectionReceiver`). A Mongoose model queried in the same file is
still reported.
