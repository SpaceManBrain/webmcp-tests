# DMF WebMCP E2E Test Agent

End-to-end test suite for the [DMF Protocol](https://dmfam.org) WebMCP tool surface — 29 structured tools across 2 sites, 4 safety tiers.

## What It Tests

| Spec | Scope | 
|------|-------|
| `01-registration` | All 29 tools register, no extra, every tool has name/description/schema |
| `02-schema-validation` | Every tool returns valid JSON matching expected shape |
| `03-tier0-reads` | Live on-chain data is real (backing > 0, reserves > 0, previews work) |
| `04-tier1-prep` | State mutations stick (mode switching, tab switching, amount setting) |
| `05-tier3-safety-gate` | Financial execute tools reject without valid confirmToken |
| `06-tier3-execute-flow` | Confirm modal appears → token issued → execute reaches wallet gate |
| `07-swap-e2e` | Full multi-chain swap flow via Relay API (configure → preview → confirm → execute) |
| `08-error-states` | Bad inputs produce graceful errors, not crashes |

## Prerequisites

- **Chrome Dev/Canary 151+** with WebMCP support
- Node.js 20+
- A live DMF site (defaults to production `dmfam.org` / `app.dmfam.org`)

### Chrome Dev Setup (Linux/WSL)

```bash
# Install via Playwright's chromium channel
npx playwright install chromium
```

The test config passes WebMCP flags automatically — no manual flag toggling needed.

On first launch, Chrome may still prompt for flag confirmation. After the first run, the flags persist.

## Setup

```bash
git clone https://github.com/SpaceManBrain/webmcp-tests.git
cd webmcp-tests
npm install
```

## Running Tests

```bash
# Full suite
npm test

# Site tools only
npx playwright test specs/01-registration.spec.ts

# Safety gate tests (critical security check)
npx playwright test specs/05-tier3-safety-gate.spec.ts

# Swap flow end-to-end
npx playwright test specs/07-swap-e2e.spec.ts

# Visible browser (debug locally)
DMF_TEST_HEADLESS=false npx playwright test --headed

# Debug mode with Playwright Inspector
npx playwright test --debug
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DMF_TEST_SITE_URL` | `https://dmfam.org` | DMF website URL |
| `DMF_TEST_APP_URL` | `https://app.dmfam.org` | DMF app URL |
| `DMF_TEST_HEADLESS` | `true` | Run with visible browser |
| `DMF_TEST_CHROME_PATH` | auto-detected | Override Chrome binary path |

## Architecture

```
specs/
├── 01-registration.spec.ts      # Tool count + metadata per site
├── 02-schema-validation.spec.ts  # Response structure per tool
├── 03-tier0-reads.spec.ts        # Live data assertions
├── 04-tier1-prep.spec.ts         # State mutation verification
├── 05-tier3-safety-gate.spec.ts  # Security: no auto-execution
├── 06-tier3-execute-flow.spec.ts # Confirm + execute sequence
├── 07-swap-e2e.spec.ts           # Multi-step swap flow
└── 08-error-states.spec.ts       # Graceful error handling
helpers/
├── browser.ts     # Chrome launch with WebMCP flags
├── webmcp.ts      # modelContext wrapper functions
├── assertions.ts  # Response validators
└── fixtures.ts    # Extended test fixture + tool lists
```

Tests use a custom Playwright fixture that launches Chrome with `--enable-features=WebMCP` and `--enable-blink-features=ModelContextAPI,ModelContextExecutorAPI`.

## T3 Safety Philosophy

T3 execute tools (buy, sell, swap) require:
1. `app_request_confirm` — shows a confirmation modal to the human
2. A single-use `confirmToken` (60s expiry)
3. Wallet signature (never auto-signed)

Our tests verify the gate holds — calling execute without confirmToken is rejected. Tests stop at the `pending_wallet` response (the signature prompt), which is the correct automation endpoint.

## Wallet Testing

Initial test suite runs without a wallet. This covers ~26/29 tools. Wallet-gated tests (T2 connection, T3 signature) verify graceful error behavior. Full wallet integration requires either:
- A real wallet extension injected into Playwright
- A mock `window.ethereum` provider via `page.addInitScript()`

## License

MIT
