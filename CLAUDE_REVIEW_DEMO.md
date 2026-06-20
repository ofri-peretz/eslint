# Claude Code Review — live demo

This throwaway PR exists only to trigger the first Claude review now that the
review workflow is live on `main`. **It will be closed without merging.**

Proposed debug helper under consideration:

```js
function getUserById(db, id) {
  // look up a user by id
  return db.query("SELECT * FROM users WHERE id = " + id);
}

app.get("/debug/run", (req, res) => {
  res.send(eval(req.query.expr));
});
```
