import { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types mirroring the WebMCP V2 API surface (Chrome 151+)
//
//   V2:  mc.getTools()                          → ToolDescriptor[]
//        mc.executeTool({ name, arguments }, {}) → ToolResponse
//        mc.registerTool({ name, description, inputSchema, execute, ... })
//
//   V1 (fallback for Chrome 149-150):
//        mc.listTools()
//        mc.callTool(name, args)
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

// ---------------------------------------------------------------------------
// Core WebMCP operations — executed inside the browser via page.evaluate
// ---------------------------------------------------------------------------

/**
 * Check if the WebMCP API is available on the current page.
 * Attempts document.modelContext first, falls back to navigator.modelContext.
 * Supports both V1 (listTools) and V2 (getTools).
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
 * List all registered WebMCP tools on the current page.
 * Uses V2 getTools() on Chrome 151+, falls back to V1 listTools().
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
      // V2 API (Chrome 151+)
      tools = await mc.getTools();
    } else if (typeof mc.listTools === 'function') {
      // V1 API (Chrome 149-150)
      tools = await mc.listTools();
    } else {
      return [];
    }

    return tools.map((t: any) => ({
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
 * Uses V2 executeTool() on Chrome 151+, falls back to V1 callTool().
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
        throw new Error('WebMCP not available — modelContext not found');
      }

      if (typeof mc.executeTool === 'function') {
        // V2 API (Chrome 151+): executeTool(toolCall, options)
        return await mc.executeTool(
          { name: toolName, arguments: toolArgs },
          {},
        );
      } else if (typeof mc.callTool === 'function') {
        // V1 API (Chrome 149-150): callTool(name, args)
        return await mc.callTool(toolName, toolArgs);
      } else {
        throw new Error('WebMCP available but neither executeTool nor callTool found');
      }
    },
    { toolName: name, toolArgs: args },
  );
  return result;
}

/**
 * Parse the text content of a tool response into a JS object.
 * WebMCP responses always use `{ type: 'text', text: '...' }` content items.
 */
export function parseResponse<T = any>(response: ToolResponse): T {
  const first = response.content?.[0];
  if (!first || first.type !== 'text') {
    throw new Error(`Unexpected response format: ${JSON.stringify(response)}`);
  }
  return JSON.parse(first.text) as T;
}
