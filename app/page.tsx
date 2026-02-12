import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { ProductsSection } from "@/components/products-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"

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
