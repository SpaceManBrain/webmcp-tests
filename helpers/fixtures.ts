import { test as base, expect, Page } from '@playwright/test';
import { createBrowser } from './browser';
import { isWebMcpAvailable, listTools, isToolExecutionBroken } from './webmcp';
import { mockEthProvider, MockWalletConfig } from './mock-wallet';

export { expect };

/** Base URL for app.dmfam.org */
export const APP_BASE_URL =
  process.env.DMF_TEST_APP_URL || 'https://app.dmfam.org';

// ---------------------------------------------------------------------------
// Extended test fixture
// ---------------------------------------------------------------------------

interface WebMcpFixtures {
  dmfPage: Page;
  executionBroken: boolean;
  /** When true, injects a mock window.ethereum before navigation */
  withMockWallet: boolean;
  /** Optional wallet config (address, chainId) */
  walletConfig: Partial<MockWalletConfig>;
}

export const test = base.extend<WebMcpFixtures>({
  dmfPage: async ({ withMockWallet, walletConfig }, use) => {
    const browser = await createBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
    });
    const page = await context.newPage();

    // Inject mock wallet before any page JS runs
    if (withMockWallet) {
      await mockEthProvider(page, walletConfig);
    }

    // Wrap goto to wait for WebMCP provider useEffect to register tools
    const originalGoto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const result = await originalGoto(url, { waitUntil: 'networkidle', ...options });
      await page.waitForTimeout(1500);
      return result;
    };

    await use(page);
    await context.close();
    await browser.close();
  },

  withMockWallet: [false, { option: true }],
  walletConfig: [{}, { option: true }],

  executionBroken: async ({ dmfPage }, use) => {
    await dmfPage.goto('https://dmfam.org');
    const broken = await isToolExecutionBroken(dmfPage);
    await use(broken);
  },
});

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

export const SITE_TOOLS = [
  'site_read_page_state',
  'site_get_transparency',
  'site_get_protocol_facts',
  'site_search_faq',
  'site_list_docs',
  'site_ask_support',
  'site_navigate',
  'site_open_app',
];

export const APP_TOOLS_T0_T1 = [
  'app_read_page_state',
  'app_get_backing',
  'app_get_balances',
  'app_preview_buy',
  'app_preview_sell',
  'app_preview_swap',
  'app_list_chains',
  'app_set_mode',
  'app_set_dmf_tab',
  'app_set_buy_amount',
  'app_set_sell_amount',
  'app_configure_swap',
];

export const APP_TOOLS_T2_T3 = [
  'app_connect_wallet',
  'app_switch_to_base',
  'app_request_confirm',
  'app_execute_buy',
  'app_execute_sell',
  'app_execute_swap',
];

export const SITE_TOOL_COUNT = SITE_TOOLS.length; // 8
export const APP_TOOL_COUNT = APP_TOOLS_T0_T1.length + APP_TOOLS_T2_T3.length; // 18
