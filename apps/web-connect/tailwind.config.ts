import { ledgerLivePreset } from "@ledgerhq/lumen-design-core";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@ledgerhq/lumen-ui-react/dist/lib/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [ledgerLivePreset],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
