import { SecretsPathConfig, SupportedPlatform } from "./types";

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
