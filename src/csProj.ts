import * as fs from "fs";
import * as path from "path";
import { parseStringPromise, Builder } from "xml2js";
import * as os from "os";
import * as vscode from 'vscode';
import { CsProjFileInfo } from "./types";

export const getAllFilesWithExtension = async (
  dir: string,
  extension: string
): Promise<CsProjFileInfo[]> => {
  const results: CsProjFileInfo[] = [];
  try {
    const entries = await fs.readdirSync(dir, {withFileTypes: true});
    const tasks = entries.map(async (entry)=> {
      const fileInfo = {fullPath: path.join(dir, entry.name), fileName: entry.name};
      if (entry.isDirectory()){
        const subResults = await getAllFilesWithExtension(fileInfo.fullPath, extension);
        results.push(...subResults);
      } else if (entry.isFile() && entry.name.endsWith(extension)){
        results.push(fileInfo);
      }
    });
    await Promise.all(tasks);
    return results;
  } catch(err){
    throw err;
  }
};

export const parseDocument = async (path: string): Promise<string> => {
  const fileContent = await fs.promises.readFile(path, "utf-8");
  return await parseStringPromise(fileContent);
};

export const getUserSecretsId = async (
  parsedXml: any
): Promise<string | undefined> => {
  const project = parsedXml.Project;

  if (!project || !project.PropertyGroup) {
    throw new Error("invalid .csproj file structure.");
  }

  const propertyGroup = Array.isArray(project.PropertyGroup)
    ? project.PropertyGroup[0]
    : project.PropertyGroup;
  let userSecretsId = propertyGroup.UserSecretsId;
  return userSecretsId ? userSecretsId[0] : undefined;
};

export const insertUserSecretsId = async (
  path: string,
  parsedDocument: any,
  userSecretsId: string
): Promise<string> => {
  const project = parsedDocument.Project;

  if (!project || !project.PropertyGroup) {
    throw new Error("invalid .csproj file structure.");
  }

  const propertyGroup = Array.isArray(project.PropertyGroup)
    ? project.PropertyGroup[0]
    : project.PropertyGroup;
  propertyGroup.UserSecretsId = [userSecretsId];

  const builder = new Builder();
  const updatedDocument = builder.buildObject(parsedDocument);
  await fs.promises.writeFile(path, updatedDocument, "utf-8");
  return updatedDocument;
};

export const getUserSecretsFilePath = async (
  userSecretsId: string | undefined
): Promise<string | undefined> => {
  if (!userSecretsId) {
    return undefined;
  }

  if (os.platform() === "win32") {
    return path.join(
      os.homedir(),
      "AppData",
      "Roaming",
      "Microsoft",
      "UserSecrets",
      userSecretsId,
      "secrets.json"
    );
  }

  if (os.platform() === "linux" || os.platform() === "darwin") {
    return path.join(
      os.homedir(),
      ".microsoft",
      "usersecrets",
      userSecretsId,
      "secrets.json"
    );
  }

  return undefined;
};

export const getOrGenerateSecretFile = async (
  filePath: string
): Promise<string> => {
  const fileExists = await fs.existsSync(filePath);
  if (!fileExists) {
    const uri = vscode.Uri.parse(filePath);
    const content = new TextEncoder().encode('{}');
    vscode.workspace.fs.writeFile(uri, content);
  }
  const file = await fs.promises.readFile(filePath, "utf-8");
  return file;
};

