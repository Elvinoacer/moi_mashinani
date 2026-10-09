/** Resize before transport so 5 MB source images fit serverless request limits. */
async function compressPhoto(file: File): Promise<File> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) throw new Error('Use JPG, PNG or WebP images, up to 5 MB each.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 25000000) throw new Error('Use an image under 25 megapixels.');
    const canvas = document.createElement('canvas');
    let blob: Blob | null = null;
    for (const [dimension,quality] of [[1600,0.82],[1200,0.65]] as const) {
      const ratio = Math.min(1,dimension/bitmap.width,dimension/bitmap.height);
      canvas.width = Math.max(1,Math.round(bitmap.width*ratio));canvas.height = Math.max(1,Math.round(bitmap.height*ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo processing is unavailable. Try another browser.');
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve,'image/webp',quality));
      if (blob && blob.size <= 1024 * 1024) break;
    }
    if (!blob || blob.size > 1024 * 1024) throw new Error('Reduce this image’s dimensions and try again.');
    return new File([blob],`${file.name.replace(/\.[^.]+$/,'')}.webp`,{type:blob.type});
  } finally {bitmap.close();}
}

export async function uploadBusinessPhotos(files: File[], businessId?: string): Promise<string[]> {
  if (!files.length || files.length > 8) throw new Error('Choose one to eight photos at a time.');
  const prepared = await Promise.all(files.map(compressPhoto));
  const photos: string[] = [];
  try {
    // Three compressed images keep each multipart request below Vercel's 4.5 MB limit.
    for (let i=0;i<prepared.length;i+=3) {
      const body = new FormData();prepared.slice(i,i+3).forEach(file => body.append('files',file));
      if (businessId) body.append('businessId',businessId);
      const response = await fetch('/api/uploads',{method:'POST',body});
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.photos)) throw new Error(result.error || 'Photo upload failed. Please try again.');
      photos.push(...result.photos);
    }
    return photos;
  } catch (error) {
    await Promise.allSettled(photos.map(url => fetch(`/api/uploads?url=${encodeURIComponent(url)}`,{method:'DELETE'})));
    throw error;
  }
}
