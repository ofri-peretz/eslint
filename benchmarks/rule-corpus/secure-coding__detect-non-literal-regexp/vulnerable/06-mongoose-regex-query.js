/**
 * The Mongoose idiom for a "contains" query: hand the driver a live RegExp.
 *
 * Mongo evaluates the expression server-side, so an attacker-authored pattern
 * does not merely burn the Node event loop — it burns the database's. The
 * constructor call is nested inside an object literal inside a call argument,
 * which is where a visitor that only inspects statement-level expressions loses it.
 */
import { User } from '../models/user.js';

export async function searchUsers(req, res) {
  const users = await User.find({
    displayName: new RegExp(req.query.name, 'i'),
  })
    .limit(50)
    .lean();

  res.json({ users });
}
