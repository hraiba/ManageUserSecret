import * as vscode from "vscode";

export interface CsProject {
  uri: vscode.Uri;
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
    uri: vscode.Uri, 
    userSecretsId:  string;
}

export type SupportedPlatform = "win32" | "linux" | "darwin";
