# Chrome 151 WebMCP V2 API — Provider Compatibility Fix
# Apply these patches to the DMF WebMCP providers in both repos.

## Root Cause

Chrome 151 shipped WebMCP V2 with a different API signature:

  V1 (Chrome 149-150):   mc.registerTool(name, definition, execute)   — 3 args
  V2 (Chrome 151+):      mc.registerTool({ name, ..., execute })     — 1 object arg

The `getMc()` check passes in V2 because `registerTool` still exists as a method,
but calling it with 3 args throws and tools silently fail to register.

## Fix

Replace every `mc.registerTool(name, definition, execute)` with a compat wrapper
that detects the API version and calls accordingly.

---

## Step 1 — Add this adapter function to both providers

Add at the top of the provider file (or in a shared helper):

### DMF-org: app/lib/webmcp/DmfWebMcpProvider.tsx
### DMF-app: src/lib/webmcp/DmfWebMcpProvider.tsx

Add near the imports:

```typescript
/**
 * Adapter for Chrome 151+ WebMCP V2 API.
 * 
 * V1: mc.registerTool(name, definition, execute) — 3 args
 * V2: mc.registerTool({ name, description, inputSchema, annotations, execute }) — 1 object arg
 *
 * Detects version by checking Function.length (V2 length=1, V1 length=3).
 */
function registerToolCompat(
  mc: any,
  name: string,
  definition: { description: string; inputSchema: object; annotations?: object },
  execute: (...args: any[]) => any,
): void {
  if (mc.registerTool.length === 1) {
    // V2 — single object with execute inline
    mc.registerTool({
      name,
      ...definition,
      execute,
    });
  } else {
    // V1 — separate args
    mc.registerTool(name, definition, execute);
  }
}
```

## Step 2 — Replace all mc.registerTool() calls

Every call to `mc.registerTool(name, definition, execute)` becomes:

```typescript
registerToolCompat(mc, name, definition, execute);
```

### Files to patch:

| Repo | File | Tool count |
|------|------|-----------|
| DMF-org | app/lib/webmcp/site-tools.ts | 8 tools |
| DMF-app | src/lib/webmcp/app-tools.ts | 12 tools |
| DMF-app | src/lib/webmcp/app-execute-tools.ts | 3 tools |
| DMF-app | src/lib/webmcp/app-swap-tools.ts | 3 tools |

Each file exports an array of `{ name, description, inputSchema, annotations, execute }` objects
that are iterated in the provider. The registration loop needs the compat wrapper:

```typescript
// Before (in provider useEffect):
tools.forEach(({ name, description, inputSchema, annotations, execute }) => {
  mc.registerTool(name, { description, inputSchema, annotations }, execute);
});

// After:
tools.forEach(({ name, description, inputSchema, annotations, execute }) => {
  registerToolCompat(mc, name, { description, inputSchema, annotations }, execute);
});
```

## Verification

After patching and redeploying:

```javascript
// In Chrome 151+ DevTools console on dmfam.org:
const mc = document.modelContext;
const tools = await mc.getTools();
console.log(tools.map(t => t.name));
// Expected: ['site_read_page_state', 'site_get_transparency', ...all 8]

// Also verify executeTool works:
const r = await mc.executeTool({ name: 'site_read_page_state', arguments: {} }, {});
console.log(r);
// Expected: { content: [{ type: 'text', text: '...' }] }
```

## Why V1 also works

When Chrome 149 users visit the site, `mc.registerTool.length` is 3 (V1 API),
so `registerToolCompat` calls the V1 three-arg version. No behavior change for them.

## Rolling back

If V2 causes issues, remove the compat wrapper and revert to direct 3-arg calls.
V1 still works on Chrome 149-150. Only Chrome 151+ needs the change.
