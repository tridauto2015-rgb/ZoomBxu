"use client"

import { useState } from "react"
import { Product } from "./product-card"
import { X, Save, Upload } from "lucide-react"
import { useRef } from "react"
import { supabase } from "@/lib/supabase"

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
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `products/${fileName}`

        const { error } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })

        if (error) {
          console.error('Upload error:', error)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        uploadedUrls.push(urlData.publicUrl)
      }

      const currentImages = formData.images.split(",").filter((img) => img.trim())
      const allImages = [...currentImages, ...uploadedUrls].join(", ")
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
    <div className="flex flex-col w-full bg-[#0a0a0b]">
      {/* Form Header */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-[#181c27]">
        <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-3">
          <span className="w-2 h-6 bg-[#f4a732] inline-block" />
          {product ? "Edit Asset Protocol" : "Initialize New Asset"}
        </h2>
        <button onClick={onCancel} className="p-2 text-slate-500 hover:text-white hover:rotate-90 transition-all border border-transparent hover:border-white/10" aria-label="Close">
            <X strokeWidth={1} className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col p-4 md:p-6 gap-6 md:gap-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.01] to-transparent pointer-events-none" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Product Name */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              Identity String <span className="text-[#f4a732]">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="bg-[#181c27] border border-white/10 text-white p-3 text-sm focus:outline-none focus:ring-0 focus:border-[#f4a732] rounded-sm transition-colors"
              required
            />
          </div>

          {/* Price */}
          <div className="flex flex-col gap-2">
            <label htmlFor="price" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              Value Rating <span className="text-[#f4a732]">*</span>
            </label>
            <input
              id="price"
              type="text"
              value={formData.price}
              onChange={(e) => handleChange("price", e.target.value)}
              placeholder="₱4,500.00"
              className="bg-[#181c27] border border-white/10 text-white p-3 text-sm font-russo-one tracking-wider focus:outline-none focus:ring-0 focus:border-[#f4a732] rounded-sm transition-colors"
              required
            />
          </div>

          {/* Original Price */}
          <div className="flex flex-col gap-2">
            <label htmlFor="originalPrice" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              Legacy Rating
            </label>
            <input
              id="originalPrice"
              type="text"
              value={formData.originalPrice}
              onChange={(e) => handleChange("originalPrice", e.target.value)}
              placeholder="₱5,000.00"
              className="bg-[#181c27] border border-white/10 text-white p-3 text-sm font-russo-one tracking-wider focus:outline-none focus:ring-0 focus:border-[#f4a732] rounded-sm transition-colors"
            />
          </div>

          {/* Rating */}
          <div className="flex flex-col gap-2">
            <label htmlFor="rating" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              Telemetry (Stars) <span className="text-[#f4a732]">*</span>
            </label>
            <select
              id="rating"
              value={formData.rating}
              onChange={(e) => handleChange("rating", e.target.value)}
              className="bg-[#181c27] border border-white/10 text-white p-3 text-sm focus:outline-none focus:ring-0 focus:border-[#f4a732] rounded-sm transition-colors appearance-none cursor-pointer"
              required
            >
              <option value={5}>5.0 - Optimal</option>
              <option value={4}>4.0 - Standard</option>
              <option value={3}>3.0 - Acceptable</option>
              <option value={2}>2.0 - Degraded</option>
              <option value={1}>1.0 - Critical</option>
            </select>
          </div>

          {/* Review Count */}
          <div className="flex flex-col gap-2">
            <label htmlFor="reviewCount" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              Data Points (Count) <span className="text-[#f4a732]">*</span>
            </label>
            <input
              id="reviewCount"
              type="number"
              value={formData.reviewCount}
              onChange={(e) => handleChange("reviewCount", e.target.value)}
              min="0"
              className="bg-[#181c27] border border-white/10 text-white p-3 text-sm font-mono focus:outline-none focus:ring-0 focus:border-[#f4a732] rounded-sm transition-colors"
              required
            />
          </div>

          {/* Badge */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label htmlFor="badge" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              Override Tag
            </label>
            <input
              id="badge"
              type="text"
              value={formData.badge}
              onChange={(e) => handleChange("badge", e.target.value)}
              placeholder="BEST SELLER, NEW ARRIVAL..."
              className="bg-[#181c27] border border-white/10 text-[#f4a732] font-black uppercase tracking-[0.15em] text-xs p-3 focus:outline-none focus:ring-0 focus:border-[#f4a732] rounded-sm transition-colors"
            />
          </div>
        </div>

        {/* Images */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-6 relative z-10 w-full overflow-hidden">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
            Visual Assets <span className="text-[#f4a732]">*</span>
          </label>

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
            className="flex items-center justify-center gap-2 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white p-4 font-black text-xs uppercase tracking-widest transition-colors w-full rounded-sm"
          >
            <Upload strokeWidth={2} className="w-4 h-4 text-[#f4a732]" />
            {uploading ? "Extracting Data..." : "Upload Asset Package"}
          </button>

          {/* Image previews */}
          {formData.images && (
            <div className="mt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {formData.images.split(",").filter((img) => img.trim()).map((img, index) => (
                  <div key={index} className="relative group bg-[#181c27] border border-white/10 aspect-square flex items-center justify-center overflow-hidden">
                    <img
                      src={img.trim()}
                      alt={`Asset ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1.5 bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                      aria-label={`Remove asset ${index + 1}`}
                    >
                        <X strokeWidth={2} className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1 bg-black/80 text-[8px] font-mono text-white/50 backdrop-blur-md uppercase">
                        [{index}]
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* URL fallback */}
          <div className="flex flex-col gap-2 mt-4">
            <label htmlFor="imageUrls" className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              Manual Asset Links (Vector Support)
            </label>
            <textarea
              id="imageUrls"
              value={formData.images}
              onChange={(e) => handleChange("images", e.target.value)}
              placeholder="https://database.url/01.jpg, https://database.url/02.jpg..."
              rows={3}
              className="bg-[#181c27] border border-white/10 text-white/70 p-3 text-xs font-mono focus:outline-none focus:ring-0 focus:border-[#f4a732] rounded-sm transition-colors resize-y scrollbar-thin overflow-auto w-full break-all"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-white/5 pt-6 mt-4 relative z-10 w-full">
          <button 
            type="button" 
            onClick={onCancel} 
            className="w-full sm:w-auto px-6 py-3.5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs font-black uppercase tracking-[0.15em] transition-colors rounded-sm"
          >
            Abort
          </button>
          <button 
            type="submit" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-[#f4a732] hover:bg-[#d89128] text-black font-black text-xs uppercase tracking-[0.15em] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-[4px_4px_0_rgba(255,255,255,0.1)] border border-[#a46e1d] rounded-sm"
          >
            <Save strokeWidth={2} className="w-4 h-4" />
            {product ? "Commit Configuration" : "Initialize Asset"}
          </button>
        </div>
      </form>
    </div>
  )
}
