import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation/RootNavigator';
import { DeviceSessionProvider } from '@/providers/DeviceSessionProvider';
import { DmkProvider } from '@/providers/DmkProvider';
import { StyleProvider } from '@/providers/StyleProvider';

export default function App() {
  const isDarkMode = useColorScheme() !== 'light';

  return (
    <SafeAreaProvider>
      <StyleProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <DmkProvider>
          <DeviceSessionProvider>
            <RootNavigator />
          </DeviceSessionProvider>
        </DmkProvider>
      </StyleProvider>
    </SafeAreaProvider>
  );
}
