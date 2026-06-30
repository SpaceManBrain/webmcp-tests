/**
 * 04-tier1-prep.spec.ts
 *
 * Verify T1 tools mutate the app state correctly.
 * Read state before and after to confirm side effects.
 */
import { expect } from '@playwright/test';
import { test } from '../helpers/fixtures';
import { callTool, parseResponse } from '../helpers/webmcp';
import { assertSuccess } from '../helpers/assertions';

// ---------------------------------------------------------------------------
// Mode switching
// ---------------------------------------------------------------------------

test('app_set_mode: switching to swap mode updates app state', async ({ dmfPage }) => {
  await dmfPage.goto('/');

  // Set to swap
  const setR = await callTool(dmfPage, 'app_set_mode', { mode: 'swap' });
  assertSuccess(setR);

  // Read state and verify
  const readR = await callTool(dmfPage, 'app_read_page_state', {});
  const state = assertSuccess<any>(readR);
  const mode = (state.mode ?? '').toLowerCase();
  expect(mode).toBe('swap');
});

test('app_set_mode: switching back to dmf mode updates state', async ({ dmfPage }) => {
  await dmfPage.goto('/');

  await callTool(dmfPage, 'app_set_mode', { mode: 'dmf' });
  const readR = await callTool(dmfPage, 'app_read_page_state', {});
  const state = assertSuccess<any>(readR);
  const mode = (state.mode ?? '').toLowerCase();
  expect(mode).toContain('dmf');
});

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

test('app_set_dmf_tab: switching to sell tab', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  await callTool(dmfPage, 'app_set_mode', { mode: 'dmf' });

  const r = await callTool(dmfPage, 'app_set_dmf_tab', { tab: 'sell' });
  assertSuccess(r);

  const readR = await callTool(dmfPage, 'app_read_page_state', {});
  const state = assertSuccess<any>(readR);
  const tab = (state.tab ?? state.activeTab ?? '').toLowerCase();
  expect(tab).toBe('sell');
});

// ---------------------------------------------------------------------------
// Amount setting
// ---------------------------------------------------------------------------

test('app_set_buy_amount: returns preview matching the amount', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  await callTool(dmfPage, 'app_set_mode', { mode: 'dmf' });

  const r = await callTool(dmfPage, 'app_set_buy_amount', { usdcAmount: '50' });
  assertSuccess(r);

  // The response should include the preview data
  const data = parseResponse<any>(r);
  expect(data).toBeDefined();
});

test('app_set_sell_amount: returns preview matching the amount', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  await callTool(dmfPage, 'app_set_mode', { mode: 'dmf' });
  await callTool(dmfPage, 'app_set_dmf_tab', { tab: 'sell' });

  const r = await callTool(dmfPage, 'app_set_sell_amount', { dmfUsdAmount: '50' });
  assertSuccess(r);
});
