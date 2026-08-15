import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

/**
 * ImageUploader — file-based image uploader with live previews.
 *
 * Props:
 *   value        — string (single) or string[] (multiple) of existing image URLs
 *   onChange     — callback receiving the new array of image URL strings
 *   multiple     — boolean, allow multi-file selection (default: false)
 *   label        — field label text
 *   maxSizeMB    — max individual file size (default: 5)
 */
export default function ImageUploader({
  value = [],
  onChange,
  multiple = false,
  label = 'Images',
  maxSizeMB = 5,
}) {
  const [previews, setPreviews] = useState(() => {
    const urls = Array.isArray(value) ? value : [value]
    return urls.filter(Boolean)
  })
  const fileInputRef = useRef(null)

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const maxSize = maxSizeMB * 1024 * 1024

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert(`"${file.name}" is not an image. Please select image files only.`)
        return
      }
      if (file.size > maxSize) {
        alert(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is ${maxSizeMB}MB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target.result
        setPreviews((prev) => {
          const next = multiple ? [...prev, dataUrl] : [dataUrl]
          onChange(next)
          return next
        })
      }
      reader.readAsDataURL(file)
    })

    // Clear the input so the same file can be selected again
    e.target.value = ''
  }

  const removeImage = (index) => {
    const newPreviews = previews.filter((_, i) => i !== index)
    setPreviews(newPreviews)
    onChange(newPreviews)
  }

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="space-y-3">
      <label className="block font-body text-xs tracking-label uppercase text-muted-foreground mb-2">
        {label}
      </label>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple={multiple}
        onChange={handleFilesSelected}
        className="hidden"
      />

      <button
        type="button"
        onClick={triggerFileSelect}
        className="flex items-center gap-2 px-4 py-3 border border-border rounded-lg font-body text-sm text-foreground hover:bg-secondary transition-colors w-full"
      >
        <Upload size={16} />
        {multiple ? 'Upload Images' : 'Upload Image'}
      </button>

      {previews.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center">
          <ImageIcon size={24} className="mx-auto text-muted-foreground/50 mb-2" />
          <p className="font-body text-xs text-muted-foreground">
            No images selected. Click the button above to upload.
          </p>
        </div>
      ) : (
        <div className={`grid gap-3 ${
          multiple ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'
        }`}>
          {previews.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`${label} preview ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
