import { StructuredTransactionFields } from "../signing/types";

export type SearchParamsLike = {
  get: (name: string) => string | null;
  toString?: () => string;
};

export function parseStructuredFields(
  searchParams: SearchParamsLike,
): StructuredTransactionFields | null {
  const to = searchParams.get("to");
  const value = searchParams.get("value");
  const gasLimit = searchParams.get("gasLimit");
  const chainId = searchParams.get("chainId");

  if (!to || !gasLimit || !chainId) {
    return null;
  }

  return {
    to,
    value: value ?? "0",
    data: searchParams.get("data") ?? undefined,
    gasLimit,
    chainId: Number(chainId),
  };
}

export function encodeReturnToSignRoute(
  searchParams: SearchParamsLike,
  signPath = "/sign",
): string {
  const params =
    typeof searchParams.toString === "function" ? searchParams.toString() : "";
  const route = params ? `${signPath}?${params}` : signPath;
  return encodeURIComponent(route);
}

export function isSafeInternalRoute(route: string): boolean {
  return route.startsWith("/") && !route.startsWith("//");
}
