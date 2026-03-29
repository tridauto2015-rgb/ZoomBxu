"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Product } from "@/components/product-card"
import { supabase } from "@/lib/supabase"

interface ProductsContextType {
  products: Product[]
  filteredProducts: Product[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  setProducts: (products: Product[]) => void
  addProduct: (product: Omit<Product, "id">) => void
  updateProduct: (id: string, product: Product) => void
  deleteProduct: (id: string) => void
  clearUploadedPictures: () => void
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")

  useEffect(() => {
    loadProducts()

    // Subscribe to realtime product changes
    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProducts()
      })
      .subscribe()

    // Load search query from localStorage
    const handleStorageChange = () => {
      const storedQuery = localStorage.getItem('searchQuery')
      if (storedQuery !== searchQuery) {
        setSearchQuery(storedQuery || '')
        localStorage.removeItem('searchQuery')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    handleStorageChange()

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      // Map snake_case DB columns to camelCase frontend types
      const mapped: Product[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.original_price,
        rating: p.rating,
        reviewCount: p.review_count,
        images: p.images || [],
        category: p.category,
        badge: p.badge,
      }))
      setProducts(mapped)
    }
    if (error) console.error('Error loading products:', error)
  }

  const updateProducts = async (newProducts: Product[]) => {
    setProducts(newProducts)
  }

  const filteredProducts = searchQuery.trim() === ''
    ? products
    : products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      )

  const clearUploadedPictures = () => {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('uploaded-picture-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`Cleared ${keysToRemove.length} uploaded pictures from localStorage`)
  }

  const formatPrice = (price: string) => {
    const cleanPrice = price.replace('₱', '').replace(/,/g, '')
    const numPrice = parseFloat(cleanPrice)
    if (isNaN(numPrice)) return price
    return `₱${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const addProduct = async (product: Omit<Product, "id">) => {
    const { error } = await supabase.from('products').insert([{
      name: product.name,
      price: formatPrice(product.price),
      original_price: product.originalPrice ? formatPrice(product.originalPrice) : null,
      rating: product.rating,
      review_count: product.reviewCount,
      images: product.images,
      category: product.category,
      badge: product.badge || null,
    }])
    if (error) console.error('Error adding product:', error)
    // Realtime subscription will auto-refresh
  }

  const updateProduct = async (id: string, updatedProduct: Product) => {
    const { error } = await supabase.from('products').update({
      name: updatedProduct.name,
      price: formatPrice(updatedProduct.price),
      original_price: updatedProduct.originalPrice ? formatPrice(updatedProduct.originalPrice) : null,
      rating: updatedProduct.rating,
      review_count: updatedProduct.reviewCount,
      images: updatedProduct.images,
      category: updatedProduct.category,
      badge: updatedProduct.badge || null,
    }).eq('id', id)
    if (error) console.error('Error updating product:', error)
  }

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) console.error('Error deleting product:', error)
  }

  return (
    <ProductsContext.Provider value={{
      products,
      filteredProducts,
      searchQuery,
      setSearchQuery,
      setProducts: updateProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      clearUploadedPictures
    }}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const context = useContext(ProductsContext)
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider")
  }
  return context
}
