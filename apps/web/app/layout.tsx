import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import ThemeProvider from "@/components/ThemeProvider";
import QueryProvider from "@/components/QueryProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import ToastContainer from "@/components/Toast";
import { CrewProvider } from "@/lib/crew-store";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Flarepath — AI Fire Dispatch",
  description:
    "Real-time fire emergency dispatch platform with AI triage, shortest-path routing, and in-browser turn-by-turn navigation.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff2d2d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "#08080c", color: "#e8e8ec" }}
      >
        <ThemeProvider>
          <QueryProvider>
            <CrewProvider>
              {children}
            </CrewProvider>
          </QueryProvider>
          <ServiceWorkerRegister />
          <InstallPrompt />
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
