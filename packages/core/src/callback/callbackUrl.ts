import { buildSignatureHex } from "../signing/signature";
import { SignatureParts } from "../signing/types";

export function buildCallbackUrl(
  callback: string,
  signature: SignatureParts,
): string {
  const callbackUrl = new URL(callback);
  callbackUrl.searchParams.set("signature", buildSignatureHex(signature));
  callbackUrl.searchParams.set("r", signature.r);
  callbackUrl.searchParams.set("s", signature.s);
  callbackUrl.searchParams.set("v", String(signature.v));
  return callbackUrl.toString();
}
