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
import path from 'path';
 
export const handleUserSecretCommand = async (resourceUri?:vscode.Uri) =>{
	try{
		const csProjFile = await(resourceUri 
			? getCsProjFromUri(resourceUri)
			: selectCsProjFile());

		const secretsOperation = await processUserSecrets(csProjFile);
		await openUserSecretsFile(secretsOperation.userSecretsId);
	
	} catch(error){
		handleError(error);
	}
};

const selectCsProjFile = async ():Promise<CsProjFileInfo> => {
	const csProjFiles = await getAllFilesWithExtension('.csproj');
	if (!csProjFiles.length){
		throw new Error('No .csproj files found in the workspace');
	}

	const selectedFileName = await vscode.window.showQuickPick(
		csProjFiles.map(f => f.fileName),
		{
			placeHolder: 'Select a .csproj file',
			ignoreFocusOut: true,
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

const getCsProjFromUri = (uri: vscode.Uri): CsProjFileInfo =>{
	if(!uri.fsPath.endsWith('.csproj')){
		throw new Error('Selected file is not a csproj file');
	}

	return { 
		fullPath: uri.fsPath,
		fileName: path.basename(uri.fsPath),
	};
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