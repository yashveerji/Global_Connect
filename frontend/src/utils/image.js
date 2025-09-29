export async function compressImage(file, { maxDim = 1080, quality = 0.8, mime = 'image/jpeg' } = {}) {
  if (!(file instanceof File)) return file;
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });
  const canvas = document.createElement('canvas');
  let { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: mime });
}

  // Append a short-lived cache-busting query param to an image URL.
  // Default ttlMs keeps the same URL for 60s to avoid thrash while still refreshing quickly after updates.
  export function bust(url, ttlMs = 60000) {
    if (!url) return url;
    try {
      const t = Math.floor(Date.now() / ttlMs);
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}cb=${t}`;
    } catch {
      return url;
    }
  }