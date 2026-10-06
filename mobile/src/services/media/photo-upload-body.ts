import { File } from 'expo-file-system';

export async function createPhotoUploadBody(uri: string): Promise<File> {
  return new File(uri);
}
