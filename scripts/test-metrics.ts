import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium, expect as playwrightExpect } from '@playwright/test';

const expect = playwrightExpect.configure({ timeout: 90000 });

async function main() {
const context = JSON.parse(readFileSync('/tmp/moimashinani-test-context.json', 'utf8'));
assert.ok(new URL(context.databaseUrl).pathname.startsWith('/moimashinani_e2e_'), 'Requires the disposable test harness database');
assert.equal(context.baseUrl, 'http://127.0.0.1:3100');
process.env.DATABASE_URL = context.databaseUrl;
const { prisma } = await import('../src/lib/prisma');
const { Store } = await import('../src/lib/store');
const base = context.baseUrl;
const browser = await chromium.launch({ headless: true });
try {
  const merchant = await browser.newContext();
  merchant.setDefaultTimeout(90000);
  merchant.setDefaultNavigationTimeout(90000);
  const login = await merchant.request.post(`${base}/api/auth/login`, { data: context.admin, timeout: 90000 });
  assert.equal(login.status(), 200);
  const business = await prisma.business.findUniqueOrThrow({ where: { id: 'biz_kevin_phones' } });
  await prisma.business.update({ where: { id: business.id }, data: { metrics: { views: 0, calls: 0, whatsapp: 0, directions: 0, bookingRequests: 0 } } });
  const dashboard = await merchant.newPage();
  await dashboard.goto(`${base}/dashboard/${business.slug}`);
  await expect(dashboard.getByRole('button', { name: 'Refresh metrics', exact: true })).toBeEnabled();
  const customer = await browser.newContext();
  customer.setDefaultTimeout(90000);
  customer.setDefaultNavigationTimeout(90000);
  const profile = await customer.newPage();
  await profile.addInitScript(() => {
    // Exercise tracking even when the Beacon API is unavailable.
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined });
    window.open = () => null;
    document.addEventListener('click', event => {
      const anchor = (event.target as Element).closest('a');
      if (anchor?.href.startsWith('tel:') || anchor?.href.startsWith('https://wa.me/')) event.preventDefault();
    });
  });
  const view = profile.waitForResponse(response => response.url().endsWith('/api/events'));
  await profile.goto(`${base}/b/${business.slug}`);
  assert.equal((await view).status(), 200);
  await expect(profile.getByRole('link', { name: /^Call \(/ }).first()).toBeVisible();
  async function clickEvent(action: () => Promise<unknown>) {
    const response = profile.waitForResponse(response => response.url().endsWith('/api/events'));
    await action();
    assert.equal((await response).status(), 200);
  }
  await clickEvent(() => profile.getByRole('link', { name: /^Call \(/ }).first().click());
  await clickEvent(() => profile.getByRole('link', { name: 'WhatsApp Message', exact: true }).click());
  await clickEvent(() => profile.getByRole('button', { name: 'Open Google Maps', exact: true }).click());
  await profile.getByRole('button', { name: 'Request Booking', exact: true }).first().click();
  await profile.getByLabel('Your name', { exact: true }).fill('Analytics Customer');
  await profile.getByLabel('Your phone / WhatsApp', { exact: true }).fill('0712345678');
  await profile.getByRole('button', { name: 'Submit booking request' }).click();
  await expect(profile.getByText('Booking request saved', { exact: true })).toBeVisible();
  const expected = { views: 1, calls: 1, whatsapp: 1, directions: 1, bookingRequests: 1 };
  const endpoint = `${base}/api/businesses/${business.slug}/metrics`;
  const response = await merchant.request.get(endpoint, { timeout: 90000 });
  assert.equal(response.status(), 200);
  assert.equal(response.headers()['cache-control'], 'no-store');
  const metrics = await response.json();
  assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key => [key, metrics[key]])), expected);
  assert.equal((await customer.request.get(endpoint, { timeout: 90000 })).status(), 401);
  console.log('PASS all five real customer actions reach private owner metrics; anonymous access rejected');
  function counter(label: string) { return dashboard.getByText(label, { exact: true }).locator('..').locator('p').last(); }
  await dashboard.evaluate(() => window.dispatchEvent(new Event('focus')));
  for (const label of ['Profile views', 'Calls', 'WhatsApp', 'Directions clicks', 'Booking requests']) await expect(counter(label)).toHaveText('1');
  console.log('PASS dashboard updates on return without reloading');
  await clickEvent(() => profile.getByRole('link', { name: 'Continue on WhatsApp' }).click());
  await dashboard.getByRole('button', { name: 'Refresh metrics', exact: true }).click();
  await expect(counter('WhatsApp')).toHaveText('2');
  console.log('PASS booking follow-up WhatsApp and manual metrics refresh');
  await Store.recordEvent(business.id, 'call');
  await expect(counter('Calls')).toHaveText('2', { timeout: 35000 });
  console.log('PASS dashboard refreshes automatically every 30 seconds');
  await dashboard.route('**/metrics', route => route.fulfill({ status: 500, json: { error: 'Test outage' } }));
  await dashboard.getByRole('button', { name: 'Refresh metrics', exact: true }).click();
  await expect(dashboard.getByText(/^Metrics could not be refreshed/)).toContainText('Showing the last loaded counts');
  await expect(counter('Calls')).toHaveText('2');
  await dashboard.unroute('**/metrics');
  await dashboard.getByRole('button', { name: 'Refresh metrics', exact: true }).click();
  await expect(dashboard.getByText(/^Metrics could not be refreshed/)).toHaveCount(0);
  console.log('PASS refresh failures retain previous counts and recover');
  const before = (await Store.getBusinessById(business.id))!.metrics.calls;
  await Promise.all(Array.from({ length: 20 }, () => Store.recordEvent(business.id, 'call')));
  assert.equal((await Store.getBusinessById(business.id))!.metrics.calls, before + 20);
  const bookingsBefore = await prisma.bookingIntent.count({ where: { businessId: business.id } });
  const originalRecord = Store.recordEvent;
  Store.recordEvent = async () => { throw new Error('Simulated counter failure'); };
  try { await assert.rejects(Store.createBookingIntent({ businessId: business.id }), /Simulated counter failure/); }
  finally { Store.recordEvent = originalRecord; }
  assert.equal(await prisma.bookingIntent.count({ where: { businessId: business.id } }), bookingsBefore);
  console.log('PASS concurrent increments are preserved and failed booking counters roll back bookings');
  await profile.goto(`${base}/search?q=${encodeURIComponent(business.name)}`);
  await clickEvent(() => profile.getByRole('link', { name: `Call ${business.name}`, exact: true }).click());
  await clickEvent(() => profile.getByRole('link', { name: `WhatsApp ${business.name}`, exact: true }).click());
  await clickEvent(() => profile.getByRole('button', { name: 'Directions', exact: true }).first().click());
  const cardMetrics = (await Store.getBusinessById(business.id))!.metrics;
  assert.equal(cardMetrics.calls, before + 21);
  assert.equal(cardMetrics.whatsapp, 3);
  assert.equal(cardMetrics.directions, 2);
  const { newSession } = await import('../src/lib/auth');
  const other = await prisma.account.create({ data: { email: `metrics-other-${Date.now()}@test.invalid`, name: 'Other owner', role: 'BUSINESS', emailVerifiedAt: new Date() } });
  const token = await newSession(other.id);
  assert.equal((await customer.request.get(endpoint, { headers: { Cookie: `mm_session=${token}` } })).status(), 403);
  console.log('PASS directory card interactions and cross-business analytics authorization');

} finally {
  await browser.close();
  await prisma.$disconnect();
}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
