"use client";

import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  DeviceManagementKit,
  DeviceManagementKitBuilder,
} from "@ledgerhq/device-management-kit";
import { webBleTransportFactory } from "@ledgerhq/device-transport-kit-web-ble";
import { webHidTransportFactory } from "@ledgerhq/device-transport-kit-web-hid";

const DmkContext = createContext<DeviceManagementKit | null>(null);

export function DmkProvider({ children }: PropsWithChildren) {
  const dmk = useMemo(
    () =>
      new DeviceManagementKitBuilder()
        .addTransport(webHidTransportFactory)
        .addTransport(webBleTransportFactory)
        .build(),
    [],
  );

  useEffect(() => {
    return () => {
      dmk.close();
    };
  }, [dmk]);

  return <DmkContext.Provider value={dmk}>{children}</DmkContext.Provider>;
}

export function useDmk() {
  const value = useContext(DmkContext);
  if (!value) {
    throw new Error("useDmk must be used within DmkProvider");
  }
  return value;
}
