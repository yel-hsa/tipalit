import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getFirebaseStorage } from './config'
import { ServiceError } from '../errors'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateImage(blob: Blob) {
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new ServiceError('storage', 'Image size must be less than 5 MB.')
  }
  if (!ALLOWED_MIME_TYPES.includes(blob.type)) {
    throw new ServiceError('storage', 'Allowed file formats: JPG, JPEG, PNG, WEBP.')
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(parts[1])
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return new Blob([array], { type: mime })
}

export async function uploadListingImage(
  userId: string,
  listingId: string,
  imageInput: string | Blob | File,
  fileName = 'photo_1.webp',
): Promise<string> {
  const storage = getFirebaseStorage()
  let blob: Blob

  if (typeof imageInput === 'string') {
    if (imageInput.startsWith('data:')) {
      blob = dataUrlToBlob(imageInput)
    } else if (imageInput.startsWith('http')) {
      return imageInput
    } else {
      throw new ServiceError('storage', 'Invalid image data.')
    }
  } else {
    blob = imageInput
  }

  validateImage(blob)

  const storagePath = `item_photos/${userId}/${listingId}/${fileName}`
  const fileRef = ref(storage, storagePath)

  try {
    const uploadResult = await uploadBytes(fileRef, blob, {
      contentType: blob.type || 'image/jpeg',
      customMetadata: {
        userId,
        listingId,
      },
    })
    const downloadUrl = await getDownloadURL(uploadResult.ref)
    return downloadUrl
  } catch (err: unknown) {
    console.error('[TIPalit Firebase Storage] Image upload error:', err)
    throw new ServiceError('storage', 'Failed to upload item photo to Cloud Storage.')
  }
}

export async function deleteListingImage(photoUrlOrPath: string): Promise<void> {
  if (!photoUrlOrPath.includes('firebase') && !photoUrlOrPath.startsWith('item_photos/')) {
    return
  }
  const storage = getFirebaseStorage()
  try {
    const fileRef = ref(storage, photoUrlOrPath)
    await deleteObject(fileRef)
  } catch (err) {
    console.warn('[TIPalit Firebase Storage] Could not delete image:', err)
  }
}
