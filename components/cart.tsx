"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/contexts/cart-context"
import { ShoppingCart, Minus, Plus, Trash2, X, CheckCircle2, PackageCheck } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

export function Cart() {
    const { cart, removeFromCart, updateQuantity, getCartTotal, getCartCount, clearCart } = useCart()
    const { user, isAuthenticated } = useAuth()
    const itemCount = getCartCount()
    const [isBouncing, setIsBouncing] = useState(false)
    const [penaltyUntil, setPenaltyUntil] = useState<string | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    useEffect(() => {
        const handleOpenCart = () => {
            setIsSheetOpen(true)
            if (isAuthenticated && user?.phone) {
                checkPenalty()
            }
        }
        const handleCloseCart = () => setIsSheetOpen(false)

        window.addEventListener('open-cart', handleOpenCart)
        window.addEventListener('close-cart', handleCloseCart)

        return () => {
            window.removeEventListener('open-cart', handleOpenCart)
            window.removeEventListener('close-cart', handleCloseCart)
        }
    }, [isAuthenticated, user?.phone])

    useEffect(() => {
        if (isAuthenticated && user?.phone) {
            checkPenalty()
        } else {
            setPenaltyUntil(null)
        }
    }, [isAuthenticated, user?.phone])

    const checkPenalty = async () => {
        if (!user?.phone) {
            setPenaltyUntil(null)
            return
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('penalty_until')
                .eq('phone', user?.phone)
                .maybeSingle() // Safer than .single()

            if (error) throw error
            setPenaltyUntil(data?.penalty_until || null)
        } catch (err) {
            console.error("Error checking penalty:", err)
            setPenaltyUntil(null) // Default to no penalty on error for safety
        }
    }

    useEffect(() => {
        if (itemCount > 0) {
            setIsBouncing(true)
            const timer = setTimeout(() => setIsBouncing(false), 400)
            return () => clearTimeout(timer)
        }
    }, [itemCount])

    const isBanned = !!(penaltyUntil && new Date(penaltyUntil) > new Date())
    const remainingTime = isBanned
        ? Math.ceil((new Date(penaltyUntil!).getTime() - Date.now()) / 60000)
        : 0

    const handleCheckout = async () => {
        if (!isAuthenticated) {
            toast.error("Please login to proceed with checkout")
            return
        }

        // Fresh check right before checkout to prevent stale blocks
        await checkPenalty()

        if (isBanned) {
            const currentRemaining = Math.ceil((new Date(penaltyUntil!).getTime() - Date.now()) / 60000)
            toast.error(`Your account is temporarily restricted from ordering for another ${currentRemaining} minutes.`, {
                className: "border-destructive bg-destructive/5"
            })
            return
        }

        const cartDetails = cart.map(item => `${item.name} (x${item.quantity}) - ${item.price}`).join("\n")
        const total = getCartTotal()

        // Include product images in the checkout message
        const productImages = cart.map(item => `- ${item.name}: ${item.images[0]}`).join("\n")

        const chatMsg = `I would like to checkout the following items:\n\n${cartDetails}\n\nTotal: ${total}\n\nProduct Photos:\n${productImages}`

        try {
            // 1. Create a record in the 'orders' table
            const { error: orderError } = await supabase.from('orders').insert([
                {
                    customer_name: user?.name,
                    customer_phone: user?.phone,
                    items: cart, // Save full cart data as JSONB
                    total_price: total,
                    status: 'pending'
                }
            ])

            if (orderError) throw orderError

            // 2. Send Chat message
            const { error: chatError } = await supabase.from('messages').insert([
                {
                    content: chatMsg,
                    sender_id: user?.phone,
                    sender_name: user?.name,
                    is_admin: false,
                    recipient_id: 'admin'
                }
            ])

            if (chatError) throw chatError

            clearCart()
            setIsSheetOpen(false)
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open-user-orders'))
            }, 300)
            window.dispatchEvent(new CustomEvent('open-chat'))

        } catch (error: any) {
            console.error("Checkout error:", error)
            toast.error("Failed to process order: " + error.message)
        }
    }

    return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className={cn(
                    "relative h-12 w-12 rounded-xl border-border bg-background transition-all hover:bg-muted",
                    isBouncing && "animate-cart-bounce"
                )}>
                    <ShoppingCart className="h-6 w-6" />
                    {itemCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground animate-in zoom-in">
                            {itemCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
                <SheetHeader className="space-y-2.5 pr-6">
                    <SheetTitle className="text-2xl font-bold">Shopping Cart</SheetTitle>
                    <Separator />
                </SheetHeader>

                {itemCount === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center space-y-4">
                        <div className="rounded-full bg-muted p-6">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-medium text-muted-foreground">Your cart is empty</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 pr-6">
                            <div className="space-y-6 pt-4">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex gap-4">
                                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                                            <Image
                                                src={item.images[0] || "/placeholder.svg"}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-bold leading-none text-foreground">{item.name}</h4>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{item.price}</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-md"
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-md"
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="space-y-4 pt-6">
                            <Separator />
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span>{getCartTotal()}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Shipping and taxes calculated at checkout.
                                </p>
                            </div>
                            <SheetFooter>
                                <Button
                                    className={cn(
                                        "w-full py-6 text-lg font-bold",
                                        isBanned && "bg-destructive hover:bg-destructive opacity-80 cursor-not-allowed"
                                    )}
                                    size="lg"
                                    onClick={handleCheckout}
                                    disabled={isBanned}
                                >
                                    {isBanned ? `Restricted (${remainingTime}m)` : "Proceed to Checkout"}
                                </Button>
                            </SheetFooter>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
