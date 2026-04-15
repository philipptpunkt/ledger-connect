"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";
import { type DeviceSessionId } from "@ledgerhq/device-management-kit";

type DeviceSessionContextValue = {
  sessionId: DeviceSessionId | null;
  setSessionId: (sessionId: DeviceSessionId | null) => void;
};

const DeviceSessionContext = createContext<DeviceSessionContextValue | null>(
  null,
);

export function DeviceSessionProvider({ children }: PropsWithChildren) {
  const [sessionId, setSessionId] = useState<DeviceSessionId | null>(null);

  const value = useMemo(
    () => ({
      sessionId,
      setSessionId,
    }),
    [sessionId],
  );

  return (
    <DeviceSessionContext.Provider value={value}>
      {children}
    </DeviceSessionContext.Provider>
  );
}

export function useDeviceSession() {
  const value = useContext(DeviceSessionContext);
  if (!value) {
    throw new Error(
      "useDeviceSession must be used within DeviceSessionProvider",
    );
  }
  return value;
}
