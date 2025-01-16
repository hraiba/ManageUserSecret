import * as path from "path";
import { parseStringPromise, Builder } from "xml2js";
import * as os from "os";
import * as vscode from "vscode";
import {
  CsProject,
  ProjectStructure,
  SupportedPlatform,
} from "./types/csProjTypes";
import { SECRETS_CONFIG } from "./config";

export const getAllFilesWithExtension = async (extension: string,)
  : Promise<CsProject[]> => {
  const files = await vscode.workspace.findFiles(
    `**/*${extension}`, 
    '{**/node_modules/**, **/bin/**, **/obj/**, **/Properties/**}');
  const result = files.map(f => {
    return{
      uri:f,
      fileName: path.basename(f.fsPath),
    };
  }); 
  return result;
}; 

export const parseDocument = async (
  uri:vscode.Uri
): Promise<ProjectStructure> => {
  try {
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
  uri: vscode.Uri,
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
): Promise<vscode.Uri | undefined> => {
  try {
    if (!userSecretsId) {
      return undefined;
    }

    const platform = os.platform() as SupportedPlatform;
    const config = SECRETS_CONFIG[platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const p =  path.join(
      os.homedir(),
      ...config.basePath,
      userSecretsId,
      config.filename
    );
    return vscode.Uri.file(p);
  } catch (error: any) {
    console.error(`Failed to get secrets file path: ${error.message}`);
    return undefined;
  }
};

export const ensureUserSecretFile = async (
  uri: vscode.Uri
): Promise<string> => {
  try {
    try {
      await vscode.workspace.fs.stat(uri);
    } catch (error) {
      const content = new TextEncoder().encode("{\n}");
      await vscode.workspace.fs.writeFile(uri, content);
    }

    // Read the file to ensure it exists
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
