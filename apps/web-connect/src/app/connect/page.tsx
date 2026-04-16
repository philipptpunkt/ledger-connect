"use client";

import { Suspense, useEffect } from "react";
import { Button } from "@ledgerhq/lumen-ui-react";
import { isSafeInternalRoute } from "@ledgerhq/ledger-connect-core";
import { useRouter, useSearchParams } from "next/navigation";

import { useConnectionCheck } from "@/hooks/useConnectionCheck";

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    phase,
    sessionId,
    errorMessage,
    connectWithBluetooth,
    connectWithUsb,
  } = useConnectionCheck();
  const returnTo = searchParams.get("returnTo");

  useEffect(() => {
    if (phase !== "connected" || !sessionId || !returnTo) {
      return;
    }

    if (isSafeInternalRoute(returnTo)) {
      router.push(returnTo);
    }
  }, [phase, returnTo, router, sessionId]);

  return (
    <main className="bg-canvas text-base min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-560 flex-col items-center justify-center gap-24 px-24 text-center">
        {phase === "connected" ? (
          <div className="flex flex-col gap-8">
            <p className="heading-3-semi-bold">Continue on device</p>
            <p className="body-2 text-muted">
              Your Ledger is connected. We&apos;ll continue automatically.
            </p>
          </div>
        ) : null}

        {phase === "locked" ? (
          <div className="flex flex-col gap-8">
            <p className="heading-3-semi-bold">Unlock your Ledger device</p>
            <p className="body-2 text-muted">
              Enter your PIN on the device and keep it connected. Once it is
              unlocked, Ledger Connect will continue automatically.
            </p>
          </div>
        ) : null}

        {(phase === "checking" || phase === "connecting") && (
          <div className="flex flex-col gap-8">
            <p className="body-1 text-base">
              {phase === "checking"
                ? "Checking for an available Ledger device..."
                : "Connecting to your Ledger device..."}
            </p>
            <p className="body-2 text-muted">
              Keep your Ledger nearby, connected by USB or Bluetooth, and
              unlocked.
            </p>
          </div>
        )}

        {phase === "needsSelection" ? (
          <div className="flex w-full max-w-400 flex-col gap-16">
            <div className="flex flex-col gap-8">
              <p className="heading-3-semi-bold">
                Connect your Ledger to continue
              </p>
              <p className="body-2 text-muted">
                No connected device was found yet. Plug in your Ledger with USB
                or use Bluetooth, then unlock it and select a connection method
                below.
              </p>
            </div>
            <Button
              type="button"
              appearance="base"
              size="lg"
              isFull
              onClick={connectWithBluetooth}
            >
              Connect with Bluetooth
            </Button>
            <Button
              type="button"
              appearance="gray"
              size="lg"
              isFull
              onClick={connectWithUsb}
            >
              Connect with USB
            </Button>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="body-2 text-error border-error bg-surface rounded-md border px-16 py-8">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-canvas text-base min-h-screen">
          <div className="mx-auto flex min-h-screen w-full max-w-560 items-center justify-center px-24 text-center">
            <p className="body-2 text-muted">
              Preparing the connection flow...
            </p>
          </div>
        </main>
      }
    >
      <ConnectPageContent />
    </Suspense>
  );
}
