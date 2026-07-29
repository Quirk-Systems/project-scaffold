export type RuntimeKind = "local" | "ci" | "server" | "worker" | "edge";

export interface RuntimeProfile {
  id: `quirk://runtimes/${string}`;
  name: string;
  kind: RuntimeKind;
  status: "experimental" | "active" | "constrained";
  capabilities: string[];
  prohibitions: string[];
  limits: {
    timeoutMs: number;
    memoryMb: number;
    maxConcurrency: number;
  };
  authority: {
    network: "none" | "allowlist" | "open";
    filesystem: "none" | "read" | "read-write";
    secrets: "none" | "scoped";
  };
}

export interface RuntimeRequirement {
  capabilities?: string[];
  network?: RuntimeProfile["authority"]["network"];
  filesystem?: RuntimeProfile["authority"]["filesystem"];
  minimumMemoryMb?: number;
}

export function runtimeSupports(
  runtime: RuntimeProfile,
  requirement: RuntimeRequirement,
): boolean {
  const hasCapabilities = (requirement.capabilities ?? []).every((capability) =>
    runtime.capabilities.includes(capability),
  );
  const enoughMemory =
    runtime.limits.memoryMb >= (requirement.minimumMemoryMb ?? 0);
  const filesystemOrder = ["none", "read", "read-write"];
  const networkOrder = ["none", "allowlist", "open"];
  const enoughFilesystem =
    filesystemOrder.indexOf(runtime.authority.filesystem) >=
    filesystemOrder.indexOf(requirement.filesystem ?? "none");
  const enoughNetwork =
    networkOrder.indexOf(runtime.authority.network) >=
    networkOrder.indexOf(requirement.network ?? "none");

  return hasCapabilities && enoughMemory && enoughFilesystem && enoughNetwork;
}
