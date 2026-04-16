/**
 * Lightweight JSON-RPC helpers for EVM usage signals (no ethers dependency).
 */

export type EvmUsageResult = {
  balanceWei: string;
  txCount: string;
};

/**
 * Calls eth_getBalance and eth_getTransactionCount for an address.
 */
export async function fetchEvmAccountUsage(
  rpcUrl: string,
  address: string,
): Promise<EvmUsageResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const body = (method: string) =>
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params: [address, "latest"],
    });

  const [balanceRes, countRes] = await Promise.all([
    fetch(rpcUrl, { method: "POST", headers, body: body("eth_getBalance") }),
    fetch(rpcUrl, {
      method: "POST",
      headers,
      body: body("eth_getTransactionCount"),
    }),
  ]);

  if (!balanceRes.ok) {
    throw new Error(`RPC eth_getBalance failed: ${balanceRes.status}`);
  }
  if (!countRes.ok) {
    throw new Error(`RPC eth_getTransactionCount failed: ${countRes.status}`);
  }

  const balanceJson = (await balanceRes.json()) as {
    result?: string;
    error?: { message?: string };
  };
  const countJson = (await countRes.json()) as {
    result?: string;
    error?: { message?: string };
  };

  if (balanceJson.error?.message) {
    throw new Error(balanceJson.error.message);
  }
  if (countJson.error?.message) {
    throw new Error(countJson.error.message);
  }

  const balanceWei = balanceJson.result ?? "0x0";
  const txCount = countJson.result ?? "0x0";

  return { balanceWei, txCount };
}

/** True if hex bigint is > 0 */
export function isHexPositive(hex: string): boolean {
  const n = BigInt(hex);
  return n > 0n;
}

/**
 * Optional default public RPC URLs for well-known chains (dev convenience only).
 * Prefer passing an explicit rpcUrl in production.
 */
export function getDefaultRpcUrlForChain(chainId: number): string | null {
  switch (chainId) {
    case 1:
      return "https://cloudflare-eth.com";
    case 11155111:
      return "https://rpc.sepolia.org";
    case 5:
      return "https://rpc.goerli.mudit.blog";
    default:
      return null;
  }
}
