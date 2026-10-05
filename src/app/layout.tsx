import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Takapay | Payment automation",
  description: "Payment automation for startups and small businesses in Bangladesh.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
