---
'eslint-plugin-mongodb-security': minor
---

fix(mongodb-security): recognise a collection handle held in a variable as MongoDB evidence

A DAO constructed with a connected `db` keeps its collection in a variable
(`const col = db.collection('x'); col.find(q).toArray(cb)`) and imports no Mongo package. Only the
chained `db.collection('x').find(...)` form was recognised, so the whole plugin abstained on that
layout, including `no-unsafe-where` on a `$where` built from request data. A native-driver method
called through a variable bound to a `.collection('name')` handle now opens the gate. A Firestore
handle in a variable (`col.doc(id).get()`) still does not. Expect new findings in files of that
shape.
