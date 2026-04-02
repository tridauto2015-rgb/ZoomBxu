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

// Geocoding function using Nominatim (OpenStreetMap)
const searchAddresses = async (query: string): Promise<Array<{title: string, subtitle: string, full_name: string, lat: number, lng: number}>> => {
    try {
        // Add Philippines context for better results if not already present
        const searchQuery = query.toLowerCase().includes('philippines') ? query : `${query}, Philippines`;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=ph`);
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
            return data.map(item => {
                const parts = item.display_name.split(',');
                const title = parts[0].trim();
                const subtitle = parts.slice(1).join(',').replace(/, Philippines$/, '').trim();
                return {
                    title,
                    subtitle: subtitle || parts[0].trim(),
                    full_name: item.display_name.replace(/, Philippines$/, ''),
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon)
                };
            });
        }
        return [];
    } catch (error) {
        console.error("Address search error:", error);
        return [];
    }
};

const LocationPicker = dynamic(() => import('@/components/shared/location-picker'), { 
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
    const [addressInput, setAddressInput] = useState<string>("")
    const [isGeocoding, setIsGeocoding] = useState(false)
    const [suggestions, setSuggestions] = useState<Array<{title: string, subtitle: string, full_name: string, lat: number, lng: number}>>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)

    // Calculate delivery fee
    const distance = deliveryLocation 
        ? calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, deliveryLocation.lat, deliveryLocation.lng)
        : 0
    
    // Tiered pricing: P10 per km up to 200km, then P1 per km for the excess
    const deliveryFee = distance > 200 
        ? 2000 + (distance - 200) * 1 
        : distance * 10

    const finalTotalValue = Number((getRawTotal() + deliveryFee).toFixed(2))

    useEffect(() => {
        setMounted(true)
    }, [])

    // Debounced geocoding function for suggestions
    useEffect(() => {
        if (!addressInput.trim() || addressInput === locationName) {
            setIsGeocoding(false)
            setSuggestions([])
            setShowSuggestions(false)
            setSelectedIndex(-1)
            return
        }

        const timeoutId = setTimeout(async () => {
            setIsGeocoding(true)
            try {
                const results = await searchAddresses(addressInput)
                setSuggestions(results)
                if (results.length > 0) {
                    setShowSuggestions(true)
                    setSelectedIndex(0) // Default highlight first
                } else {
                    setShowSuggestions(false)
                }
            } catch (error) {
                console.error("Error searching for location:", error)
            } finally {
                setIsGeocoding(false)
            }
        }, 600) // Slightly faster debounce for better feel

        return () => clearTimeout(timeoutId)
    }, [addressInput, locationName])

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
        // Play ATM sound effect
        const audio = new Audio('/sounds/checkout-click.mp3')
        audio.play().catch(e => console.error("Audio playback failed:", e))

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
                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            
                                            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80">Contact Number</label>
                                        </div>

                                    </div>
                                    <div className="relative group/input">
                                        {/* Animated border effect */}
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-0 group-hover/input:opacity-20 transition-opacity duration-500 blur-xl"></div>
                                        
                                        {/* Main input container */}
                                        <div className="relative bg-gradient-to-br from-slate-50/80 to-white/90 dark:from-slate-900/80 dark:to-slate-800/90 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg group-hover/input:shadow-xl transition-all duration-300 overflow-hidden">
                                            {/* Top decorative line */}
                                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity duration-500"></div>
                                            
                                            {/* Country code section */}
                                            <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-20 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent border-r border-slate-200/40 dark:border-slate-700/40">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-primary/90">+63</span>
                                                    <div className="w-4 h-px bg-primary/20 mt-0.5"></div>
                                                </div>
                                            </div>
                                            
                                            <input 
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/\D/g, '');
                                                    while (val.length > 0 && val[0] !== '9') {
                                                        val = val.substring(1);
                                                    }
                                                    setPhoneNumber(val.substring(0, 10));
                                                }}
                                                placeholder="9XX XXX XXXX"
                                                maxLength={11}
                                                className="w-full h-12 bg-transparent pl-24 pr-16 text-sm font-medium tracking-[0.02em] placeholder:text-slate-400/60 dark:placeholder:text-slate-500/60 focus:outline-none transition-all duration-300"
                                            />
                                            
                                            {/* Right side indicators */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                {phoneNumber.length === 10 && (
                                                    <div className="flex items-center gap-1 animate-in slide-in-from-right duration-300">
                                                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-purple-500 opacity-60 group-focus-within/input:opacity-100 transition-opacity duration-300"></div>
                                            </div>
                                            
                                            {/* Bottom progress bar */}
                                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300 rounded-full"
                                                    style={{ width: `${(phoneNumber.length / 10) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        

                                        
                                        {/* Corner decorations */}
                                        <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-primary/30 rounded-tl-sm opacity-0 group-hover/input:opacity-100 transition-opacity duration-300"></div>
                                        <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-primary/30 rounded-tr-sm opacity-0 group-hover/input:opacity-100 transition-opacity duration-300"></div>
                                        <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-primary/30 rounded-bl-sm opacity-0 group-hover/input:opacity-100 transition-opacity duration-300"></div>
                                        <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-primary/30 rounded-br-sm opacity-0 group-hover/input:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80">Delivery Address</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1 h-1 rounded-full animate-pulse", deliveryLocation && addressInput === locationName ? "bg-green-500" : "bg-primary")}></div>
                                            <span className={cn("text-[8px] font-medium", deliveryLocation && addressInput === locationName ? "text-green-600" : "text-primary")}>
                                                {deliveryLocation && addressInput === locationName ? "Location pinned" : "Awaiting sync"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="relative group/input">
                                        {/* Animated border effect */}
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-0 group-hover/input:opacity-20 transition-opacity duration-500 blur-xl"></div>
                                        
                                        {/* Main input container */}
                                        <div className="relative bg-gradient-to-br from-slate-50/80 to-white/90 dark:from-slate-900/80 dark:to-slate-800/90 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg group-hover/input:shadow-xl transition-all duration-300 overflow-hidden">
                                            {/* Top decorative line */}
                                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity duration-500"></div>
                                            
                                            {/* Icon section prefix */}
                                            <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-14 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent border-r border-slate-200/40 dark:border-slate-700/40">
                                                <div className="flex flex-col items-center">
                                                    <MapPin className="h-4 w-4 text-primary/90" />
                                                    <div className="w-4 h-px bg-primary/20 mt-1"></div>
                                                </div>
                                            </div>
                                            
                                            <input 
                                                type="text"
                                                value={addressInput}
                                                onChange={(e) => {
                                                    setAddressInput(e.target.value)
                                                    setShowSuggestions(true)
                                                    if (!isGeocoding) setIsGeocoding(true)
                                                }}
                                                onFocus={() => {
                                                    if (suggestions.length > 0) setShowSuggestions(true)
                                                }}
                                                onBlur={() => {
                                                    // Delay hiding to allow suggested item click to register
                                                    setTimeout(() => setShowSuggestions(false), 200)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (!showSuggestions || suggestions.length === 0) return
                                                    
                                                    if (e.key === 'ArrowDown') {
                                                        e.preventDefault()
                                                        setSelectedIndex(prev => (prev + 1) % suggestions.length)
                                                    } else if (e.key === 'ArrowUp') {
                                                        e.preventDefault()
                                                        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
                                                    } else if (e.key === 'Enter' && selectedIndex >= 0) {
                                                        e.preventDefault()
                                                        const selected = suggestions[selectedIndex]
                                                        setAddressInput(selected.full_name)
                                                        setLocationName(selected.full_name)
                                                        setDeliveryLocation({ lat: selected.lat, lng: selected.lng })
                                                        setShowSuggestions(false)
                                                    } else if (e.key === 'Escape') {
                                                        setShowSuggestions(false)
                                                    }
                                                }}
                                                placeholder="Click map or type here..."
                                                className="w-full h-12 bg-transparent pl-16 pr-14 text-sm font-medium tracking-[0.02em] placeholder:text-slate-400/60 dark:placeholder:text-slate-500/60 focus:outline-none transition-all duration-300"
                                            />
                                            
                                            {/* Right side indicators */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                {isGeocoding ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                ) : deliveryLocation && addressInput === locationName ? (
                                                    <div className="flex items-center gap-1 animate-in slide-in-from-right duration-300">
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    </div>
                                                ) : null}
                                                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-purple-500 opacity-60 group-focus-within/input:opacity-100 transition-opacity duration-300"></div>
                                            </div>
                                            
                                            {/* Bottom progress bar */}
                                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300 rounded-full"
                                                    style={{ width: addressInput.length > 5 ? '100%' : `${addressInput.length * 15}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        
                                        {/* Dropdown Suggestions */}
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                                <ScrollArea className="max-h-[280px]">
                                                    <div className="p-1.5 flex flex-col gap-1">
                                                        {suggestions.map((suggestion, index) => (
                                                            <button
                                                                key={index}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setAddressInput(suggestion.full_name)
                                                                    setLocationName(suggestion.full_name)
                                                                    setDeliveryLocation({ lat: suggestion.lat, lng: suggestion.lng })
                                                                    setShowSuggestions(false)
                                                                }}
                                                                onMouseEnter={() => setSelectedIndex(index)}
                                                                className={cn(
                                                                    "w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-start gap-3 group",
                                                                    selectedIndex === index 
                                                                        ? "bg-primary/10 dark:bg-primary/20" 
                                                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "mt-0.5 p-1.5 rounded-lg transition-colors",
                                                                    selectedIndex === index 
                                                                        ? "bg-primary text-white" 
                                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary group-hover:bg-primary/10"
                                                                )}>
                                                                    <MapPin className="h-3.5 w-3.5" />
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className={cn(
                                                                        "font-bold text-sm truncate",
                                                                        selectedIndex === index ? "text-primary" : "text-slate-700 dark:text-slate-200"
                                                                    )}>
                                                                        {suggestion.title}
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                                                                        {suggestion.subtitle}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                                <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[9px] font-sans text-slate-500 bg-white dark:bg-slate-900 shadow-sm">↵</kbd>
                                                        <span className="text-[9px] text-slate-400 font-medium">to select</span>
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 font-medium italic">Powered by OpenStreetMap</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Corner decorations */}
                                        <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-primary/30 rounded-tl-sm opacity-0 group-hover/input:opacity-100 transition-opacity duration-300"></div>
                                        <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-primary/30 rounded-tr-sm opacity-0 group-hover/input:opacity-100 transition-opacity duration-300"></div>
                                        <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-primary/30 rounded-bl-sm opacity-0 group-hover/input:opacity-100 transition-opacity duration-300"></div>
                                        <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-primary/30 rounded-br-sm opacity-0 group-hover/input:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                </div>
                                <div className="rounded-2xl overflow-hidden border border-border/80 shadow-sm bg-background ring-offset-background transition-all focus-within:ring-2 focus-within:ring-primary/20">
                                    <LocationPicker 
                                        onLocationSelect={setDeliveryLocation} 
                                        onAddressResolve={(addr) => {
                                            setLocationName(addr)
                                            setAddressInput(addr)
                                        }}
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
                                        <span className="text-[9px] opacity-60 font-mono">
                                            ({distance > 200 ? "₱1/km excess" : "₱10/km"})
                                        </span>
                                    </div>
                                    <span className={cn(!deliveryLocation && "opacity-20")}>
                                        {formatCurrency(deliveryFee)}
                                    </span>
                                </div>
                                <Separator className="bg-border/50" />
                                <div className="flex items-center justify-between text-xl font-black pt-1">
                                    <span className="tracking-tight">Total</span>
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
                                            : "Checkout"}
                                </Button>
                            </SheetFooter>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
