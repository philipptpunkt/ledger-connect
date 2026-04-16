"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@ledgerhq/lumen-ui-react";
import {
  buildCallbackUrl,
  buildSignatureHex,
  encodeReturnToSignRoute,
  parseStructuredFields,
} from "@ledgerhq/ledger-connect-core";
import { useRouter, useSearchParams } from "next/navigation";
import { DeviceStatus } from "@ledgerhq/device-management-kit";

import { useSignTransaction } from "@/hooks/useSignTransaction";
import { useDeviceSession } from "@/providers/DeviceSessionProvider";
import { useDmk } from "@/providers/DmkProvider";

const DEFAULT_DERIVATION_PATH = "44'/60'/0'/0/0";
const DISCONNECT_GRACE_MS = 1200;

function SignPageFallback() {
  return (
    <main className="bg-canvas text-base min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-480 items-center justify-center px-24 py-40 text-center">
        <p className="body-2 text-muted">Preparing the signing flow...</p>
      </div>
    </main>
  );
}

function SignPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dmk = useDmk();
  const { sessionId, setSessionId } = useDeviceSession();
  const { state, signTransaction, cancel } = useSignTransaction();

  const txParam = searchParams.get("tx") ?? "";
  const callbackParam = searchParams.get("callback");
  const initialPath = searchParams.get("path") ?? DEFAULT_DERIVATION_PATH;

  const structuredFields = useMemo(
    () => parseStructuredFields(searchParams),
    [searchParams],
  );

  const hasTransaction = !!(txParam || structuredFields);
  const [canSign, setCanSign] = useState(false);
  const [deviceHint, setDeviceHint] = useState<string | null>(null);
  const disconnectTimeoutRef = useRef<number | null>(null);

  const encodedReturnTo = useMemo(() => {
    return encodeReturnToSignRoute(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (sessionId) {
      return;
    }
    router.replace(`/connect?returnTo=${encodedReturnTo}`);
  }, [encodedReturnTo, router, sessionId]);

  useEffect(() => {
    if (state.status !== "completed" || !callbackParam) {
      return;
    }

    try {
      window.location.assign(buildCallbackUrl(callbackParam, state.signature));
    } catch {
      // Callback is optional and may be invalid. Keep the signature visible in UI.
    }
  }, [callbackParam, state]);

  useEffect(() => {
    if (!sessionId) {
      setCanSign(false);
      setDeviceHint("Connect and unlock your Ledger device to continue.");
      return;
    }

    const stateSub = dmk.getDeviceSessionState({ sessionId }).subscribe({
      next: (sessionState) => {
        switch (sessionState.deviceStatus) {
          case DeviceStatus.CONNECTED:
          case DeviceStatus.BUSY:
            if (disconnectTimeoutRef.current !== null) {
              window.clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            setCanSign(true);
            setDeviceHint(null);
            break;
          case DeviceStatus.LOCKED:
            if (disconnectTimeoutRef.current !== null) {
              window.clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            setCanSign(false);
            setDeviceHint(
              "Unlock your Ledger device with your PIN before starting the signing flow.",
            );
            break;
          case DeviceStatus.NOT_CONNECTED:
            setCanSign(false);
            if (disconnectTimeoutRef.current === null) {
              disconnectTimeoutRef.current = window.setTimeout(() => {
                setDeviceHint("Your Ledger device is no longer connected.");
                setSessionId(null);
                disconnectTimeoutRef.current = null;
              }, DISCONNECT_GRACE_MS);
            }
            break;
          default:
            break;
        }
      },
      error: (error) => {
        setCanSign(false);
        setDeviceHint(
          error instanceof Error
            ? error.message
            : "Could not read the Ledger device state.",
        );
      },
    });

    return () => {
      if (disconnectTimeoutRef.current !== null) {
        window.clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      stateSub.unsubscribe();
    };
  }, [dmk, sessionId, setSessionId]);

  const handleSign = () => {
    if (!canSign) {
      return;
    }

    if (structuredFields) {
      signTransaction({ derivationPath: initialPath, structuredFields });
    } else {
      signTransaction({ derivationPath: initialPath, transaction: txParam });
    }
  };

  return (
    <main className="bg-canvas text-base min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-480 flex-col justify-center gap-24 px-24 py-40">
        <h1 className="heading-3-semi-bold">Sign transaction</h1>

        {hasTransaction ? null : (
          <p className="body-2 text-error border-error bg-surface rounded-md border px-16 py-8">
            Missing transaction parameters. Provide either <code>tx</code> (hex)
            or structured fields (<code>to</code>, <code>value</code>,{" "}
            <code>data</code>, <code>gasLimit</code>, <code>chainId</code>).
          </p>
        )}

        <div className="bg-surface border-muted rounded-lg border p-16">
          <div className="flex flex-col gap-16">
            <p className="body-2 text-muted">
              Ledger Connect prepares the signing request and forwards the
              details to your Ledger device for review.
            </p>

            <div className="min-h-64">
              {deviceHint ? (
                <p className="body-2 text-warning border-warning bg-canvas rounded-md border px-16 py-8">
                  {deviceHint}
                </p>
              ) : null}
            </div>

            <div className="flex gap-12">
              <Button
                type="button"
                appearance="base"
                onClick={handleSign}
                disabled={!hasTransaction || !canSign}
                loading={state.status === "pending"}
              >
                Sign transaction
              </Button>
              <Button
                type="button"
                appearance="gray"
                onClick={cancel}
                disabled={state.status !== "pending"}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>

        {state.status === "pending" ? (
          <p className="body-2 text-warning border-warning bg-surface rounded-md border px-16 py-8">
            Preparing the request and waiting for confirmation on your Ledger
            device
            {state.step ? ` (${state.step})` : ""}
            {state.requiredUserInteraction
              ? ` - ${state.requiredUserInteraction}`
              : ""}
          </p>
        ) : null}

        {state.status === "completed" ? (
          <div className="bg-surface border-success rounded-md border px-16 py-12">
            <p className="body-2-semi-bold text-success">
              Transaction signed successfully.
            </p>
            <p className="body-3 mt-32 break-all">r: {state.signature.r}</p>
            <p className="body-3 break-all">s: {state.signature.s}</p>
            <p className="body-3 break-all">v: {state.signature.v}</p>
            <p className="body-3 mt-32 break-all">
              signature: {buildSignatureHex(state.signature)}
            </p>
          </div>
        ) : null}

        {state.status === "error" ? (
          <p className="body-2 text-error border-error bg-surface rounded-md border px-16 py-8">
            {state.message}
          </p>
        ) : null}
      </div>
    </main>
  );
}

export default function SignPage() {
  return (
    <Suspense fallback={<SignPageFallback />}>
      <SignPageContent />
    </Suspense>
  );
}
