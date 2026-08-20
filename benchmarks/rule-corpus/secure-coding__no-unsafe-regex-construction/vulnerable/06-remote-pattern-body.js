/**
 * VULNERABLE - The pattern is fetched from a remote policy service and compiled
 * without inspection. A compromised or merely careless upstream owns this
 * process's CPU.
 */
export async function loadDenyPattern(policyUrl) {
  const response = await fetch(policyUrl);
  return new RegExp(await response.text(), 'i');
}
