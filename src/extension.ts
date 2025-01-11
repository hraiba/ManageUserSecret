import * as vscode from 'vscode';
import { handleUserSecretCommand } from './handlers/userSecretsCommandHandler';


export  const activate = (context: vscode.ExtensionContext) => {
	const disposable = vscode.commands.registerCommand(
		'dotnet.manageUserSecrets',
	(resourceUri: vscode.Uri) => handleUserSecretCommand(context, resourceUri)
);

context.subscriptions.push(disposable);
};

 
// This method is called when your extension is deactivated
export const  deactivate = () => {};

