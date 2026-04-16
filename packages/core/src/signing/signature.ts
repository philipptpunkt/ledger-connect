import { SignatureParts } from "./types";

export function buildSignatureHex(signature: SignatureParts) {
  const vHex = `0x${signature.v.toString(16).padStart(2, "0")}`;
  return `${signature.r}${signature.s.slice(2)}${vHex.slice(2)}`;
}
