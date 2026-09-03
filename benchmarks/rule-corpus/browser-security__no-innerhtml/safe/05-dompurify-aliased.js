/**
 * SAFE - The sanitiser reached through a local alias - still sanitised.
 */
import DOMPurify from 'dompurify';
const purify = DOMPurify.sanitize;
el.innerHTML = purify(user.bio);
