"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Product } from "@/components/product-card"

interface ProductsContextType {
  products: Product[]
  filteredProducts: Product[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  setProducts: (products: Product[]) => void
  addProduct: (product: Product) => void
  updateProduct: (id: number, product: Product) => void
  deleteProduct: (id: number) => void
  clearUploadedPictures: () => void
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

const initialProducts: Product[] = [
  {
    id: 1,
    name: "Premium Ceramic Brake Pads",
    price: "₱1,249.99",
    originalPrice: "₱1,699.99",
    rating: 5,
    reviewCount: 324,
    images: ["/images/brake-pads.jpg", "/images/brake-pads-2.jpg", "/images/brake-pads-3.jpg"],
    category: "Brakes",
    badge: "Best Seller",
  },
  {
    id: 2,
    name: "High-Flow Oil Filter",
    price: "₱329.99",
    rating: 4,
    reviewCount: 189,
    images: ["/images/oil-filter.jpg", "/images/oil-filter-2.jpg"],
    category: "Filters",
  },
  {
    id: 3,
    name: "Performance Spark Plugs",
    price: "₱899.99",
    originalPrice: "₱1,199.99",
    rating: 5,
    reviewCount: 267,
    images: ["/images/spark-plugs.jpg", "/images/spark-plugs-2.jpg"],
    category: "Electrical",
    badge: "Popular",
  },
  {
    id: 4,
    name: "Heavy-Duty Shock Absorbers",
    price: "₱2,499.99",
    originalPrice: "₱3,299.99",
    rating: 4,
    reviewCount: 156,
    images: ["/images/shock-absorbers.jpg", "/images/shock-absorbers-2.jpg"],
    category: "Suspension",
  },
  {
    id: 5,
    name: "LED Headlight Assembly",
    price: "₱4,999.99",
    originalPrice: "₱6,499.99",
    rating: 5,
    reviewCount: 423,
    images: ["/images/headlights.jpg", "/images/headlights-2.jpg", "/images/headlights-3.jpg"],
    category: "Lighting",
    badge: "Premium",
  },
  {
    id: 6,
    name: "Synthetic Motor Oil 5W-30",
    price: "₱599.99",
    rating: 4,
    reviewCount: 892,
    images: ["/images/motor-oil.jpg"],
    category: "Engine",
  },
  {
    id: 7,
    name: "Air Filter Replacement",
    price: "₱249.99",
    originalPrice: "₱349.99",
    rating: 4,
    reviewCount: 234,
    images: ["/images/air-filter.jpg", "/images/air-filter-2.jpg"],
    category: "Filters",
    badge: "Sale",
  },
  {
    id: 8,
    name: "Performance Air Filter",
    price: "₱624.99",
    rating: 4,
    reviewCount: 178,
    images: ["/images/air-filter.jpg", "/images/oil-filter.jpg"],
    category: "Filters",
  },
]

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    // Load search query from localStorage when it changes
    const handleStorageChange = () => {
      const storedQuery = localStorage.getItem('searchQuery')
      if (storedQuery !== searchQuery) {
        setSearchQuery(storedQuery || '')
        localStorage.removeItem('searchQuery') // Clear after using
      }
    }

    window.addEventListener('storage', handleStorageChange)
    handleStorageChange() // Check immediately

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      } else {
        console.error('Failed to load products')
      }
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const updateProducts = async (newProducts: Product[]) => {
    setProducts(newProducts)
    // Note: We'll implement individual product updates via API calls
  }

  // Filter products based on search query
  const filteredProducts = searchQuery.trim() === '' 
    ? products 
    : products.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      )

  const clearUploadedPictures = () => {
    // Remove all uploaded pictures from localStorage
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('uploaded-picture-')) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    console.log(`Cleared ${keysToRemove.length} uploaded pictures from localStorage`)
  }

  const addProduct = async (product: Product) => {
    try {
      // Ensure price has peso sign and comma formatting
      const formatPrice = (price: string) => {
        const cleanPrice = price.replace('₱', '').replace(/,/g, '')
        const numPrice = parseFloat(cleanPrice)
        if (isNaN(numPrice)) return price
        return `₱${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }

      const productWithPeso = {
        ...product,
        price: formatPrice(product.price),
        originalPrice: product.originalPrice ? formatPrice(product.originalPrice) : product.originalPrice
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productWithPeso),
      })
      
      if (response.ok) {
        const newProduct = await response.json()
        setProducts(prev => [...prev, newProduct])
      } else {
        console.error('Failed to add product')
      }
    } catch (error) {
      console.error('Error adding product:', error)
    }
  }

  const updateProduct = async (id: number, updatedProduct: Product) => {
    try {
      // Ensure price has peso sign and comma formatting
      const formatPrice = (price: string) => {
        const cleanPrice = price.replace('₱', '').replace(/,/g, '')
        const numPrice = parseFloat(cleanPrice)
        if (isNaN(numPrice)) return price
        return `₱${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }

      const productWithPeso = {
        ...updatedProduct,
        price: formatPrice(updatedProduct.price),
        originalPrice: updatedProduct.originalPrice ? formatPrice(updatedProduct.originalPrice) : updatedProduct.originalPrice
      }

      const response = await fetch(`/api/products?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productWithPeso),
      })
      
      if (response.ok) {
        const updated = await response.json()
        setProducts(prev => prev.map(p => p.id === id ? updated : p))
      } else {
        console.error('Failed to update product')
      }
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  const deleteProduct = async (id: number) => {
    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setProducts(prev => prev.filter(p => p.id !== id))
      } else {
        console.error('Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
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
