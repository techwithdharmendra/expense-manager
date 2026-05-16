
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const ATTACHMENTS_DIR = 'attachments';

export async function ensureDirectory() {
  try {
    await Filesystem.mkdir({
      path: ATTACHMENTS_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch (e: any) {
    // Directory might already exist, which is fine. 
    // On some platforms, it throws if it exists.
    if (!e.message?.includes('already exists') && !e.code?.includes('DIR_EXISTS')) {
      console.warn('Directory check/creation notice:', e);
    }
  }
}

export async function saveFile(file: File): Promise<string> {
  await ensureDirectory();
  
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const path = `${ATTACHMENTS_DIR}/${fileName}`;
  
  const base64Data = await fileToBase64(file);
  
  await Filesystem.writeFile({
    path,
    data: base64Data,
    directory: Directory.Data
  });
  
  return fileName;
}

export async function getFileUri(fileName: string): Promise<string> {
  const path = `${ATTACHMENTS_DIR}/${fileName}`;
  const result = await Filesystem.getUri({
    path,
    directory: Directory.Data
  });
  
  // Capacitor.convertFileSrc works for local files in the WebView.
  return Capacitor.convertFileSrc(result.uri);
}

export async function getRawFileUri(fileName: string): Promise<string> {
  const path = `${ATTACHMENTS_DIR}/${fileName}`;
  const result = await Filesystem.getUri({
    path,
    directory: Directory.Data
  });
  
  return result.uri;
}

export async function deleteFile(fileName: string) {
  try {
    await Filesystem.deleteFile({
      path: `${ATTACHMENTS_DIR}/${fileName}`,
      directory: Directory.Data
    });
  } catch (e) {
    console.error('Failed to delete file', e);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:*/ *;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}
