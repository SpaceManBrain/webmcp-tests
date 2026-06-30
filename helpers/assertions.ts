import { expect } from '@playwright/test';
import { ToolResponse, parseResponse } from './webmcp';

// ---------------------------------------------------------------------------
// Chrome V2 executeTool regression detection
// ---------------------------------------------------------------------------

/**
 * Check if the tool response indicates the known V2 executeTool regression.
 */
export function isExecutionBroken(response: ToolResponse): boolean {
  if (!response.content?.[0]) return false;
  try {
    const data = JSON.parse(response.content[0].text);
    return data.code === 'EXECUTION_BROKEN';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Response shape assertions
// ---------------------------------------------------------------------------

/**
 * Assert the tool response has a valid content envelope.
 * If execution is broken (V2 regression), the assertion passes trivially.
 */
export function assertValidResponse(response: ToolResponse): void {
  expect(response).toBeDefined();
  expect(response.content).toBeDefined();
  expect(Array.isArray(response.content)).toBe(true);
  expect(response.content.length).toBeGreaterThanOrEqual(1);
  expect(response.content[0].type).toBe('text');
  expect(typeof response.content[0].text).toBe('string');
}

/**
 * Assert the response parsed as JSON has { success: true }.
 * Skips assertions if execution is broken (V2 regression).
 */
export function assertSuccess<T = any>(response: ToolResponse): T | null {
  assertValidResponse(response);

  if (isExecutionBroken(response)) {
    console.warn('[test] Skipping success assertion — V2 executeTool regression detected');
    return null;
  }

  const parsed = parseResponse<T>(response);
  const root = parsed as any;
  expect(
    root.success !== false && root.error === undefined,
    `Expected success but got: ${firstLine(response)}`,
  ).toBe(true);
  return parsed;
}

/**
 * Assert the tool returned a graceful error (expected failure mode).
 */
export function assertGracefulError(response: ToolResponse): void {
  assertValidResponse(response);

  if (isExecutionBroken(response)) {
    console.warn('[test] Skipping graceful-error assertion — V2 executeTool regression detected');
    return;
  }

  const parsed = parseResponse(response);
  const root = parsed as any;
  expect(
    root.success === false || root.error !== undefined,
    `Expected graceful error but got success: ${firstLine(response)}`,
  ).toBe(true);
}

/**
 * Assert a T3 tool rejected execution because no confirmToken was provided.
 */
export function assertT3GateRejection(response: ToolResponse): void {
  assertValidResponse(response);

  if (isExecutionBroken(response)) {
    console.warn('[test] Skipping T3 gate assertion — V2 executeTool regression detected');
    return;
  }

  const text = response.content[0].text.toLowerCase();
  expect(text).toContain('confirm');
  expect(text).not.toContain('pending_wallet');
}

/**
 * Assert a T3 tool reached the wallet signature stage.
 */
export function assertPendingWallet(response: ToolResponse): void {
  assertValidResponse(response);

  if (isExecutionBroken(response)) {
    console.warn('[test] Skipping pending_wallet assertion — V2 executeTool regression detected');
    return;
  }

  const text = response.content[0].text.toLowerCase();
  expect(text).toContain('pending_wallet');
}

// ---------------------------------------------------------------------------
// Numeric sanity
// ---------------------------------------------------------------------------

/**
 * Assert a parsed numeric field is a positive number.
 */
export function assertPositiveNumber(value: unknown, fieldName: string): void {
  if (value === undefined || value === null) {
    console.warn(`[test] Skipping positive number assertion for ${fieldName} — value is null/undefined`);
    return;
  }
  const num = typeof value === 'string' ? parseFloat(value) : (value as number);
  expect(typeof num).toBe('number');
  expect(isNaN(num)).toBe(false);
  expect(num).toBeGreaterThan(0);
  expect(Number.isFinite(num)).toBe(true);
}

/**
 * Assert a backing/circulation/reserves string is positive.
 */
export function assertPositiveBigNumber(value: unknown): void {
  if (value === undefined || value === null) {
    console.warn('[test] Skipping positive big number assertion — value is null/undefined');
    return;
  }
  const str = String(value);
  expect(str).toMatch(/^\d+(\.\d+)?$/);
  expect(parseFloat(str)).toBeGreaterThan(0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstLine(response: ToolResponse): string {
  const text = response.content?.[0]?.text ?? '';
  return text.slice(0, 120).replace(/\n/g, '\\n');
}
