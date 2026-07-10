import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Epilogue } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const epilogue = Epilogue({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Daily Tracker — A quiet record of staying",
  description:
    "A beautiful archival daily tracker. Color-code every day, journal margin notes, and watch your streak grow.",
  keywords: [
    "nofap",
    "tracker",
    "streak",
    "habit",
    "journal",
    "self-improvement",
  ],
  authors: [{ name: "The Daily Tracker" }],
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%23181716'/%3E%3Ccircle cx='50' cy='50' r='28' fill='none' stroke='%23EAE6DF' stroke-width='4'/%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#181716",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${instrumentSerif.variable} ${epilogue.variable} antialiased bg-paper text-ink min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
