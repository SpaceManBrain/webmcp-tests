import { Browser, BrowserContext, chromium } from '@playwright/test';

// Default path to our portable Chrome Dev 151 installation
const CHROME_DEV_PATH =
  process.env.DMF_TEST_CHROME_PATH ||
  '/home/devcontainers/chrome-dev/chrome-linux64/chrome';

/**
 * Playwright launch options for Chrome Dev with WebMCP flags.
 */
export async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    executablePath: CHROME_DEV_PATH,
    headless: process.env.DMF_TEST_HEADLESS !== 'false',
    args: [
      '--enable-features=WebMCP',
      '--enable-blink-features=ModelContextAPI,ModelContextExecutorAPI',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
    ],
  });
}

/**
 * Create browser + context + page in one call.
 * The context persists across tests within a spec file.
 */
export async function createTestContext(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: import('@playwright/test').Page;
}> {
  const browser = await createBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });
  const page = await context.newPage();
  return { browser, context, page };
}
