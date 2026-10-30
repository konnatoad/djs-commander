import fs from 'fs';
import path from 'path';

// Files the handler imports. Type declarations, source maps, JSON and notes next to
// them are left alone.
const CODE_FILE = /\.(js|cjs|mjs|ts)$/;
const isCodeFile = (name: string) => CODE_FILE.test(name) && !name.endsWith('.d.ts');

/** Code files in `directory` (and its subfolders with `nesting`), sorted by path. */
export function getFilePaths(directory?: string, nesting?: boolean): string[] {
  let filePaths: string[] = [];
  if (!directory) return filePaths;

  const files = fs.readdirSync(directory, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(directory, file.name);

    if (file.isFile() && isCodeFile(file.name)) {
      filePaths.push(filePath);
    }

    if (nesting && file.isDirectory()) {
      filePaths = [...filePaths, ...getFilePaths(filePath, true)];
    }
  }

  // readdir's order depends on the file system, so sort to load the same way everywhere
  return filePaths.sort();
}

export function getFolderPaths(directory?: string, nesting?: boolean): string[] {
  let folderPaths: string[] = [];
  if (!directory) return folderPaths;

  const folders = fs.readdirSync(directory, { withFileTypes: true });

  for (const folder of folders) {
    const folderPath = path.join(directory, folder.name);

    if (folder.isDirectory()) {
      folderPaths.push(folderPath);

      if (nesting) {
        folderPaths = [...folderPaths, ...getFolderPaths(folderPath, true)];
      }
    }
  }

  return folderPaths.sort();
}
