import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invite Studio",
  description: "Programmatic animated invitation card renderer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
