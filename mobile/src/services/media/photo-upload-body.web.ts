export async function createPhotoUploadBody(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('No se pudo leer la fotografía seleccionada.');
  return response.blob();
}
