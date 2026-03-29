import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OrdersPageContent } from "@/components/orders-page-content"

export default function OrdersPage() {
    return (
        <div className="min-h-screen">
            <Header />
            <main className="pt-24 pb-20">
                <OrdersPageContent />
            </main>
            <Footer />
        </div>
    )
}
