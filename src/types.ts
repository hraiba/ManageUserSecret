export interface CsProjFileInfo {
  fullPath: string;
  fileName: string;
}

export interface ProjectStructure {
  Project: {
    PropertyGroup: PropertyGroup | PropertyGroup[];
  };
}

export interface PropertyGroup {
  UserSecretsId?: string[];
  [key: string]: unknown;
}

export interface SecretsPathConfig {
  basePath: string[];
  filename: string;
}
export type SupportedPlatform = "win32" | "linux" | "darwin";

export const SECRETS_CONFIG: Record<SupportedPlatform, SecretsPathConfig> = {
  win32: {
    basePath: ["AppData", "Roaming", "Microsoft", "UserSecrets"],
    filename: "secrets.json",
  },
  linux: {
    basePath: [".microsoft", "usersecrets"],
    filename: "secrets.json",
  },
  darwin: {
    basePath: [".microsoft", "usersecrets"],
    filename: "secrets.json",
  },
};
