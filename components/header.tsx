"use client"

import { useState } from "react"
import Image from "next/image"
import { Menu, X, Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAdmin } from "@/contexts/admin-context"
import { useAuth } from "@/contexts/auth-context"
import { Cart } from "./cart"
import { UserOrders } from "./user-orders"
import { AuthModal } from "./auth-modal"
import { LogOut, User as UserIcon, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Shop", href: "#products" },
  { label: "Contact", href: "#contact" },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const { isAdmin } = useAdmin()
  const { user, isAuthenticated, logout } = useAuth()

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const targetId = href.replace('#', '')
    const element = document.getElementById(targetId)

    // Close mobile menu first
    setMobileOpen(false)

    if (element) {
      // Check if mobile and use appropriate scrolling method
      if (window.innerWidth < 768) {
        // Mobile: Use immediate scroll with fallback
        const headerHeight = 64 // Mobile header height
        const targetPosition = element.offsetTop - headerHeight

        // Small delay to ensure mobile menu is closed
        setTimeout(() => {
          if ('scrollBehavior' in document.documentElement.style) {
            // Modern mobile browsers - use CSS smooth scroll
            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            })
          } else {
            // Older mobile browsers - immediate scroll
            window.scrollTo(0, targetPosition)
          }
        }, 150) // Delay for mobile menu closure
      } else {
        // Desktop: Keep original elegant animation
        const headerHeight = 80 // Desktop header height
        const startPosition = window.pageYOffset
        const targetPosition = element.offsetTop - headerHeight
        const distance = targetPosition - startPosition
        const duration = 1500 // 1.5 seconds for desktop

        let start: number | null = null

        const animation = (currentTime: number) => {
          if (start === null) start = currentTime
          const timeElapsed = currentTime - start
          const progress = Math.min(timeElapsed / duration, 1)

          // Easing function for smooth acceleration and deceleration
          const easeInOutCubic = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2

          window.scrollTo(0, startPosition + (distance * easeInOutCubic))

          if (timeElapsed < duration) {
            requestAnimationFrame(animation)
          }
        }

        requestAnimationFrame(animation)
      }
    }
  }

  return (
    <>
      {/* Main header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => handleSmoothScroll(e, "#home")}
            className="flex items-center gap-3"
          >
            <div className="relative h-20 w-20 -my-4 overflow-hidden">
              <Image
                src="/images/zoombxu.png"
                alt="Zoom BXU Logo"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 80px, 80px"
              />
            </div>

          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="relative text-lg font-medium text-foreground transition-colors duration-300 hover:text-primary after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="hidden lg:flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-xl border border-border">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-bold">{user?.name.split(' ')[0]}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-muted-foreground hover:bg-muted hover:text-destructive gap-2 font-bold"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setAuthModalOpen(true)}
                className="hidden lg:flex gap-2 font-bold px-6"
                size="sm"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            )}

            <div className="flex items-center gap-3">
              <UserOrders />
              <div className="cart-container">
                <Cart />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-12 w-12 items-center justify-center rounded-lg text-foreground transition-colors duration-200 hover:bg-muted md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-500 ease-in-out lg:hidden",
            mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <nav className="border-t border-border px-6 py-4 space-y-2" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  handleSmoothScroll(e, link.href)
                  setMobileOpen(false)
                }}
                className="block rounded-lg px-4 py-4 text-xl font-medium text-foreground transition-colors duration-200 hover:bg-muted hover:text-primary"
              >
                {link.label}
              </a>
            ))}

            <div className="pt-4 border-t border-border mt-4">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl">
                    <UserIcon className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg">{user?.name}</span>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full py-6 font-bold text-lg rounded-xl"
                    onClick={() => {
                      logout()
                      setMobileOpen(false)
                    }}
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full py-6 font-bold text-lg rounded-xl"
                  onClick={() => {
                    setAuthModalOpen(true)
                    setMobileOpen(false)
                  }}
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                </Button>
              )}
            </div>
          </nav>
        </div>
      </header>
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  )
}
