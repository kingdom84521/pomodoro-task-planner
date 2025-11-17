import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete User Journey
 * User Story 1: Register → Create task → Run Pomodoro → Verify tracking
 *
 * Test Scope:
 * 1. User registration flow
 * 2. Task creation with estimated Pomodoros
 * 3. Starting a Pomodoro session
 * 4. Timer countdown functionality
 * 5. Completing a Pomodoro
 * 6. Verifying actual Pomodoros are tracked
 */

test.describe('Pomodoro Task Planning - User Story 1', () => {
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123',
    timezone: 'America/New_York',
  };

  const testTask = {
    name: 'Write E2E Tests',
    description: 'Create comprehensive E2E tests for the application',
    estimatedPomodoros: 2,
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('complete user journey: register → create task → run Pomodoro', async ({ page }) => {
    // Step 1: Register a new user
    await test.step('User registration', async () => {
      await page.click('text=Sign Up');
      await page.waitForURL('**/register');

      await page.fill('input[type="text"]', testUser.name);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.selectOption('select[name="timezone"]', testUser.timezone);

      await page.click('button[type="submit"]');

      // Should redirect to tasks page after successful registration
      await page.waitForURL('**/tasks', { timeout: 5000 });
      await expect(page).toHaveURL(/\/tasks/);
    });

    // Step 2: Create a new task
    await test.step('Create a task', async () => {
      await page.click('text=Create New Task');

      await page.fill('input[placeholder*="task name"]', testTask.name);
      await page.fill('textarea[placeholder*="description"]', testTask.description);
      await page.fill('input[type="number"]', testTask.estimatedPomodoros.toString());

      await page.click('button:has-text("Create Task")');

      // Verify task appears in the list
      await expect(page.locator('text=' + testTask.name)).toBeVisible();
      await expect(page.locator('text=Estimated: ' + testTask.estimatedPomodoros)).toBeVisible();
    });

    // Step 3: Navigate to Apply Mode and start Pomodoro
    await test.step('Start a Pomodoro session', async () => {
      await page.click('text=Apply Mode');
      await page.waitForURL('**/apply');

      // Select the task
      await page.click(`text=${testTask.name}`);

      // Start Pomodoro
      await page.click('button:has-text("Start Pomodoro")');

      // Verify timer is running
      await expect(page.locator('.timer-status:has-text("Running")')).toBeVisible({ timeout: 2000 });

      // Verify timer display shows time remaining
      const timerDisplay = page.locator('.time-text');
      await expect(timerDisplay).toBeVisible();

      // Timer should show 25:00 or slightly less (25 minutes default)
      const timerText = await timerDisplay.textContent();
      expect(timerText).toMatch(/^(25|24):[0-5][0-9]$/);
    });

    // Step 4: Pause and resume Pomodoro
    await test.step('Pause and resume Pomodoro', async () => {
      // Pause the timer
      await page.click('button:has-text("Pause")');
      await expect(page.locator('.timer-status:has-text("Paused")')).toBeVisible();

      // Resume the timer
      await page.click('button:has-text("Resume")');
      await expect(page.locator('.timer-status:has-text("Running")')).toBeVisible();
    });

    // Step 5: Complete the Pomodoro
    await test.step('Complete Pomodoro session', async () => {
      // Click complete button
      await page.click('button:has-text("Complete")');

      // Should show break notification modal
      await expect(page.locator('text=Pomodoro Complete')).toBeVisible({ timeout: 3000 });
      await expect(page.locator('text=Great work!')).toBeVisible();

      // Close the notification
      await page.click('button:has-text("Continue Working")');
    });

    // Step 6: Verify task tracking
    await test.step('Verify Pomodoro tracking', async () => {
      // Navigate back to tasks page
      await page.click('text=Tasks');
      await page.waitForURL('**/tasks');

      // Find the task and verify actual Pomodoros is updated
      const taskCard = page.locator(`text=${testTask.name}`).locator('..');
      await expect(taskCard.locator('text=Actual: 1')).toBeVisible();

      // Verify task status changed to in-progress
      await expect(taskCard.locator('text=In Progress')).toBeVisible();
    });
  });

  test('user cannot start Pomodoro without selecting a task', async ({ page }) => {
    // Login (assuming user is already registered from previous test)
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Navigate to Apply Mode
    await page.goto('/apply');

    // Start button should be disabled or not present without task selection
    const startButton = page.locator('button:has-text("Start Pomodoro")');
    if (await startButton.isVisible()) {
      await expect(startButton).toBeDisabled();
    }
  });

  test('timer persists across page refreshes', async ({ page }) => {
    // This test requires an active session
    // For now, we'll mark it as a placeholder for future implementation
    test.skip();
  });

  test('browser notifications are requested on first Pomodoro', async ({ page, context }) => {
    // Grant notification permissions
    await context.grantPermissions(['notifications']);

    // Start a Pomodoro session (assuming user is logged in)
    await page.goto('/apply');

    // This is a placeholder - actual implementation depends on notification handling
    test.skip();
  });
});

test.describe('Authentication Flow', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/tasks');

    // Should redirect to login page
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with valid credentials succeeds', async ({ page }) => {
    await page.goto('/login');

    // Use credentials from a known test user
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button[type="submit"]');

    // Should redirect to tasks page
    await page.waitForURL('**/tasks', { timeout: 5000 });
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/Invalid credentials|Login failed/i')).toBeVisible({ timeout: 3000 });
  });
});
