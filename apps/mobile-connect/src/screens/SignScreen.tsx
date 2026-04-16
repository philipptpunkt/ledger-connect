import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { Box, Button, Text } from '@ledgerhq/lumen-ui-rnative';
import { DeviceStatus } from '@ledgerhq/device-management-kit';
import {
  buildCallbackUrl,
  buildSignatureHex,
  parseStructuredFields,
} from '@ledgerhq/ledger-connect-core';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useSignTransaction } from '@/hooks/useSignTransaction';
import { RootStackParamList } from '@/navigation/types';
import { useDeviceSession } from '@/providers/DeviceSessionProvider';
import { useDmk } from '@/providers/DmkProvider';

const DEFAULT_DERIVATION_PATH = "44'/60'/0'/0/0";
const DISCONNECT_GRACE_MS = 1200;

type Props = NativeStackScreenProps<RootStackParamList, 'Sign'>;

export function SignScreen({ navigation, route }: Props) {
  const dmk = useDmk();
  const { sessionId, setSessionId } = useDeviceSession();
  const { state, signTransaction, cancel } = useSignTransaction();

  const txParam = route.params?.tx ?? '';
  const callbackParam = route.params?.callback;
  const initialPath = route.params?.path ?? DEFAULT_DERIVATION_PATH;

  const structuredFields = useMemo(
    () =>
      parseStructuredFields({
        get: key => {
          const value = route.params?.[key as keyof typeof route.params];
          if (typeof value !== 'string') {
            return null;
          }
          return value;
        },
      }),
    [route.params],
  );

  const hasTransaction = !!(txParam || structuredFields);
  const [canSign, setCanSign] = useState(false);
  const [deviceHint, setDeviceHint] = useState<string | null>(null);
  const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (sessionId) {
      return;
    }
    navigation.replace('Connect', { returnTo: route.params ?? {} });
  }, [navigation, route.params, sessionId]);

  useEffect(() => {
    if (state.status !== 'completed' || !callbackParam) {
      return;
    }

    try {
      void Linking.openURL(buildCallbackUrl(callbackParam, state.signature));
    } catch {
      // Callback is optional and may be invalid. Keep the signature visible in UI.
    }
  }, [callbackParam, state]);

  useEffect(() => {
    if (!sessionId) {
      setCanSign(false);
      setDeviceHint('Connect and unlock your Ledger device to continue.');
      return;
    }

    const stateSub = dmk.getDeviceSessionState({ sessionId }).subscribe({
      next: sessionState => {
        switch (sessionState.deviceStatus) {
          case DeviceStatus.CONNECTED:
          case DeviceStatus.BUSY:
            if (disconnectTimeoutRef.current !== null) {
              clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            setCanSign(true);
            setDeviceHint(null);
            break;
          case DeviceStatus.LOCKED:
            if (disconnectTimeoutRef.current !== null) {
              clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            setCanSign(false);
            setDeviceHint(
              'Unlock your Ledger device with your PIN before starting the signing flow.',
            );
            break;
          case DeviceStatus.NOT_CONNECTED:
            setCanSign(false);
            if (disconnectTimeoutRef.current === null) {
              disconnectTimeoutRef.current = setTimeout(() => {
                setDeviceHint('Your Ledger device is no longer connected.');
                setSessionId(null);
                disconnectTimeoutRef.current = null;
              }, DISCONNECT_GRACE_MS);
            }
            break;
          default:
            break;
        }
      },
      error: error => {
        setCanSign(false);
        setDeviceHint(
          error instanceof Error
            ? error.message
            : 'Could not read the Ledger device state.',
        );
      },
    });

    return () => {
      if (disconnectTimeoutRef.current !== null) {
        clearTimeout(disconnectTimeoutRef.current);
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
    <Box
      lx={{
        flex: 1,
        justifyContent: 'center',
        gap: 's16',
        paddingHorizontal: 's24',
        paddingVertical: 's24',
      }}
    >
      <Text typography="heading4SemiBold">Sign transaction</Text>

      {hasTransaction ? null : (
        <Text typography="body2" lx={{ color: 'error' }}>
          Missing transaction parameters. Provide either tx or structured
          fields.
        </Text>
      )}

      <Text typography="body2" lx={{ color: 'muted' }}>
        Ledger Connect prepares the signing request and forwards the details to
        your Ledger device for review.
      </Text>

      {deviceHint ? (
        <Text typography="body2" lx={{ color: 'warning' }}>
          {deviceHint}
        </Text>
      ) : null}

      <Box lx={{ flexDirection: 'row', gap: 's8' }}>
        <Button
          appearance="accent"
          onPress={handleSign}
          disabled={!hasTransaction || !canSign}
          loading={state.status === 'pending'}
        >
          Sign transaction
        </Button>
        <Button
          appearance="gray"
          onPress={cancel}
          disabled={state.status !== 'pending'}
        >
          Cancel
        </Button>
      </Box>

      {state.status === 'pending' ? (
        <Text typography="body2" lx={{ color: 'warning' }}>
          Preparing the request and waiting for confirmation on your Ledger
          device
          {state.step ? ` (${state.step})` : ''}
          {state.requiredUserInteraction
            ? ` - ${state.requiredUserInteraction}`
            : ''}
        </Text>
      ) : null}

      {state.status === 'completed' ? (
        <Box lx={{ gap: 's4' }}>
          <Text typography="body2SemiBold" lx={{ color: 'success' }}>
            Transaction signed successfully.
          </Text>
          <Text typography="body3">r: {state.signature.r}</Text>
          <Text typography="body3">s: {state.signature.s}</Text>
          <Text typography="body3">v: {state.signature.v}</Text>
          <Text typography="body3">
            signature: {buildSignatureHex(state.signature)}
          </Text>
        </Box>
      ) : null}

      {state.status === 'error' ? (
        <Text typography="body2" lx={{ color: 'error' }}>
          {state.message}
        </Text>
      ) : null}
    </Box>
  );
}
