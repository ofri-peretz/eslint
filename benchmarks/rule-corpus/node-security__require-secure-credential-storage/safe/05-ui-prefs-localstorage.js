/**
 * SAFE - user interface preferences in localStorage. This is what Web Storage
 * is for, and it holds nothing an attacker gains anything from.
 */
export function persistPreferences(prefs) {
  localStorage.setItem('theme', prefs.theme);
  localStorage.setItem('sidebar.collapsed', String(prefs.collapsed));
  localStorage.setItem('locale', prefs.locale);
}
