export type StructuredTransactionFields = {
  to: string;
  value: string;
  data?: string;
  gasLimit: string;
  chainId: number;
};

export type SignatureParts = {
  r: string;
  s: string;
  v: number;
};
