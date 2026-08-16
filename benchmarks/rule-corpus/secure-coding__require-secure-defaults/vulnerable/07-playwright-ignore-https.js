/**
 * VULNERABLE - `ignoreHTTPSErrors: true` turns off certificate validation for
 * every page the browser context opens. It is added to get past a staging
 * certificate and then inherited by the suite that scrapes production, at which
 * point the scraper accepts any certificate from anyone.
 *
 * No platform plugin in this ecosystem owns Playwright, so if this rule does
 * not report it, nothing does.
 */
import { chromium } from 'playwright';

export async function openSession(storageState) {
  const browser = await chromium.launch();
  return browser.newContext({ ignoreHTTPSErrors: true, storageState });
}
