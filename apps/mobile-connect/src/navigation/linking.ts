import type { LinkingOptions } from '@react-navigation/native';

import { RootStackParamList } from './types';

// Placeholder host until the final universal link domain is available.
const UNIVERSAL_LINK_HOST = 'connect-placeholder.ledger.com';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'ledger-connect://',
    `https://${UNIVERSAL_LINK_HOST}`,
    `http://${UNIVERSAL_LINK_HOST}`,
  ],
  config: {
    screens: {
      Connect: 'connect',
      Sign: 'sign',
      Accounts: 'accounts',
    },
  },
};
