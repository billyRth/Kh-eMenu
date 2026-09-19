import { IMAGE_BUCKET, supabase } from './supabase';

/** Phone photos are often 5–10 MB; shrink to something that loads fast on 4G. */
async function resize(file: File, maxSize: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))), 'image/jpeg', 0.82),
  );
}

export async function uploadImage(restaurantId: string, file: File, maxSize = 1200): Promise<string> {
  const blob = await resize(file, maxSize);
  const path = `${restaurantId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
