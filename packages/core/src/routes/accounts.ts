import type { SearchParamsLike } from "./sign";

export type AccountsRouteParams = {
  /** EVM chain id (e.g. 1 for Ethereum mainnet) */
  chainId: number;
  /** Number of addresses to derive starting at startIndex (default 5, max 20) */
  count?: number;
  /** First account index in path 44'/60'/0'/0/{index} (default 0) */
  startIndex?: number;
  /** Optional JSON-RPC HTTP endpoint for balance / tx count */
  rpcUrl?: string;
  /** URL to open with discovery result (see buildAccountsCallbackUrl) */
  callback?: string;
};

const DEFAULT_COUNT = 5;
const MAX_COUNT = 20;
const DEFAULT_START_INDEX = 0;
/** When the URL omits chainId (e.g. ledger-connect://accounts), default to Ethereum mainnet. */
const DEFAULT_CHAIN_ID = 1;

export function parseAccountsParams(
  searchParams: SearchParamsLike,
): AccountsRouteParams | null {
  const chainIdRaw = searchParams.get("chainId");
  let chainId: number;
  if (chainIdRaw == null || chainIdRaw === "") {
    chainId = DEFAULT_CHAIN_ID;
  } else {
    chainId = Number(chainIdRaw);
    if (!Number.isFinite(chainId) || chainId < 0) {
      return null;
    }
  }

  const countRaw = searchParams.get("count");
  let count = countRaw ? Number(countRaw) : DEFAULT_COUNT;
  if (!Number.isFinite(count) || count < 1) {
    count = DEFAULT_COUNT;
  }
  count = Math.min(Math.floor(count), MAX_COUNT);

  const startRaw = searchParams.get("startIndex");
  let startIndex = startRaw ? Number(startRaw) : DEFAULT_START_INDEX;
  if (!Number.isFinite(startIndex) || startIndex < 0) {
    startIndex = DEFAULT_START_INDEX;
  }
  startIndex = Math.floor(startIndex);

  const rpcUrl = searchParams.get("rpcUrl") ?? undefined;
  const callback = searchParams.get("callback") ?? undefined;

  return {
    chainId,
    count,
    startIndex,
    rpcUrl,
    callback,
  };
}

export function encodeReturnToAccountsRoute(
  searchParams: SearchParamsLike,
  accountsPath = "/accounts",
): string {
  const params =
    typeof searchParams.toString === "function" ? searchParams.toString() : "";
  const route = params ? `${accountsPath}?${params}` : accountsPath;
  return encodeURIComponent(route);
}

/** BIP44 path for Ethereum external addresses: m/44'/60'/0'/0/{index} */
export function ethereumDerivationPathForIndex(index: number): string {
  return `44'/60'/0'/0/${index}`;
}
