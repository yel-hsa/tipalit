import { IconButton } from '@figma/astraui'
import { ImagePlus, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { OVERLAY_CONTROL } from './overlayControl'
import Pressable from './Pressable'

type ImageDropzoneProps = {
  // current photo urls (data or remote); the first is the cover
  previewUrls: string[]
  maxPhotos: number
  onSelect: (file: File) => void
  onRemove: (index: number) => void
}

export default function ImageDropzone({ previewUrls, maxPhotos, onSelect, onRemove }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const full = previewUrls.length >= maxPhotos

  const pick = (file: File | undefined) => {
    if (file && file.type.startsWith('image/') && !full) onSelect(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    pick(event.dataTransfer.files[0])
  }

  return (
    <>
      {/* kit has no file input, so a hidden native input backs the dropzone */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          pick(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      {previewUrls.length > 0 ? (
        <div className="grid grid-cols-3 gap-sm">
          {previewUrls.map((url, index) => (
            <div key={`${index}-${url}`} className="relative aspect-square overflow-hidden rounded-corner-lg bg-bg-subtle">
              <img
                src={url}
                alt={index === 0 ? 'Cover photo' : `Additional photo ${index + 1}`}
                className="size-full object-cover"
              />
              {index === 0 && previewUrls.length > 1 && (
                <span className="absolute left-xs top-xs rounded-corner-sm bg-scrim px-xs py-1 text-caption-sm font-semibold text-on-scrim">
                  Cover
                </span>
              )}
              <div className="absolute right-xs top-xs">
                <IconButton
                  type="button"
                  variant="subtle"
                  size="small"
                  icon={<X size={16} />}
                  aria-label={index === 0 ? 'Remove cover photo' : `Remove photo ${index + 1}`}
                  onClick={() => onRemove(index)}
                  className={OVERLAY_CONTROL}
                />
              </div>
            </div>
          ))}
          {!full && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label={`Add photo ${previewUrls.length + 1} of ${maxPhotos}`}
              className="flex aspect-square flex-col items-center justify-center gap-2xs rounded-corner-lg border-2 border-dashed border-border-primary bg-bg-faint text-center hover:bg-bg-subtle"
            >
              <ImagePlus size={24} className="text-text-secondary" />
              <span className="text-caption-sm text-text-secondary">
                {previewUrls.length + 1}/{maxPhotos}
              </span>
            </button>
          )}
        </div>
      ) : (
        <Pressable
          onPress={() => inputRef.current?.click()}
          aria-label="Add photos"
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-sm rounded-corner-lg border-2 border-dashed px-xl py-2xl text-center ${
            dragging ? 'border-brand-primary bg-bg-subtle' : 'border-border-primary bg-bg-faint hover:bg-bg-subtle'
          }`}
        >
          <span className="flex size-12 items-center justify-center rounded-corner-full bg-accent text-on-accent">
            <ImagePlus size={24} />
          </span>
          <span className="text-label text-text-primary">Add photos</span>
          <span className="text-label-sm text-text-secondary">
            Tap to browse or drop images. First photo is the cover, up to {maxPhotos}.
          </span>
        </Pressable>
      )}
    </>
  )
}
