/**
 * SAFE - `Array.isArray` is the cross-realm-correct array test and the value is
 * normalised into a known shape before it is used. Every element is then checked
 * to be a string.
 */
import { Article } from '../models/article';

export async function findByTags(req, res) {
  const raw = req.query.tag;
  const tags = Array.isArray(raw) ? raw : [raw];
  if (!tags.every((tag) => typeof tag === 'string')) {
    return res.status(400).json({ error: 'tags must be strings' });
  }
  const articles = await Article.find({ tags: { $in: tags } });
  return res.json(articles);
}
