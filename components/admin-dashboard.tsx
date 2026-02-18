"use client"

import { useState } from "react"
import { useAdmin } from "@/contexts/admin-context"
import { useProducts } from "@/contexts/products-context"
import { Product, ProductCard } from "./product-card"
import { Plus, Edit, Trash2, LogOut, Package, MessageSquare, ShoppingBag, RefreshCw } from "lucide-react"
import { AdminChat } from "./admin-chat"
import { AdminOrders } from "./admin-orders"
import { ProductForm } from "./product-form"
import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

export function AdminDashboard() {
  const { logout } = useAdmin()
  const { products, addProduct, updateProduct, deleteProduct, clearUploadedPictures } = useProducts()
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<"products" | "messages" | "orders">("products")
  const [unreadCount, setUnreadCount] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3")
  }, [])

  // Background listener for admin notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'recipient_id=eq.admin'
      }, (payload) => {
        // Play sound for all customer messages
        audioRef.current?.play().catch(e => console.log("Audio play failed:", e))

        // Increment unread count if not on messages tab
        if (activeTab !== "messages") {
          setUnreadCount(prev => prev + 1)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "messages") {
      setUnreadCount(0)
    }
  }, [activeTab])

  const handleAddProduct = () => {
    setEditingProduct(null)
    setShowForm(true)
    setActiveTab("products")
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
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "products"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === "orders"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === "messages"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Messages
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white animate-in zoom-in duration-300">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === "products" && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-card-foreground">Total Products</h3>
                <p className="text-3xl font-bold text-primary">{products.length}</p>
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
              <div className="flex gap-4">
                <button
                  onClick={handleClearUploadedPictures}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-bold"
                >
                  <RefreshCw className="h-4 w-4" />
                  Clear Image Cache
                </button>
                <button
                  onClick={handleAddProduct}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-bold shadow-lg shadow-primary/20"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
              </div>
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
        {activeTab === "orders" && (
          <div className="animate-in fade-in duration-500">
            <AdminOrders />
          </div>
        )}
        {activeTab === "messages" && (
          <div className="animate-in fade-in duration-500">
            <AdminChat />
          </div>
        )}
      </div>
    </div>
  )
}
