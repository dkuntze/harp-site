/* eslint-env node */
import { readFileSync } from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';

const fixtures = path.join(__dirname, 'fixtures');
const index = JSON.parse(readFileSync(path.join(fixtures, 'bird-index.json'), 'utf8'));
const profileHTML = readFileSync(path.join(fixtures, 'bird-profile.html'), 'utf8');
const profileURL = 'https://www.heartlandavianrescueproject.org/adoption/birds/jon';

async function mockIndex(page, data = index) {
  await page.route('**/bird-index.json?**', (route) => route.fulfill({ json: data }));
}

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth
    <= document.documentElement.clientWidth)).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/nav.plain.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<div><p><a href="/">HARP</a></p></div>',
  }));
  await page.route('**/footer.plain.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<div><p>Heartland Avian Rescue Project</p></div>',
  }));
});

test('listing filters profiles and links to the full story', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mockIndex(page);
  await page.route('**/adoption/birds/jon', (route) => route.fulfill({
    contentType: 'text/html',
    body: profileHTML,
  }));
  await page.goto('/test/available-birds');
  const listing = page.locator('.bird-listing');
  await expect(listing.locator('.bird-card:visible')).toHaveCount(3);
  await expect(listing).not.toContainText('Adopted profile');
  await expect(listing).not.toContainText('Hidden profile');
  await expect(listing).toContainText('Adoption pending');
  await expect(listing).toContainText('Photo coming soon');
  await expectNoOverflow(page);
  await listing.screenshot({ path: testInfo.outputPath('listing.png') });

  await page.getByLabel('Find a bird', { exact: true }).fill('GENERAL');
  await expect(listing.locator('.bird-card:visible')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('1 bird found');
  await page.getByLabel('Species', { exact: true }).selectOption('Green cheek conure');
  await expect(page.getByRole('heading', { name: 'No birds match just yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(listing.locator('.bird-card:visible')).toHaveCount(3);
  await expect(page.getByLabel('Find a bird', { exact: true })).toBeFocused();
  await page.getByLabel('Species', { exact: true }).selectOption('Green cheek conure');
  await page.getByRole('link', { name: 'Meet Jon', exact: true }).click();
  await expect(page).toHaveURL(/\/adoption\/birds\/jon$/);
  await expect(page.getByRole('heading', { name: 'Daily care' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apply to adopt Jon' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('profile keeps its image, facts, story, and application together', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/test/bird-profile');
  const profile = page.locator('.available-bird.profile');
  await expect(profile.getByRole('heading', { level: 1, name: 'Jon' })).toBeVisible();
  await expect(profile.getByRole('img', { name: 'Jon, a green cheek conure' })).toBeVisible();
  await expect(profile).toContainText('Green cheek conure');
  await expect(profile).toContainText('About 2 years');
  await expect(profile).toContainText('$200');
  await expect(profile.getByRole('link', { name: 'Apply to adopt Jon' }))
    .toHaveAttribute('href', /docs\.google\.com\/forms/);
  await expect(page.locator('.hero')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Cage requirements' })).toBeVisible();
  const schema = JSON.parse(await profile.locator('script[type="application/ld+json"]').textContent());
  expect(schema.about.name).toBe('Jon');
  await expectNoOverflow(page);
  await profile.screenshot({ path: testInfo.outputPath('profile.png') });
  expect(errors).toEqual([]);
});

test('profile omits missing facts and handles a missing photo', async ({ page }) => {
  await page.route('**/test/bird-profile*', (route) => route.fulfill({
    contentType: 'text/html',
    body: profileHTML
      .replace(/<meta name="(?:bird-age|bird-sex|adoption-fee)"[^>]+>/g, '')
      .replace(/<picture>[\s\S]*?<\/picture>/, ''),
  }));
  await page.goto('/test/bird-profile');
  const profile = page.locator('.available-bird.profile');
  await expect(profile.locator('.bird-photo')).toHaveText('Photo coming soon');
  await expect(profile.locator('.bird-facts')).toBeHidden();
  await expect(profile.getByRole('link', { name: 'Apply to adopt Jon' })).toBeVisible();
  await expectNoOverflow(page);
});

test('copy link uses the clean production canonical, not the preview URL', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (url) => { window.copiedProfileURL = url; } },
    });
  });
  await page.route('**/test/bird-profile*', (route) => route.fulfill({
    contentType: 'text/html; charset=utf-8',
    body: profileHTML.replace(
      `rel="canonical" href="${profileURL}"`,
      `rel="canonical" href="${profileURL}?utm_source=preview#care"`,
    ),
  }));
  await page.goto('/test/bird-profile?utm_source=social#care');
  const sharing = page.getByRole('group', { name: "Share Jon's profile" });
  await expect(sharing.getByRole('button', { name: 'Share profile' })).toHaveCount(0);
  await sharing.getByRole('button', { name: 'Copy link' }).click();
  await expect(sharing.getByRole('status')).toHaveText('Link copied.');
  expect(await page.evaluate(() => window.copiedProfileURL)).toBe(profileURL);
  await expect(sharing.getByRole('textbox', { name: 'Profile link' })).toBeHidden();
  await expectNoOverflow(page);
});

test('native sharing retains focus, blocks repeat activation, and handles cancellation', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.shareCalls = 0;
    Object.defineProperty(navigator, 'share', {
      value: (data) => {
        window.shareCalls += 1;
        window.sharedProfile = data;
        return new Promise((resolve, reject) => {
          window.completeSharing = () => {
            if (window.cancelSharing) reject(new DOMException('Cancelled', 'AbortError'));
            else resolve();
          };
        });
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (url) => { window.copiedProfileURL = url; } },
    });
  });
  await page.goto('/test/bird-profile?utm_source=social#care');
  const sharing = page.getByRole('group', { name: "Share Jon's profile" });
  const share = sharing.getByRole('button', { name: 'Share profile' });
  await share.focus();
  await share.press('Enter');
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await expect(share).toBeFocused();
  await expect(share).toBeDisabled();
  await share.press('Enter');
  expect(await page.evaluate(() => window.shareCalls)).toBe(1);
  await page.evaluate(() => window.completeSharing());
  await expect(share).toBeEnabled();
  await expect(share).toBeFocused();
  expect(await page.evaluate(() => window.sharedProfile)).toEqual({
    title: 'Meet Jon, a green cheek conure | HARP',
    text: 'Meet Jon, a young green cheek conure looking for a patient home through HARP in the Omaha, Lincoln, and Council Bluffs area.',
    url: profileURL,
  });
  await sharing.screenshot({ path: testInfo.outputPath('sharing-keyboard-focus.png') });
  await page.evaluate(() => { window.cancelSharing = true; });
  await share.press('Enter');
  expect(await page.evaluate(() => window.shareCalls)).toBe(2);
  await expect(share).toBeFocused();
  await page.evaluate(() => window.completeSharing());
  await expect(share).toBeEnabled();
  await expect(share).toBeFocused();
  expect(await page.evaluate(() => window.copiedProfileURL)).toBeUndefined();
  await expect(sharing.getByRole('status')).toBeEmpty();
  await sharing.getByRole('button', { name: 'Copy link' }).click();
  await expect(sharing.getByRole('status')).toHaveText('Link copied.');
});

test('blocked share and clipboard access offer a selected link for manual copying', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: async () => { throw new DOMException('Sharing blocked', 'NotAllowedError'); },
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async () => { throw new DOMException('Blocked', 'NotAllowedError'); } },
    });
  });
  await page.goto('/test/bird-profile?utm_source=social#care');
  const sharing = page.getByRole('group', { name: "Share Jon's profile" });
  await sharing.getByRole('button', { name: 'Share profile' }).click();
  const link = sharing.getByRole('textbox', { name: 'Profile link' });
  await expect(link).toHaveValue(profileURL);
  await expect(link).toBeFocused();
  expect(await link.evaluate((input) => input.selectionEnd - input.selectionStart))
    .toBe(profileURL.length);
  await expect(sharing.getByRole('status'))
    .toHaveText('Copy the selected link to share this profile.');
  await expectNoOverflow(page);
});

[
  ['Pending', 'Adoption pending'],
  ['Adopted', 'Happily adopted'],
  ['', 'Not currently available'],
  ['Unrecognized', 'Not currently available'],
].forEach(([status, label]) => {
  test(`profile with ${status || 'missing'} status does not accept applications`, async ({ page }) => {
    await page.route('**/test/bird-profile*', (route) => route.fulfill({
      contentType: 'text/html',
      body: profileHTML.replace('content="Available"', `content="${status}"`),
    }));
    await page.goto('/test/bird-profile');
    await expect(page.locator('.available-bird .bird-status')).toHaveText(label);
    await expect(page.getByRole('link', { name: 'Apply to adopt Jon' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Meet other birds' })).toBeVisible();
  });
});

test('legacy biographies retain rich text and the existing application link', async ({ page }) => {
  await page.goto('/test/legacy-bird');
  const bird = page.locator('.available-bird.legacy');
  await expect(bird.getByRole('heading', { name: 'Jon' })).toBeVisible();
  await expect(bird.locator('em')).toHaveText('out of cage time daily');
  await expect(bird.getByRole('link', { name: 'adoption requirements' })).toBeVisible();
  await expect(bird.getByRole('img', { name: 'Jon' })).toBeVisible();
  await expect(bird).toContainText('$200');
  await expect(page.getByRole('link', { name: 'Apply Now' })).toBeVisible();
  await expect(bird.locator('.bird-sharing')).toHaveCount(0);
  await expectNoOverflow(page);
});

test('listing distinguishes an empty index from a recoverable index error', async ({ page }) => {
  let failing = true;
  await page.route('**/bird-index.json?**', (route) => (failing
    ? route.fulfill({ status: 503, body: 'Temporarily unavailable' })
    : route.fulfill({ json: { total: 0, offset: 0, data: [] } })));
  await page.goto('/test/available-birds');
  await expect(page.getByRole('heading', { name: 'We could not load the birds' })).toBeVisible();
  failing = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'No birds listed right now' })).toBeVisible();
  await expect(page.locator('.bird-listing')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('search')).toBeHidden();
});

test('listing reads subsequent index pages and rejects non-profile records', async ({ page }) => {
  const invalidRecords = [
    { ...index.data[0], path: 'https://other.example/adoption/birds/jon' },
    { ...index.data[0], path: '/adoption/birds/../not-a-bird' },
    { ...index.data[0], path: '/adoption/birds/no-status', status: '' },
    { ...index.data[0], path: '/adoption/birds/' },
    { ...index.data[0] },
  ];
  const offsets = [];
  await page.route('**/bird-index.json?**', (route) => {
    const offset = Number(new URL(route.request().url()).searchParams.get('offset'));
    offsets.push(offset);
    return route.fulfill({
      json: {
        offset,
        total: invalidRecords.length + 2,
        data: offset ? [index.data[1], ...invalidRecords]
          : [{ ...index.data[0], image: './media_jon.png' }],
      },
    });
  });
  await page.goto('/test/available-birds');
  await expect(page.locator('.bird-card')).toHaveCount(2);
  expect(offsets).toEqual([0, 1]);
  await expect(page.getByRole('link', { name: 'Meet General' })).toBeVisible();
  await expect(page.locator('.bird-card', { hasText: 'Jon' }).getByRole('img'))
    .toHaveAttribute('src', /\/adoption\/birds\/media_jon\.png/);
});
