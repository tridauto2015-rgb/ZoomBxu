import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display, Russo_One } from 'next/font/google'

import './globals.css'
import { AdminProvider } from "@/contexts/admin-context"
import { ProductsProvider } from "@/contexts/products-context"
import { CartProvider } from "@/contexts/cart-context"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/sonner"
import { ChatBox } from "@/components/chat-box"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

const russoOne = Russo_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-russo-one',
})

export const metadata: Metadata = {
  title: 'Zoom Bxu Surplus',
  description: 'Your trusted source for quality auto parts. Easy to browse, easy to order. Serving car enthusiasts and everyday drivers since 1985.',
  icons: {
    icon: '/images/zoombxulogo.png',
    shortcut: '/images/zoombxulogo.png',
    apple: '/images/zoombxulogo.png',
  },
  openGraph: {
    title: 'Zoom BXU Auto Parts - Quality Parts You Can Trust',
    description: 'Your trusted source for quality auto parts. Easy to browse, easy to order. Serving car enthusiasts and everyday drivers since 1985.',
    url: 'https://zoombxusurplus.vercel.app',
    siteName: 'Zoom BXU Auto Parts',
    images: [
      {
        url: '/images/zoombxu.png',
        width: 1200,
        height: 630,
        alt: 'Zoom BXU Auto Parts Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zoom Bxu Surplus',
    description: 'Your trusted source for quality auto parts. Easy to browse, easy to order. Serving car enthusiasts and everyday drivers since 1985.',
    images: ['/images/zoombxu.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#C75B2A',
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${russoOne.variable}`}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/images/zoombxulogo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/zoombxulogo.png" />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          <AdminProvider>
            <ProductsProvider>
              <CartProvider>
                {children}
                <ChatBox />
                <Toaster />
              </CartProvider>
            </ProductsProvider>
          </AdminProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
