import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display, Russo_One } from 'next/font/google'

import './globals.css'
import { AdminProvider } from "@/contexts/admin-context"
import { ProductsProvider } from "@/contexts/products-context"
import { CartProvider } from "@/contexts/cart-context"

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
  title: 'Zoom BXU Auto Parts - Quality Parts You Can Trust',
  description: 'Your trusted source for quality auto parts. Easy to browse, easy to order. Serving car enthusiasts and everyday drivers since 1985.',
  icons: {
    icon: '/images/zoombxulogo.png',
    shortcut: '/images/zoombxulogo.png',
    apple: '/images/zoombxulogo.png',
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
        <AdminProvider>
          <ProductsProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </ProductsProvider>
        </AdminProvider>
      </body>
    </html>
  )
}
