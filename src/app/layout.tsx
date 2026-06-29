import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Wordmark font for the RealBizCraft watermark only (italic 700 per the brand guidelines).
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  weight: ["700"],
  style: ["italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CEO Operating System",
    template: "%s | CEO OS",
  },
  description: "Business Operating System for Founders & CEOs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
