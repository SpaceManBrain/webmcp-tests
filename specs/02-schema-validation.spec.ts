/**
 * 02-schema-validation.spec.ts
 *
 * Call every tool with minimal valid args and verify the response
 * matches the expected shape: content array with text, valid JSON,
 * and structural consistency.
 */
import { expect } from '@playwright/test';
import { test, APP_BASE_URL } from '../helpers/fixtures';
import { isToolExecutionBroken } from '../helpers/webmcp';

test.beforeAll(async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const broken = await isToolExecutionBroken(dmfPage);
  test.skip(broken, 'Chrome 151 V2 executeTool regression — tools register but cannot be called');
});

import { callTool, parseResponse } from '../helpers/webmcp';
import { assertValidResponse } from '../helpers/assertions';

// ---------------------------------------------------------------------------
// dmfam.org — schema check on every tool
// ---------------------------------------------------------------------------

test('site_read_page_state returns valid page state', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'site_read_page_state', {});
  assertValidResponse(r);
  const data = parseResponse<any>(r);
  expect(typeof data.url).toBe('string');
  expect(typeof data.title).toBe('string');
});

test('site_get_transparency returns reserves data', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'site_get_transparency', {});
  assertValidResponse(r);
  const data = parseResponse<any>(r);
  // Should have backing, reserves, circulation (field names may vary)
  expect(data).toBeDefined();
});

test('site_get_protocol_facts returns protocol info', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'site_get_protocol_facts', {});
  assertValidResponse(r);
});

test('site_search_faq returns FAQ results', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'site_search_faq', { query: 'dmfUSD' });
  assertValidResponse(r);
});

test('site_list_docs returns documentation index', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'site_list_docs', {});
  assertValidResponse(r);
});

test('site_ask_support returns answer from Susan', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'site_ask_support', { question: 'What is dmfUSD?' });
  assertValidResponse(r);
});

// ---------------------------------------------------------------------------
// app.dmfam.org — T0 tool schema checks
// ---------------------------------------------------------------------------

test('app_read_page_state returns app state', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_read_page_state', {});
  assertValidResponse(r);
  const data = parseResponse<any>(r);
  // Should indicate wallet not connected
  expect(data).toBeDefined();
});

test('app_get_backing returns backing per token', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_get_backing', {});
  assertValidResponse(r);
});

test('app_get_balances returns balance object', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_get_balances', {});
  assertValidResponse(r);
  const data = parseResponse<any>(r);
  // Should have usdc and dmfUsd fields (likely "0" when not connected)
  expect(data).toHaveProperty('usdc');
  expect(data).toHaveProperty('dmfUsd');
});

test('app_preview_buy returns estimate with fee', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_preview_buy', { usdcAmount: '100' });
  assertValidResponse(r);
});

test('app_preview_sell returns estimate with fee', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_preview_sell', { dmfUsdAmount: '100' });
  assertValidResponse(r);
});

test('app_list_chains returns chain array', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_list_chains', {});
  assertValidResponse(r);
  const data = parseResponse<any>(r);
  expect(data).toBeDefined();
});
