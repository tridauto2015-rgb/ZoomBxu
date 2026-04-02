import { Header } from "@/components/layout/header"
import { Hero } from "@/components/layout/hero"
import { ProductsSection } from "@/components/store/products-section"
import { ContactSection } from "@/components/layout/contact-section"
import { Footer } from "@/components/layout/footer"

export default function Page() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <ProductsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
