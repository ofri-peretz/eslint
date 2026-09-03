/**
 * VULNERABLE - `?tag=a&tag=b` makes `req.query.tag` an ARRAY. The code assumes a
 * string and calls a string method on it, so a crafted request either crashes
 * the handler (DoS) or, once the array reaches the ORM, changes the query shape.
 * No type is asserted anywhere.
 */
import express from 'express';
import { Article } from '../models/article';

export const router = express.Router();

router.get('/articles', async (req, res) => {
  const tags = req.query.tag.split(',');
  const articles = await Article.find({ tags: { $in: tags } });
  res.json(articles);
});
