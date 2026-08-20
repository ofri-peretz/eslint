/**
 * `Object.assign(target, req.body)` — the copy loop with the loop written for you.
 *
 * Functionally identical to `for (const k in src) dst[k] = src[k]`: every own
 * enumerable property of the source lands on the target, `__proto__` included.
 * It is also the single most common "mass assignment" shape in Express
 * codebases, so a rule that only visits MemberExpressions never sees the sink
 * that actually ships.
 */
import { accountRepository } from '../repositories/account-repository.js';

export async function updateAccount(req, res) {
  const account = await accountRepository.byId(req.session.userId);

  Object.assign(account, req.body);
  await accountRepository.save(account);

  res.json({ account });
}
