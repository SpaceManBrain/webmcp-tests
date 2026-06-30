import { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types mirroring the WebMCP V2 API surface (Chrome 151+)
// ---------------------------------------------------------------------------

export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean };
}

export interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * Known bug in Chrome Dev/Canary 151.0.x:
 *   executeTool() throws "Failed to read the 'description' property from
 *   'RegisteredToolDeprecated': Required member is undefined."
 *
 * This is a V2 API implementation bug. Tools register correctly (getTools()
 * works), but cannot be called. Tracked upstream.
 *
 * When this response is returned, tests should check isToolExecutionBroken()
 * and skip execution assertions gracefully.
 */
const EXECUTION_BROKEN_RESPONSE: ToolResponse = {
  content: [{ type: 'text', text: JSON.stringify({
    error: 'Chrome V2 executeTool regression — tool registered but cannot be called',
    success: false,
    code: 'EXECUTION_BROKEN',
  }) }],
  isError: true,
};

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Check if the WebMCP API is available on the current page.
 */
export async function isWebMcpAvailable(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const mc =
      (typeof document !== 'undefined' &&
        (document as any).modelContext) ||
      (typeof navigator !== 'undefined' &&
        (navigator as any).modelContext);
    return !!mc && (typeof mc.getTools === 'function' || typeof mc.listTools === 'function');
  });
}

/**
 * Check if executeTool is broken by the known V2 regression.
 * Returns true if a test call to executeTool fails with the
 * "RegisteredToolDeprecated" error.
 */
export async function isToolExecutionBroken(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const mc =
      (typeof document !== 'undefined' &&
        (document as any).modelContext) ||
      (typeof navigator !== 'undefined' &&
        (navigator as any).modelContext);
    if (!mc || typeof mc.executeTool !== 'function') return true;

    try {
      // Try V2 format
      await mc.executeTool({ name: '_test_nonexistent', arguments: {} }, {});
      return false;
    } catch (e: any) {
      // "RegisteredToolDeprecated" = known V2 bug
      if (e.message?.includes('RegisteredToolDeprecated')) return true;
      // "2 arguments required" = V1 available, V2 missing
      if (e.message?.includes('2 arguments required')) return true;
      // "Tool not found" = executeTool WORKS, tool just doesn't exist
      return false;
    }
  });
}

// ---------------------------------------------------------------------------
// Core WebMCP operations
// ---------------------------------------------------------------------------

/**
 * List all registered WebMCP tools on the current page.
 */
export async function listTools(page: Page): Promise<ToolDescriptor[]> {
  const result = await page.evaluate(async () => {
    const mc =
      (typeof document !== 'undefined' &&
        (document as any).modelContext) ||
      (typeof navigator !== 'undefined' &&
        (navigator as any).modelContext);
    if (!mc) return [];

    let tools: any[];
    if (typeof mc.getTools === 'function') {
      tools = await mc.getTools();
    } else if (typeof mc.listTools === 'function') {
      tools = await mc.listTools();
    } else {
      return [];
    }

    return (tools || []).map((t: any) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations,
    }));
  });
  return result;
}

/**
 * Call a registered WebMCP tool.
 *
 * In Chrome 151 Dev/Canary, executeTool has a known V2 regression.
 * This function returns a structured error response when execution
 * is unavailable, so tests can assert gracefully instead of crashing.
 */
export async function callTool(
  page: Page,
  name: string,
  args: Record<string, unknown> = {},
): Promise<ToolResponse> {
  const result = await page.evaluate(
    async ({ toolName, toolArgs }) => {
      const mc =
        (typeof document !== 'undefined' &&
          (document as any).modelContext) ||
        (typeof navigator !== 'undefined' &&
          (navigator as any).modelContext);
      if (!mc) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'WebMCP not available' }) }],
          isError: true,
        } as ToolResponse;
      }

      if (typeof mc.executeTool === 'function') {
        try {
          return await mc.executeTool(
            { name: toolName, arguments: toolArgs },
            {},
          );
        } catch (e: any) {
          // Known V2 regression — return structured error instead of throwing
          if (e.message?.includes('RegisteredToolDeprecated')) {
            console.warn('[WebMCP] V2 executeTool regression detected (Chrome 151 bug)');
            return {
              content: [{ type: 'text', text: JSON.stringify({
                error: e.message,
                success: false,
                code: 'EXECUTION_BROKEN',
              }) }],
              isError: true,
            } as ToolResponse;
          }
          // Unknown error — rethrow
          throw e;
        }
      }

      // No executeTool at all
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'No executeTool method available' }) }],
        isError: true,
      } as ToolResponse;
    },
    { toolName: name, toolArgs: args },
  );
  return result;
}

/**
 * Parse the text content of a tool response into a JS object.
 */
export function parseResponse<T = any>(response: ToolResponse): T {
  const first = response.content?.[0];
  if (!first || first.type !== 'text') {
    throw new Error(`Unexpected response format: ${JSON.stringify(response)}`);
  }
  return JSON.parse(first.text) as T;
}
