/**
 * VULNERABLE - The write is inside a helper with an innocuous name. The sink and
 * the key are both still present at the write.
 */
export function cacheProfile(profile) {
  localStorage.setItem('ssn', profile.nationalId);
}
