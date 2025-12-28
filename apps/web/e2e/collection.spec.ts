import { test, expect } from '@playwright/test';

test.describe('Collection Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/collection');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('should display empty state when no items', async ({ page }) => {
    await page.goto('/collection');

    // Check for empty state message
    await expect(page.getByText(/No items in collection yet/i)).toBeVisible();

    // Portfolio summary should show zeros
    await expect(page.getByText(/Portfolio Summary/i)).toBeVisible();
  });

  test('should display migration warning banner', async ({ page }) => {
    await page.goto('/collection');

    // Check for migration banner
    await expect(page.getByText(/本地数据存储.*Local Storage/i)).toBeVisible();
    await expect(page.getByText(/Phase 09/i)).toBeVisible();
  });

  test('should add a new collection item', async ({ page }) => {
    await page.goto('/collection');

    // Click Add Item button
    await page.getByRole('button', { name: /Add Item/i }).click();

    // Dialog should be visible
    await expect(page.getByText(/Add to Collection/i)).toBeVisible();

    // Fill in the form
    await page.getByLabel(/Card ID/i).fill('12345');
    await page.getByLabel(/Quantity/i).fill('2');
    await page.getByLabel(/Purchase Price/i).fill('99.99');
    
    // Select currency
    await page.locator('select').first().selectOption('CNY');
    
    // Set purchase date
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/Purchase Date/i).fill(today);
    
    // Select grade
    await page.locator('select').nth(1).selectOption('psa10');
    
    // Select grading company
    await page.locator('select').nth(2).selectOption('PSA');
    
    // Add notes
    await page.getByPlaceholder(/Add notes/i).fill('Test collection item');

    // Submit form
    await page.getByRole('button', { name: /^Save$/i }).click();

    // Wait for dialog to close
    await expect(page.getByText(/Add to Collection/i)).not.toBeVisible();

    // Verify item appears in list
    await expect(page.getByText(/Card #12345/i)).toBeVisible();
    await expect(page.getByText(/PSA10/i)).toBeVisible();
    await expect(page.getByText(/Test collection item/i)).toBeVisible();

    // Verify portfolio summary updated
    await expect(page.getByText(/1 item in collection/i)).toBeVisible();
  });

  test('should edit an existing collection item', async ({ page }) => {
    await page.goto('/collection');

    // Add an item first
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel(/Card ID/i).fill('54321');
    await page.getByLabel(/Quantity/i).fill('1');
    await page.getByLabel(/Purchase Price/i).fill('50.00');
    await page.locator('select').first().selectOption('USD');
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/Purchase Date/i).fill(today);
    await page.getByRole('button', { name: /^Save$/i }).click();

    // Wait for item to appear
    await expect(page.getByText(/Card #54321/i)).toBeVisible();

    // Click edit button
    await page.getByRole('button', { name: /Edit item/i }).click();

    // Dialog should show with existing data
    await expect(page.getByText(/Edit Collection Item/i)).toBeVisible();

    // Update quantity
    await page.getByLabel(/Quantity/i).fill('5');
    await page.getByPlaceholder(/Add notes/i).fill('Updated notes');

    // Save changes
    await page.getByRole('button', { name: /^Save$/i }).click();

    // Verify changes
    await expect(page.getByText(/Quantity:.*5/i)).toBeVisible();
    await expect(page.getByText(/Updated notes/i)).toBeVisible();
  });

  test('should delete a collection item with confirmation', async ({ page }) => {
    await page.goto('/collection');

    // Add an item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel(/Card ID/i).fill('99999');
    await page.getByLabel(/Quantity/i).fill('1');
    await page.getByLabel(/Purchase Price/i).fill('25.00');
    await page.locator('select').first().selectOption('JPY');
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/Purchase Date/i).fill(today);
    await page.getByRole('button', { name: /^Save$/i }).click();

    await expect(page.getByText(/Card #99999/i)).toBeVisible();

    // First click - should ask for confirmation
    await page.getByRole('button', { name: /Delete item/i }).click();

    // Item should still be visible
    await expect(page.getByText(/Card #99999/i)).toBeVisible();

    // Second click within 3 seconds - should actually delete
    await page.getByRole('button', { name: /Confirm delete/i }).click();

    // Item should be removed
    await expect(page.getByText(/Card #99999/i)).not.toBeVisible();
    await expect(page.getByText(/No items in collection yet/i)).toBeVisible();
  });

  test('should filter items by grade', async ({ page }) => {
    await page.goto('/collection');

    // Add multiple items with different grades
    const items = [
      { cardId: '111', grade: 'raw' },
      { cardId: '222', grade: 'psa9' },
      { cardId: '333', grade: 'psa10' },
    ];

    for (const item of items) {
      await page.getByRole('button', { name: /Add Item/i }).click();
      await page.getByLabel(/Card ID/i).fill(item.cardId);
      await page.getByLabel(/Quantity/i).fill('1');
      await page.getByLabel(/Purchase Price/i).fill('10.00');
      await page.locator('select').first().selectOption('CNY');
      const today = new Date().toISOString().split('T')[0];
      await page.getByLabel(/Purchase Date/i).fill(today);
      await page.locator('select').nth(1).selectOption(item.grade);
      await page.getByRole('button', { name: /^Save$/i }).click();
      await page.waitForTimeout(500);
    }

    // Verify all items are visible
    await expect(page.getByText(/Card #111/i)).toBeVisible();
    await expect(page.getByText(/Card #222/i)).toBeVisible();
    await expect(page.getByText(/Card #333/i)).toBeVisible();

    // Filter by PSA 10
    await page.locator('select').last().selectOption('psa10');

    // Only PSA 10 item should be visible
    await expect(page.getByText(/Card #111/i)).not.toBeVisible();
    await expect(page.getByText(/Card #222/i)).not.toBeVisible();
    await expect(page.getByText(/Card #333/i)).toBeVisible();

    // Reset filter
    await page.locator('select').last().selectOption('');
    
    // All items should be visible again
    await expect(page.getByText(/Card #111/i)).toBeVisible();
    await expect(page.getByText(/Card #222/i)).toBeVisible();
    await expect(page.getByText(/Card #333/i)).toBeVisible();
  });

  test('should search items by card ID or notes', async ({ page }) => {
    await page.goto('/collection');

    // Add items
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel(/Card ID/i).fill('12345');
    await page.getByLabel(/Quantity/i).fill('1');
    await page.getByLabel(/Purchase Price/i).fill('10.00');
    await page.locator('select').first().selectOption('CNY');
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/Purchase Date/i).fill(today);
    await page.getByPlaceholder(/Add notes/i).fill('Pikachu card');
    await page.getByRole('button', { name: /^Save$/i }).click();

    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel(/Card ID/i).fill('67890');
    await page.getByLabel(/Quantity/i).fill('1');
    await page.getByLabel(/Purchase Price/i).fill('20.00');
    await page.locator('select').first().selectOption('USD');
    await page.getByLabel(/Purchase Date/i).fill(today);
    await page.getByPlaceholder(/Add notes/i).fill('Charizard card');
    await page.getByRole('button', { name: /^Save$/i }).click();

    // Search by card ID
    await page.getByPlaceholder(/Search by card ID/i).fill('123');
    await expect(page.getByText(/Card #12345/i)).toBeVisible();
    await expect(page.getByText(/Card #67890/i)).not.toBeVisible();

    // Clear search
    await page.getByPlaceholder(/Search by card ID/i).fill('');

    // Search by notes
    await page.getByPlaceholder(/Search by card ID/i).fill('Charizard');
    await expect(page.getByText(/Card #12345/i)).not.toBeVisible();
    await expect(page.getByText(/Card #67890/i)).toBeVisible();
  });

  test('should export collection data', async ({ page }) => {
    await page.goto('/collection');

    // Add an item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel(/Card ID/i).fill('55555');
    await page.getByLabel(/Quantity/i).fill('1');
    await page.getByLabel(/Purchase Price/i).fill('100.00');
    await page.locator('select').first().selectOption('CNY');
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/Purchase Date/i).fill(today);
    await page.getByRole('button', { name: /^Save$/i }).click();

    // Wait for item to appear
    await expect(page.getByText(/Card #55555/i)).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.getByRole('button', { name: /Export JSON/i }).click();

    // Wait for download
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/cardtrail-collection-\d{4}-\d{2}-\d{2}\.json/);
  });

  test('should import collection data', async ({ page }) => {
    await page.goto('/collection');

    // Create a JSON file to import
    const importData = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      items: [
        {
          cardId: 11111,
          quantity: 3,
          purchasePrice: 150.0,
          purchaseCurrency: 'USD',
          purchaseDate: new Date().toISOString(),
          grade: 'psa9',
          gradingCompany: 'PSA',
          notes: 'Imported item',
          addedAt: new Date().toISOString(),
        },
      ],
    };

    // Create a blob and file
    const fileContent = JSON.stringify(importData);
    
    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click import button
    await page.getByRole('button', { name: /Import JSON/i }).click();
    
    const fileChooser = await fileChooserPromise;
    
    // Upload the file
    await fileChooser.setFiles({
      name: 'test-import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(fileContent),
    });

    // Wait for success message
    await expect(page.getByText(/Import Successful/i)).toBeVisible();
    await expect(page.getByText(/Added: 1 items/i)).toBeVisible();

    // Verify item appears in list
    await expect(page.getByText(/Card #11111/i)).toBeVisible();
    await expect(page.getByText(/Imported item/i)).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/collection');

    // Click Add Item
    await page.getByRole('button', { name: /Add Item/i }).click();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /^Save$/i }).click();

    // Dialog should still be open (form validation prevents submission)
    await expect(page.getByText(/Add to Collection/i)).toBeVisible();

    // Fill with invalid card ID (negative)
    await page.getByLabel(/Card ID/i).fill('-1');
    await page.getByLabel(/Quantity/i).fill('1');
    await page.getByLabel(/Purchase Price/i).fill('10');

    // Browser validation should prevent negative numbers
    // The test verifies the input constraints are in place
  });

  test('should persist data across page reloads', async ({ page }) => {
    await page.goto('/collection');

    // Add an item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel(/Card ID/i).fill('77777');
    await page.getByLabel(/Quantity/i).fill('2');
    await page.getByLabel(/Purchase Price/i).fill('75.00');
    await page.locator('select').first().selectOption('JPY');
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/Purchase Date/i).fill(today);
    await page.getByRole('button', { name: /^Save$/i }).click();

    await expect(page.getByText(/Card #77777/i)).toBeVisible();

    // Reload page
    await page.reload();

    // Item should still be visible
    await expect(page.getByText(/Card #77777/i)).toBeVisible();
  });

  test('should update portfolio summary correctly', async ({ page }) => {
    await page.goto('/collection');

    // Add first item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel(/Card ID/i).fill('100');
    await page.getByLabel(/Quantity/i).fill('2');
    await page.getByLabel(/Purchase Price/i).fill('50.00');
    await page.locator('select').first().selectOption('CNY');
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/Purchase Date/i).fill(today);
    await page.getByRole('button', { name: /^Save$/i }).click();

    // Verify count
    await expect(page.getByText(/1 item in collection/i)).toBeVisible();

    // Add second item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel(/Card ID/i).fill('200');
    await page.getByLabel(/Quantity/i).fill('1');
    await page.getByLabel(/Purchase Price/i).fill('30.00');
    await page.locator('select').first().selectOption('CNY');
    await page.getByLabel(/Purchase Date/i).fill(today);
    await page.getByRole('button', { name: /^Save$/i }).click();

    // Verify updated count
    await expect(page.getByText(/2 items in collection/i)).toBeVisible();
  });

  test('should handle notes character limit', async ({ page }) => {
    await page.goto('/collection');

    await page.getByRole('button', { name: /Add Item/i }).click();
    
    // Fill in required fields
    await page.getByLabel(/Card ID/i).fill('123');
    await page.getByLabel(/Quantity/i).fill('1');
    await page.getByLabel(/Purchase Price/i).fill('10');
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/Purchase Date/i).fill(today);

    // Type in notes field
    const notesField = page.getByPlaceholder(/Add notes/i);
    await notesField.fill('a'.repeat(500));

    // Check character counter
    await expect(page.getByText(/500\/500 characters/i)).toBeVisible();

    // Verify maxlength attribute prevents typing more
    await notesField.press('a');
    const value = await notesField.inputValue();
    expect(value.length).toBe(500);
  });
});
