"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  buildAccountsCallbackUrl,
  encodeReturnToAccountsRoute,
  parseAccountsParams,
} from "@ledgerhq/ledger-connect-core";
import { useRouter, useSearchParams } from "next/navigation";
import { DeviceStatus } from "@ledgerhq/device-management-kit";

import { useAccountDiscovery } from "@/hooks/useAccountDiscovery";
import { useDeviceSession } from "@/providers/DeviceSessionProvider";
import { useDmk } from "@/providers/DmkProvider";

const DISCONNECT_GRACE_MS = 1200;

function AccountsPageFallback() {
  return (
    <main className="bg-canvas text-base min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-480 items-center justify-center px-24 py-40 text-center">
        <p className="body-2 text-muted">Preparing accounts...</p>
      </div>
    </main>
  );
}

function AccountsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dmk = useDmk();
  const { sessionId, setSessionId } = useDeviceSession();
  const { state, discoverAccounts } = useAccountDiscovery();

  const parsed = useMemo(
    () => parseAccountsParams(searchParams),
    [searchParams],
  );

  const encodedReturnTo = useMemo(
    () => encodeReturnToAccountsRoute(searchParams),
    [searchParams],
  );

  const [canDiscover, setCanDiscover] = useState(false);
  const [deviceHint, setDeviceHint] = useState<string | null>(null);
  const hasAutoStartedRef = useRef(false);
  const disconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionId) {
      return;
    }
    router.replace(`/connect?returnTo=${encodedReturnTo}`);
  }, [encodedReturnTo, router, sessionId]);

  useEffect(() => {
    if (state.status !== "completed" || !parsed?.callback) {
      return;
    }

    try {
      window.location.assign(
        buildAccountsCallbackUrl(parsed.callback, state.result),
      );
    } catch {
      // Keep result visible in UI
    }
  }, [parsed?.callback, state]);

  useEffect(() => {
    hasAutoStartedRef.current = false;
  }, [encodedReturnTo, sessionId]);

  useEffect(() => {
    if (!parsed || !canDiscover || state.status !== "idle") {
      return;
    }

    if (hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;
    discoverAccounts({
      chainId: parsed.chainId,
      count: parsed.count ?? 5,
      startIndex: parsed.startIndex ?? 0,
      rpcUrl: parsed.rpcUrl,
    });
  }, [canDiscover, discoverAccounts, parsed, state.status]);

  useEffect(() => {
    if (!sessionId) {
      setCanDiscover(false);
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
            setCanDiscover(true);
            setDeviceHint(null);
            break;
          case DeviceStatus.LOCKED:
            if (disconnectTimeoutRef.current !== null) {
              window.clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            setCanDiscover(false);
            setDeviceHint(
              "Unlock your Ledger device with your PIN before discovering accounts.",
            );
            break;
          case DeviceStatus.NOT_CONNECTED:
            setCanDiscover(false);
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
        setCanDiscover(false);
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

  if (!parsed) {
    return (
      <main className="bg-canvas text-base min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-480 flex-col justify-center gap-24 px-24 py-40">
          <h1 className="heading-3-semi-bold">Accounts</h1>
          <p className="body-2 text-error border-error bg-surface rounded-md border px-16 py-8">
            Missing required query parameter <code>chainId</code>. Example:{" "}
            <code>/?chainId=1&amp;count=5</code>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-canvas text-base min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-480 flex-col justify-center gap-24 px-24 py-40">
        <h1 className="heading-3-semi-bold">Accounts</h1>

        <p className="body-2 text-muted">
          Derive EVM addresses from your Ledger for chain{" "}
          <code>{parsed.chainId}</code> (paths{" "}
          <code>44&apos;/60&apos;/0&apos;/0/{parsed.startIndex ?? 0}</code> →{" "}
          <code>
            44&apos;/60&apos;/0&apos;/0/
            {(parsed.startIndex ?? 0) + (parsed.count ?? 5) - 1}
          </code>
          ). Optional <code>rpcUrl</code> enriches with balance and transaction
          count.
        </p>

        <div className="bg-surface border-muted rounded-lg border p-16">
          <div className="flex flex-col gap-16">
            <div className="min-h-64">
              {deviceHint ? (
                <p className="body-2 text-warning border-warning bg-canvas rounded-md border px-16 py-8">
                  {deviceHint}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {state.status === "pending" ? (
          <p className="body-2 text-warning border-warning bg-surface rounded-md border px-16 py-8">
            {state.step ?? "Working..."}
          </p>
        ) : null}

        {state.status === "completed" ? (
          <div className="bg-surface border-success rounded-md border px-16 py-12">
            <p className="body-2-semi-bold text-success mb-16">
              Discovery complete.
            </p>
            <ul className="flex flex-col gap-12">
              {state.result.accounts.map((a) => (
                <li
                  key={`${a.path}-${a.address}`}
                  className="body-3 border-muted rounded border p-12 break-all"
                >
                  <div>
                    <span className="text-muted">#{a.index}</span>{" "}
                    <span className="text-success">
                      {a.used ? "used" : "empty"}
                    </span>
                  </div>
                  <div className="mt-8">{a.address}</div>
                  <div className="mt-8 text-muted">{a.path}</div>
                  {a.balanceWei !== undefined ? (
                    <div className="mt-8">balance: {a.balanceWei}</div>
                  ) : null}
                  {a.txCount !== undefined ? (
                    <div className="mt-8">txCount: {a.txCount}</div>
                  ) : null}
                  {a.enrichmentError ? (
                    <div className="mt-8 text-error">{a.enrichmentError}</div>
                  ) : null}
                </li>
              ))}
            </ul>
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

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsPageFallback />}>
      <AccountsPageContent />
    </Suspense>
  );
}
