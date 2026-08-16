/**
 * VULNERABLE - Keys are usually written in the plural. A whole-word match that
 * cannot fold "passwords" to "password" trades one defect class for another.
 */
localStorage.setItem('passwords', JSON.stringify(vault));
