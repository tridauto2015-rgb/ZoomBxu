"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

const categories = [
  {
    name: "Engine Parts",
    count: "2,400+ parts",
    image: "/images/hero-engine.jpg",
  },
  {
    name: "Brake Systems",
    count: "1,800+ parts",
    image: "/images/brake-pads.jpg",
  },
  {
    name: "Electrical",
    count: "3,200+ parts",
    image: "/images/alternator.jpg",
  },
  {
    name: "Suspension",
    count: "1,500+ parts",
    image: "/images/suspension.jpg",
  },
  {
    name: "Lighting",
    count: "900+ parts",
    image: "/images/headlights.jpg",
  },
  {
    name: "Filters",
    count: "600+ parts",
    image: "/images/oil-filter.jpg",
  },
]

export function CategoriesSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="categories"
      ref={sectionRef}
      className="bg-secondary py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div
          className={`mb-16 text-center transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <span className="mb-4 inline-block text-lg font-semibold uppercase tracking-widest text-primary">
            Shop by Category
          </span>
          <h2 className="font-serif text-3xl font-bold text-secondary-foreground md:text-4xl lg:text-5xl">
            <span className="text-balance">Find Parts by Category</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-xl leading-relaxed text-muted-foreground">
            Browse our wide selection of auto parts organized by category for
            easy shopping.
          </p>
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isVisible &&
            categories.map((cat, index) => (
              <a
                key={cat.name}
                href="#products"
                className="group animate-fade-in-up relative flex items-end overflow-hidden rounded-2xl"
                style={{
                  animationDelay: `${index * 120}ms`,
                  animationFillMode: "both",
                  minHeight: "280px",
                }}
              >
                <Image
                  src={cat.image || "/placeholder.svg"}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent transition-all duration-500 group-hover:from-foreground/90" />
                <div className="relative flex w-full items-end justify-between p-8">
                  <div>
                    <h3 className="text-2xl font-bold text-background">
                      {cat.name}
                    </h3>
                    <p className="mt-1 text-lg text-background/70">
                      {cat.count}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-110">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                </div>
              </a>
            ))}
        </div>
      </div>
    </section>
  )
}
