import * as vscode from 'vscode';
import { 
	getAllFilesWithExtension, 
	getUserSecretsId,
	parseDocument,
	insertUserSecretsId,
	getUserSecretsFilePath,
	ensureUserSecretFile,
} from './csProj';
import {v4 as uuid} from 'uuid';

export  const activate = (context: vscode.ExtensionContext) => {
    const disposable = vscode.commands.registerCommand('usersecret.userSecret', async () => {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }

        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

        try {
            const csProjFiles = await getAllFilesWithExtension(workspacePath, '.csproj');

            if (csProjFiles.length === 0) {
                vscode.window.showInformationMessage('No .csproj files found.');
                return;
            }

            const selectedFileName = await vscode.window.showQuickPick(
                csProjFiles.map(f => f.fileName),
                { placeHolder: 'Select a .csproj file' }
            );

            if (!selectedFileName) {
                vscode.window.showInformationMessage('No file selected.');
                return;
            }

            const fullPath = csProjFiles.find(f => f.fileName === selectedFileName)?.fullPath;

            if (!fullPath) {
                vscode.window.showInformationMessage('No file selected.');
                return;
            }

            let userSecretsId = undefined;
            const parsedDocument = await parseDocument(fullPath);
            userSecretsId = await getUserSecretsId(parsedDocument);

            if (!userSecretsId) {
                const userSelection = await vscode.window.showWarningMessage(
                    "Couldn't find a user secret ID. Do you want to add a new one?",
                    'Yes',
                    'No'
                );

                if (userSelection === 'No') {
                    return;
                }

                userSecretsId = uuid();
                await insertUserSecretsId(fullPath, parsedDocument, userSecretsId);
            }

            const userSecretFilePath = await getUserSecretsFilePath(userSecretsId);

            if (!userSecretFilePath) {
                vscode.window.showErrorMessage('Platform is not supported.');
                return;
            }

            await ensureUserSecretFile(userSecretFilePath);
            const document = await vscode.workspace.openTextDocument(userSecretFilePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage('An error occurred while processing .csproj files.');
            console.error(error);
        }
    });

    context.subscriptions.push(disposable);
};


// This method is called when your extension is deactivated
export const  deactivate = () => {};

