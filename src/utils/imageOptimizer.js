/**
 * RakshaNav Client-Side Image Optimizer
 * Validates, resizes, and compresses images before AI analysis and storage upload.
 */

const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validate and optimize an image file
 * @param {File|Blob} file 
 * @param {Object} options 
 * @returns {Promise<{ file: File, blob: Blob, base64: string, dataUrl: string, mimeType: string, width: number, height: number, sizeBytes: number }>}
 */
export async function optimizeImage(file, options = {}) {
  const maxWidth = options.maxWidth || MAX_WIDTH;
  const maxHeight = options.maxHeight || MAX_HEIGHT;
  const quality = options.quality !== undefined ? options.quality : 0.75;

  if (!file) throw new Error('No image file provided.');

  const fileType = (file.type || '').toLowerCase();
  const fileName = file.name || 'image.jpg';

  const isAllowedType = ALLOWED_MIME_TYPES.includes(fileType) || 
    /\.(jpe?g|png|webp)$/i.test(fileName);

  if (!isAllowedType) {
    throw new Error('Unsupported image format. Please upload a JPEG, PNG, or WebP image.');
  }

  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        return reject(new Error('Unable to read image dimensions.'));
      }

      // Calculate proportional downscaled dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas rendering context is unavailable.'));
      }

      // Draw onto canvas with smooth interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output format (use jpeg for general photos, png for transparency if needed)
      const outputMime = fileType === 'image/png' ? 'image/png' : 'image/jpeg';
      const outputExt = outputMime === 'image/png' ? 'png' : 'jpg';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Image optimization failed.'));
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result;
            const base64 = typeof dataUrl === 'string' ? dataUrl.split(',')[1] : '';

            const optimizedFile = new File(
              [blob], 
              fileName.replace(/\.[^/.]+$/, `.${outputExt}`), 
              { type: outputMime, lastModified: Date.now() }
            );

            if (import.meta.env?.DEV) {
              console.log('[ImageOptimizer] Original:', {
                size: `${(originalSize / 1024).toFixed(1)} KB`,
                dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
                type: fileType
              });
              console.log('[ImageOptimizer] Optimized:', {
                size: `${(blob.size / 1024).toFixed(1)} KB`,
                dimensions: `${width}x${height}`,
                type: outputMime
              });
            }

            resolve({
              file: optimizedFile,
              blob,
              base64,
              dataUrl,
              mimeType: outputMime,
              width,
              height,
              sizeBytes: blob.size,
              originalSizeBytes: originalSize
            });
          };
          reader.onerror = () => reject(new Error('Failed to read optimized image.'));
          reader.readAsDataURL(blob);
        },
        outputMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode image file. Please verify the file is a valid image.'));
    };

    img.src = objectUrl;
  });
}
