"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Robert M.",
    role: "Ford F-150 Owner",
    quote:
      "I have been buying parts here for 20 years. The website is so easy to use and the parts always fit perfectly. Best auto parts store around.",
    rating: 5,
    image: "/images/team-mechanic.jpg",
  },
  {
    name: "Margaret S.",
    role: "Toyota Camry Owner",
    quote:
      "As someone who is not very tech-savvy, I really appreciate how simple this website is. I found my brake pads in under a minute. Wonderful service.",
    rating: 5,
    image: "/images/team-mechanic.jpg",
  },
  {
    name: "James W.",
    role: "Classic Car Enthusiast",
    quote:
      "Great prices, fast shipping, and the parts are always top quality. Their expert support line helped me find a hard-to-get alternator for my vintage Mustang.",
    rating: 5,
    image: "/images/team-mechanic.jpg",
  },
]

export function TestimonialsSection() {
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
    <section ref={sectionRef} className="bg-secondary py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div
          className={`mb-16 text-center transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <span className="mb-4 inline-block text-lg font-semibold uppercase tracking-widest text-primary">
            Customer Reviews
          </span>
          <h2 className="font-serif text-3xl font-bold text-secondary-foreground md:text-4xl lg:text-5xl">
            <span className="text-balance">What Our Customers Say</span>
          </h2>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {isVisible &&
            testimonials.map((t, index) => (
              <div
                key={t.name}
                className="animate-fade-in-up relative rounded-2xl border border-border bg-card p-8 shadow-sm"
                style={{
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: "both",
                }}
              >
                <Quote className="mb-4 h-10 w-10 text-primary/30" />
                <div className="mb-4 flex" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < t.rating
                          ? "fill-primary text-primary"
                          : "fill-muted text-muted"
                      }`}
                    />
                  ))}
                </div>
                <blockquote className="mb-6 text-lg leading-relaxed text-card-foreground">
                  {`"${t.quote}"`}
                </blockquote>
                <div className="flex items-center gap-4 border-t border-border pt-6">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full">
                    <Image
                      src={t.image || "/placeholder.svg"}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-card-foreground">
                      {t.name}
                    </p>
                    <p className="text-base text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}
