/**
 * SAFE - `completeLogin` submits a form. It contains the letters "log" and
 * logs nothing. Seven of this rule's twelve wild-corpus findings were this one
 * function, and `login`, `logout`, `dialog`, `catalog` and `blog` are all the
 * same trap.
 */
export async function completeLogin(page, url, email, password) {
  await page.goto(url);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
}

export function buildLoginDialog(catalog, password) {
  return { catalog, requiresPassword: Boolean(password) };
}
