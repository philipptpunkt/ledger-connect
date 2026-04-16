import { useEffect } from 'react';
import { Box, Button, Text } from '@ledgerhq/lumen-ui-rnative';
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
    <Box
      lx={{
        flex: 1,
        paddingHorizontal: 's24',
        paddingVertical: 's24',
        justifyContent: 'center',
        gap: 's16',
      }}
    >
      {phase === 'connected' ? (
        <Box lx={{ gap: 's8' }}>
          <Text typography="heading4SemiBold">Continue on device</Text>
          <Text typography="body2" lx={{ color: 'muted' }}>
            Your Ledger is connected. We will continue to the signing flow
            automatically.
          </Text>
        </Box>
      ) : null}

      {phase === 'locked' ? (
        <Box lx={{ gap: 's8' }}>
          <Text typography="heading4SemiBold">Unlock your Ledger device</Text>
          <Text typography="body2" lx={{ color: 'muted' }}>
            Enter your PIN on the device and keep it connected.
          </Text>
        </Box>
      ) : null}

      {(phase === 'checking' || phase === 'connecting') && (
        <Box lx={{ gap: 's8' }}>
          <Text typography="body1">
            {phase === 'checking'
              ? 'Checking for an available Ledger device...'
              : 'Connecting to your Ledger device...'}
          </Text>
          <Text typography="body2" lx={{ color: 'muted' }}>
            Keep your Ledger nearby, connected by USB or Bluetooth, and
            unlocked.
          </Text>
        </Box>
      )}

      {phase === 'needsSelection' ? (
        <Box lx={{ gap: 's12' }}>
          <Text typography="heading4SemiBold">
            Connect your Ledger to continue
          </Text>
          <Text typography="body2" lx={{ color: 'muted' }}>
            No connected device was found yet.
          </Text>
          <Button
            appearance="accent"
            size="lg"
            isFull
            onPress={connectWithBluetooth}
          >
            Connect with Bluetooth
          </Button>
          <Button appearance="gray" size="lg" isFull onPress={connectWithUsb}>
            Connect with USB
          </Button>
        </Box>
      ) : null}

      {errorMessage ? (
        <Text typography="body2" lx={{ color: 'error' }}>
          {errorMessage}
        </Text>
      ) : null}
    </Box>
  );
}
