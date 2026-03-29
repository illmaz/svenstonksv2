// scripts/senate-feasibility-test.mjs
// Throwaway feasibility test — not integrated with app code.
// Run: node scripts/senate-feasibility-test.mjs

import { chromium } from 'playwright';

const BASE = 'https://efdsearch.senate.gov';

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();

  console.log('Navigating to search page...');
  await page.goto(`${BASE}/search/`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const title = await page.title();
  console.log('Page title:', title);

  if (title.toLowerCase().includes('access denied')) {
    console.log('RESULT: Blocked at page load — Akamai IP block confirmed.');
    process.exit(1);
  }

  const csrf = await page.$eval(
    'input[name="csrfmiddlewaretoken"]',
    el => el.value
  ).catch(() => null);

  console.log('CSRF token found:', csrf ? `yes (${csrf.slice(0, 10)}...)` : 'no');

  const result = await page.evaluate(async ({ base, csrf }) => {
    const params = new URLSearchParams({
      start: '0',
      length: '5',
      'report_types[]': 'PTR',
      submitted_start_date: '01/01/2026',
      submitted_end_date: '03/28/2026',
      action: 'getData',
    });
    if (csrf) params.set('csrfmiddlewaretoken', csrf);

    const res = await fetch(`${base}/search/report/data/`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${base}/search/`,
        'X-CSRFToken': csrf ?? '',
      },
      body: params.toString(),
    });

    const status = res.status;
    const text = await res.text();
    let data = null;
    let textSnippet = null;
    try {
      data = JSON.parse(text);
    } catch (_) {
      textSnippet = text.slice(0, 500);
    }
    return { status, data, textSnippet };
  }, { base: BASE, csrf });

  console.log('POST status:', result.status);
  console.log('recordsTotal:', result.data?.recordsTotal ?? 'n/a');
  console.log('first row:', result.data?.data?.[0] ?? 'n/a');
  if (result.textSnippet) console.log('response text snippet:', result.textSnippet);

} finally {
  await browser.close();
}
