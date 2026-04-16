import { PropsWithChildren } from 'react';
import {
  ThemeProvider as LumenThemeProvider,
  type SupportedLocale,
} from '@ledgerhq/lumen-ui-rnative';
import { ledgerLiveThemes as lumenThemes } from '@ledgerhq/lumen-design-core';
import { useColorScheme } from 'react-native';

export function StyleProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const locale: SupportedLocale = 'en';

  return (
    <LumenThemeProvider
      themes={lumenThemes}
      colorScheme={colorScheme}
      locale={locale}
    >
      {children}
    </LumenThemeProvider>
  );
}
