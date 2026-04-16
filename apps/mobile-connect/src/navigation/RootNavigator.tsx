import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { linking } from './linking';
import { RootStackParamList } from './types';
import { AccountsScreen } from '@/screens/AccountsScreen';
import { ConnectScreen } from '@/screens/ConnectScreen';
import { SignScreen } from '@/screens/SignScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Connect">
        <Stack.Screen
          name="Connect"
          component={ConnectScreen}
          options={{ title: 'Connect' }}
        />
        <Stack.Screen
          name="Sign"
          component={SignScreen}
          options={{ title: 'Sign transaction' }}
        />
        <Stack.Screen
          name="Accounts"
          component={AccountsScreen}
          options={{ title: 'Accounts' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
