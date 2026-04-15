/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@ledgerhq/context-module",
    "@ledgerhq/device-management-kit",
    "@ledgerhq/device-signer-kit-ethereum",
    "@ledgerhq/device-transport-kit-web-hid",
    "@ledgerhq/device-transport-kit-web-ble",
  ],
};

export default nextConfig;
