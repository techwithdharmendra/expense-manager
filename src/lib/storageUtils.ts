import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const EXPENSE_MANAGER_DIR = 'ExpenseManager';

export async function ensureExpenseManagerDir() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { files } = await Filesystem.readdir({
      path: '',
      directory: Directory.Documents
    });
    // check if it exists
    const exists = files.some(f => (f as any).name === EXPENSE_MANAGER_DIR || (typeof f === 'string' && f === EXPENSE_MANAGER_DIR));
    if (!exists) {
      await Filesystem.mkdir({
        path: EXPENSE_MANAGER_DIR,
        directory: Directory.Documents,
        recursive: true
      });
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('exists')) {
      await Filesystem.mkdir({
        path: EXPENSE_MANAGER_DIR,
        directory: Directory.Documents,
        recursive: true
      }).catch(e => console.error(e));
    }
  }
}

export async function saveToExpenseManagerDir(fileName: string, data: string, isCsv = false) {
  if (!Capacitor.isNativePlatform()) return null;
  await ensureExpenseManagerDir();
  const path = `${EXPENSE_MANAGER_DIR}/${fileName}`;
  const result = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Documents,
    encoding: Encoding.UTF8
  });
  return result.uri;
}

export async function readFromExpenseManagerDir(fileName: string) {
  if (!Capacitor.isNativePlatform()) return null;
  const path = `${EXPENSE_MANAGER_DIR}/${fileName}`;
  try {
    const result = await Filesystem.readFile({
      path,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
    return result.data;
  } catch (e) {
    return null;
  }
}
