import type { AccountsDiscoveryResult } from "../accounts/types";

/**
 * Appends a single JSON payload to the callback URL as `accounts` query param.
 */
export function buildAccountsCallbackUrl(
  callback: string,
  result: AccountsDiscoveryResult,
): string {
  const callbackUrl = new URL(callback);
  const payload = JSON.stringify(result);
  callbackUrl.searchParams.set("accounts", payload);
  return callbackUrl.toString();
}
