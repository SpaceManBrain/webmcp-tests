/**
 * 01-registration.spec.ts
 *
 * Verify all expected WebMCP tools are registered on each site.
 * No extra tools. Every tool has name, description, inputSchema.
 */
import { expect } from '@playwright/test';
import { test, APP_BASE_URL, SITE_TOOLS, APP_TOOLS_T0_T1, APP_TOOLS_T2_T3, SITE_TOOL_COUNT, APP_TOOL_COUNT } from '../helpers/fixtures';
import { listTools } from '../helpers/webmcp';

// ---------------------------------------------------------------------------
// dmfam.org — 8 tools
// ---------------------------------------------------------------------------

test('dmfam.org: all 8 site tools registered', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const tools = await listTools(dmfPage);
  const names = tools.map((t) => t.name);
  expect(names.sort()).toEqual([...SITE_TOOLS].sort());
});

test('dmfam.org: no unexpected extra tools', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const tools = await listTools(dmfPage);
  expect(tools.length).toBe(SITE_TOOL_COUNT);
});

test('dmfam.org: every tool has name, description, and inputSchema', async ({ dmfPage }) => {
  await dmfPage.goto('/');
  const tools = await listTools(dmfPage);
  for (const t of tools) {
    expect(typeof t.name).toBe('string');
    expect(t.name.length).toBeGreaterThan(0);
    expect(typeof t.description).toBe('string');
    expect(t.description.length).toBeGreaterThan(0);
    expect(t.inputSchema).toBeDefined();
    // V2 API returns inputSchema as JSON string; V1 returns parsed object
    const schema = typeof t.inputSchema === 'string' ? JSON.parse(t.inputSchema) : t.inputSchema;
    expect(schema).toHaveProperty('type', 'object');
  }
});

// ---------------------------------------------------------------------------
// app.dmfam.org — 18 tools (12 T0-T1 + 6 T2-T3)
// ---------------------------------------------------------------------------

test('app.dmfam.org: all 18 tools registered', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const tools = await listTools(dmfPage);
  const names = tools.map((t) => t.name);
  const expected = [...APP_TOOLS_T0_T1, ...APP_TOOLS_T2_T3];
  expect(names.sort()).toEqual([...expected].sort());
});

test('app.dmfam.org: no unexpected extra tools', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const tools = await listTools(dmfPage);
  expect(tools.length).toBe(APP_TOOL_COUNT);
});

test('app.dmfam.org: every tool has name, description, and inputSchema', async ({ dmfPage }) => {
  await dmfPage.goto(APP_BASE_URL);
  const tools = await listTools(dmfPage);
  for (const t of tools) {
    expect(typeof t.name).toBe('string');
    expect(t.name.length).toBeGreaterThan(0);
    expect(typeof t.description).toBe('string');
    expect(t.description.length).toBeGreaterThan(0);
    expect(t.inputSchema).toBeDefined();
    // V2 API returns inputSchema as JSON string; V1 returns parsed object
    const schema = typeof t.inputSchema === 'string' ? JSON.parse(t.inputSchema) : t.inputSchema;
    expect(schema).toHaveProperty('type', 'object');
  }
});
