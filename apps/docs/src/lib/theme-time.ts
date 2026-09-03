export type ResolvedTheme = 'light' | 'dark';

export function getTimeBasedTheme(date: Date): ResolvedTheme {
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

// Mirror of getTimeBasedTheme. Inlined into <head> so the right class lands on
// <html> before next-themes hydrates (no FOUC). Edits MUST stay in sync with
// the TS helper above — locked by src/__tests__/theme-time-lock.test.ts.
export const THEME_TIME_INLINE_SCRIPT = `(function(){
  try {
    var ls = localStorage;
    var pick = ls.getItem('theme-user-pick');
    var theme;
    if (pick === 'light' || pick === 'dark') {
      theme = pick;
    } else {
      var hour = new Date().getHours();
      theme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }
    ls.setItem('theme', theme);
    var d = document.documentElement;
    d.classList.remove('light','dark');
    d.classList.add(theme);
    d.style.colorScheme = theme;
  } catch(e){}
})();`;
