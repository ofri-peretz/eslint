/**
 * VULNERABLE - Framebusting writes the PARENT window's location. `top` is a
 * different window, but it is still a navigation the attacker steers.
 */
if (window.top !== window.self) {
  top.location.href = decodeURIComponent(location.search);
}
