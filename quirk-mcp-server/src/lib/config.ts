import path from "node:path";

export interface QuirkConfig {
  vaultPath: string;
  dailyFolder: string;
  dailyFormat: string;
  readOnly: boolean;
  maxFileBytes: number;
  excludedDirs: string[];
}

export function loadConfig(): QuirkConfig {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) {
    throw new Error(
      "OBSIDIAN_VAULT_PATH environment variable is required. Point it at your vault root.",
    );
  }

  const resolved = path.resolve(vaultPath);

  return {
    vaultPath: resolved,
    dailyFolder: process.env.QUIRK_DAILY_FOLDER ?? "Daily",
    dailyFormat: process.env.QUIRK_DAILY_FORMAT ?? "YYYY-MM-DD",
    readOnly: process.env.QUIRK_READ_ONLY === "true",
    maxFileBytes: Number(process.env.QUIRK_MAX_FILE_BYTES ?? 1_048_576),
    excludedDirs: [
      ".obsidian",
      ".trash",
      ".smart-connections",
      ".git",
      "node_modules",
    ],
  };
}
