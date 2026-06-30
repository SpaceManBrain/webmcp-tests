/**
 * 07-swap-e2e.spec.ts
 *
 * Multi-chain swap flow: configure → preview → confirm → execute.
 * The preview hits the real Relay API; the execute opens the SwapWidget.
 *
 * Tests stop at the wallet signature gate — no real tokens are moved.
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
import { assertSuccess, assertValidResponse, assertPositiveNumber } from '../helpers/assertions';

// ---------------------------------------------------------------------------
// Swap configuration
// ---------------------------------------------------------------------------

test('app_configure_swap: sets swap parameters without error', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  await callTool(dmfPage, 'app_set_mode', { mode: 'swap' });

  const r = await callTool(dmfPage, 'app_configure_swap', {
    fromChainId: 8453,     // Base
    toChainId: 10,         // Optimism
    fromToken: 'USDC',
    toToken: 'USDC',
    amount: '100',
  });
  assertSuccess(r);
});

// ---------------------------------------------------------------------------
// Swap preview (Relay API call — real data, no wallet needed)
// ---------------------------------------------------------------------------

test('app_preview_swap: returns quote from Relay API', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  await callTool(dmfPage, 'app_set_mode', { mode: 'swap' });

  // Configure first
  await callTool(dmfPage, 'app_configure_swap', {
    fromChainId: 8453,
    toChainId: 10,
    fromToken: 'USDC',
    toToken: 'USDC',
    amount: '100',
  });

  // Preview
  const r = await callTool(dmfPage, 'app_preview_swap', {});
  const data = assertSuccess<any>(r);

  // Should have exchange rate / estimated receive data
  const est = data.estimatedReceive ?? data.estimated_receive ?? data.output;
  if (est !== undefined) {
    expect(parseFloat(String(est))).toBeGreaterThan(0);
  }

  // Log for debugging
  console.log('Preview response keys:', Object.keys(data).join(', '));
});

// ---------------------------------------------------------------------------
// Swap E2E — full flow to signature gate
// ---------------------------------------------------------------------------

test('app_swap_full_flow: configure → preview → confirm → execute', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  await callTool(dmfPage, 'app_set_mode', { mode: 'swap' });

  // Step 1: Configure
  const configR = await callTool(dmfPage, 'app_configure_swap', {
    fromChainId: 8453,
    toChainId: 10,
    fromToken: 'USDC',
    toToken: 'USDC',
    amount: '10',
  });
  assertSuccess(configR);

  // Step 2: Preview
  const previewR = await callTool(dmfPage, 'app_preview_swap', {});
  assertSuccess(previewR);

  // Step 3: Request confirmation
  const confirmR = await callTool(dmfPage, 'app_request_confirm', {
    action: 'swap',
    summary: { fromChain: 'Base', toChain: 'Optimism', amount: '10' },
  });
  assertValidResponse(confirmR);
  const confirmData = parseResponse<any>(confirmR);
  console.log('Confirm response:', JSON.stringify(confirmData).slice(0, 200));

  // Step 4: Execute (will reach wallet gate)
  const execR = await callTool(dmfPage, 'app_execute_swap', {});
  assertValidResponse(execR);
  console.log('Execute response:', execR.content[0].text.slice(0, 200));
});
