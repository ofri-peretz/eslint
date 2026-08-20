/**
 * ADVERSARIAL — the key is attacker-controlled and its name ends in `Type`.
 *
 * The rule carries an allowlist of camelCase SUFFIXES (`Code`, `Status`,
 * `Version`, `Kind`, `Mode`, `Type`, `Stage`, `Level`, `Phase`, `Step`, `Flag`,
 * `Num`, `Count`) whose comment claims such values are "never raw user input".
 * They are here, and the code around them is ordinary telemetry.
 *
 * Rename `eventType` to `eventName` and the identical program reports. The rule
 * is deciding by spelling, in the suppress direction — a missed vulnerability
 * rather than a false alarm, so it is quiet where quiet is worst.
 */
import { metricsSnapshot } from '../lib/metrics-snapshot.js';

export function recordEvent(req, res) {
  const eventType = req.body.type;
  const counters = metricsSnapshot.counters;

  counters[eventType] = (counters[eventType] ?? 0) + 1;
  res.status(202).end();
}
