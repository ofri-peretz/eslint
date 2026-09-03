/**
 * SAFE - The rule's whole vocabulary appears only inside comments and string
 * literals. The executable code builds a documentation table.
 *
 * Documented checks: `typeof req.body === 'object'`, `value == null`,
 * `payload.constructor.name === 'Object'`.
 */
export const VALIDATION_GUIDE = [
  { id: 'typeof-object', text: "typeof req.body === 'object' also admits null" },
  { id: 'loose-null', text: 'value == null matches undefined too' },
  { id: 'constructor-name', text: "payload.constructor.name === 'Object' is spoofable" },
];

export function describe(ruleId) {
  return VALIDATION_GUIDE.find((entry) => entry.id === ruleId)?.text ?? 'unknown';
}
