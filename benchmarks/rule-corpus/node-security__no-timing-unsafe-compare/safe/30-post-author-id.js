/**
 * SAFE (wave 3, name-inference probe) - the same author-ownership check as
 * safe/20, with the field qualified.
 *
 * Attacks the shape of the collision fix: a set of whole identifier spellings
 * only matches the spellings it was given. `postAuthorId` is the same
 * collision as `authorId` and normalises to a different string.
 */
'use strict';

async function deleteComment(req, res, db) {
  const comment = await db.comments.byId(req.params.commentId);

  if (req.body.postAuthorId !== comment.postAuthorId) {
    res.status(403).json({ error: 'not your comment' });
    return;
  }

  await db.comments.remove(comment.id);
  res.json({ ok: true });
}

module.exports = { deleteComment };
