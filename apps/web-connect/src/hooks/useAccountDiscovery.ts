"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ContextModule,
  ClearSignContextType,
  ContextModuleBuilder,
} from "@ledgerhq/context-module";
import { DeviceActionStatus } from "@ledgerhq/device-management-kit";
import {
  type AccountsDiscoveryResult,
  type DiscoveredAccount,
  ethereumDerivationPathForIndex,
  fetchEvmAccountUsage,
  getDefaultRpcUrlForChain,
  isHexPositive,
  toErrorMessage,
} from "@ledgerhq/ledger-connect-core";
import { SignerEthBuilder } from "@ledgerhq/device-signer-kit-ethereum";
import { type Subscription } from "rxjs";

import { useDeviceSession } from "@/providers/DeviceSessionProvider";
import { useDmk } from "@/providers/DmkProvider";

const DEFAULT_ORIGIN_TOKEN =
  "1e55ba3959f4543af24809d9066a2120bd2ac9246e626e26a1ff77eb109ca0e5";
const ORIGIN_TOKEN =
  process.env.NEXT_PUBLIC_GATING_TOKEN ?? DEFAULT_ORIGIN_TOKEN;
const APP_SOURCE = process.env.NEXT_PUBLIC_APP_SOURCE ?? "ledger-connect";

export type AccountDiscoveryState =
  | { status: "idle" }
  | {
      status: "pending";
      step?: string;
    }
  | {
      status: "completed";
      result: AccountsDiscoveryResult;
    }
  | {
      status: "error";
      message: string;
    };

export type DiscoverAccountsParams = {
  chainId: number;
  count: number;
  startIndex: number;
  rpcUrl?: string;
};

export function useAccountDiscovery() {
  const dmk = useDmk();
  const { sessionId } = useDeviceSession();
  const [state, setState] = useState<AccountDiscoveryState>({ status: "idle" });
  const subscriptionRef = useRef<Subscription | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const signer = useMemo(() => {
    if (!sessionId) {
      return null;
    }

    const contextModule = new ContextModuleBuilder({
      originToken: ORIGIN_TOKEN,
      loggerFactory: (tag: string) =>
        dmk.getLoggerFactory()(["ContextModule", tag]),
    })
      .setAppSource(APP_SOURCE)
      .build();

    const filteredContextModule: ContextModule = {
      getContexts: (input, expectedTypes) =>
        contextModule.getContexts(
          input,
          expectedTypes?.filter(
            (type) => type !== ClearSignContextType.TRANSACTION_CHECK,
          ),
        ),
      getFieldContext: (field, expectedType) =>
        contextModule.getFieldContext(field, expectedType),
      getTypedDataFilters: (typedData) =>
        contextModule.getTypedDataFilters(typedData),
      getSolanaContext: (transactionContext) =>
        contextModule.getSolanaContext(transactionContext),
      report: (params) => contextModule.report(params),
    };

    return new SignerEthBuilder({
      dmk,
      sessionId,
      originToken: ORIGIN_TOKEN,
    })
      .withContextModule(filteredContextModule)
      .build();
  }, [dmk, sessionId]);

  const cancel = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    cancelRef.current?.();
    cancelRef.current = null;
    setState({ status: "idle" });
  }, []);

  const discoverAccounts = useCallback(
    ({ chainId, count, startIndex, rpcUrl }: DiscoverAccountsParams) => {
      if (!signer) {
        setState({
          status: "error",
          message: "No connected Ledger session found.",
        });
        return;
      }

      const resolvedRpc =
        rpcUrl?.trim() || getDefaultRpcUrlForChain(chainId) || undefined;

      subscriptionRef.current?.unsubscribe();
      cancelRef.current?.();
      cancelRef.current = null;

      setState({ status: "pending", step: "Deriving addresses..." });

      void (async () => {
        const accounts: DiscoveredAccount[] = [];

        for (let i = 0; i < count; i += 1) {
          const index = startIndex + i;
          const path = ethereumDerivationPathForIndex(index);

          setState({
            status: "pending",
            step: `Getting address ${i + 1} of ${count}...`,
          });

          try {
            const address = await new Promise<`0x${string}`>(
              (resolve, reject) => {
                const { observable, cancel: cancelDa } = signer.getAddress(
                  path,
                  {
                    checkOnDevice: false,
                    chainId,
                  },
                );
                cancelRef.current = cancelDa;

                const sub = observable.subscribe({
                  next: (deviceActionState) => {
                    if (
                      deviceActionState.status === DeviceActionStatus.Completed
                    ) {
                      sub.unsubscribe();
                      cancelRef.current = null;
                      resolve(deviceActionState.output.address);
                      return;
                    }
                    if (deviceActionState.status === DeviceActionStatus.Error) {
                      sub.unsubscribe();
                      cancelRef.current = null;
                      reject(deviceActionState.error);
                    }
                  },
                  error: (err) => {
                    cancelRef.current = null;
                    reject(err);
                  },
                });
                subscriptionRef.current = sub;
              },
            );

            subscriptionRef.current = null;
            cancelRef.current = null;

            let balanceWei: string | undefined;
            let txCount: string | undefined;
            let enrichmentError: string | undefined;
            let used = false;

            if (resolvedRpc) {
              try {
                const usage = await fetchEvmAccountUsage(resolvedRpc, address);
                balanceWei = usage.balanceWei;
                txCount = usage.txCount;
                used =
                  isHexPositive(usage.balanceWei) ||
                  isHexPositive(usage.txCount);
              } catch (err) {
                enrichmentError = toErrorMessage(
                  err,
                  "Could not fetch on-chain data.",
                );
                used = false;
              }
            }

            accounts.push({
              index,
              path,
              address,
              balanceWei,
              txCount,
              used,
              enrichmentError,
            });
          } catch (error) {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            cancelRef.current = null;
            setState({
              status: "error",
              message: toErrorMessage(error, "Failed to get address."),
            });
            return;
          }
        }

        setState({
          status: "completed",
          result: { chainId, accounts },
        });
      })();
    },
    [signer],
  );

  useEffect(() => {
    return () => {
      subscriptionRef.current?.unsubscribe();
      cancelRef.current?.();
    };
  }, []);

  return {
    state,
    sessionId,
    discoverAccounts,
    cancel,
  };
}
