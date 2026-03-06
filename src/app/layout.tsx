import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SROI Calculator - Strive",
  description: "Social Return on Investment Calculator for Strive - Sustainable Tourism Initiative",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
