"use client";

import { createContext, useContext } from "react";
import type { RuntimeConfig } from "@/lib/runtime-config";

const RuntimeConfigContext = createContext<RuntimeConfig>({});

export function RuntimeConfigProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: RuntimeConfig;
}) {
  return (
    <RuntimeConfigContext.Provider value={config}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig() {
  return useContext(RuntimeConfigContext);
}
