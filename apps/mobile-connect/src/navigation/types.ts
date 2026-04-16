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

export type RootStackParamList = {
  Connect: {
    returnTo?: SignRouteParams;
  };
  Sign: SignRouteParams;
};
