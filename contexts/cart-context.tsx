"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Product } from "@/components/product-card"

export interface CartItem extends Product {
  quantity: number
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (product: Product) => void
  removeFromCart: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => string
  getCartCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])

  // Load from localStorage only on mount
  useEffect(() => {
    const stored = localStorage.getItem("cart")
    if (stored) {
      try {
        setCart(JSON.parse(stored))
      } catch (error) {
        console.error("Error loading cart from localStorage:", error)
      }
    }
  }, [])

  // Save to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart))
  }, [cart])

  const addToCart = (product: Product) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === product.id)

      if (existingItem) {
        // Update quantity if item already exists
        return currentCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        // Add new item with quantity 1
        return [...currentCart, { ...product, quantity: 1 }]
      }
    })
  }

  const removeFromCart = (productId: number) => {
    setCart(currentCart => currentCart.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(currentCart => currentCart.map(item =>
      item.id === productId
        ? { ...item, quantity }
        : item
    ))
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    const total = cart.reduce((sum, item) => {
      const price = parseFloat(item.price.replace('₱', '').replace(',', ''))
      return sum + (price * item.quantity)
    }, 0)
    return `₱${total.toFixed(2)}`
  }

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartCount
    }}>
      {children}
    </CartContext.Provider>
  )
}
