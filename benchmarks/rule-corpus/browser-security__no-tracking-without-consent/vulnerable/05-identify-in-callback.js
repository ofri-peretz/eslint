/**
 * VULNERABLE - Identification inside an event handler. Being asynchronous
 * changes nothing about whether consent was given.
 */
document.getElementById('signup').addEventListener('submit', () => {
  analytics.identify(currentUser.id);
});
