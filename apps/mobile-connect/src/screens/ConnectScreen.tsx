import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useConnectionCheck } from '@/hooks/useConnectionCheck';
import { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Connect'>;

export function ConnectScreen({ navigation, route }: Props) {
  const {
    phase,
    sessionId,
    errorMessage,
    connectWithBluetooth,
    connectWithUsb,
  } = useConnectionCheck();

  useEffect(() => {
    if (phase !== 'connected' || !sessionId || !route.params?.returnTo) {
      return;
    }

    navigation.replace('Sign', route.params.returnTo);
  }, [navigation, phase, route.params?.returnTo, sessionId]);

  return (
    <View style={styles.container}>
      {phase === 'connected' ? (
        <View style={styles.group}>
          <Text style={styles.title}>Continue on device</Text>
          <Text style={styles.bodyMuted}>
            Your Ledger is connected. We will continue to the signing flow
            automatically.
          </Text>
        </View>
      ) : null}

      {phase === 'locked' ? (
        <View style={styles.group}>
          <Text style={styles.title}>Unlock your Ledger device</Text>
          <Text style={styles.bodyMuted}>
            Enter your PIN on the device and keep it connected.
          </Text>
        </View>
      ) : null}

      {(phase === 'checking' || phase === 'connecting') && (
        <View style={styles.group}>
          <Text style={styles.body}>
            {phase === 'checking'
              ? 'Checking for an available Ledger device...'
              : 'Connecting to your Ledger device...'}
          </Text>
          <Text style={styles.bodyMuted}>
            Keep your Ledger nearby, connected by USB or Bluetooth, and
            unlocked.
          </Text>
        </View>
      )}

      {phase === 'needsSelection' ? (
        <View style={styles.group}>
          <Text style={styles.title}>Connect your Ledger to continue</Text>
          <Text style={styles.bodyMuted}>
            No connected device was found yet.
          </Text>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={connectWithBluetooth}
          >
            <Text style={styles.primaryButtonText}>Connect with Bluetooth</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={connectWithUsb}
          >
            <Text style={styles.secondaryButtonText}>Connect with USB</Text>
          </Pressable>
        </View>
      ) : null}

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
    backgroundColor: '#ffffff',
  },
  group: {
    gap: 8,
  },
  title: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    color: '#111111',
    fontSize: 17,
  },
  bodyMuted: {
    color: '#666666',
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
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
  errorText: {
    color: '#c62828',
    fontSize: 15,
  },
});
