"use client"

import { useState, useRef } from "react"
import { Product } from "./product-card"
import { X, Save, Upload, Image as ImageIcon } from "lucide-react"

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
        
        // Convert file to base64 for API upload
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        
        const base64 = await base64Promise
        
        // Upload to Cloudinary via API
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file: base64 }),
        })
        
        if (response.ok) {
          const result = await response.json()
          uploadedImages.push(result.url)
        } else {
          console.error('Upload failed for file:', file.name)
        }
      }
      
      // Update form data with uploaded images
      const currentImages = formData.images.split(",").filter(img => img.trim())
      const allImages = [...currentImages, ...uploadedImages].join(", ")
      setFormData(prev => ({ ...prev, images: allImages }))
      
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const removeImage = (indexToRemove: number) => {
    const currentImages = formData.images.split(",").filter(img => img.trim())
    const updatedImages = currentImages.filter((_, index) => index !== indexToRemove)
    setFormData(prev => ({ ...prev, images: updatedImages.join(", ") }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const productData = {
      ...formData,
      category: "General", // Default category since field is removed
      images: formData.images.split(",").map(img => img.trim()).filter(img => img),
      rating: Number(formData.rating),
      reviewCount: Number(formData.reviewCount),
    }

    onSave(productData)
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">
          {product ? "Edit Product" : "Add New Product"}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Product Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-foreground mb-2">
              Price *
            </label>
            <input
              id="price"
              type="text"
              value={formData.price}
              onChange={(e) => handleChange("price", e.target.value)}
              placeholder="₱49.99"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Original Price */}
          <div>
            <label htmlFor="originalPrice" className="block text-sm font-medium text-foreground mb-2">
              Original Price
            </label>
            <input
              id="originalPrice"
              type="text"
              value={formData.originalPrice}
              onChange={(e) => handleChange("originalPrice", e.target.value)}
              placeholder="₱69.99"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Rating */}
          <div>
            <label htmlFor="rating" className="block text-sm font-medium text-foreground mb-2">
              Rating *
            </label>
            <select
              id="rating"
              value={formData.rating}
              onChange={(e) => handleChange("rating", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value={5}>5 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star</option>
            </select>
          </div>

          {/* Review Count */}
          <div>
            <label htmlFor="reviewCount" className="block text-sm font-medium text-foreground mb-2">
              Review Count *
            </label>
            <input
              id="reviewCount"
              type="number"
              value={formData.reviewCount}
              onChange={(e) => handleChange("reviewCount", e.target.value)}
              min="0"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Badge */}
          <div>
            <label htmlFor="badge" className="block text-sm font-medium text-foreground mb-2">
              Badge
            </label>
            <input
              id="badge"
              type="text"
              value={formData.badge}
              onChange={(e) => handleChange("badge", e.target.value)}
              placeholder="Best Seller, Sale, etc."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Images */}
        <div>
          <label htmlFor="images" className="block text-sm font-medium text-foreground mb-2">
            Product Images *
          </label>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            id="images"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          {/* Upload button */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-primary rounded-lg bg-background hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Upload className="h-5 w-5 text-primary" />
              <span className="text-foreground">
                {uploading ? "Uploading..." : "Upload Images"}
              </span>
            </button>
            
            {/* Current images preview */}
            {formData.images && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Current Images:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.images.split(",").filter(img => img.trim()).map((img, index) => (
                    <div key={index} className="relative group">
                      <div className="relative w-16 h-16 rounded-lg border border-border overflow-hidden">
                        <img
                          src={img}
                          alt={`Product image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Fallback text input */}
          <div className="mt-4">
            <label htmlFor="imageUrls" className="block text-sm font-medium text-foreground mb-2">
              Or enter image URLs (comma separated)
            </label>
            <textarea
              id="imageUrls"
              value={formData.images}
              onChange={(e) => handleChange("images", e.target.value)}
              placeholder="/images/product1.jpg, /images/product2.jpg"
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            {product ? "Update Product" : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  )
}
