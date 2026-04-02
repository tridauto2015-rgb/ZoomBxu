import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { OrdersPageContent } from "@/components/store/orders-page-content"

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
