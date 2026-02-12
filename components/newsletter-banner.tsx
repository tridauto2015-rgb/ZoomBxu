"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"

export function NewsletterBanner() {
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
    <section ref={sectionRef} className="bg-primary py-16 lg:py-20">
      <div
        className={`mx-auto max-w-4xl px-6 text-center transition-all duration-1000 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <h2 className="font-serif text-3xl font-bold text-primary-foreground md:text-4xl">
          <span className="text-balance">Stay Updated on Deals and New Parts</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-xl text-primary-foreground/80">
          Join our newsletter for exclusive discounts, new product arrivals, and
          helpful car maintenance tips.
        </p>

        <form
          className="mx-auto mt-10 flex max-w-xl flex-col gap-4 sm:flex-row"
          onSubmit={(e) => e.preventDefault()}
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            type="email"
            id="newsletter-email"
            placeholder="Enter your email address"
            className="flex-1 rounded-xl border-2 border-primary-foreground/20 bg-primary-foreground/10 px-6 py-5 text-lg text-primary-foreground placeholder:text-primary-foreground/50 transition-colors duration-200 focus:border-primary-foreground focus:outline-none"
          />
          <button
            type="submit"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-background px-8 py-5 text-lg font-bold text-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            Subscribe
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </form>
      </div>
    </section>
  )
}
