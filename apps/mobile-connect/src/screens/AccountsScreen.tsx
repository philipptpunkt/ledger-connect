import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DeviceStatus } from '@ledgerhq/device-management-kit';
import {
  buildAccountsCallbackUrl,
  parseAccountsParams,
} from '@ledgerhq/ledger-connect-core';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAccountDiscovery } from '@/hooks/useAccountDiscovery';
import { RootStackParamList } from '@/navigation/types';
import { useDeviceSession } from '@/providers/DeviceSessionProvider';
import { useDmk } from '@/providers/DmkProvider';

const DISCONNECT_GRACE_MS = 1200;

type Props = NativeStackScreenProps<RootStackParamList, 'Accounts'>;

export function AccountsScreen({ navigation, route }: Props) {
  const dmk = useDmk();
  const { sessionId, setSessionId } = useDeviceSession();
  const { state, discoverAccounts } = useAccountDiscovery();

  const parsed = useMemo(
    () =>
      parseAccountsParams({
        get: name => {
          const value = route.params?.[name as keyof typeof route.params];
          if (typeof value !== 'string') {
            return null;
          }
          return value;
        },
      }),
    [route.params],
  );

  const callbackParam = route.params?.callback;

  const [canDiscover, setCanDiscover] = useState(false);
  const [deviceHint, setDeviceHint] = useState<string | null>(null);
  const hasAutoStartedRef = useRef(false);
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
      void Linking.openURL(
        buildAccountsCallbackUrl(callbackParam, state.result),
      );
    } catch {
      // Keep result visible
    }
  }, [callbackParam, state]);

  useEffect(() => {
    hasAutoStartedRef.current = false;
  }, [route.params, sessionId]);

  useEffect(() => {
    if (!parsed || !canDiscover || state.status !== 'idle') {
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
            setCanDiscover(true);
            setDeviceHint(null);
            break;
          case DeviceStatus.LOCKED:
            if (disconnectTimeoutRef.current !== null) {
              clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            setCanDiscover(false);
            setDeviceHint(
              'Unlock your Ledger device with your PIN before discovering accounts.',
            );
            break;
          case DeviceStatus.NOT_CONNECTED:
            setCanDiscover(false);
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
        setCanDiscover(false);
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

  if (!parsed) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Accounts</Text>
        <Text style={styles.errorText}>
          Invalid chainId. Use a non-negative integer, for example:
          ledger-connect://accounts?chainId=1
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Accounts</Text>
      <Text style={styles.bodyMuted}>
        Chain {parsed.chainId} — paths 44&apos;/60&apos;/0&apos;/0/
        {parsed.startIndex ?? 0} …{' '}
        {(parsed.startIndex ?? 0) + (parsed.count ?? 5) - 1}
      </Text>

      {deviceHint ? <Text style={styles.warningText}>{deviceHint}</Text> : null}

      {state.status === 'pending' ? (
        <Text style={styles.warningText}>{state.step ?? 'Working...'}</Text>
      ) : null}

      {state.status === 'completed' ? (
        <View style={styles.resultCard}>
          <Text style={styles.successText}>Discovery complete</Text>
          {state.result.accounts.map(a => (
            <View key={`${a.path}-${a.address}`} style={styles.accountRow}>
              <Text style={styles.codeText}>
                #{a.index} {a.used ? 'used' : 'empty'}
              </Text>
              <Text style={styles.codeText}>{a.address}</Text>
              <Text style={styles.codeMuted}>{a.path}</Text>
              {a.balanceWei !== undefined ? (
                <Text style={styles.codeMuted}>bal: {a.balanceWei}</Text>
              ) : null}
              {a.txCount !== undefined ? (
                <Text style={styles.codeMuted}>tx: {a.txCount}</Text>
              ) : null}
              {a.enrichmentError ? (
                <Text style={styles.errorText}>{a.enrichmentError}</Text>
              ) : null}
            </View>
          ))}
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
    fontSize: 14,
    lineHeight: 20,
  },
  warningText: {
    color: '#8a5a00',
    fontSize: 15,
  },
  successText: {
    color: '#1b5e20',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 15,
  },
  resultCard: {
    gap: 12,
    borderRadius: 12,
    backgroundColor: '#f6f8f6',
    padding: 16,
  },
  accountRow: {
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  codeText: {
    color: '#222222',
    fontSize: 13,
  },
  codeMuted: {
    color: '#666666',
    fontSize: 12,
  },
});
