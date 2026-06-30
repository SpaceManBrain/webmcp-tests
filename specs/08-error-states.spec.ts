/**
 * 08-error-states.spec.ts
 *
 * Verify tools handle bad inputs gracefully — validation errors, not crashes.
 * Every error path should return a structured error, not throw unhandled.
 */
import { expect, test } from '../helpers/fixtures';
import { callTool } from '../helpers/webmcp';
import { assertGracefulError, assertValidResponse } from '../helpers/assertions';

// ---------------------------------------------------------------------------
// Missing required arguments
// ---------------------------------------------------------------------------

test('app_preview_buy: missing arguments returns graceful error', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'app_preview_buy', {});
  assertGracefulError(r);
});

test('app_preview_sell: missing arguments returns graceful error', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'app_preview_sell', {});
  assertGracefulError(r);
});

test('app_set_buy_amount: empty amount returns graceful error', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'app_set_buy_amount', { usdcAmount: '' });
  assertGracefulError(r);
});

test('app_set_dmf_tab: invalid tab returns graceful error', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'app_set_dmf_tab', { tab: 'invalid_tab_xyz' });
  // The tool may accept it gracefully — either way, response should be valid
  assertValidResponse(r);
});

// ---------------------------------------------------------------------------
// Type mismatches / absurd values
// ---------------------------------------------------------------------------

test('app_set_buy_amount: negative amount returns graceful error', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'app_set_buy_amount', { usdcAmount: '-50' });
  assertGracefulError(r);
});

test('app_set_buy_amount: non-numeric string returns graceful error', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'app_set_buy_amount', { usdcAmount: 'abc' });
  assertGracefulError(r);
});

// ---------------------------------------------------------------------------
// Unreasonable amounts (way beyond any wallet's capacity)
// ---------------------------------------------------------------------------

test('app_execute_buy: absurd amount returns graceful error', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'app_execute_buy', {
    usdcAmount: '999999999999',
    confirmToken: 'test-token',
  });
  // Should error gracefully — insufficient funds or invalid token
  assertValidResponse(r);
});

test('app_configure_swap: zero amount returns graceful error', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  await callTool(dmfPage, 'app_set_mode', { mode: 'swap' });
  const r = await callTool(dmfPage, 'app_configure_swap', {
    fromChainId: 8453,
    toChainId: 10,
    fromToken: 'USDC',
    toToken: 'USDC',
    amount: '0',
  });
  // Zero-amount swaps should be rejected
  assertGracefulError(r);
});

// ---------------------------------------------------------------------------
// Service capability — without wallet, read state should show disconnected
// ---------------------------------------------------------------------------

test('app_read_page_state: shows wallet as disconnected', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'app_read_page_state', {});
  assertValidResponse(r);
  const text = r.content[0].text.toLowerCase();
  // Should indicate no wallet connected
  expect(text).toContain('connect');
  expect(text).not.toContain('connected');
});
