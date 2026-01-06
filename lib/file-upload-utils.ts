import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64Decode } from 'base64-arraybuffer';

export async function fileUriToByteArray(fileUri: string): Promise<Uint8Array> {
  try {
    const base64String = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });

    const arrayBuffer = base64Decode(base64String);
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Error converting file URI to byte array:', error);
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getFileExtension(uri: string): string {
  return uri.split('.').pop()?.toLowerCase() || 'bin';
}

export function getContentType(extension: string): string {
  const ext = extension.toLowerCase();

  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
}
