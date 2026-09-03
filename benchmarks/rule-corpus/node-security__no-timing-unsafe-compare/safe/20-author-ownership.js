/**
 * SAFE (wave 2, name-inference probe) - post ownership by author id.
 *
 * `authorId` matches the `auth` pattern as a plain substring. An author id is
 * printed on every published post. This is the exact collision the repo's own
 * working agreement names: `/auth/i` matching `author`.
 */
'use strict';

async function updatePost(req, res, db) {
  const post = await db.posts.byId(req.params.postId);

  if (req.body.authorId !== post.authorId) {
    res.status(403).json({ error: 'not your post' });
    return;
  }

  await db.posts.update(post.id, { body: req.body.body });
  res.json({ ok: true });
}

module.exports = { updatePost };
