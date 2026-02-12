"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ArrowRight, Shield, Truck, Headset } from "lucide-react"

export function Hero() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section id="home" className="relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/background.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-foreground/70" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-36 md:py-44 lg:py-52">
        <div className="max-w-3xl">
          <h2
            className={`font-serif text-4xl font-bold leading-tight text-background md:text-5xl lg:text-7xl transition-all duration-1000 delay-200 ease-out ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >

          </h2>
        </div>
      </div>

      </section>
  )
}
