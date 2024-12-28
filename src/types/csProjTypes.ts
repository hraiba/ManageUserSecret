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

export interface CsProjOperation{
    parsedDocument: ProjectStructure,
    fullPath: string; 
    userSecretsId:  string;
}

export type SupportedPlatform = "win32" | "linux" | "darwin";
