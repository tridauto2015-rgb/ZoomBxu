"use client"

import { useState } from "react"
import { useAdmin } from "@/contexts/admin-context"
import { useProducts } from "@/contexts/products-context"
import { Product, ProductCard } from "./product-card"
import { Plus, Edit, Trash2, LogOut, Package, Tag, RefreshCw } from "lucide-react"
import { ProductForm } from "./product-form"
import { CategoryForm } from "./category-form"

export function AdminDashboard() {
  const { logout } = useAdmin()
  const { products, setProducts, addProduct, updateProduct, deleteProduct, clearUploadedPictures } = useProducts()
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"products" | "categories">("products")

  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category)))

  const handleAddProduct = () => {
    setEditingProduct(null)
    setShowForm(true)
    setActiveTab("products")
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setShowCategoryForm(true)
    setActiveTab("categories")
  }

  const handleEditCategory = (category: string) => {
    setEditingCategory(category)
    setShowCategoryForm(true)
    setActiveTab("categories")
  }

  const handleSaveCategory = (categoryName: string) => {
    if (editingCategory) {
      // Update all products with the old category name
      const updatedProducts = products.map(p => 
        p.category === editingCategory 
          ? { ...p, category: categoryName }
          : p
      )
      setProducts(updatedProducts)
    } else {
      // Just add the new category (products will use it when needed)
    }
    setShowCategoryForm(false)
    setEditingCategory(null)
  }

  const handleClearUploadedPictures = () => {
    if (confirm("Are you sure you want to clear all uploaded pictures? This action cannot be undone.")) {
      clearUploadedPictures()
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDeleteProduct = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct(id)
    }
  }

  const handleSaveProduct = (product: Omit<Product, "id">) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, { ...product, id: editingProduct.id })
    } else {
      const newProduct = {
        ...product,
        id: Math.max(...products.map(p => p.id)) + 1
      }
      addProduct(newProduct)
    }
    setShowForm(false)
    setEditingProduct(null)
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <ProductForm
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => {
              setShowForm(false)
              setEditingProduct(null)
            }}
          />
        </div>
      </div>
    )
  }

  if (showCategoryForm) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <CategoryForm
            category={editingCategory}
            onSave={handleSaveCategory}
            onCancel={() => {
              setShowCategoryForm(false)
              setEditingCategory(null)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="font-serif text-2xl font-bold text-card-foreground">
              Admin Dashboard
            </h1>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex space-x-1 border-b border-border">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "products"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "categories"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Categories
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === "products" && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-card-foreground">Total Products</h3>
                <p className="text-3xl font-bold text-primary">{products.length}</p>
              </div>
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-card-foreground">Categories</h3>
                <p className="text-3xl font-bold text-primary">{categories.length}</p>
              </div>
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-card-foreground">Avg Rating</h3>
                <p className="text-3xl font-bold text-primary">
                  {(products.reduce((acc, p) => acc + p.rating, 0) / products.length).toFixed(1)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-card-foreground">Products</h2>
              <button
                onClick={handleAddProduct}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <div key={`${product.id}-${index}`} className="relative group">
                  <ProductCard product={product} index={0} />
                  
                  {/* Admin Controls */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 bg-background/90 backdrop-blur-sm rounded-lg border border-border hover:bg-muted transition-colors"
                      aria-label={`Edit ${product.name}`}
                    >
                      <Edit className="h-4 w-4 text-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 bg-background/90 backdrop-blur-sm rounded-lg border border-border hover:bg-red-500 hover:text-white transition-colors"
                      aria-label={`Delete ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "categories" && (
          <div>
            {/* Actions */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-card-foreground">Categories</h2>
              <div className="flex gap-4">
                <button
                  onClick={handleAddCategory}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Category
                </button>
                <button
                  onClick={handleClearUploadedPictures}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Clear Uploaded Pictures
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <div key={category} className="bg-card p-6 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-card-foreground">{category}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 bg-background/90 backdrop-blur-sm rounded-lg border border-border hover:bg-muted transition-colors"
                        aria-label={`Edit ${category} category`}
                      >
                        <Edit className="h-4 w-4 text-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete the "${category}" category? This will update all products in this category to "Uncategorized".`)) {
                            // Update all products with this category to "Uncategorized"
                            const updatedProducts = products.map(p => 
                              p.category === category ? { ...p, category: "Uncategorized" } : p
                            )
                            setProducts(updatedProducts)
                          }
                        }}
                        className="p-2 bg-background/90 backdrop-blur-sm rounded-lg border border-border hover:bg-red-500 hover:text-white transition-colors"
                        aria-label={`Delete ${category} category`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Product count for this category */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {products.filter(p => p.category === category).length} products in this category
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
