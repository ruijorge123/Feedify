/**
 * Client-side image downscale + re-encode via canvas. Needed because phone camera photos
 * (commonly 4-10MB uncompressed) can, once base64-encoded (~33% larger), exceed the backend's
 * serverless function request-body size limit — producing a bare network failure with no useful
 * error detail before the request ever reaches FastAPI's own validation. Desktop uploads rarely
 * hit this because users tend to pick already-small existing images, which is why the failure
 * only showed up on Android.
 */
export function compressImageFile(file, { maxDimension = 1600, quality = 0.82, maxOutputBytes = 1.5 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal membaca gambar"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let q = quality;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        // Base64 is ~4/3 the size of the raw bytes it encodes — keep stepping quality down
        // until we're comfortably under the target, or we hit a quality floor.
        while (dataUrl.length > maxOutputBytes * 1.37 && q > 0.4) {
          q -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
