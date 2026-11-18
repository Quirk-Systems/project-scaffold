import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quirk Starter",
  description: "A little room for a good idea.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
