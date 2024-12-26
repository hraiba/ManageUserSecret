import * as path from "path";
import { parseStringPromise, Builder } from "xml2js";
import * as os from "os";
import * as vscode from "vscode";
import {
  CsProjFileInfo,
  ProjectStructure,
  SECRETS_CONFIG,
  SupportedPlatform,
} from "./types";

export const getAllFilesWithExtension = async (
  dir: string,
  extension: string
): Promise<CsProjFileInfo[]> => {
  const results: CsProjFileInfo[] = [];
  try {
    const direUri = vscode.Uri.file(dir);
    const entries = await vscode.workspace.fs.readDirectory(direUri);
    const tasks = entries.map(async ([name, type]) => {
      const fullPath = path.join(dir, name);
      const fileInfo = { fullPath: fullPath, fileName: name };
      if (type === vscode.FileType.Directory) {
        const subResults = await getAllFilesWithExtension(fullPath, extension);
        results.push(...subResults);
      } else if (type === vscode.FileType.File && name.endsWith(extension)) {
        results.push(fileInfo);
      }
    });
    await Promise.all(tasks);
    return results;
  } catch (err) {
    throw err;
  }
};

export const parseDocument = async (
  path: string
): Promise<ProjectStructure> => {
  try {
    const uri = vscode.Uri.file(path);
    const fileContent = await vscode.workspace.fs.readFile(uri);
    const parsedContent = await parseStringPromise(
      new TextDecoder().decode(fileContent)
    );
    if (!isValidProjectStructure(parsedContent)) {
      throw new Error("Invalid project file structure");
    }
    return parsedContent;
  } catch (error: any) {
    throw new Error(`Failed to parse project file: ${error.message}`);
  }
};

export const getUserSecretsId = async (
  parsedDocument: ProjectStructure
): Promise<string | undefined> => {
  try {
    if (!isValidProjectStructure(parsedDocument)) {
      throw new Error("Invalid project file structure");
    }
    const propertyGroup = Array.isArray(parsedDocument.Project.PropertyGroup)
      ? parsedDocument.Project.PropertyGroup[0]
      : parsedDocument.Project.PropertyGroup;
    return propertyGroup.UserSecretsId?.[0];
  } catch (error: any) {
    throw new Error(`Failed to get UserSecretsId: ${error.message}`);
  }
};

export const insertUserSecretsId = async (
  path: string,
  parsedDocument: ProjectStructure,
  userSecretsId: string
): Promise<string> => {
  try {
    if (!isValidProjectStructure(parsedDocument)) {
      throw new Error("Invalid project file structure");
    }
    const propertyGroup = Array.isArray(parsedDocument.Project.PropertyGroup)
      ? parsedDocument.Project.PropertyGroup[0]
      : parsedDocument.Project.PropertyGroup;

    propertyGroup.UserSecretsId = [userSecretsId];
    const builder = new Builder();
    const updatedDocument = builder.buildObject(parsedDocument);
    const uri = vscode.Uri.file(path);
    await vscode.workspace.fs.writeFile(
      uri,
      new TextEncoder().encode(updatedDocument)
    );
    return updatedDocument;
  } catch (error: any) {
    throw new Error(`Failed to insert UserSecretsId: ${error.message}`);
  }
};

export const getUserSecretsFilePath = async (
  userSecretsId: string | undefined
): Promise<string | undefined> => {
  try {
    if (!userSecretsId) {
      return undefined;
    }

    const platform = os.platform() as SupportedPlatform;
    const config = SECRETS_CONFIG[platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    return path.join(
      os.homedir(),
      ...config.basePath,
      userSecretsId,
      config.filename
    );
  } catch (error: any) {
    console.error(`Failed to get secrets file path: ${error.message}`);
    return undefined;
  }
};

export const ensureUserSecretFile = async (
  filePath: string
): Promise<string> => {
  try {
    const uri = vscode.Uri.file(filePath);
    try {
      await vscode.workspace.fs.stat(uri);
    } catch (error) {
      const content = new TextEncoder().encode("{\n}");
      await vscode.workspace.fs.writeFile(uri, content);
    }

    const fileContent = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(fileContent);
  } catch (error: any) {
    throw new Error(`Failed to ensure secret file: ${error.message}`);
  }
};
const isValidProjectStructure = (doc: any): doc is ProjectStructure => {
  return (
    doc?.Project?.PropertyGroup &&
    (Array.isArray(doc.Project.PropertyGroup) ||
      typeof doc.Project.PropertyGroup === "object")
  );
};
