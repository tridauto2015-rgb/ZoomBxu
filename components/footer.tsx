"use client"

import Image from "next/image"
import { Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left Column - Contact Info */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <span className="text-lg text-background/80">(+63) 950 758 6561</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-lg text-background/80">
                  Facebook: Zoom Bxu Surplus
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-lg text-background/80">
                  936 Ochoa Ave, Butuan City, 8600 Agusan del Norte
                </span>
              </div>
            </div>
          </div>

          {/* Right Column - Services & Specialization */}
          <div className="flex flex-col gap-6">
            {/* Services */}
            <div>
              <h4 className="mb-4 text-lg font-bold text-background">Our Services</h4>
              <ul className="flex flex-col gap-2">
                <li className="text-base text-background/80">• Car Repair Services</li>
                <li className="text-base text-background/80">• Professional Paint Jobs</li>
                <li className="text-base text-background/80">• Engine Problem Diagnostics</li>
                <li className="text-base text-background/80">• Body Repair & Restoration</li>
              </ul>
            </div>

            {/* Specialization */}
            <div>
              <h4 className="mb-4 text-lg font-bold text-background">Specialization</h4>
              <p className="text-base text-background/80 leading-relaxed">
                Specialized in Mitsubishi and Nissan parts with expert installation services and genuine components for optimal performance and reliability.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-background/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
          <p className="text-base text-background/50">
            2025 Zoom BXU Auto Parts. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-background/50 hover:text-background transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-background/50 hover:text-background transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
