"use client"

import { useState } from "react"
import { Product } from "./product-card"
import { X, Save, Upload } from "lucide-react"
import { useRef } from "react"

interface ProductFormProps {
  product?: Product | null
  onSave: (product: Omit<Product, "id">) => void
  onCancel: () => void
}

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    price: product?.price || "",
    originalPrice: product?.originalPrice || "",
    rating: product?.rating || 5,
    reviewCount: product?.reviewCount || 0,
    images: product?.images.join(", ") || "",
    badge: product?.badge || "",
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploadedImages: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        const base64 = await base64Promise
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64 }),
        })
        if (response.ok) {
          const result = await response.json()
          uploadedImages.push(result.url)
        }
      }
      const currentImages = formData.images.split(",").filter((img) => img.trim())
      const allImages = [...currentImages, ...uploadedImages].join(", ")
      setFormData((prev) => ({ ...prev, images: allImages }))
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (indexToRemove: number) => {
    const currentImages = formData.images.split(",").filter((img) => img.trim())
    const updatedImages = currentImages.filter((_, index) => index !== indexToRemove)
    setFormData((prev) => ({ ...prev, images: updatedImages.join(", ") }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const productData = {
      ...formData,
      category: "General",
      images: formData.images.split(",").map((img) => img.trim()).filter((img) => img),
      rating: Number(formData.rating),
      reviewCount: Number(formData.reviewCount),
    }
    onSave(productData)
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="pf-wrap">
      {/* Header */}
      <div className="pf-header">
        <h2 className="pf-title">
          {product ? "Edit Product" : "Add New Product"}
        </h2>
        <button onClick={onCancel} className="pf-close-btn" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="pf-body">
        <div className="pf-grid">
          {/* Product Name */}
          <div className="pf-field pf-field--wide">
            <label htmlFor="pf-name" className="pf-label">Product Name <span className="pf-required">*</span></label>
            <input
              id="pf-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="pf-input"
              required
            />
          </div>

          {/* Price */}
          <div className="pf-field">
            <label htmlFor="pf-price" className="pf-label">Price <span className="pf-required">*</span></label>
            <input
              id="pf-price"
              type="text"
              value={formData.price}
              onChange={(e) => handleChange("price", e.target.value)}
              placeholder="₱49.99"
              className="pf-input"
              required
            />
          </div>

          {/* Original Price */}
          <div className="pf-field">
            <label htmlFor="pf-originalPrice" className="pf-label">Original Price</label>
            <input
              id="pf-originalPrice"
              type="text"
              value={formData.originalPrice}
              onChange={(e) => handleChange("originalPrice", e.target.value)}
              placeholder="₱69.99"
              className="pf-input"
            />
          </div>

          {/* Rating */}
          <div className="pf-field">
            <label htmlFor="pf-rating" className="pf-label">Rating <span className="pf-required">*</span></label>
            <select
              id="pf-rating"
              value={formData.rating}
              onChange={(e) => handleChange("rating", e.target.value)}
              className="pf-input pf-select"
              required
            >
              <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
              <option value={4}>⭐⭐⭐⭐ 4 Stars</option>
              <option value={3}>⭐⭐⭐ 3 Stars</option>
              <option value={2}>⭐⭐ 2 Stars</option>
              <option value={1}>⭐ 1 Star</option>
            </select>
          </div>

          {/* Review Count */}
          <div className="pf-field">
            <label htmlFor="pf-reviewCount" className="pf-label">Review Count <span className="pf-required">*</span></label>
            <input
              id="pf-reviewCount"
              type="number"
              value={formData.reviewCount}
              onChange={(e) => handleChange("reviewCount", e.target.value)}
              min="0"
              className="pf-input"
              required
            />
          </div>

          {/* Badge */}
          <div className="pf-field">
            <label htmlFor="pf-badge" className="pf-label">Badge</label>
            <input
              id="pf-badge"
              type="text"
              value={formData.badge}
              onChange={(e) => handleChange("badge", e.target.value)}
              placeholder="Best Seller, Sale…"
              className="pf-input"
            />
          </div>
        </div>

        {/* Images */}
        <div className="pf-field pf-field--full">
          <label className="pf-label">Product Images <span className="pf-required">*</span></label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="pf-upload-btn"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload Images"}
          </button>

          {/* Image previews */}
          {formData.images && (
            <div className="pf-preview-wrap">
              <p className="pf-preview-label">Current Images</p>
              <div className="pf-preview-grid">
                {formData.images.split(",").filter((img) => img.trim()).map((img, index) => (
                  <div key={index} className="pf-thumb-wrap group">
                    <img
                      src={img.trim()}
                      alt={`Product image ${index + 1}`}
                      className="pf-thumb-img"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="pf-thumb-remove"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* URL fallback */}
          <div className="pf-field--full" style={{ marginTop: "1rem" }}>
            <label htmlFor="pf-imageUrls" className="pf-label">Or enter image URLs (comma separated)</label>
            <textarea
              id="pf-imageUrls"
              value={formData.images}
              onChange={(e) => handleChange("images", e.target.value)}
              placeholder="/images/product1.jpg, /images/product2.jpg"
              rows={2}
              className="pf-input pf-textarea"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="pf-footer">
          <button type="button" onClick={onCancel} className="pf-btn pf-btn--cancel">
            Cancel
          </button>
          <button type="submit" className="pf-btn pf-btn--save">
            <Save className="h-4 w-4" />
            {product ? "Update Product" : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  )
}
