"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/contexts/cart-context"
import { ShoppingCart, Minus, Plus, Trash2, X, CheckCircle2, PackageCheck, MapPin } from "lucide-react"
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
import { STORE_LOCATION, calculateDistance, formatCurrency } from "@/lib/utils"

import dynamic from "next/dynamic"

const LocationPicker = dynamic(() => import('./location-picker'), { 
    ssr: false,
    loading: () => <div className="h-[250px] w-full rounded-xl flex items-center justify-center bg-muted/20 animate-pulse border border-border mt-6 text-xs text-muted-foreground uppercase tracking-widest gap-2"><MapPin className="w-4 h-4"/> Loading GPS Engine...</div>
})

export function Cart() {
    const { cart, removeFromCart, updateQuantity, getCartTotal, getRawTotal, getCartCount, clearCart } = useCart()
    const { user, isAuthenticated, supabaseUser } = useAuth()
    const itemCount = getCartCount()
    const [isBouncing, setIsBouncing] = useState(false)
    const [penaltyUntil, setPenaltyUntil] = useState<string | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [deliveryLocation, setDeliveryLocation] = useState<{lat: number, lng: number} | null>(null)
    const [locationName, setLocationName] = useState<string>("")
    const [phoneNumber, setPhoneNumber] = useState<string>("")

    // Calculate delivery fee
    const distance = deliveryLocation 
        ? calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, deliveryLocation.lat, deliveryLocation.lng)
        : 0
    const deliveryFee = distance * 5
    const finalTotalValue = Number((getRawTotal() + deliveryFee).toFixed(2))

    useEffect(() => {
        setMounted(true)
    }, [])

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

        if (!deliveryLocation) {
            toast.error("Please pin your exact delivery location on the map first.")
            return
        }

        if (!phoneNumber || phoneNumber.length < 8) {
            toast.error("Please enter a valid phone number for delivery contact.")
            return
        }

        const cartDetails = cart.map(item => `${item.name} (x${item.quantity}) - ${formatCurrency(item.price)}`).join("\n")
        const productImages = cart.map(item => `${item.name}:\n${item.images[0]}`).join("\n\n")
        const total = formatCurrency(finalTotalValue)

        const chatMsg = `I would like to checkout the following items:\n${cartDetails}\nDelivery Fee: ${formatCurrency(deliveryFee)}\nTotal (incl. Fee): ${total}\n\n${productImages}`

        try {
            // 1. Create a record in the 'orders' table
            const { error: orderError } = await supabase.from('orders').insert([
                {
                    user_id: supabaseUser?.id, // Link to auth user
                    customer_name: user?.name,
                    customer_phone: phoneNumber,
                    location_name: locationName,
                    items: cart, // Save full cart data as JSONB
                    total_price: finalTotalValue,
                    status: 'pending',
                    customer_lat: deliveryLocation.lat,
                    customer_lng: deliveryLocation.lng
                }
            ])

            if (orderError) throw orderError

            // Update user profile with latest phone number
            if (supabaseUser?.id) {
                await supabase.from('profiles').upsert({
                    id: supabaseUser.id,
                    phone: phoneNumber,
                    updated_at: new Date()
                }, { onConflict: 'id' })
            }

            // 2. Send Chat message
            const { error: chatError } = await supabase.from('messages').insert([
                {
                    content: chatMsg,
                    sender_id: supabaseUser?.id || user?.phone || "anonymous", // Consistent account grouping ID
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

    if (!mounted) {
        return (
            <Button variant="outline" size="icon" className="relative h-12 w-12 rounded-xl border-border bg-background transition-all hover:bg-muted">
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
                        {itemCount}
                    </span>
                )}
            </Button>
        )
    }

    return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className={cn(
                    "relative h-12 w-12 rounded-xl border-border bg-background transition-all hover:bg-muted shadow-sm",
                    isBouncing && "animate-cart-bounce"
                )}>
                    <ShoppingCart className="h-6 w-6" />
                    {itemCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground animate-in zoom-in ring-2 ring-background">
                            {itemCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md bg-background border-l-border">
                <SheetHeader className="space-y-4 pr-6 pb-4 border-b border-border">
                    <SheetTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6 text-primary" />
                        Checkout Cart
                    </SheetTitle>
                </SheetHeader>

                {itemCount === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center space-y-4">
                        <div className="rounded-full bg-muted p-8 opacity-40">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-black text-muted-foreground/60 uppercase tracking-widest text-xs">Your cart is empty</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 pr-6 -mr-6 px-6">
                            <div className="space-y-6 pt-6 mb-10">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex gap-4 group">
                                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-sm transition-transform group-hover:scale-105 duration-300">
                                            <Image
                                                src={item.images[0] || "/placeholder.svg"}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between py-1">
                                            <div className="space-y-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-bold text-sm leading-tight text-foreground line-clamp-2">{item.name}</h4>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="text-muted-foreground/40 hover:text-destructive transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <p className="text-sm font-black text-primary">{item.price}</p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/50 shadow-inner">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-md hover:bg-background"
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-md hover:bg-background"
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="space-y-4 pt-6 border-t border-border bg-card/50 -mx-6 px-6 pb-6">
                            <div className="space-y-4">
                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Contact Number</label>
                                        <span className="text-[10px] font-bold text-primary/60 italic">Required for dispatch</span>
                                    </div>
                                    <div className="relative group/input">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-border/50">
                                            <span className="text-sm font-black text-muted-foreground">+63</span>
                                        </div>
                                        <input 
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                // PH mobile numbers always start with 9 after +63
                                                while (val.length > 0 && val[0] !== '9') {
                                                    val = val.substring(1);
                                                }
                                                setPhoneNumber(val.substring(0, 10));
                                            }}
                                            placeholder="9XX XXX XXXX"
                                            maxLength={11}
                                            className="w-full h-14 bg-muted/10 border border-border rounded-2xl pl-20 pr-4 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none group-hover/input:border-primary/20"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between group cursor-pointer mb-2">
                                    <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <MapPin className="h-3 w-3 text-primary" />
                                        Location
                                    </h4>
                                    {deliveryLocation && (
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter max-w-[180px] truncate text-right">
                                            {locationName || `${distance.toFixed(2)} km away`}
                                        </span>
                                    )}
                                </div>
                                <div className="rounded-2xl overflow-hidden border border-border/80 shadow-sm bg-background ring-offset-background transition-all focus-within:ring-2 focus-within:ring-primary/20">
                                    <LocationPicker 
                                        onLocationSelect={setDeliveryLocation} 
                                        onAddressResolve={(addr) => setLocationName(addr)}
                                        defaultLocation={deliveryLocation || undefined} 
                                    />
                                </div>
                                {!deliveryLocation && (
                                    <div className="bg-destructive/10 border border-destructive/20 p-2 rounded-lg flex items-center justify-center gap-2">
                                        <X className="h-3 w-3 text-destructive" />
                                        <p className="text-[9px] text-destructive font-black uppercase tracking-widest">
                                            Pin location to calculate fee
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 py-2">
                                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>{getCartTotal()}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <span>Delivery Fee</span>
                                        <span className="text-[9px] opacity-60 font-mono">(₱5.00/km)</span>
                                    </div>
                                    <span className={cn(!deliveryLocation && "opacity-20")}>
                                        {formatCurrency(deliveryFee)}
                                    </span>
                                </div>
                                <Separator className="bg-border/50" />
                                <div className="flex items-center justify-between text-xl font-black pt-1">
                                    <span className="tracking-tight">Grand Total</span>
                                    <span className="text-primary drop-shadow-sm">{formatCurrency(finalTotalValue)}</span>
                                </div>
                            </div>

                            <SheetFooter className="pt-2">
                                <Button
                                    className={cn(
                                        "w-full py-7 text-lg font-black uppercase tracking-widest shadow-lg shadow-primary/10 transition-all active:scale-[0.98]",
                                        (isBanned || !deliveryLocation || phoneNumber.length < 10) && "opacity-50 grayscale cursor-not-allowed"
                                    )}
                                    size="lg"
                                    onClick={handleCheckout}
                                    disabled={isBanned || !deliveryLocation || phoneNumber.length < 10}
                                >
                                    {isBanned 
                                        ? `Restricted (${remainingTime}m)` 
                                        : !deliveryLocation 
                                            ? "Select Location First" 
                                            : "Dispatch Order"}
                                </Button>
                            </SheetFooter>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
