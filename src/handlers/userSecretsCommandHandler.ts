import * as vscode from "vscode";
import {
  getAllFilesWithExtension,
  getUserSecretsId,
  parseDocument,
  insertUserSecretsId,
  getUserSecretsFilePath,
  ensureUserSecretFile,
} from "../csProj";
import { v4 as uuid } from "uuid";
import { CsProject, CsProjOperation } from "../types/csProjTypes";
import path from "path";

export const handleUserSecretCommand = async (
  context: vscode.ExtensionContext,
  resourceUri?: vscode.Uri
) => {
  try {
    const csProjFile = await (resourceUri
      ? getCsProjFromUri(resourceUri)
      : selectCsProjFile(context));

    const secretsOperation = await processUserSecrets(csProjFile.uri);
    await openUserSecretsFile(secretsOperation.userSecretsId);
  } catch (error) {
    handleError(error);
  }
};

const selectCsProjFile = async (
  context: vscode.ExtensionContext
): Promise<CsProject> => {
  const previousSelectedFileKey = "prev";

  let csProjFiles = await getAllFilesWithExtension(".csproj");
  if (!csProjFiles.length) {
    throw new Error("No .csproj files found in the workspace");
  }

 
    const previousSelectedFile = context.workspaceState.get<CsProject>(
      previousSelectedFileKey
    );

  if (previousSelectedFile) {
    csProjFiles = csProjFiles.filter((file) => file !== previousSelectedFile);
    csProjFiles.unshift(previousSelectedFile);
  }

  const selectedFileName = await vscode.window.showQuickPick(
    csProjFiles.map((f) => f.fileName),
    {
      placeHolder: "Select a .csproj file",
      ignoreFocusOut: true,
    }
  );
  if (!selectedFileName) {
    throw new Error("No file was selected.");
  }

  const selectedFile = csProjFiles.find((f) => f.fileName === selectedFileName);
  if (!selectedFile?.uri) {
    throw new Error("Selected file not found");
  }

  context.workspaceState.update(previousSelectedFileKey, selectedFile);
  return selectedFile;
};

const getCsProjFromUri = (uri: vscode.Uri): CsProject => {
  if (!uri.fsPath.endsWith(".csproj")) {
    throw new Error("Selected file is not a csproj file");
  }

  return {
    uri: uri,
    fileName: path.basename(uri.fsPath),
  };
};

const processUserSecrets = async (
  uri: vscode.Uri
): Promise<CsProjOperation> => {
  const parsedDocument = await parseDocument(uri);
  let userSecretsId = await getUserSecretsId(parsedDocument);

  if (!userSecretsId) {
    const shouldCreate = await promptCreateUserSecrets();
    if (!shouldCreate) {
      throw new Error("User secrets creation cancelled.");
    }

    userSecretsId = uuid();
    await insertUserSecretsId(uri, parsedDocument, userSecretsId);
  }
  return {
    parsedDocument,
    uri: uri,
    userSecretsId,
  };
};

const promptCreateUserSecrets = async (): Promise<boolean> => {
  const response = await vscode.window.showWarningMessage(
    "Couldn't find user secrets. Do you want to add new ones?",
    { modal: true },
    "Yes",
    "No"
  );

  return response === "Yes";
};

const openUserSecretsFile = async (userSecretsId: string): Promise<void> => {
  const secretsFilePath = await getUserSecretsFilePath(userSecretsId);
  if (!secretsFilePath) {
    throw new Error("Platform is not supported for user secrets.");
  }
  await ensureUserSecretFile(secretsFilePath);
  const document = await vscode.workspace.openTextDocument(secretsFilePath);
  await vscode.window.showTextDocument(document);
};

const handleError = (error: unknown): void => {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  vscode.window.showErrorMessage(`User Secrets Error: ${errorMessage}`);
  console.error("User Secrets Extension Error: ", error);
};
