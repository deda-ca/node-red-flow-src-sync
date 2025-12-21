import fs from 'fs';
import path from 'path';

import type { Flows, ManifestFolder, ManifestFile, Manifest } from '../types.ts';

export type FlowFileProperty = {
    type: 'func' | 'format' | 'initialize' | 'finalize' | 'info';
    extension: '.js' | '.vue' | '.initialize.js' | '.finalize.js' | '.info.md';
};

export type FlowFolderProperty = {
    type: 'tab' | 'subflow';
    name: 'label' | 'name';
};

const flowFilesProperties: FlowFileProperty[] = [
    { type: 'func', extension: '.js' },
    { type: 'format', extension: '.vue' },
    { type: 'initialize', extension: '.initialize.js' },
    { type: 'finalize', extension: '.finalize.js' },
    { type: 'info', extension: '.info.md' }
];

const flowFolderProperties: { [key: string]: FlowFolderProperty } = {
    tab: { type: 'tab', name: 'label' },
    subflow: { type: 'subflow', name: 'name' }
};

const supportedFlowFileTypes = ['function', 'ui-template'];

export function sanitizeName(name: string, folderName: string, existingFileNames: Map<string, number>): string {
    // Make sure the name is a valid file name and build the file path.
    name = name.replace(/[\/\\]/g, '-');
    const filePath = path.join(folderName, name);

    // If the file name already exists then add a number to the end of the file name.
    const existingFilesCount = existingFileNames.get(filePath);

    if (existingFilesCount) {
        name += ` (${existingFilesCount})`;
        existingFileNames.set(filePath, existingFilesCount + 1);
    } else {
        existingFileNames.set(filePath, 1);
    }

    return name;
}

export async function flow2src(flows: Flows, manifest: Manifest = {}, options: { sourcePath?: string; applyManifest?: boolean }): Promise<Manifest> {
    // Add missing default options
    options = { ...options, ...{ sourcePath: '', applyManifest: false } };
    // If no source path is specified then throw an error.
    if (options.applyManifest && !options.sourcePath) throw new Error('No source path specified.');

    // A list of all manifest file names. This is the sub path which includes folder name. Used to ensure file names are unique.
    const filesMap: Map<string, number> = new Map();
    // A list of all folders
    const folders: Map<string, ManifestFolder> = new Map();

    // Add the default folder to the files map and the folders list.
    folders.set('default', { id: 'default', type: 'folder', name: 'default', folderName: 'default' });
    filesMap.set('default', 1);

    // Find all folders first. The folder structure is base on Tabs and Subflows.
    for (const flowItem of flows) {
        // If item is not of supported type then skip it.
        const folderProperty = flowFolderProperties[flowItem.type];
        if (!folderProperty) continue;
        // If item does not have a valid name then skip it.
        const name = flowItem[folderProperty.name];
        if (!name) continue;

        // Get the item properties.
        const manifestItem = { id: flowItem.id, type: flowItem.type, name, folderName: sanitizeName(name, '', filesMap) };
        // Add the folder to the list of folder.
        folders.set(manifestItem.id, manifestItem);

        // If the folder does not exist then create it.
        if (options.applyManifest) {
            const filePath = path.join(options.sourcePath!, manifestItem.folderName);
            if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, { recursive: true });
        }
    }

    // Extract Functions and UI Templates (Vue components)
    for (const flowItem of flows) {
        // If not supported type then skip it.
        if (!supportedFlowFileTypes.includes(flowItem.type)) continue;

        // Find the folder
        const folder = flowItem.z && folders.get(flowItem.z);
        const folderName = (folder && folder.folderName) || 'default';
        // Get the item properties and process them.
        const name = flowItem.name;
        const baseFileName = sanitizeName(name, folderName, filesMap);
        const files: ManifestFile[] = [];

        // Add the files to the manifest
        for (const fileProperty of flowFilesProperties) {
            const content = flowItem[fileProperty.type];
            if (content && typeof content === 'string' && content.trim().length) {
                files.push({ type: fileProperty.type, name: `${baseFileName}${fileProperty.extension}`, content });
            }
        }
        // If there are no files then skip it.
        if (!files.length) continue;

        // Get the existing manifest item.
        const manifestItem = { id: flowItem.id, type: flowItem.type, name, folderName, baseFileName, files };
        const existingManifestItem = manifest[flowItem.id];
        // Update the manifest item.
        manifest[flowItem.id] = manifestItem;

        // If we need to apply the manifest then check for changes and apply them.
        if (options.applyManifest) {
            // Traverse the files and process each one.
            for (const file of files) {
                // Find the existing file in the old manifest.
                const existingFile = existingManifestItem && existingManifestItem.files.find((f) => f.type === file.type);
                // If there is no existing file or the content has changed then create it.
                const filePath = path.join(options.sourcePath!, folderName, file.name);
                if (!existingFile || existingFile.content !== file.content || !fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, file.content, 'utf8');
                }
            }
        }
    }

    // TODO: If there are changes then save the manifest file.

    // Save the manifest file
    const manifestFile = path.join(options.sourcePath!, 'manifest.json');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

    // Remove any files that are not in the manifest
    let sourceFiles = [];

    try {
        sourceFiles = getAllFiles(config.sourcePath, ['.vue', '.js', '.md']);
    } catch (error) {
        console.error(`ERROR-E01: could not find any files ro read in ${config.sourcePath}`);
        process.exit(1);
    }

    sourceFiles.forEach((file) => {
        let found = false;

        Object.keys(manifest).forEach((id) => {
            const item = manifest[id];

            if (file.indexOf(item.folderName) > -1 && file.indexOf(item.baseFileName) > -1) {
                found = true;
            }
        });

        if (!found) {
            const filePath = path.join(config.sourcePath!, file);
            fs.rmSync(filePath);
            console.info(`INFO: removed unused file: ${file}`);
        }
    });

    // Report the number of functions and templates extracted
    if (count === 0) {
        console.info('INFO : No Functions or templates found in format fields.');
    } else {
        console.info(`INFO: extracted ${count} functions or templates.`);
    }

    return manifest;
}
