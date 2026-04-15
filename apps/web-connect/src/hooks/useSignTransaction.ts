"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ContextModule,
  ClearSignContextType,
  ContextModuleBuilder,
} from "@ledgerhq/context-module";
import { DeviceActionStatus } from "@ledgerhq/device-management-kit";
import { SignerEthBuilder } from "@ledgerhq/device-signer-kit-ethereum";
import { ethers } from "ethers";
import { type Subscription } from "rxjs";

import { useDeviceSession } from "@/providers/DeviceSessionProvider";
import { useDmk } from "@/providers/DmkProvider";

const DEFAULT_ORIGIN_TOKEN =
  "1e55ba3959f4543af24809d9066a2120bd2ac9246e626e26a1ff77eb109ca0e5";
const ORIGIN_TOKEN =
  process.env.NEXT_PUBLIC_GATING_TOKEN ?? DEFAULT_ORIGIN_TOKEN;
const APP_SOURCE = process.env.NEXT_PUBLIC_APP_SOURCE ?? "ledger-connect";

export type StructuredTransactionFields = {
  to: string;
  value: string;
  data?: string;
  gasLimit: string;
  chainId: number;
};

export type SignTransactionParams = {
  derivationPath: string;
  transaction?: string;
  structuredFields?: StructuredTransactionFields;
  skipOpenApp?: boolean;
};

export type SignTransactionState =
  | { status: "idle" }
  | {
      status: "pending";
      step?: string;
      requiredUserInteraction?: string;
    }
  | {
      status: "completed";
      signature: { r: string; s: string; v: number };
    }
  | {
      status: "error";
      message: string;
    };

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

function parseTransactionInput(transaction: string): Uint8Array {
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

function buildTransactionFromFields(
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

export function useSignTransaction() {
  const dmk = useDmk();
  const { sessionId } = useDeviceSession();
  const [state, setState] = useState<SignTransactionState>({ status: "idle" });
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

  const signTransaction = useCallback(
    ({
      derivationPath,
      transaction,
      structuredFields,
      skipOpenApp,
    }: SignTransactionParams) => {
      if (!signer) {
        setState({
          status: "error",
          message: "No connected Ledger session found.",
        });
        return;
      }

      try {
        const transactionBytes = structuredFields
          ? buildTransactionFromFields(structuredFields)
          : parseTransactionInput(transaction!);
        setState({ status: "pending" });

        subscriptionRef.current?.unsubscribe();
        cancelRef.current?.();

        const { observable, cancel: cancelDeviceAction } =
          signer.signTransaction(derivationPath, transactionBytes, {
            skipOpenApp,
          });
        cancelRef.current = cancelDeviceAction;

        subscriptionRef.current = observable.subscribe({
          next: (deviceActionState) => {
            switch (deviceActionState.status) {
              case DeviceActionStatus.Pending:
                setState({
                  status: "pending",
                  step: deviceActionState.intermediateValue?.step,
                  requiredUserInteraction:
                    deviceActionState.intermediateValue
                      ?.requiredUserInteraction,
                });
                break;
              case DeviceActionStatus.Completed:
                setState({
                  status: "completed",
                  signature: deviceActionState.output,
                });
                break;
              case DeviceActionStatus.Error:
                setState({
                  status: "error",
                  message: toErrorMessage(
                    deviceActionState.error,
                    "Failed to sign transaction.",
                  ),
                });
                break;
              case DeviceActionStatus.Stopped:
                setState({ status: "idle" });
                break;
              case DeviceActionStatus.NotStarted:
              default:
                setState({ status: "pending" });
            }
          },
          error: (error) => {
            setState({
              status: "error",
              message: toErrorMessage(error, "Failed to sign transaction."),
            });
          },
        });
      } catch (error) {
        setState({
          status: "error",
          message: toErrorMessage(error, "Invalid transaction format."),
        });
      }
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
    signTransaction,
    cancel,
  };
}
