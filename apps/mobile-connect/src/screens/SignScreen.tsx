import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
const MAX_DISCONNECT_RETRIES = 2;

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
  const disconnectRetryCountRef = useRef(0);

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
            disconnectRetryCountRef.current = 0;
            setCanSign(true);
            setDeviceHint(null);
            break;
          case DeviceStatus.LOCKED:
            if (disconnectTimeoutRef.current !== null) {
              clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            disconnectRetryCountRef.current = 0;
            setCanSign(false);
            setDeviceHint(
              'Unlock your Ledger device with your PIN before starting the signing flow.',
            );
            break;
          case DeviceStatus.NOT_CONNECTED:
            setCanSign(false);
            if (disconnectTimeoutRef.current === null) {
              disconnectTimeoutRef.current = setTimeout(() => {
                disconnectTimeoutRef.current = null;
                disconnectRetryCountRef.current += 1;

                if (disconnectRetryCountRef.current > MAX_DISCONNECT_RETRIES) {
                  setDeviceHint('Your Ledger device is no longer connected.');
                  cancel();
                  setSessionId(null);
                  return;
                }

                setDeviceHint(
                  `Connection lost. Waiting for your Ledger to reconnect (${disconnectRetryCountRef.current}/${MAX_DISCONNECT_RETRIES}).`,
                );
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
  }, [cancel, dmk, sessionId, setSessionId]);

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sign transaction</Text>

      {hasTransaction ? null : (
        <Text style={styles.errorText}>
          Missing transaction parameters. Provide either tx or structured
          fields.
        </Text>
      )}

      <Text style={styles.bodyMuted}>
        Ledger Connect prepares the signing request and forwards the details to
        your Ledger device for review.
      </Text>

      {deviceHint ? <Text style={styles.warningText}>{deviceHint}</Text> : null}

      <View style={styles.buttonRow}>
        <Pressable
          style={[
            styles.button,
            styles.primaryButton,
            (!hasTransaction || !canSign || state.status === 'pending') &&
              styles.buttonDisabled,
          ]}
          onPress={handleSign}
          disabled={!hasTransaction || !canSign || state.status === 'pending'}
        >
          <Text style={styles.primaryButtonText}>
            {state.status === 'pending' ? 'Signing...' : 'Sign transaction'}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.button,
            styles.secondaryButton,
            state.status !== 'pending' && styles.buttonDisabled,
          ]}
          onPress={cancel}
          disabled={state.status !== 'pending'}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>

      {state.status === 'pending' ? (
        <Text style={styles.warningText}>
          Preparing the request and waiting for confirmation on your Ledger
          device
          {state.step ? ` (${state.step})` : ''}
          {state.requiredUserInteraction
            ? ` - ${state.requiredUserInteraction}`
            : ''}
        </Text>
      ) : null}

      {state.status === 'completed' ? (
        <View style={styles.resultCard}>
          <Text style={styles.successText}>
            Transaction signed successfully.
          </Text>
          <Text style={styles.codeText}>r: {state.signature.r}</Text>
          <Text style={styles.codeText}>s: {state.signature.s}</Text>
          <Text style={styles.codeText}>v: {state.signature.v}</Text>
          <Text style={styles.codeText}>
            signature: {buildSignatureHex(state.signature)}
          </Text>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <Text style={styles.errorText}>{state.message}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '700',
  },
  bodyMuted: {
    color: '#666666',
    fontSize: 16,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#111111',
  },
  secondaryButton: {
    backgroundColor: '#f1f1f1',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    color: '#8a5a00',
    fontSize: 15,
    lineHeight: 21,
  },
  successText: {
    color: '#1b5e20',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#c62828',
    fontSize: 15,
    lineHeight: 21,
  },
  resultCard: {
    gap: 6,
    borderRadius: 12,
    backgroundColor: '#f6f8f6',
    padding: 16,
  },
  codeText: {
    color: '#222222',
    fontSize: 13,
  },
});
