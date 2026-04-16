import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import {
  DeviceManagementKit,
  DeviceManagementKitBuilder,
} from '@ledgerhq/device-management-kit';
import { RNBleTransportFactory } from '@ledgerhq/device-transport-kit-react-native-ble';
import { RNHidTransportFactory } from '@ledgerhq/device-transport-kit-react-native-hid';

const DmkContext = createContext<DeviceManagementKit | null>(null);

export function DmkProvider({ children }: PropsWithChildren) {
  const dmk = useMemo(
    () =>
      new DeviceManagementKitBuilder()
        .addTransport(RNBleTransportFactory)
        .addTransport(RNHidTransportFactory)
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
    throw new Error('useDmk must be used within DmkProvider');
  }

  return value;
}
