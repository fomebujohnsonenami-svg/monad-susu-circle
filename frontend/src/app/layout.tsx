import type { Metadata } from "next";
import { Syne, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ibmPlex = IBM_Plex_Mono({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Susu Circle · Monad",
  description: "Rotating savings circle dashboard on Monad Testnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${sourceSans.variable} ${ibmPlex.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
