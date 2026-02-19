"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useAdmin } from "@/contexts/admin-context"
import { useProducts } from "@/contexts/products-context"
import { Product } from "./product-card"
import {
  Plus, Edit, Trash2, LogOut, Package,
  MessageSquare, ShoppingBag, Star, LayoutList
} from "lucide-react"
import { AdminChat } from "./admin-chat"
import { AdminOrders } from "./admin-orders"
import { ProductForm } from "./product-form"
import { supabase } from "@/lib/supabase"

type Tab = "products" | "messages" | "orders"

export function AdminDashboard() {
  const { logout } = useAdmin()
  const { products, addProduct, updateProduct, deleteProduct } = useProducts()
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("products")
  const [unreadCount, setUnreadCount] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3")
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel("admin-notifs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "recipient_id=eq.admin",
      }, () => {
        audioRef.current?.play().catch(() => { })
        if (activeTab !== "messages") {
          setUnreadCount((prev) => prev + 1)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "messages") setUnreadCount(0)
  }, [activeTab])

  const handleAddProduct = () => {
    setEditingProduct(null)
    setShowForm(true)
    setActiveTab("products")
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
        id: products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1,
      }
      addProduct(newProduct)
    }
    setShowForm(false)
    setEditingProduct(null)
  }

  const avgRating = products.length > 0
    ? (products.reduce((acc, p) => acc + p.rating, 0) / products.length).toFixed(1)
    : "0.0"

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "products", label: "Products", icon: <LayoutList className="h-4 w-4" /> },
    { id: "orders", label: "Orders", icon: <ShoppingBag className="h-4 w-4" /> },
    { id: "messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
  ]

  if (showForm) {
    return (
      <div className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-topbar-inner">
            <div className="admin-brand">
              <div className="admin-brand-icon">
                <Package className="h-5 w-5" />
              </div>
              <span className="admin-brand-name">ZoomBXU Admin</span>
            </div>
            <button
              onClick={() => { setShowForm(false); setEditingProduct(null) }}
              className="admin-logout-btn"
            >
              ← Back
            </button>
          </div>
        </header>
        <div className="admin-form-wrap">
          <ProductForm
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => { setShowForm(false); setEditingProduct(null) }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      {/* Topbar */}
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-brand">
            <div className="admin-brand-icon">
              <Package className="h-5 w-5" />
            </div>
            <span className="admin-brand-name">ZoomBXU Admin</span>
          </div>
          <button onClick={logout} className="admin-logout-btn" aria-label="Logout">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <nav className="admin-tabnav">
        <div className="admin-tabnav-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`admin-tab ${activeTab === tab.id ? "admin-tab--active" : ""}`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === "messages" && unreadCount > 0 && (
                <span className="admin-badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="admin-main">
        {/* ── Products Tab ── */}
        {activeTab === "products" && (
          <div className="admin-section">
            {/* Stats row */}
            <div className="admin-stats-row">
              <div className="admin-stat-card">
                <div className="admin-stat-icon admin-stat-icon--blue">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="admin-stat-label">Total Products</p>
                  <p className="admin-stat-value">{products.length}</p>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-icon admin-stat-icon--amber">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <p className="admin-stat-label">Avg Rating</p>
                  <p className="admin-stat-value">{avgRating}</p>
                </div>
              </div>
            </div>

            {/* List header */}
            <div className="admin-list-header">
              <h2 className="admin-list-title">Product Inventory</h2>
              <button onClick={handleAddProduct} className="admin-add-btn">
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Product List */}
            {products.length === 0 ? (
              <div className="admin-empty">
                <Package className="h-12 w-12 admin-empty-icon" />
                <p className="admin-empty-text">No products yet. Add your first one!</p>
              </div>
            ) : (
              <div className="admin-product-list">
                {/* Table header */}
                <div className="admin-list-head">
                  <span>Product</span>
                  <span>Price</span>
                  <span>Rating</span>
                  <span className="admin-col-actions-head">Actions</span>
                </div>

                {/* Rows */}
                {products.map((product, index) => (
                  <div
                    key={`${product.id}-${index}`}
                    className="admin-product-row"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    {/* Thumbnail + Name */}
                    <div className="admin-product-info">
                      <div className="admin-thumb">
                        <Image
                          src={product.images[0] || "/placeholder.svg"}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="admin-product-meta">
                        <span className="admin-product-name">{product.name}</span>
                        {product.badge && (
                          <span className="admin-product-badge">{product.badge}</span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="admin-price-cell">
                      <span className="admin-price">{product.price}</span>
                      {product.originalPrice && (
                        <span className="admin-original-price">{product.originalPrice}</span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="admin-rating-cell">
                      <Star className="h-3.5 w-3.5 admin-star-icon" />
                      <span className="admin-rating-val">{product.rating}</span>
                      <span className="admin-review-count">({product.reviewCount})</span>
                    </div>

                    {/* Actions */}
                    <div className="admin-actions-cell">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="admin-action-btn admin-action-btn--edit"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="admin-action-btn admin-action-btn--delete"
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === "orders" && (
          <div className="admin-section">
            <AdminOrders />
          </div>
        )}

        {/* ── Messages Tab ── */}
        {activeTab === "messages" && (
          <div className="admin-section">
            <AdminChat />
          </div>
        )}
      </main>
    </div>
  )
}
