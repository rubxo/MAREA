import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

export type PickedPhoto = { uri: string; width: number; height: number };
export type PickPhotoOptions = Readonly<{
  maxDimension?: number;
  quality?: number;
}>;

export async function pickPhoto(options: PickPhotoOptions = {}): Promise<PickedPhoto | null> {
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.82;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: true });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > maxDimension) {
    context.resize(asset.width >= asset.height ? { width: maxDimension } : { height: maxDimension });
  }
  const rendered = await context.renderAsync();
  const image = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG });
  context.release(); rendered.release();
  const directory = new Directory(Paths.document, 'pending-photos');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, randomUUID() + '.jpg');
  new File(image.uri).copy(file);
  return { uri: file.uri, width: image.width, height: image.height };
}
