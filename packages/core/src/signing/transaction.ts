import { ethers } from "ethers";

import { StructuredTransactionFields } from "./types";

export function parseTransactionInput(transaction: string): Uint8Array {
  let rawTx = transaction;

  try {
    const jsonTx = JSON.parse(transaction) as Record<string, unknown>;
    if ("from" in jsonTx) {
      delete jsonTx.from;
    }
    rawTx = ethers.Transaction.from(jsonTx).unsignedSerialized;
  } catch {
    rawTx = ethers.Transaction.from(transaction).unsignedSerialized;
  }

  return ethers.getBytes(rawTx);
}

export function buildTransactionFromFields(
  fields: StructuredTransactionFields,
): Uint8Array {
  const tx = ethers.Transaction.from({
    to: fields.to,
    value: ethers.getBigInt(fields.value || "0"),
    data: fields.data || "0x",
    gasLimit: ethers.getBigInt(fields.gasLimit),
    chainId: fields.chainId,
    type: 2,
    maxFeePerGas: ethers.parseUnits("30", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
    nonce: 0,
  });

  return ethers.getBytes(tx.unsignedSerialized);
}
