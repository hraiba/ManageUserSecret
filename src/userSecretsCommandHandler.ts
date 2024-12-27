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
import { CsProjFileInfo, CsProjOperation } from './types';
 
export const handleUserSecretCommand = async () =>{
	try{
		const workspacePath = await getWorkspacePath();
		const csProjFile = await selectCsProjFile(workspacePath);
		const secretsOperation = await processUserSecrets(csProjFile);
		await openUserSecretsFile(secretsOperation.userSecretsId);
	} catch(error){
		handleError(error);
	}
};

const getWorkspacePath = async (): Promise<string> => {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders?.length){ 
		throw new Error('No workspace folder is open.');
	}
	return workspaceFolders[0].uri.fsPath;
};

const selectCsProjFile = async (workspacePath: string ):Promise<CsProjFileInfo> => {
			const maxDepth = vscode.workspace
			.getConfiguration('usersecret')
			.get<number>('maxDepth', 3);

	const csProjFiles = await getAllFilesWithExtension(workspacePath, '.csproj', maxDepth);
	if (!csProjFiles.length){
		throw new Error('No .csproj files found in the workspace');
	}

	const selectedFileName = await vscode.window.showQuickPick(
		csProjFiles.map(f => f.fileName),
		{
			placeHolder: 'Select a .csproj file',
			ignoreFocusOut: true
		}
	);
	if(!selectedFileName){
		throw new Error('No file was selected.');
	}

	const selectedFile = csProjFiles.find(f => f.fileName === selectedFileName);
	if (!selectedFile?.fullPath){
		throw new Error('Selected file not found');
	}
	return selectedFile;
};

const processUserSecrets = async (csProjFile: {fullPath: string}): Promise<CsProjOperation> => {
	const parsedDocument = await parseDocument(csProjFile.fullPath);
	let userSecretsId = await getUserSecretsId(parsedDocument);

	if (!userSecretsId){
		const shouldCreate = await promptCreateUserSecrets();
		if(!shouldCreate){
			throw new Error ('User secrets creation cancelled.');
		}

		userSecretsId = uuid(); 
		await insertUserSecretsId(
			csProjFile.fullPath,
			parsedDocument,
			userSecretsId
		);
	}
	return {
		parsedDocument, 
		fullPath: csProjFile.fullPath,
		userSecretsId
	};
};

const promptCreateUserSecrets = async (): Promise<boolean> => {
	const response = await vscode.window.showWarningMessage(
		"Couldn't find user secrets. Do you want to add new ones?",
		{modal: true},
		'Yes',
		'No'
	);

	return response === 'Yes';
};

const openUserSecretsFile = async (userSecretsId: string): Promise<void> => {
	const secretsFilePath = await getUserSecretsFilePath(userSecretsId); 
	if(!secretsFilePath){
		throw new Error('Platform is not supported for user secrets.'); 
	}
	await ensureUserSecretFile(secretsFilePath);
	const document = await vscode.workspace.openTextDocument(secretsFilePath);
	await vscode.window.showTextDocument(document); 
}; 
 
const handleError = (error: unknown ):void => {
	const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
	vscode.window.showErrorMessage(`User Secrets Error: ${errorMessage}`);
	console.error('User Secrets Extension Error: ', error);
};