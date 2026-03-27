import "@/styles/globals.css";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme-provider";
import { SWRegister } from "@/components/sw-register";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "Milo Dashboard",
  description: "Mobile-first dashboard PWA",
  manifest: "/manifest.webmanifest",
  themeColor: "#0f172a"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SWRegister />
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
