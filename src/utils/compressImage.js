/**
 * Compress and convert an image to WebP format on the client side.
 * @param {File} file - Original image file
 * @param {object} options
 * @param {number} options.maxWidth - Max width in pixels (default: 1200)
 * @param {number} options.quality - WebP quality 0-1 (default: 0.8)
 * @returns {Promise<File>} Compressed image as a File
 */
export async function compressImage(file, { maxWidth = 1200, quality = 0.8 } = {}) {
  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) return file

  // Skip if already WebP and small enough
  if (file.type === 'image/webp' && file.size < 500 * 1024) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Resize if needed
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // WebP not supported, fallback to JPEG
            canvas.toBlob(
              (jpegBlob) => {
                if (!jpegBlob) return resolve(file)
                const result = new File([jpegBlob], changeExt(file.name, 'jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(result)
              },
              'image/jpeg',
              quality
            )
            return
          }

          const result = new File([blob], changeExt(file.name, 'webp'), {
            type: 'image/webp',
            lastModified: Date.now(),
          })
          resolve(result)
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file) // Fallback to original on error
    }

    img.src = url
  })
}

function changeExt(filename, newExt) {
  const lastDot = filename.lastIndexOf('.')
  const base = lastDot > 0 ? filename.slice(0, lastDot) : filename
  return `${base}.${newExt}`
}
