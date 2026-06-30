import { expect } from '@playwright/test';
import { ToolResponse, parseResponse } from './webmcp';

// ---------------------------------------------------------------------------
// Response shape assertions
// ---------------------------------------------------------------------------

/**
 * Assert the tool response has a valid content envelope.
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
 * Assert the response body parsed as JSON has { success: true }.
 */
export function assertSuccess<T = any>(response: ToolResponse): T {
  assertValidResponse(response);
  const parsed = parseResponse<T>(response);
  // Some tools nest success under different keys; accept top-level or nested
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
  const text = response.content[0].text.toLowerCase();
  expect(text).toContain('confirm');
  expect(text).not.toContain('pending_wallet');
  expect(text).not.toContain('success');
}

/**
 * Assert a T3 tool reached the wallet signature stage (expected automation endpoint).
 */
export function assertPendingWallet(response: ToolResponse): void {
  assertValidResponse(response);
  const text = response.content[0].text.toLowerCase();
  expect(text).toContain('pending_wallet');
}

// ---------------------------------------------------------------------------
// Numeric sanity
// ---------------------------------------------------------------------------

/**
 * Assert a parsed numeric field is a positive number (useful for balances, fees, estimates).
 */
export function assertPositiveNumber(value: unknown, fieldName: string): void {
  const num = typeof value === 'string' ? parseFloat(value) : (value as number);
  expect(typeof num).toBe('number');
  expect(isNaN(num)).toBe(false);
  expect(num).toBeGreaterThan(0);
  expect(Number.isFinite(num)).toBe(true);
}

/**
 * Assert the backing/circulation/reserves string is a positive value.
 */
export function assertPositiveBigNumber(value: unknown): void {
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
