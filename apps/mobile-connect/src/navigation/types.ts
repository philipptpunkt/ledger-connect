export type SignRouteParams = {
  tx?: string;
  to?: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  chainId?: string;
  path?: string;
  callback?: string;
};

/** Query-style params for the accounts discovery flow (EVM). */
export type AccountsRouteParams = {
  /** Defaults to Ethereum mainnet (1) in @ledgerhq/ledger-connect-core when omitted. */
  chainId?: string;
  count?: string;
  startIndex?: string;
  rpcUrl?: string;
  callback?: string;
};

export type RootStackParamList = {
  Connect: {
    returnTo?: SignRouteParams | AccountsRouteParams;
  };
  Sign: SignRouteParams;
  Accounts: AccountsRouteParams;
};
