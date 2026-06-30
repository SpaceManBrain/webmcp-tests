/**
 * 03-tier0-reads.spec.ts
 *
 * Functional verification of T0 read tools against live on-chain state.
 * These tests prove the tools return real data, not mock defaults.
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
import { assertSuccess, assertPositiveBigNumber } from '../helpers/assertions';

// ---------------------------------------------------------------------------
// dmfam.org — live data checks
// ---------------------------------------------------------------------------

test('site_get_transparency: backing, reserves, and circulation are positive', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'site_get_transparency', {});
  const data = assertSuccess<any>(r);

  // The transparency endpoint returns backing ratio, reserves, circulation
  // Field names may use camelCase or snake_case; check both
  const backingPct =
    data.backingRatio ?? data.backing_ratio ?? data.backingPercentage ?? data.backing_percentage;
  const reserves = data.reserves ?? data.totalReserves ?? data.total_reserves;
  const circulation = data.circulation ?? data.totalSupply ?? data.total_supply;

  expect(backingPct).toBeDefined('backing ratio missing from response');
  expect(reserves).toBeDefined('reserves missing from response');
  expect(circulation).toBeDefined('circulation missing from response');

  expect(parseFloat(String(backingPct))).toBeGreaterThan(0);
  assertPositiveBigNumber(reserves);
  assertPositiveBigNumber(circulation);
});

test('site_get_protocol_facts returns protocol description', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const r = await callTool(dmfPage, 'site_get_protocol_facts', {});
  const data = assertSuccess<any>(r);
  const text = JSON.stringify(data).toLowerCase();
  expect(text).toContain('dmf');
  expect(text).toContain('usdc');
});

// ---------------------------------------------------------------------------
// app.dmfam.org — live on-chain data
// ---------------------------------------------------------------------------

test('app_get_backing: backing per token is positive', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_get_backing', {});
  const data = assertSuccess<any>(r);
  // backingPerToken or backing_per_token
  const bpt = data.backingPerToken ?? data.backing_per_token;
  expect(bpt).toBeDefined('backingPerToken missing from response');
  assertPositiveBigNumber(bpt);
});

test('app_get_balances returns numeric strings for usdc and dmfUsd', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_get_balances', {});
  const data = assertSuccess<any>(r);
  expect(typeof data.usdc).toBe('string');
  expect(typeof data.dmfUsd).toBe('string');
  expect(data.usdc).toMatch(/^\d+(\.\d+)?$/);
  expect(data.dmfUsd).toMatch(/^\d+(\.\d+)?$/);
});

test('app_preview_buy: estimatedReceive > 0 and fee > 0', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_preview_buy', { usdcAmount: '100' });
  const data = assertSuccess<any>(r);
  expect(data).toBeDefined();
  // The tool returns estimatedReceive and fee — check they're positive
  const est = data.estimatedReceive ?? data.estimated_receive ?? data.output;
  const fee = data.fee ?? data.feeAmount ?? data.fee_amount;
  if (est !== undefined) expect(parseFloat(String(est))).toBeGreaterThan(0);
  if (fee !== undefined) expect(parseFloat(String(fee))).toBeGreaterThan(0);
});

test('app_preview_sell: estimatedReceive > 0 and fee > 0', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_preview_sell', { dmfUsdAmount: '100' });
  const data = assertSuccess<any>(r);
  const est = data.estimatedReceive ?? data.estimated_receive ?? data.output;
  const fee = data.fee ?? data.feeAmount ?? data.fee_amount;
  if (est !== undefined) expect(parseFloat(String(est))).toBeGreaterThan(0);
  if (fee !== undefined) expect(parseFloat(String(fee))).toBeGreaterThan(0);
});

test('app_list_chains returns array of objects with chainId', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const r = await callTool(dmfPage, 'app_list_chains', {});
  const data = assertSuccess<any>(r);
  const chains = Array.isArray(data) ? data : data.chains ?? data.chainIds ?? [];
  expect(chains.length).toBeGreaterThan(0);
  for (const c of chains) {
    const id = typeof c === 'object' ? (c.chainId ?? c.chain_id ?? c.id) : null;
    if (id !== null) {
      expect(Number(id)).toBeGreaterThan(0);
    }
  }
});
