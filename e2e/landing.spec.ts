import { expect, test } from '@playwright/test';

/**
 * Golden-path smoke tests. Authenticated flows (create workspace, calendar
 * drag/drop, AI generation) are stubbed below with test.fixme until a test
 * Firebase project + seeded auth is wired up (see roadmap Phase 2/3).
 */
test.describe('landing', () => {
  test('renders the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/forge/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('exposes a sign-in entry point', async ({ page }) => {
    await page.goto('/');
    const signIn = page.getByRole('button', { name: /sign in|log in|get started|sign up/i }).first();
    await expect(signIn).toBeVisible();
    await signIn.click();
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('authenticated flows', () => {
  test.fixme('user can create a workspace', async () => {});
  test.fixme('user can create and drag a post on the calendar', async () => {});
  test.fixme('user can generate content with AI (mocked provider)', async () => {});
  test.fixme('user can share a public calendar', async () => {});
});
