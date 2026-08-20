/**
 * SAFE - The cookie NAME is computed, so nothing is known about what the
 * interpolations carry. Abstaining beats guessing.
 */
document.cookie = name + '=' + value;
document.cookie = buildCookie(options);
