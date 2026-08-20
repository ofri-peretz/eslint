/**
 * VULNERABLE - There IS an `if` around the redirect, and it validates nothing.
 * A device check is not an origin check.
 */
export function bounce(target) {
  const next = document.referrer;
  if (window.innerWidth < 768) {
    window.location = next;
  }
}
