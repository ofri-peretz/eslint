/**
 * SAFE - sanitize-html, the other widely used sanitiser.
 */
import sanitizeHtml from 'sanitize-html';
el.innerHTML = sanitizeHtml(comment.body);
