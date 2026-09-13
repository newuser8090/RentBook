/**
 * General image compression utility using an off-screen HTML Canvas.
 */
export function compressImageFile(
  file: File, 
  maxWidth: number = 900, 
  maxHeight: number = 900, 
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(canvas.toDataURL('image/jpeg', quality));
          return;
        }

        // Fill with white background so transparent PNGs don't turn black in JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image file for QR codes by resizing to max 300x300 pixels
 * and exporting as image/jpeg at 0.7 quality.
 * Ensures the QR image string is under 30KB to safely stay within database payload limits.
 */
export function compressQrImageFile(file: File): Promise<string> {
  return compressImageFile(file, 300, 300, 0.7);
}
