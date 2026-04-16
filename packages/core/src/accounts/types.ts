/**
 * One derived EVM account candidate with optional on-chain usage enrichment.
 */
export type DiscoveredAccount = {
  index: number;
  /** BIP44 path, e.g. 44'/60'/0'/0/0 */
  path: string;
  address: `0x${string}`;
  /** Native balance in wei as hex string (0x...) when enrichment ran */
  balanceWei?: string;
  /** Transaction count as hex string when enrichment ran */
  txCount?: string;
  /** True if balance > 0 or txCount > 0 */
  used: boolean;
  /** Set when RPC enrichment failed for this address */
  enrichmentError?: string;
};

/**
 * Payload returned to the host app via callback or displayed in UI.
 */
export type AccountsDiscoveryResult = {
  chainId: number;
  accounts: DiscoveredAccount[];
};
