declare module '@ledgerhq/lumen-ui-rnative' {
  import { ComponentType, PropsWithChildren } from 'react';

  export type SupportedLocale = 'en';

  export const ThemeProvider: ComponentType<
    PropsWithChildren<{
      themes: unknown;
      colorScheme: 'light' | 'dark';
      locale: SupportedLocale;
    }>
  >;

  export const Box: ComponentType<Record<string, unknown>>;
  export const Text: ComponentType<Record<string, unknown>>;
  export const Button: ComponentType<Record<string, unknown>>;
}
