export const MAX_MARKETING_IMAGE_BYTES = 450_000;

export function readImageDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

export async function imageFileToDataUrl(file) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }
  if (file.size > MAX_MARKETING_IMAGE_BYTES) {
    throw new Error('Image must be under 450 KB');
  }
  return readImageDataUrl(file);
}
