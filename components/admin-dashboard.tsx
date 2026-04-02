"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useAdmin } from "@/contexts/admin-context"
import { useProducts } from "@/contexts/products-context"
import { Product } from "./product-card"
import {
  Plus, Edit, Trash2, Star, Hexagon, Layers, Zap, Inbox, DoorOpen, Truck, MessageSquare, TrendingUp
} from "lucide-react"
import { AdminChat } from "./admin-chat"
import { AdminOrders } from "./admin-orders"
import { AdminAnalytics } from "./admin-analytics"
import { ProductForm } from "./product-form"
import { supabase } from "@/lib/supabase"
import gsap from "gsap"

type Tab = "analytics" | "products" | "messages" | "orders"

export function AdminDashboard() {
  const { logout } = useAdmin()
  const { products, addProduct, updateProduct, deleteProduct } = useProducts()
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("analytics")
  const [unreadCount, setUnreadCount] = useState(0)
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const navRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    // Only init audio on client
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
    if (activeTab !== "messages") setChatSessionId(null);
  }, [activeTab])

  useEffect(() => {
    const handleNavToChat = (e: any) => {
        setChatSessionId(e.detail)
        setActiveTab("messages")
    }
    window.addEventListener('nav-to-chat', handleNavToChat)
    return () => window.removeEventListener('nav-to-chat', handleNavToChat)
  }, [])

  // GSAP Animation whenever activeTab or showForm changes
  useEffect(() => {
    if (mainContentRef.current) {
        gsap.fromTo(mainContentRef.current,
            { opacity: 0, x: -10 },
            { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", clearProps: "all" }
        );
    }
  }, [activeTab, showForm])

  // GSAP Smooth Navigation Indicator
  useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.id === activeTab)
    const activeEl = navRefs.current[activeIndex]
    
    if (indicatorRef.current && activeEl && window.innerWidth >= 768) {
        gsap.to(indicatorRef.current, {
            y: activeEl.offsetTop,
            height: activeEl.offsetHeight,
            opacity: 1,
            duration: 0.5,
            ease: "expo.out"
        })
    }
  }, [activeTab])


  const handleAddProduct = () => {
    setEditingProduct(null)
    setShowForm(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDeleteProduct = (id: string) => {
    // We use standard confirm as UI blocking is correct for deletion
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteProduct(id)
    }
  }

  const handleSaveProduct = (product: Omit<Product, "id">) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, { ...product, id: editingProduct.id })
    } else {
      addProduct(product)
    }
    setShowForm(false)
    setEditingProduct(null)
  }

  const avgRating = products.length > 0
    ? (products.reduce((acc, p) => acc + p.rating, 0) / products.length).toFixed(1)
    : "0.0"

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "analytics", label: "Analytics", icon: <TrendingUp strokeWidth={1.5} className="w-5 h-5 mx-auto md:mx-0" /> },
    { id: "products", label: "Inventory", icon: <Layers strokeWidth={1.5} className="w-5 h-5 mx-auto md:mx-0" /> },
    { id: "orders", label: "Delivery", icon: <Truck strokeWidth={1.5} className="w-5 h-5 mx-auto md:mx-0" /> },
    { id: "messages", label: "Message", icon: <MessageSquare strokeWidth={1.5} className="w-5 h-5 mx-auto md:mx-0" /> },
  ]

  return (
    <div className="admin-shell flex flex-col md:flex-row min-h-screen bg-[#0f1117] text-[#e8eaf0] font-sans selection:bg-[#f4a732]/30 pb-20 md:pb-0">
        
        {/* === Mobile Topbar === */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#181c27] z-40 sticky top-0">
            <div className="flex items-center gap-3 group cursor-default">
                <div className="w-10 h-10 relative flex items-center justify-center rounded-full p-0.5 border-2 border-[#f4a732]/40 shadow-[0_0_12px_rgba(244,167,50,0.3)] bg-black overflow-hidden group-hover:border-[#f4a732] group-hover:shadow-[0_0_20px_rgba(244,167,50,0.6)] transition-all duration-500">
                    <Image src="/images/zoombxulogocircle.png" alt="ZoomBXU Logo" fill className="object-contain p-1" sizes="40px" />
                </div>
                <span className="font-black text-xl tracking-tighter uppercase leading-none text-white">Admin</span>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors p-2" aria-label="Logout">
                <DoorOpen strokeWidth={2} className="w-5 h-5" />
            </button>
        </header>

        {/* === Sidebar Navigation === */}
        <aside className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-3 border-t border-white/5 bg-[#181c27]/95 backdrop-blur-xl
                          md:sticky md:top-0 md:h-screen md:w-[250px] md:flex-col md:justify-start md:items-stretch md:py-8 md:px-0 md:border-t-0 md:border-r md:border-white/5 md:bg-[#181c27]">
            
            {/* Desktop Brand */}
            <div className="hidden md:flex items-center gap-4 px-8 mb-12 group cursor-pointer" onClick={() => window.location.href = '/'}>
                <div className="w-14 h-14 relative flex items-center justify-center rounded-full p-0.5 border-2 border-[#f4a732]/40 shadow-[0_0_15px_rgba(244,167,50,0.3)] bg-black overflow-hidden group-hover:border-[#f4a732] group-hover:-translate-y-1 group-hover:shadow-[0_5px_25px_rgba(244,167,50,0.6)] transition-all duration-500 shrink-0">
                    <Image src="/images/zoombxulogocircle.png" alt="ZoomBXU Logo" fill className="object-contain p-1.5" sizes="56px" />
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-xl tracking-tighter uppercase leading-none text-white group-hover:text-[#f4a732] transition-colors">ZoomBXU</span>
                    <span className="text-[9px] text-[#f4a732] uppercase tracking-[0.2em] font-bold mt-1.5">Control Center</span>
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex items-center justify-around w-full md:flex-col md:justify-start md:gap-3 md:px-4 flex-1 relative">
                
                {/* Floating GSAP Indicator (Desktop) */}
                <div 
                    ref={indicatorRef} 
                    className="hidden md:block absolute left-0 w-[4px] bg-[#f4a732] shadow-[0_0_15px_rgba(244,167,50,0.5)] opacity-0 pointer-events-none z-0" 
                />

                {tabs.map((tab, idx) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            ref={(el) => {
                                navRefs.current[idx] = el
                            }}
                            onClick={() => {
                                setShowForm(false)
                                setActiveTab(tab.id)
                            }}
                            className={`relative flex flex-col md:flex-row items-center md:justify-start gap-1 md:gap-4 p-2 md:p-4 md:rounded-sm w-full md:w-auto md:w-full transition-all group overflow-hidden border border-transparent z-10
                                ${isActive ? 'text-white md:bg-[#1e2336]/60 md:border-white/5' : 'text-slate-500 hover:text-slate-300 md:hover:bg-white/[0.02]'}
                            `}
                        >
                            <div className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-[#f4a732] md:text-[#f4a732]' : 'group-hover:text-slate-400'}`}>
                                {tab.icon}
                            </div>
                            
                            <span className={`relative z-10 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] mt-1 md:mt-0 transition-colors duration-300
                                ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}
                            `}>
                                {tab.label}
                            </span>

                            {/* Unread Badge Overlay */}
                            {tab.id === "messages" && unreadCount > 0 && (
                                <span className="absolute top-1 right-2 md:relative md:top-0 md:ml-auto md:right-0 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    )
                })}
            </nav>

            {/* Desktop Exit System Button */}
            <div className="hidden md:block mt-auto px-6">
                <button onClick={logout} className="flex items-center gap-4 py-4 w-full text-slate-500 hover:text-red-400 transition-colors group border-t border-white/5">
                    <DoorOpen strokeWidth={2} className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-xs uppercase tracking-[0.15em]">System Exit</span>
                </button>
            </div>
        </aside>

        {/* === Main Workspace === */}
        <main className="flex-1 w-full md:h-screen md:overflow-y-auto overflow-x-hidden bg-[#0a0a0b] relative">
            
            {/* Subtle Gradient Backdrop */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#181c27] to-transparent pointer-events-none opacity-50" />

            <div ref={mainContentRef} className="max-w-[1200px] mx-auto w-full relative z-10">
                
                {showForm ? (
                    <div className="p-4 md:p-10">
                        <div className="flex items-center gap-4 mb-8">
                            <button
                                onClick={() => { setShowForm(false); setEditingProduct(null) }}
                                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-[0.15em]"
                            >
                                <span className="text-[#f4a732] text-lg leading-none">←</span> Return
                            </button>
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white border-l-2 border-white/20 pl-4">
                                {editingProduct ? 'Edit Module' : 'New Module'}
                            </h2>
                        </div>
                        <div className="bg-[#181c27] border border-white/5 p-1">
                            <ProductForm
                                product={editingProduct}
                                onSave={handleSaveProduct}
                                onCancel={() => { setShowForm(false); setEditingProduct(null) }}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Inventory Tab ── */}
                        {activeTab === "products" && (
                            <div className="p-4 md:p-10 pt-8 md:pt-12">
                                {/* Stats row */}
                                <div className="grid grid-cols-2 md:flex gap-4 md:gap-6 mb-12">
                                    <div className="flex bg-[#181c27] border border-white/5 p-5 md:p-6 flex-1 items-center gap-4 md:gap-6 relative overflow-hidden group">
                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                                        <div className="w-12 h-12 flex items-center justify-center bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                                            <Layers strokeWidth={1.5} className="w-6 h-6" />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">System Assets</p>
                                            <p className="text-2xl sm:text-4xl font-black text-white leading-none mt-2 font-russo-one tracking-wider">{products.length}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex bg-[#181c27] border border-white/5 p-5 md:p-6 flex-1 items-center gap-4 md:gap-6 relative overflow-hidden group">
                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#f4a732]/5 rounded-full blur-2xl group-hover:bg-[#f4a732]/10 transition-colors" />
                                        <div className="w-12 h-12 flex items-center justify-center bg-[#f4a732]/10 text-[#f4a732] border border-[#f4a732]/20 shrink-0">
                                            <Star strokeWidth={1.5} className="w-6 h-6" />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">Global Rating</p>
                                            <p className="text-2xl sm:text-4xl font-black text-white leading-none mt-2 font-russo-one tracking-wider">{avgRating}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* List header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                                        <span className="w-2 h-6 bg-[#f4a732] inline-block" />
                                        Inventory
                                    </h2>
                                    <button 
                                        onClick={handleAddProduct} 
                                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#f4a732] hover:bg-[#d89128] text-black font-black text-xs uppercase tracking-[0.15em] transition-all hover:translate-x-0.5 active:translate-x-0 shadow-[4px_4px_0_rgba(255,255,255,0.1)] border border-[#a46e1d]"
                                    >
                                        <Plus className="w-4 h-4" strokeWidth={3} />
                                        Add Products
                                    </button>
                                </div>

                                {/* Product List */}
                                {products.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-white/10 bg-[#181c27] mt-8">
                                        <Layers strokeWidth={1} className="w-16 h-16 text-slate-700 mb-6" />
                                        <p className="text-slate-400 font-bold uppercase tracking-[0.15em] text-xs">Database is currently empty</p>
                                    </div>
                                ) : (
                                        <div className="bg-[#181c27] border border-white/5 overflow-hidden">
                                            {/* Table header (Desktop only) */}
                                            <div className="hidden md:grid grid-cols-[3fr_1.5fr_1fr_1.5fr] gap-4 p-4 bg-[#1e2336] border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                <span>Product Identification</span>
                                                <span className="text-center">Price</span>
                                                <span className="text-center">Rating</span>
                                                <span className="text-right">Actions</span>
                                            </div>

                                            {/* Rows */}
                                            <div className="divide-y divide-white/5">
                                                {products.map((product, index) => (
                                                    <div
                                                        key={`${product.id}-${index}`}
                                                        className="flex flex-col md:grid md:grid-cols-[3fr_1.5fr_1fr_1.5fr] gap-4 p-4 md:p-5 items-stretch md:items-center hover:bg-white/[0.02] transition-colors group"
                                                    >
                                                        {/* Thumbnail + Name */}
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className="w-16 h-16 shrink-0 bg-black border border-white/10 relative shadow-[2px_2px_0px_rgba(255,255,255,0.05)]">
                                                                <Image
                                                                    src={product.images[0] || "/placeholder.svg"}
                                                                    alt={product.name}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="64px"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1 min-w-0">
                                                                <span className="font-bold text-sm md:text-base text-white truncate w-full">{product.name}</span>
                                                                {product.badge && (
                                                                    <span className="self-start text-[9px] font-black uppercase tracking-[0.15em] text-[#f4a732] bg-[#f4a732]/10 border border-[#f4a732]/20 px-2 py-0.5">
                                                                        {product.badge}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Price (Value String) */}
                                                        <div className="flex md:flex-col items-center md:justify-center justify-between gap-2 p-3 md:p-0 bg-white/[0.02] md:bg-transparent rounded-sm md:rounded-none">
                                                            <span className="md:hidden text-[9px] font-black uppercase tracking-widest text-slate-600">Price</span>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="font-russo-one text-white text-sm tracking-widest">{product.price}</span>
                                                                {product.originalPrice && (
                                                                    <span className="text-xs text-slate-600 line-through font-russo-one">{product.originalPrice}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Rating (Telemetry) */}
                                                        <div className="flex md:flex-col items-center md:justify-center justify-between gap-2 p-3 md:p-0 border-t border-white/5 md:border-t-0">
                                                            <span className="md:hidden text-[9px] font-black uppercase tracking-widest text-slate-600">Stats</span>
                                                            <div className="flex items-center gap-2">
                                                                <Star className="w-3.5 h-3.5 text-[#f4a732] fill-[#f4a732]" />
                                                                <span className="font-bold text-sm text-white">{product.rating}</span>
                                                                <span className="text-xs text-slate-600 font-bold tracking-widest">({product.reviewCount})</span>
                                                            </div>
                                                        </div>

                                                        {/* Actions (Operations) */}
                                                        <div className="flex items-center gap-2 justify-end mt-4 md:mt-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => handleEditProduct(product)}
                                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors"
                                                                aria-label={`Edit ${product.name}`}
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteProduct(product.id)}
                                                                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                                                                aria-label={`Delete ${product.name}`}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                )}
                            </div>
                        )}

                        {/* ── Analytics Tab ── */}
                        {activeTab === "analytics" && (
                            <div className="p-4 md:p-10 pt-8 md:pt-12">
                                <AdminAnalytics />
                            </div>
                        )}

                        {/* ── Orders Tab ── */}
                        {activeTab === "orders" && (
                            <div className="p-4 md:p-10 pt-8 md:pt-12">
                                <AdminOrders />
                            </div>
                        )}

                        {/* ── Messages Tab ── */}
                        {activeTab === "messages" && (
                            <div className="p-2 md:p-8 pt-4 md:pt-8 w-full max-w-7xl mx-auto">
                                <AdminChat initialSessionId={chatSessionId} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    </div>
  )
}
