import type { Metadata } from "next";
import { PropsWithChildren } from "react";

import { DmkProvider } from "@/providers/DmkProvider";
import { DeviceSessionProvider } from "@/providers/DeviceSessionProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Web Connect",
  description: "Ledger Connect web app",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preload"
          href="/fonts/Inter-ExtraLight-BETA.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Inter-Light-BETA.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Inter-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Inter-Medium.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Inter-SemiBold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Inter-ExtraBold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/HMAlphaMono-Medium.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-canvas text-base antialiased">
        <DmkProvider>
          <DeviceSessionProvider>{children}</DeviceSessionProvider>
        </DmkProvider>
      </body>
    </html>
  );
}
