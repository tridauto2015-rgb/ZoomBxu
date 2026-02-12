import mongoose from 'mongoose'

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  originalPrice: { type: String },
  rating: { type: Number, default: 5 },
  reviewCount: { type: Number, default: 0 },
  images: [{ type: String }],
  category: { type: String, required: true },
  badge: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Add virtual id for compatibility with frontend
ProductSchema.virtual('id').get(function() {
  return this._id.toHexString()
})

export default mongoose.models.Product || mongoose.model('Product', ProductSchema)
