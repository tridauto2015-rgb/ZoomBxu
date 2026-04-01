"use client"

import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { ProductCard, type Product } from "./product-card"
import { useProducts } from "@/contexts/products-context"

export function ProductsSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [localSearchQuery, setLocalSearchQuery] = useState("")
  const sectionRef = useRef<HTMLDivElement>(null)
  const { filteredProducts, searchQuery, setSearchQuery } = useProducts()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="products" ref={sectionRef} className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div
          className={`mb-16 text-center transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="font-russo-one text-3xl font-bold text-foreground md:text-4xl lg:text-7xl">
            <span className="text-balance">Available Parts and Surplus</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-xl leading-relaxed text-muted-foreground">
            Product are negotiable base on the quantity and condition.
          </p>
        </div>

        {/* Search Bar */}
        <div
          className={`mb-12 transition-all duration-1000 delay-200 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => {
                  setLocalSearchQuery(e.target.value)
                  setSearchQuery(e.target.value)
                }}
                placeholder="Search for parts..."
                className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              {localSearchQuery && (
                <button
                  onClick={() => {
                    setLocalSearchQuery("")
                    setSearchQuery("")
                  }}
                  className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            {localSearchQuery && (
              <p className="mt-2 text-sm text-muted-foreground">
                Found {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} matching "{localSearchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isVisible &&
            filteredProducts.map((product, index) => (
              <ProductCard key={`${product.id}-${index}`} product={product} index={index} />
            ))}
        </div>

        {/* View all button */}
        <div
          className={`mt-16 text-center transition-all duration-1000 delay-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <button
            type="button"
            className="inline-flex items-center gap-3 rounded-xl border-2 border-primary px-10 py-5 text-xl font-semibold text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
          >
            View All Products
          </button>
        </div>
      </div>
    </section>
  )
}
