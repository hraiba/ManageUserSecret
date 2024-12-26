import * as vscode from 'vscode';
import { 
	getAllFilesWithExtension, 
	getUserSecretsId,
	parseDocument,
	insertUserSecretsId,
	getUserSecretsFilePath,
	getOrGenerateSecretFile,
} from './CsProj';
import {v4 as uuid} from 'uuid';
import path from 'path';

export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('usersecret.userSecret', async  () => {
		if(!vscode.workspace.workspaceFolders){
			vscode.window.showErrorMessage('No workspace folder is open.');
			return;
		}
		const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		try {
			const csProjFiles = await getAllFilesWithExtension(workspacePath, '.csproj');
			if (csProjFiles.length === 0){
				vscode.window.showInformationMessage('No .csproj files found.');
				return ;
			}
			const files = csProjFiles.map(f=> {
				
				return {
					path: f,
					name: path.basename(f)
				};
			});
			const selectedFileName = await vscode.window.showQuickPick(files.map(f => f.name), 
				{placeHolder: 'Select a .csproj file'});

			if (!selectedFileName){
				vscode.window.showInformationMessage('No file selected.');
				return;
			}
			const selectedFile = files.find(f => f.name === selectedFileName)?.path;
			if (!selectedFile ){

				vscode.window.showInformationMessage('No file selected.');
				return;
			}
			let userSecretsId = undefined;
			const parsedDocument = await parseDocument(selectedFile);
			userSecretsId = await getUserSecretsId(parsedDocument);
			if (!userSecretsId){
				const userSelection =await vscode.window.showWarningMessage("couldn't find user secret, do you want to add new one?",
					'yes', 'no');
				if (userSelection === 'no'){
						return;
					}
					userSecretsId = uuid();
					await insertUserSecretsId( selectedFile, parsedDocument, userSecretsId);
			}
			const userSecretFilePath = await getUserSecretsFilePath(userSecretsId);
			if (!userSecretFilePath){
				vscode.window.showErrorMessage('platform is not supported');
				return;
			}
		
			vscode.window.showInformationMessage(`userSecretsId: ${userSecretsId}`);
			vscode.window.showWarningMessage(`userSecrets File path: ${userSecretFilePath}`);

			const file = await getOrGenerateSecretFile(userSecretFilePath!)	;
			const document = await vscode.workspace.openTextDocument(userSecretFilePath!);
			// const document = await vscode.workspace.openTextDocument(selectedFile!);
			await vscode.window.showTextDocument(document);

		}
		catch(error){
			vscode.window.showErrorMessage('Error finding .csproj files.');
			console.error(error);
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
