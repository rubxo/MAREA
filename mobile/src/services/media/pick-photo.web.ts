import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = { uri: string; width: number; height: number };
export type PickPhotoOptions = Readonly<{
  maxDimension?: number;
  quality?: number;
}>;

async function durableImageUri(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (asset.base64) {
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('No se pudo leer la fotografía seleccionada.');
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo preparar la fotografía.'));
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('La fotografía seleccionada no es válida.'));
    reader.readAsDataURL(blob);
  });
}

export async function pickPhoto(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: true,
    base64: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const uri = await durableImageUri(asset);
  const { width, height } = asset;
  return { uri, width, height };
}
