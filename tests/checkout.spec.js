import { test, expect } from '@playwright/test';

test('User can buy a pass as a guest with full details', async ({ page }) => {
  // 1. Start at the tickets page
  await page.goto('http://localhost:3000/en/tickets');

  // 2. Select the "Full Pass" card
  await page.click('text=Full Pass');

  // 3. Move to the Auth Choice screen (Login vs Guest)
  await page.click('button:has-text("Next")');

  // 4. Select "Continue as Guest"
  // Using a more robust selector in case there are multiple buttons
  await page.getByRole('button', { name: /guest/i }).click();

  // 5. Fill out the Guest Form
  // We use getByPlaceholder or locator('input[type="email"]') for precision
  await page.locator('input[type="text"]').first().fill('Test Guest User');
  await page.locator('input[type="email"]').fill('test-guest@example.com');

  // 6. Click "Add to Cart"
  await page.click('button:has-text("Add")');

  // 7. VERIFICATION
  // Ensure the app successfully moves the user to the cart
  await expect(page).toHaveURL(/.*\/cart/);
  
  // Ensure the guest data is actually rendered in the cart
  await expect(page.locator('text=Test Guest User')).toBeVisible();
  await expect(page.locator('text=test-guest@example.com')).toBeVisible();
});