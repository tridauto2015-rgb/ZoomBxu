"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { ShoppingCart, Eye, Star, Check } from "lucide-react"
import { ProductImageCarousel } from "./product-image-carousel"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "./auth-modal"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import gsap from "gsap"

export interface Product {
  id: number
  name: string
  price: string
  originalPrice?: string
  rating: number
  reviewCount: number
  images: string[]
  category: string
  badge?: string
}

interface ProductCardProps {
  product: Product
  index: number
}

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [showFlyer, setShowFlyer] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true)
      return
    }

    setIsAdding(true)
    setShowFlyer(true)
    addToCart(product)

    // GSAP Fly Animation
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const cartElement = document.querySelector('.cart-container')
      const cartRect = cartElement?.getBoundingClientRect()

      if (cartRect) {
        const flyer = document.createElement('div')
        flyer.style.position = 'fixed'
        flyer.style.left = `${buttonRect.left + buttonRect.width / 2 - 20}px`
        flyer.style.top = `${buttonRect.top + buttonRect.height / 2 - 20}px`
        flyer.style.width = '40px'
        flyer.style.height = '40px'
        flyer.style.backgroundColor = 'hsl(var(--primary))'
        flyer.style.borderRadius = '50%'
        flyer.style.zIndex = '9999'
        flyer.style.pointerEvents = 'none'
        flyer.style.display = 'flex'
        flyer.style.alignItems = 'center'
        flyer.style.justifyContent = 'center'
        flyer.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
        flyer.innerHTML = `<img src="${product.images[0]}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%" />`
        document.body.appendChild(flyer)

        gsap.to(flyer, {
          left: cartRect.left + cartRect.width / 2 - 10,
          top: cartRect.top + cartRect.height / 2 - 10,
          scale: 0.1,
          opacity: 0.2,
          duration: 0.7,
          ease: "back.in(1.7)",
          onComplete: () => {
            document.body.removeChild(flyer)
            // Slightly delay the cart opening for better feel
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-cart'))
            }, 100)
          }
        })
      }
    }

    // Reset states after animation
    setTimeout(() => {
      setIsAdding(false)
      setShowFlyer(false)
    }, 1000)
  }

  return (
    <>
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          addToCart(product)
        }}
      />
      <article
        className="group animate-fade-in-up overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image area */}
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.images[0] || "/placeholder.svg"}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-700 ${isHovered ? "scale-110" : "scale-100"
              }`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Badge */}
          {product.badge && (
            <div className="absolute left-4 top-4 rounded-lg bg-primary px-3 py-1.5">
              <span className="text-base font-bold text-primary-foreground">
                {product.badge}
              </span>
            </div>
          )}

          {/* Hover overlay with view button */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-foreground/30 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"
              }`}
          >
            <button
              type="button"
              onClick={() => setCarouselOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-background px-6 py-4 text-lg font-semibold text-foreground shadow-lg transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
              aria-label={`View more images of ${product.name}`}
            >
              <Eye className="h-5 w-5" />
              View Gallery
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="mb-3 text-xl font-bold text-card-foreground lg:text-2xl">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex" aria-label={`Rated ${product.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${i < Math.floor(product.rating)
                    ? "fill-primary text-primary"
                    : "fill-muted text-muted"
                    }`}
                />
              ))}
            </div>
            <span className="text-base text-muted-foreground">
              ({product.reviewCount})
            </span>
          </div>

          {/* Price and CTA */}
          <div className="mt-auto flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {product.originalPrice}
                  </span>
                )}
              </div>
            </div>

            <button
              ref={buttonRef}
              onClick={handleAddToCart}
              disabled={isAdding}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-lg font-bold transition-all duration-300 active:scale-95",
                isAdding
                  ? "bg-green-500 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg"
              )}
            >
              {isAdding ? (
                <>
                  <Check className="h-5 w-5 animate-in zoom-in duration-300" />
                  Added!
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </div>
      </article>

      {/* Image carousel modal */}
      <ProductImageCarousel
        images={product.images}
        productName={product.name}
        isOpen={carouselOpen}
        onClose={() => setCarouselOpen(false)}
      />
    </>
  )
}
