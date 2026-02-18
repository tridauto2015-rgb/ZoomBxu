"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Package,
    Clock,
    CheckCircle2,
    XCircle,
    ShoppingBag,
    AlertTriangle,
    Timer
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Order {
    id: string
    created_at: string
    items: any[]
    total_price: string
    status: 'pending' | 'processing' | 'cancelled' | 'completed'
}

interface UserProfile {
    phone: string
    cancellation_count: number
    penalty_until: string | null
}

export function UserOrders() {
    const { user, isAuthenticated } = useAuth()
    const [orders, setOrders] = useState<Order[]>([])
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isBouncing, setIsBouncing] = useState(false)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    useEffect(() => {
        const handleOpenOrders = () => {
            setIsSheetOpen(true)
        }
        window.addEventListener('open-user-orders', handleOpenOrders)
        return () => window.removeEventListener('open-user-orders', handleOpenOrders)
    }, [])

    useEffect(() => {
        if (!isAuthenticated || !user?.phone) {
            setOrders([])
            setProfile(null)
            return
        }

        fetchUserOrders()
        fetchUserProfile()

        // Subscribe to changes in THIS user's orders
        const channel = supabase
            .channel(`user-orders:${user.phone}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `customer_phone=eq.${user.phone}`
            }, () => {
                fetchUserOrders()
                fetchUserProfile()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [isAuthenticated, user?.phone])

    useEffect(() => {
        if (isSheetOpen && isAuthenticated && user?.phone) {
            fetchUserOrders()
            fetchUserProfile()
        }
    }, [isSheetOpen, isAuthenticated, user?.phone])

    useEffect(() => {
        const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length
        if (activeCount > 0) {
            setIsBouncing(true)
            const timer = setTimeout(() => setIsBouncing(false), 400)
            return () => clearTimeout(timer)
        }
    }, [orders.length])

    const fetchUserProfile = async () => {
        if (!user?.phone) return
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone', user.phone)
            .single()

        if (data) {
            setProfile(data)
        } else if (error && error.code === 'PGRST116') {
            const { data: newProfile } = await supabase
                .from('profiles')
                .insert([{ phone: user.phone, cancellation_count: 0 }])
                .select()
                .single()
            if (newProfile) setProfile(newProfile)
        }
    }

    const fetchUserOrders = async () => {
        setIsLoading(true)
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_phone', user?.phone)
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        setIsLoading(false)
    }

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm("Are you sure you want to cancel this order? This will result in a temporary ordering penalty.")) return

        const currentCount = profile?.cancellation_count || 0
        const newCount = currentCount + 1

        // Progressive Penalty: 1st time 10 mins, each subsequent time 10x previous
        // 1: 10m, 2: 100m, 3: 1000m...
        const penaltyMinutes = 10 * Math.pow(10, newCount - 1)
        const penaltyUntil = new Date(Date.now() + penaltyMinutes * 60000).toISOString()

        try {
            const { error: orderError } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', orderId)

            if (orderError) throw orderError

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    cancellation_count: newCount,
                    penalty_until: penaltyUntil
                })
                .eq('phone', user?.phone)

            if (profileError) throw profileError

            // 3. Send cancellation notification to chat
            const cancelMsg = `Order Cancelled: REF ${orderId.split('-')[0].toUpperCase()}\nTotal: ${orders.find(o => o.id === orderId)?.total_price}\nCancellation Reason: User manually cancelled.`
            await supabase.from('messages').insert([
                {
                    content: cancelMsg,
                    sender_id: user?.phone,
                    sender_name: user?.name,
                    is_admin: false,
                    recipient_id: 'admin'
                }
            ])

            toast.error(`Order Cancelled. Penalty: You cannot order for ${penaltyMinutes} minutes.`, {
                duration: 6000
            })

            fetchUserOrders()
            fetchUserProfile()
        } catch (err: any) {
            toast.error("Failed to cancel: " + err.message)
        }
    }

    const isBanned = profile?.penalty_until && new Date(profile.penalty_until) > new Date()
    const remainingTime = isBanned
        ? Math.ceil((new Date(profile!.penalty_until!).getTime() - Date.now()) / 60000)
        : 0

    if (!isAuthenticated) return null

    return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className={cn(
                    "relative h-12 w-12 rounded-xl border-border bg-background transition-all hover:bg-muted shadow-sm",
                    isBouncing && "animate-cart-bounce"
                )}>
                    <ShoppingBag className="h-6 w-6" />
                    {(orders.filter(o => o.status === 'pending').length + orders.filter(o => o.status === 'processing').length) > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                            {orders.filter(o => o.status === 'pending').length + orders.filter(o => o.status === 'processing').length}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md bg-background">
                <SheetHeader className="pb-4 border-b border-border">
                    <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6 text-primary" />
                        Order History
                    </SheetTitle>
                </SheetHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                    {isBanned && (
                        <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-destructive">Ordering Suspended</p>
                                <p className="text-xs text-destructive/80">
                                    Multiple cancellations detected. Restriction ends in:
                                </p>
                                <div className="flex items-center gap-1.5 pt-1 text-destructive">
                                    <Timer className="h-4 w-4" />
                                    <span className="text-base font-black">{remainingTime} minutes</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Clock className="h-10 w-10 animate-spin text-primary mb-4" />
                            <p className="font-medium text-muted-foreground">Syncing orders...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="bg-muted rounded-full p-6 mb-4 opacity-50">
                                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold">No orders found</h3>
                            <p className="text-sm text-muted-foreground max-w-[240px] mx-auto mt-2">
                                Your order history is empty. Start adding items to your cart!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6 pt-6 pb-12">
                            {orders.map((order) => (
                                <div key={order.id} className="group relative rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="space-y-1.5">
                                            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 flex items-center gap-1.5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                REF: {order.id.split('-')[0].toUpperCase()}
                                            </div>
                                            <p className="text-sm font-medium">
                                                {new Date(order.created_at).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-3">
                                            <Badge
                                                className={cn(
                                                    "capitalize border-none px-3 py-1 font-black shadow-sm tracking-widest text-[9px]",
                                                    order.status === 'pending' && "bg-amber-100 text-amber-600 hover:bg-amber-100",
                                                    order.status === 'processing' && "bg-blue-100 text-blue-600 hover:bg-blue-100",
                                                    order.status === 'completed' && "bg-emerald-100 text-emerald-600 hover:bg-emerald-100",
                                                    order.status === 'cancelled' && "bg-rose-100 text-rose-600 hover:bg-rose-100"
                                                )}
                                            >
                                                {order.status}
                                            </Badge>
                                            {order.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancelOrder(order.id)}
                                                    className="group/btn flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-destructive/60 hover:text-destructive transition-colors"
                                                >
                                                    <XCircle className="h-3 w-3" />
                                                    Cancel Order
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-muted/30 rounded-xl p-3">
                                        {order.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="h-6 w-6 rounded-lg bg-background border border-border flex items-center justify-center text-[10px] font-black shadow-sm">
                                                        {item.quantity}
                                                    </span>
                                                    <span className="font-semibold text-foreground/80">{item.name}</span>
                                                </div>
                                                <span className="font-bold text-xs">{item.price}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-dashed border-border flex items-center justify-between">
                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-60">Total</span>
                                        <span className="text-xl font-black text-primary drop-shadow-sm">{order.total_price}</span>
                                    </div>

                                    {order.status === 'pending' && (
                                        <div className="mt-4 flex items-center gap-2.5 text-[11px] font-medium text-amber-700 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                                            <Clock className="h-4 w-4 animate-pulse" />
                                            Awaiting admin verification...
                                        </div>
                                    )}
                                    {order.status === 'completed' && (
                                        <div className="mt-4 flex items-center gap-2.5 text-[11px] font-medium text-green-700 bg-green-50/50 p-3 rounded-xl border border-green-100/50">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Product ready for pickup/delivery!
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="pt-6 border-t border-border mt-auto bg-background">
                    <p className="text-center text-[10px] uppercase font-black tracking-widest text-muted-foreground/40">
                        Zoom BXU Surplus • 2026
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    )
}
