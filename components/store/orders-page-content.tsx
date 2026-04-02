"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
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
    Timer,
    MapPin,
    ArrowLeft,
    ChevronDown,
    Truck
} from "lucide-react"
import dynamic from "next/dynamic"
import { cn, formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

const OrderTrackingMap = dynamic(() => import('@/components/shared/order-tracking-map'), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-[300px] rounded-xl border border-border mt-4 flex items-center justify-center bg-muted/20 animate-pulse">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Loading Map Engine...</span>
        </div>
    )
})

interface Order {
    id: string
    created_at: string
    items: any[]
    total_price: string
    status: 'pending' | 'processing' | 'cancelled' | 'completed'
    customer_lat?: number
    customer_lng?: number
}

interface UserProfile {
    phone: string
    cancellation_count: number
    penalty_until: string | null
}

export function OrdersPageContent() {
    const { user, isAuthenticated, supabaseUser } = useAuth()
    const [orders, setOrders] = useState<Order[]>([])
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

    const formatOrderPrice = (val: any) => formatCurrency(val)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isAuthenticated || !user?.phone) {
            setOrders([])
            setProfile(null)
            return
        }

        fetchUserOrders()
        fetchUserProfile()

        const channel = supabase
            .channel(`user-orders-page:${user.phone}`)
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

    const fetchUserProfile = async () => {
        if (!user?.phone) return
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone', user.phone)
            .single()

        if (data) setProfile(data)
    }

    const fetchUserOrders = async () => {
        if (!supabaseUser?.id && !user?.phone) return
        setIsLoading(true)
        
        // Query by user_id (preferred) or by phone number
        const { data } = await supabase
            .from('orders')
            .select('*')
            .or(`user_id.eq.${supabaseUser?.id},customer_phone.eq.${user?.phone}`)
            .order('created_at', { ascending: false })

        if (data) {
            setOrders(data)
            const firstActive = data.find(o => o.status === 'processing' || o.status === 'pending')
            if (firstActive && !expandedOrderId) {
                setExpandedOrderId(firstActive.id)
            }
        }
        setIsLoading(false)
    }

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm("Are you sure you want to cancel?")) return
        // Simplification for the page view, reusing logic is fine
        try {
            const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
            if (error) throw error
            fetchUserOrders()
            toast.success("Order cancelled")
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    const formatOrderTime = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
            month: '2-digit', day: '2-digit', year: 'numeric'
        }).replace(',', '')
    }

    if (!mounted) return null

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-20" />
                </div>
                <h2 className="text-2xl font-black mb-2">Sign in to view orders</h2>
                <p className="text-muted-foreground max-w-sm mb-8">Access your order history and live tracking in real-time.</p>
                <Link href="/">
                    <Button className="h-12 px-8 rounded-xl font-bold">Go to Home</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-8 border-b border-border/50">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">My Orders</h1>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-[52px]">
                        Real-time status & tracking
                    </p>
                </div>

            </div>

            {isLoading && orders.length === 0 ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 w-full rounded-2xl bg-muted/40 animate-pulse border border-border" />
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-bold">No orders found</h3>
                    <p className="text-sm text-muted-foreground mt-1">Start shopping to see your orders here.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => {
                        const isExpanded = expandedOrderId === order.id
                        const statusColors = {
                            pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                            processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                            completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            cancelled: "bg-destructive/10 text-destructive border-destructive/20"
                        }

                        return (
                            <div 
                                key={order.id} 
                                className={cn(
                                    "group relative rounded-3xl border transition-all duration-300 overflow-hidden",
                                    isExpanded 
                                        ? "bg-card border-primary/20 shadow-xl shadow-primary/[0.03]" 
                                        : "bg-muted/10 border-border hover:border-primary/20 hover:bg-card"
                                )}
                            >
                                {/* Order Header - Summary */}
                                <div 
                                    className="p-6 cursor-pointer"
                                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors",
                                                isExpanded ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border"
                                            )}>
                                                <ShoppingBag className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{formatOrderTime(order.created_at)}</p>
                                                <h3 className="font-black text-lg tracking-tight">REF: #{order.id.split('-')[0].toUpperCase()}</h3>
                                                <p className="text-xs font-medium text-muted-foreground truncate max-w-[200px]">
                                                    {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-6">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-0.5 opacity-50">Grand Total</p>
                                                <p className="text-xl font-black text-primary tracking-tighter">{formatOrderPrice(order.total_price)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge className={cn("px-3 py-1.5 font-black uppercase text-[10px] tracking-widest border-2", statusColors[order.status])}>
                                                    {order.status}
                                                </Badge>
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center bg-muted/20 transition-transform duration-500",
                                                    isExpanded && "rotate-180 bg-primary/10 text-primary"
                                                )}>
                                                    <ChevronDown className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Tracking View */}
                                <div className={cn(
                                    "grid transition-all duration-500 ease-[cubic-bezier(0.2,1,0.3,1)]",
                                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                )}>
                                    <div className="overflow-hidden">
                                        <div className="p-6 pt-0 border-t border-border/40 bg-muted/5 space-y-8">
                                            
                                            {/* Journey Log */}
                                            <div className="pt-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Journey Log</h4>
                                                <div className="pl-6 border-l-2 border-muted/30 space-y-8 relative">
                                                    
                                                    {/* Step 3: Success? */}
                                                    {order.status === 'completed' && (
                                                        <div className="relative">
                                                            <div className="absolute -left-[33px] top-1 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-background border-2 border-background" />
                                                            <p className="text-sm font-black text-emerald-600">Package Delivered</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">Handed over successfully. Ref 502-B</p>
                                                        </div>
                                                    )}

                                                    {/* Step 2: Transit */}
                                                    {(order.status === 'processing' || order.status === 'completed') && (
                                                        <div className="relative">
                                                            <div className={cn(
                                                                "absolute -left-[33px] top-1 h-5 w-5 rounded-full ring-4 ring-background border-2 border-background", 
                                                                order.status === 'processing' ? "bg-blue-500 animate-pulse" : "bg-muted text-muted-foreground"
                                                            )} />
                                                            <p className={cn("text-sm font-black", order.status === 'processing' ? "text-blue-600" : "text-foreground opacity-40")}>
                                                                {order.status === 'completed' ? 'Out for Delivery' : 'Rider Dispatched'}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                {order.status === 'completed' ? 'Completed logistics cycle.' : 'Transit initiated. Real-time GPS enabled below.'}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Step 1: Placed */}
                                                    <div className="relative">
                                                        <div className="absolute -left-[33px] top-1 h-5 w-5 rounded-full bg-muted/80 ring-4 ring-background border-2 border-background" />
                                                        <p className="text-sm font-black text-foreground opacity-40">Order Confirmed</p>
                                                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">Digital receipt generated and queued.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Telemetry/Map section */}
                                            {order.status === 'processing' && order.customer_lat && order.customer_lng && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
                                                            <Truck className="h-3 w-3" />
                                                            Telemetry Feed
                                                        </h4>
                                                        <span className="flex items-center gap-2 text-[10px] font-black text-blue-500 animate-pulse">
                                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                            LIVE UPDATE
                                                        </span>
                                                    </div>
                                                    <div className="h-[350px] w-full rounded-[2.5rem] overflow-hidden border border-border shadow-2xl relative">
                                                        <OrderTrackingMap 
                                                            orderId={order.id} 
                                                            customerLocation={{ lat: order.customer_lat, lng: order.customer_lng }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            {order.status === 'pending' && (
                                                <div className="pt-4">
                                                    <button
                                                        onClick={() => handleCancelOrder(order.id)}
                                                        className="w-full bg-destructive/5 hover:bg-destructive/10 text-destructive font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl border border-destructive/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        Abort & Request Cancellation
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
