import { test as base, expect, Page } from '@playwright/test';
import { createBrowser } from './browser';
import { isWebMcpAvailable, listTools } from './webmcp';

// ---------------------------------------------------------------------------
// Extended test fixture that provides a ready-to-use WebMCP-enabled page
// ---------------------------------------------------------------------------

interface WebMcpFixtures {
  dmfPage: Page;
  registeredTools: string[];
}

export const test = base.extend<WebMcpFixtures>({
  dmfPage: async ({ browser: _unused }, use) => {
    // Launch our own browser with WebMCP flags
    const browser = await createBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
    await browser.close();
  },

  registeredTools: async ({ dmfPage }, use) => {
    const available = await isWebMcpAvailable(dmfPage);
    expect(available, 'WebMCP API not available — check Chrome flags').toBe(true);
    const tools = await listTools(dmfPage);
    const names = tools.map((t) => t.name);
    await use(names);
  },
});

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

/** T0 read tools expected on dmfam.org */
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

/** T0 + T1 prep tools expected on app.dmfam.org (T2/T3 tested in safety spec) */
export const APP_TOOLS_T0_T1 = [
  // T0 reads
  'app_read_page_state',
  'app_get_backing',
  'app_get_balances',
  'app_preview_buy',
  'app_preview_sell',
  'app_preview_swap',
  'app_list_chains',
  // T1 prep
  'app_set_mode',
  'app_set_dmf_tab',
  'app_set_buy_amount',
  'app_set_sell_amount',
  'app_configure_swap',
];

/** T2-T3 tools on app.dmfam.org */
export const APP_TOOLS_T2_T3 = [
  'app_connect_wallet',
  'app_switch_to_base',
  'app_request_confirm',
  'app_execute_buy',
  'app_execute_sell',
  'app_execute_swap',
];

/** Total count per site */
export const SITE_TOOL_COUNT = SITE_TOOLS.length; // 8
export const APP_TOOL_COUNT = APP_TOOLS_T0_T1.length + APP_TOOLS_T2_T3.length; // 12 + 6 = 18
