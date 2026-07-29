import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { getRuntimeConfig } from "@/lib/runtime-config";

// Render per request so promoted images read their deployment environment.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quirk Systems",
  description: "A Quirk Systems project",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtimeConfig = getRuntimeConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers runtimeConfig={runtimeConfig}>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
