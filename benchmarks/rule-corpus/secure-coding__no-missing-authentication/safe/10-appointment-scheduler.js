/**
 * SAFE (adversarial wave) - A clinic booking store, reached as a function
 * parameter so the binding cannot be resolved and only the name is available.
 *
 * `app` is a substring of `appointmentScheduler`, so this is the same carrier
 * class as `wrapper` in a domain where the word is unavoidable.
 */
export function nextAvailable(appointmentScheduler, clinicId) {
  const slots = appointmentScheduler.get(clinicId);
  appointmentScheduler.delete(`${clinicId}:expired`);
  return slots?.[0] ?? null;
}
