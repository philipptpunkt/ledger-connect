import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type DeviceSessionId,
  DeviceStatus,
  type DiscoveredDevice,
} from '@ledgerhq/device-management-kit';
import { rnBleTransportIdentifier } from '@ledgerhq/device-transport-kit-react-native-ble';
import { rnHidTransportIdentifier } from '@ledgerhq/device-transport-kit-react-native-hid';
import { type ConnectionPhase } from '@ledgerhq/ledger-connect-core';
import { type Subscription } from 'rxjs';

import { useDeviceSession } from '@/providers/DeviceSessionProvider';
import { useDmk } from '@/providers/DmkProvider';

type TransportChoice = 'usb' | 'bluetooth';

type UseConnectionCheckResult = {
  phase: ConnectionPhase;
  sessionId: DeviceSessionId | null;
  errorMessage: string | null;
  connectWithUsb: () => void;
  connectWithBluetooth: () => void;
};

const AUTO_CHECK_TIMEOUT_MS = 1500;

export function useConnectionCheck(): UseConnectionCheckResult {
  const dmk = useDmk();
  const { sessionId, setSessionId } = useDeviceSession();
  const [phase, setPhase] = useState<ConnectionPhase>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isConnectingRef = useRef(false);
  const discoverySubRef = useRef<Subscription | null>(null);
  const availableDevicesSubRef = useRef<Subscription | null>(null);

  const clearDiscovery = useCallback(() => {
    discoverySubRef.current?.unsubscribe();
    discoverySubRef.current = null;
  }, []);

  const connectToDevice = useCallback(
    async (device: DiscoveredDevice) => {
      if (isConnectingRef.current || sessionId) {
        return;
      }

      isConnectingRef.current = true;
      setErrorMessage(null);
      setPhase('connecting');

      try {
        const nextSessionId = await dmk.connect({ device });
        setSessionId(nextSessionId);
      } catch (error) {
        setPhase('needsSelection');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not connect to device.',
        );
      } finally {
        isConnectingRef.current = false;
      }
    },
    [dmk, sessionId, setSessionId],
  );

  const connectWithTransport = useCallback(
    (choice: TransportChoice) => {
      clearDiscovery();
      setErrorMessage(null);
      setPhase('connecting');

      const transport =
        choice === 'usb' ? rnHidTransportIdentifier : rnBleTransportIdentifier;

      discoverySubRef.current = dmk.startDiscovering({ transport }).subscribe({
        next: device => {
          clearDiscovery();
          void connectToDevice(device);
        },
        error: error => {
          setPhase('needsSelection');
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Device discovery failed. Try again.',
          );
        },
      });
    },
    [clearDiscovery, connectToDevice, dmk],
  );

  useEffect(() => {
    if (sessionId) {
      return;
    }

    let hasDiscoveredDevice = false;
    const timeoutId = setTimeout(() => {
      if (!hasDiscoveredDevice && !isConnectingRef.current) {
        setPhase('needsSelection');
      }
    }, AUTO_CHECK_TIMEOUT_MS);

    availableDevicesSubRef.current = dmk
      .listenToAvailableDevices({})
      .subscribe({
        next: devices => {
          if (
            !devices.length ||
            hasDiscoveredDevice ||
            isConnectingRef.current
          ) {
            return;
          }

          hasDiscoveredDevice = true;
          clearTimeout(timeoutId);
          void connectToDevice(devices[0]);
        },
        error: () => {
          setPhase('needsSelection');
        },
      });

    return () => {
      clearTimeout(timeoutId);
      availableDevicesSubRef.current?.unsubscribe();
      availableDevicesSubRef.current = null;
    };
  }, [connectToDevice, dmk, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const stateSub = dmk.getDeviceSessionState({ sessionId }).subscribe({
      next: state => {
        switch (state.deviceStatus) {
          case DeviceStatus.LOCKED:
            setPhase('locked');
            break;
          case DeviceStatus.CONNECTED:
          case DeviceStatus.BUSY:
            setPhase('connected');
            break;
          case DeviceStatus.NOT_CONNECTED:
            setSessionId(null);
            setPhase('needsSelection');
            break;
          default:
            setPhase('connecting');
        }
      },
      error: error => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not read device session state.',
        );
      },
    });

    return () => {
      stateSub.unsubscribe();
    };
  }, [dmk, sessionId, setSessionId]);

  useEffect(() => {
    return () => {
      clearDiscovery();
      availableDevicesSubRef.current?.unsubscribe();
      availableDevicesSubRef.current = null;
    };
  }, [clearDiscovery]);

  return {
    phase,
    sessionId,
    errorMessage,
    connectWithUsb: () => connectWithTransport('usb'),
    connectWithBluetooth: () => connectWithTransport('bluetooth'),
  };
}
