/**
 * Mock window.ethereum injector for Playwright tests.
 *
 * Injects a fake EIP-1193 provider before the page loads, allowing
 * wagmi/RainbowKit to detect a connected wallet without a real
 * browser extension.
 *
 * Limitations:
 *   - No real private keys — signature is a static fake
 *   - No real transactions — eth_sendTransaction returns a fake hash
 *   - No real balances — accounts have 0 USDC / 0 dmfUSD
 *   - Test stops at pending_wallet: proves the flow initiates, not signs
 *
 * Usage:
 *   await mockEthProvider(page);
 *   await page.goto('https://app.dmfam.org');
 *   // Now wagmi sees the wallet and tools can proceed past T2
 */

export interface MockWalletConfig {
  /** Ethereum address returned by eth_accounts / eth_requestAccounts */
  address: string;
  /** Chain ID in decimal (default: 8453 = Base) */
  chainId: number;
  /** Whether isMetaMask should be true (default: true) */
  isMetaMask?: boolean;
}

const DEFAULT_CONFIG: MockWalletConfig = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  chainId: 8453,
  isMetaMask: true,
};

/**
 * Build the JavaScript string to inject into the page via addInitScript.
 * This runs before any page JS executes, so wagmi picks up the provider
 * on initialization.
 */
export function buildMockProviderScript(config: Partial<MockWalletConfig> = {}): string {
  const { address, chainId, isMetaMask } = { ...DEFAULT_CONFIG, ...config };
  const chainIdHex = `0x${chainId.toString(16)}`;

  return `
(function() {
  if (window.ethereum) return; // don't overwrite a real provider

  const address = '${address}';
  const chainIdHex = '${chainIdHex}';
  let isConnected = true;

  const provider = {
    isMetaMask: ${isMetaMask},
    isConnected: () => isConnected,

    request: async ({ method, params }) => {
      // Silence wagmi console spam
      if (method === 'eth_blockNumber') return '0x0';
      if (method === 'net_version') return '${chainId}';

      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [address];

        case 'eth_chainId':
          return chainIdHex;

        case 'wallet_switchEthereumChain':
          // Pretend the switch succeeded
          return null;

        case 'wallet_addEthereumChain':
          return null;

        case 'personal_sign':
          return '0x' + 'f'.repeat(130); // fake 65-byte signature

        case 'eth_sendTransaction':
          // Returns a fake tx hash — flow proved, no real tx sent
          return '0x' + 'a'.repeat(64);

        case 'eth_estimateGas':
          return '0x5208'; // 21000 gas

        case 'eth_gasPrice':
          return '0x4a817c800'; // 20 gwei

        case 'eth_getBalance':
          return '0x0'; // empty wallet

        case 'eth_call':
          // Return "0" encoded as uint256 for balanceOf
          return '0x0000000000000000000000000000000000000000000000000000000000000000';

        case 'eth_getTransactionReceipt':
        case 'eth_getTransactionByHash':
          return null;

        default:
          console.debug('[MockEIP1193] Unhandled method:', method, params);
          throw new Error('MockEIP1193: unsupported method ' + method);
      }
    },

    on: (event, handler) => {
      console.debug('[MockEIP1193] Listener registered:', event);
      if (event === 'connect' && typeof handler === 'function') {
        handler({ chainId: chainIdHex });
      }
    },

    removeListener: () => {},
  };

  Object.defineProperty(window, 'ethereum', {
    value: provider,
    writable: false,
    configurable: false,
  });
})();
`;
}

/**
 * Apply the mock wallet provider to a Playwright page.
 * Must be called BEFORE page.goto().
 */
export async function mockEthProvider(
  page: import('@playwright/test').Page,
  config: Partial<MockWalletConfig> = {},
): Promise<void> {
  const script = buildMockProviderScript(config);
  await page.addInitScript(script);
}
