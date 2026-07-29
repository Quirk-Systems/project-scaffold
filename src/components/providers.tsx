"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState } from "react";
import { PostHogProvider } from "@/components/posthog-provider";
import { RuntimeConfigProvider } from "@/components/runtime-config-provider";
import type { RuntimeConfig } from "@/lib/runtime-config";

export function Providers({
  children,
  runtimeConfig,
}: {
  children: React.ReactNode;
  runtimeConfig: RuntimeConfig;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <RuntimeConfigProvider config={runtimeConfig}>
      <QueryClientProvider client={queryClient}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>{children}</PostHogProvider>
        </NextThemesProvider>
      </QueryClientProvider>
    </RuntimeConfigProvider>
  );
}
